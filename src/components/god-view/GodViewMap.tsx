"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import type { GodViewBatch } from "@/lib/types";
import {
  riskLevelToNum,
  clusterCircleLayer,
  clusterCountLayer,
  unclusteredPointLayer,
  unclusteredPulseLayer,
  routeGlowLayer,
  routeLineLayer,
  drawnRouteGlowLayer,
  drawnRouteLineLayer,
} from "./god-view-map-layers";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const MAP_STYLE = { width: "100%", height: "100%" } as const;

const ANIMATION_DURATION = 4000;
const STAGGER_DELAY = 300;

export interface GodViewLayers {
  routes: boolean;
  clusters: boolean;
}

interface GodViewMapProps {
  batches: GodViewBatch[];
  selectedBatchLotCode: string | null;
  onBatchSelect: (lotCode: string | null) => void;
  layers: GodViewLayers;
  flyToTarget: { lng: number; lat: number } | null;
}

/* ── Helpers ────────────────────────────────────────────────── */

function buildClusterGeoJSON(batches: GodViewBatch[]) {
  return {
    type: "FeatureCollection" as const,
    features: batches
      .filter((b) => b.lastLocation)
      .map((b) => ({
        type: "Feature" as const,
        properties: {
          lotCode: b.lotCode,
          productName: b.productName,
          riskLevel: b.riskLevel,
          riskLevelNum: riskLevelToNum(b.riskLevel),
          riskScore: b.riskScore,
          anomalyCount: b.anomalyCount,
          status: b.status,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [b.lastLocation!.lng, b.lastLocation!.lat],
        },
      })),
  };
}

function buildRoutesGeoJSON(batches: GodViewBatch[]) {
  const features = batches
    .filter((b) => b.stages.length >= 2)
    .map((b) => {
      const coords = b.stages
        .sort((a, z) => a.sequenceOrder - z.sequenceOrder)
        .map((s) => [s.location.lng, s.location.lat] as [number, number]);

      return {
        type: "Feature" as const,
        properties: {
          lotCode: b.lotCode,
          riskLevel: b.riskLevel,
          riskLevelNum: riskLevelToNum(b.riskLevel),
        },
        geometry: { type: "LineString" as const, coordinates: coords },
      };
    });

  return { type: "FeatureCollection" as const, features };
}

/** Truncate a LineString to a given progress (0-1). */
function truncateLineString(
  coords: [number, number][],
  progress: number,
): [number, number][] {
  if (coords.length < 2 || progress <= 0) return [];
  const clamped = Math.min(progress, 1);
  const totalSegs = coords.length - 1;
  const exactIdx = clamped * totalSegs;
  const idx = Math.floor(exactIdx);
  const segProg = exactIdx - idx;

  const drawn: [number, number][] = [];
  for (let i = 0; i <= Math.min(idx, coords.length - 1); i++) {
    drawn.push(coords[i]);
  }
  if (idx < totalSegs && segProg > 0) {
    const [x0, y0] = coords[idx];
    const [x1, y1] = coords[idx + 1];
    drawn.push([x0 + (x1 - x0) * segProg, y0 + (y1 - y0) * segProg]);
  }
  return drawn;
}

function computeBounds(batches: GodViewBatch[]): [[number, number], [number, number]] | null {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  let count = 0;

  for (const b of batches) {
    for (const s of b.stages) {
      const { lng, lat } = s.location;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      count++;
    }
  }

  return count > 0 ? [[minLng, minLat], [maxLng, maxLat]] : null;
}

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] as never[] };

/* ── Component ─────────────────────────────────────────────── */

export function GodViewMap({
  batches,
  selectedBatchLotCode,
  onBatchSelect,
  layers,
  flyToTarget,
}: GodViewMapProps) {
  const mapRef = useRef<MapRef>(null);
  const animRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const animDoneRef = useRef(false);
  const prevBatchCountRef = useRef(0);

  // ── GeoJSON sources ──
  const clusterData = useMemo(() => buildClusterGeoJSON(batches), [batches]);
  const routesData = useMemo(() => buildRoutesGeoJSON(batches), [batches]);

  // ── Drawn routes for animation ──
  const drawnRoutesRef = useRef(EMPTY_FC);

  // ── Animate route drawing ──
  const animateBatch = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || animDoneRef.current) return;

    const now = performance.now();
    if (animStartRef.current === null) animStartRef.current = now;
    const elapsed = now - animStartRef.current;

    const batchesWithRoutes = batches.filter((b) => b.stages.length >= 2);
    let allDone = true;

    const features = batchesWithRoutes.map((b, idx) => {
      const batchStart = idx * STAGGER_DELAY;
      const batchElapsed = elapsed - batchStart;
      const progress = Math.max(0, Math.min(1, batchElapsed / ANIMATION_DURATION));
      if (progress < 1) allDone = false;

      const coords = b.stages
        .sort((a, z) => a.sequenceOrder - z.sequenceOrder)
        .map((s) => [s.location.lng, s.location.lat] as [number, number]);

      const drawn = truncateLineString(coords, progress);
      if (drawn.length < 2) return null;

      return {
        type: "Feature" as const,
        properties: {
          lotCode: b.lotCode,
          riskLevelNum: riskLevelToNum(b.riskLevel),
        },
        geometry: { type: "LineString" as const, coordinates: drawn },
      };
    }).filter(Boolean);

    drawnRoutesRef.current = { type: "FeatureCollection" as const, features: features as typeof EMPTY_FC["features"] };

    const src = map.getSource("god-view-drawn-routes");
    if (src && "setData" in src) {
      (src as unknown as { setData: (d: unknown) => void }).setData(drawnRoutesRef.current);
    }

    if (allDone) {
      animDoneRef.current = true;
      animRef.current = null;
      return;
    }

    animRef.current = requestAnimationFrame(animateBatch);
  }, [batches]);

  // Restart animation when batches change
  useEffect(() => {
    if (batches.length > 0 && layers.routes && batches.length !== prevBatchCountRef.current) {
      prevBatchCountRef.current = batches.length;
      animDoneRef.current = false;
      animStartRef.current = null;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(animateBatch);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [batches, layers.routes, animateBatch]);

  // ── Fly to target (from alert click) ──
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: 6,
        duration: 2000,
      });
    }
  }, [flyToTarget]);

  // ── Map load: fit bounds + fog ──
  const handleLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Globe fog (starfield)
    map.setFog({
      color: "rgb(15, 15, 25)",
      "high-color": "rgb(35, 45, 75)",
      "horizon-blend": 0.06,
      "star-intensity": 0.12,
      "space-color": "rgb(8, 8, 14)",
    } as Parameters<typeof map.setFog>[0]);

    // Fit to all batch locations
    const bounds = computeBounds(batches);
    if (bounds) {
      map.fitBounds(bounds, { padding: 80, duration: 0 });
    }

    // Start route animation
    if (layers.routes && batches.length > 0) {
      animDoneRef.current = false;
      animStartRef.current = null;
      animRef.current = requestAnimationFrame(animateBatch);
    }
  }, [batches, layers.routes, animateBatch]);

  // ── Click handlers ──
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Check cluster click
      const clusterFeatures = map.queryRenderedFeatures(e.point, {
        layers: ["god-view-clusters"],
      });
      if (clusterFeatures.length > 0) {
        const feature = clusterFeatures[0];
        const clusterId = feature.properties?.cluster_id;
        const src = map.getSource("god-view-batches");
        if (src && "getClusterExpansionZoom" in src && clusterId !== undefined) {
          (src as unknown as { getClusterExpansionZoom: (id: number, cb: (err: unknown, zoom: number) => void) => void })
            .getClusterExpansionZoom(clusterId, (err, zoom) => {
              if (err) return;
              const geom = feature.geometry;
              if (geom.type === "Point") {
                map.easeTo({
                  center: geom.coordinates as [number, number],
                  zoom,
                  duration: 800,
                });
              }
            });
        }
        return;
      }

      // Check unclustered point click
      const pointFeatures = map.queryRenderedFeatures(e.point, {
        layers: ["god-view-unclustered"],
      });
      if (pointFeatures.length > 0) {
        const lotCode = pointFeatures[0].properties?.lotCode;
        if (lotCode) {
          onBatchSelect(lotCode);
          const geom = pointFeatures[0].geometry;
          if (geom.type === "Point") {
            map.easeTo({
              center: geom.coordinates as [number, number],
              zoom: Math.max(map.getZoom(), 5),
              duration: 800,
            });
          }
          return;
        }
      }

      // Click on empty space → deselect
      onBatchSelect(null);
    },
    [onBatchSelect],
  );

  // Cursor management
  const handleMouseEnter = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "pointer";
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "";
  }, []);

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        longitude: 10,
        latitude: 30,
        zoom: 2,
      }}
      style={MAP_STYLE}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      projection={{ name: "globe" }}
      onLoad={handleLoad}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      interactiveLayerIds={["god-view-clusters", "god-view-unclustered"]}
      attributionControl={false}
      logoPosition="bottom-right"
    >
      {/* Route lines (full — shown after animation or if animation off) */}
      {layers.routes && (
        <Source id="god-view-routes" type="geojson" data={animDoneRef.current ? routesData : EMPTY_FC}>
          <Layer {...routeGlowLayer} />
          <Layer {...routeLineLayer} />
        </Source>
      )}

      {/* Drawn route lines (animated) */}
      {layers.routes && (
        <Source id="god-view-drawn-routes" type="geojson" data={EMPTY_FC}>
          <Layer {...drawnRouteGlowLayer} />
          <Layer {...drawnRouteLineLayer} />
        </Source>
      )}

      {/* Batch point clusters */}
      {layers.clusters && (
        <Source
          id="god-view-batches"
          type="geojson"
          data={clusterData}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
          clusterProperties={{
            maxRiskNum: ["max", ["get", "riskLevelNum"]],
          }}
        >
          <Layer {...clusterCircleLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPulseLayer} />
          <Layer {...unclusteredPointLayer} />
        </Source>
      )}
    </Map>
  );
}
