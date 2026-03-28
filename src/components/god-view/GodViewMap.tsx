"use client";

import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import MapGL, { Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import type { GodViewBatch, GodViewLineageEdge } from "@/lib/types";
import { SupplyChainTooltip, type TooltipData } from "./SupplyChainTooltip";
import {
  riskLevelToNum,
  severityToSegmentNum,
  clusterCircleLayer,
  clusterCountLayer,
  unclusteredPointLayer,
  unclusteredPulseLayer,
  routeGlowLayer,
  routeLineLayer,
  drawnRouteGlowLayer,
  drawnRouteLineLayer,
  stageNodeHaloLayer,
  lineageGlowLayer,
  lineageLineLayer,
  flowParticleGlowLayer,
  flowParticleLayer,
} from "./god-view-map-layers";
import {
  registerStageIcons,
  STAGE_ICON_EXPRESSION,
} from "./god-view-stage-icons";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const MAP_STYLE = { width: "100%", height: "100%" } as const;

// Route animation timing
const ANIMATION_DURATION = 4000;
const STAGGER_DELAY = 300;

// Flow particle animation
const FLOW_CYCLE_MS = 3000; // time for one particle to traverse a full route
const PARTICLES_PER_SEGMENT = 3;

// Idle rotation
const IDLE_RESUME_DELAY = 5000;
const ROTATION_SPEED = 0.01; // degrees longitude per frame
const ROTATION_ZOOM_THRESHOLD = 3; // stop rotating when zoomed past this

export interface GodViewLayers {
  routes: boolean;
  clusters: boolean;
}

interface GodViewMapProps {
  batches: GodViewBatch[];
  lineageEdges: GodViewLineageEdge[];
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

/** Build deduplicated points for every stage location with anomaly severity. */
function buildStageNodesGeoJSON(batches: GodViewBatch[]) {
  // Track the highest severity seen at each location so anomaly nodes aren't hidden.
  const seen: Record<string, number> = {};
  const features: {
    type: "Feature";
    properties: { name: string; stageType: string; severityNum: number };
    geometry: { type: "Point"; coordinates: [number, number] };
  }[] = [];

  for (const b of batches) {
    for (const s of b.stages) {
      const key = `${Math.round(s.location.lng * 10)}:${Math.round(s.location.lat * 10)}`;
      const sevNum = severityToSegmentNum(s.maxSeverity);
      const existing = seen[key] ?? -1;
      if (sevNum <= existing) continue;
      // Replace lower-severity entry if upgrading
      if (existing >= 0) {
        const idx = features.findIndex(
          (f) => f.geometry.coordinates[0] === s.location.lng && f.geometry.coordinates[1] === s.location.lat,
        );
        if (idx >= 0) features.splice(idx, 1);
      }
      seen[key] = sevNum;
      features.push({
        type: "Feature",
        properties: { name: s.location.name, stageType: s.type, severityNum: sevNum },
        geometry: {
          type: "Point",
          coordinates: [s.location.lng, s.location.lat],
        },
      });
    }
  }

  return { type: "FeatureCollection" as const, features };
}

/** Build one LineString feature per consecutive stage pair, colored by the preceding stage's anomaly severity. */
function buildRoutesGeoJSON(batches: GodViewBatch[]) {
  const features: {
    type: "Feature";
    properties: { lotCode: string; segmentSeverity: number; batchIdx: number; segIdx: number };
    geometry: { type: "LineString"; coordinates: [number, number][] };
  }[] = [];

  for (let bi = 0; bi < batches.length; bi++) {
    const b = batches[bi];
    if (b.stages.length < 2) continue;
    const sorted = [...b.stages].sort((a, z) => a.sequenceOrder - z.sequenceOrder);

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      features.push({
        type: "Feature",
        properties: {
          lotCode: b.lotCode,
          segmentSeverity: severityToSegmentNum(from.maxSeverity),
          batchIdx: bi,
          segIdx: i,
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [from.location.lng, from.location.lat],
            [to.location.lng, to.location.lat],
          ],
        },
      });
    }
  }

  return { type: "FeatureCollection" as const, features };
}

/**
 * Build LineString connectors for lineage edges (merge/split).
 * Draws a line from the parent batch's last stage to the child batch's first stage.
 */
function buildLineageConnectorsGeoJSON(
  batches: GodViewBatch[],
  edges: GodViewLineageEdge[],
) {
  const batchByLot = new Map(batches.map((b) => [b.lotCode, b]));

  const features = edges
    .map((edge) => {
      const parentBatch = batchByLot.get(edge.parentLotCode);
      const childBatch = batchByLot.get(edge.childLotCode);
      if (!parentBatch || !childBatch) return null;

      const parentStages = [...parentBatch.stages].sort(
        (a, z) => a.sequenceOrder - z.sequenceOrder,
      );
      const childStages = [...childBatch.stages].sort(
        (a, z) => a.sequenceOrder - z.sequenceOrder,
      );
      if (parentStages.length === 0 || childStages.length === 0) return null;

      const from = parentStages[parentStages.length - 1].location;
      const to = childStages[0].location;

      // Skip zero-length connectors (same location)
      if (
        Math.abs(from.lng - to.lng) < 0.001 &&
        Math.abs(from.lat - to.lat) < 0.001
      )
        return null;

      return {
        type: "Feature" as const,
        properties: {
          relationship: edge.relationship,
          parentLotCode: edge.parentLotCode,
          childLotCode: edge.childLotCode,
          segmentSeverity: 0,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [from.lng, from.lat] as [number, number],
            [to.lng, to.lat] as [number, number],
          ],
        },
      };
    })
    .filter(
      (f): f is NonNullable<typeof f> => f !== null,
    );

  return { type: "FeatureCollection" as const, features };
}

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] as never[] };

/* ── Component ─────────────────────────────────────────────── */

export function GodViewMap({
  batches,
  lineageEdges,
  selectedBatchLotCode,
  onBatchSelect,
  layers,
  flyToTarget,
}: GodViewMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Route animation refs
  const animRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const animDoneRef = useRef(false);
  const prevBatchKeyRef = useRef("");
  const drawnRoutesRef = useRef(EMPTY_FC);
  const initialAnimPlayedRef = useRef(false);

  // Flow particle animation ref
  const flowAnimRef = useRef<number | null>(null);

  // Idle rotation refs
  const idleRotationRef = useRef<number | null>(null);
  const idleResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hover tooltip state ──
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // ── Filtered batches for supply chain isolation ──
  // When a batch is selected, show all batches in the same chain group
  // (connected via lineage merge/split relationships).
  const selectedChainGroup = useMemo(() => {
    if (!selectedBatchLotCode) return null;
    return batches.find((b) => b.lotCode === selectedBatchLotCode)?.chainGroup ?? null;
  }, [batches, selectedBatchLotCode]);

  const visibleBatches = useMemo(() => {
    if (!selectedChainGroup) return batches;
    return batches.filter((b) => b.chainGroup === selectedChainGroup);
  }, [batches, selectedChainGroup]);

  // ── Filter lineage edges to visible batches ──
  const visibleEdges = useMemo(() => {
    const lotCodes = new Set(visibleBatches.map((b) => b.lotCode));
    return lineageEdges.filter(
      (e) => lotCodes.has(e.parentLotCode) && lotCodes.has(e.childLotCode),
    );
  }, [visibleBatches, lineageEdges]);

  // ── GeoJSON sources ──
  const clusterData = useMemo(() => buildClusterGeoJSON(visibleBatches), [visibleBatches]);
  const stageNodesData = useMemo(() => buildStageNodesGeoJSON(visibleBatches), [visibleBatches]);
  const routesData = useMemo(() => buildRoutesGeoJSON(visibleBatches), [visibleBatches]);
  const lineageData = useMemo(
    () => buildLineageConnectorsGeoJSON(visibleBatches, visibleEdges),
    [visibleBatches, visibleEdges],
  );

  // ── Idle rotation ──
  // Instead of checking a flag every frame, we fully stop the rAF loop on
  // interaction and restart it after an idle delay. This avoids setCenter
  // calls fighting with the user's drag/zoom gestures.
  const tickIdleRotation = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      idleRotationRef.current = null;
      return;
    }

    if (map.getZoom() < ROTATION_ZOOM_THRESHOLD) {
      const center = map.getCenter();
      map.setCenter([center.lng + ROTATION_SPEED, center.lat]);
    }

    idleRotationRef.current = requestAnimationFrame(tickIdleRotation);
  }, []);

  const startIdleRotation = useCallback(() => {
    if (idleRotationRef.current) return;
    idleRotationRef.current = requestAnimationFrame(tickIdleRotation);
  }, [tickIdleRotation]);

  const stopIdleRotation = useCallback(() => {
    if (idleRotationRef.current) {
      cancelAnimationFrame(idleRotationRef.current);
      idleRotationRef.current = null;
    }
  }, []);

  const handleInteractionStart = useCallback(() => {
    stopIdleRotation();
    if (idleResumeTimerRef.current) {
      clearTimeout(idleResumeTimerRef.current);
      idleResumeTimerRef.current = null;
    }
  }, [stopIdleRotation]);

  const handleInteractionEnd = useCallback(() => {
    if (idleResumeTimerRef.current) clearTimeout(idleResumeTimerRef.current);
    idleResumeTimerRef.current = setTimeout(() => {
      startIdleRotation();
    }, IDLE_RESUME_DELAY);
  }, [startIdleRotation]);

  // ── Precompute lineage connector endpoints for particle animation ──
  const lineageConnectors = useMemo(() => {
    const batchByLot = new Map(visibleBatches.map((b) => [b.lotCode, b]));
    return visibleEdges
      .map((edge) => {
        const parentBatch = batchByLot.get(edge.parentLotCode);
        const childBatch = batchByLot.get(edge.childLotCode);
        if (!parentBatch || !childBatch) return null;

        const parentStages = [...parentBatch.stages].sort((a, z) => a.sequenceOrder - z.sequenceOrder);
        const childStages = [...childBatch.stages].sort((a, z) => a.sequenceOrder - z.sequenceOrder);
        if (parentStages.length === 0 || childStages.length === 0) return null;

        const from = parentStages[parentStages.length - 1].location;
        const to = childStages[0].location;

        if (Math.abs(from.lng - to.lng) < 0.001 && Math.abs(from.lat - to.lat) < 0.001) return null;

        return { fromLng: from.lng, fromLat: from.lat, toLng: to.lng, toLat: to.lat };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [visibleBatches, visibleEdges]);

  // ── Flow particle animation (shows direction when chain is focused) ──
  const tickFlowParticles = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) { flowAnimRef.current = null; return; }

    const now = performance.now();
    const features: GeoJSON.Feature[] = [];

    // Particles along each batch's own stages
    for (const b of visibleBatches) {
      if (b.stages.length < 2) continue;
      const sorted = [...b.stages].sort((a, z) => a.sequenceOrder - z.sequenceOrder);
      const segCount = sorted.length - 1;
      const totalDuration = FLOW_CYCLE_MS * segCount;

      for (let p = 0; p < PARTICLES_PER_SEGMENT; p++) {
        const offset = p / PARTICLES_PER_SEGMENT;
        const t = ((now / totalDuration) + offset) % 1;
        const pos = t * segCount;
        const segIdx = Math.min(Math.floor(pos), segCount - 1);
        const localT = pos - segIdx;

        const from = sorted[segIdx];
        const to = sorted[segIdx + 1];
        const lng = from.location.lng + (to.location.lng - from.location.lng) * localT;
        const lat = from.location.lat + (to.location.lat - from.location.lat) * localT;

        features.push({
          type: "Feature",
          properties: { segmentSeverity: severityToSegmentNum(from.maxSeverity) },
          geometry: { type: "Point", coordinates: [lng, lat] },
        });
      }
    }

    // Particles along lineage connectors (merge/split links between batches)
    for (const conn of lineageConnectors) {
      const t = ((now / FLOW_CYCLE_MS) + 0) % 1;
      for (let p = 0; p < 2; p++) {
        const offset = p / 2;
        const progress = (t + offset) % 1;
        const lng = conn.fromLng + (conn.toLng - conn.fromLng) * progress;
        const lat = conn.fromLat + (conn.toLat - conn.fromLat) * progress;

        features.push({
          type: "Feature",
          properties: { segmentSeverity: 0 },
          geometry: { type: "Point", coordinates: [lng, lat] },
        });
      }
    }

    const src = map.getSource("god-view-flow-particles");
    if (src && "setData" in src) {
      (src as unknown as { setData: (d: unknown) => void }).setData({
        type: "FeatureCollection",
        features,
      });
    }

    flowAnimRef.current = requestAnimationFrame(tickFlowParticles);
  }, [visibleBatches, lineageConnectors]);

  const startFlowAnimation = useCallback(() => {
    if (flowAnimRef.current) return;
    flowAnimRef.current = requestAnimationFrame(tickFlowParticles);
  }, [tickFlowParticles]);

  const stopFlowAnimation = useCallback(() => {
    if (flowAnimRef.current) {
      cancelAnimationFrame(flowAnimRef.current);
      flowAnimRef.current = null;
    }
    const map = mapRef.current?.getMap();
    if (map) {
      const src = map.getSource("god-view-flow-particles");
      if (src && "setData" in src) {
        (src as unknown as { setData: (d: unknown) => void }).setData(EMPTY_FC);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedBatchLotCode && visibleBatches.length > 0 && layers.routes) {
      startFlowAnimation();
    } else {
      stopFlowAnimation();
    }
    return () => stopFlowAnimation();
  }, [selectedBatchLotCode, visibleBatches, layers.routes, startFlowAnimation, stopFlowAnimation]);

  // ── Start normal route animation ──
  const startRouteAnimation = useCallback(() => {
    if (!layers.routes || visibleBatches.length === 0) return;
    animDoneRef.current = false;
    animStartRef.current = null;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animateBatch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleBatches, layers.routes]);

  // ── Animate route drawing (per-segment) ──
  const animateBatch = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || animDoneRef.current) return;

    const now = performance.now();
    if (animStartRef.current === null) animStartRef.current = now;
    const elapsed = now - animStartRef.current;

    let allDone = true;
    const features: GeoJSON.Feature[] = [];

    for (let bi = 0; bi < visibleBatches.length; bi++) {
      const b = visibleBatches[bi];
      if (b.stages.length < 2) continue;
      const sorted = [...b.stages].sort((a, z) => a.sequenceOrder - z.sequenceOrder);

      const batchStart = bi * STAGGER_DELAY;
      const batchElapsed = elapsed - batchStart;
      // Each segment gets an equal share of the total animation duration
      const segCount = sorted.length - 1;
      const segDuration = ANIMATION_DURATION / segCount;

      for (let si = 0; si < segCount; si++) {
        const segElapsed = batchElapsed - si * segDuration;
        const progress = Math.max(0, Math.min(1, segElapsed / segDuration));
        if (progress <= 0) { allDone = false; continue; }
        if (progress < 1) allDone = false;

        const from = sorted[si];
        const to = sorted[si + 1];
        const x0 = from.location.lng, y0 = from.location.lat;
        const x1 = to.location.lng, y1 = to.location.lat;
        const endLng = x0 + (x1 - x0) * progress;
        const endLat = y0 + (y1 - y0) * progress;

        features.push({
          type: "Feature",
          properties: {
            lotCode: b.lotCode,
            segmentSeverity: severityToSegmentNum(from.maxSeverity),
          },
          geometry: {
            type: "LineString",
            coordinates: [[x0, y0], [endLng, endLat]],
          },
        });
      }
    }

    drawnRoutesRef.current = { type: "FeatureCollection" as const, features: features as typeof EMPTY_FC["features"] };

    const src = map.getSource("god-view-drawn-routes");
    if (src && "setData" in src) {
      (src as unknown as { setData: (d: unknown) => void }).setData(drawnRoutesRef.current);
    }

    if (allDone) {
      animDoneRef.current = true;
      initialAnimPlayedRef.current = true;
      animRef.current = null;
      startIdleRotation();
      return;
    }

    animRef.current = requestAnimationFrame(animateBatch);
  }, [visibleBatches, startIdleRotation]);

  // On selection change (scoping in/out), skip animation and show final routes.
  // The draw-in animation only plays on initial page load (handleLoad).
  useEffect(() => {
    if (visibleBatches.length > 0 && layers.routes && initialAnimPlayedRef.current) {
      // After initial animation, any batch change just shows routes instantly
      animDoneRef.current = true;
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
        animRef.current = null;
      }
      // Clear the drawn-routes source so only the static routes show
      const map = mapRef.current?.getMap();
      if (map) {
        const src = map.getSource("god-view-drawn-routes");
        if (src && "setData" in src) {
          (src as unknown as { setData: (d: unknown) => void }).setData(EMPTY_FC);
        }
      }
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [visibleBatches, selectedBatchLotCode, layers.routes]);

  // ── Fly to target (from alert click) ──
  useEffect(() => {
    if (flyToTarget && mapRef.current) {
      handleInteractionStart();
      mapRef.current.flyTo({
        center: [flyToTarget.lng, flyToTarget.lat],
        zoom: 6,
        duration: 2000,
      });
      const timer = setTimeout(() => handleInteractionEnd(), 2500);
      return () => clearTimeout(timer);
    }
  }, [flyToTarget, handleInteractionStart, handleInteractionEnd]);

  // ── Map load ──
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

    // Register stage icons for the symbol layer.
    // Suppress "image not found" warnings for our icons during the async load.
    map.on("styleimagemissing", (e: { id: string }) => {
      if (e.id.startsWith("stage-")) {
        // Icon is loading — Mapbox will pick it up once addImage completes
      }
    });
    registerStageIcons(map).catch(() => {
      // Icons failed to load — stage nodes will just be invisible
    });

    // Attach interaction listeners directly on the Mapbox GL instance.
    // react-map-gl's onDragStart/onZoomStart props can miss events when
    // setCenter() is called every frame (idle rotation), because the
    // continuous programmatic moves confuse its internal gesture detection.
    const canvas = map.getCanvas();
    const onDown = () => handleInteractionStart();
    const onUp = () => handleInteractionEnd();
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    canvas.addEventListener("wheel", () => {
      handleInteractionStart();
      handleInteractionEnd();
    }, { passive: true });
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchend", onUp);

    // Start route animation — idle rotation begins after animation completes
    startRouteAnimation();

    // If no routes to animate, start idle rotation now
    if (visibleBatches.length === 0 || !layers.routes) {
      startIdleRotation();
    }
  }, [startRouteAnimation, startIdleRotation, handleInteractionStart, handleInteractionEnd, visibleBatches.length, layers.routes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleRotationRef.current) cancelAnimationFrame(idleRotationRef.current);
      if (idleResumeTimerRef.current) clearTimeout(idleResumeTimerRef.current);
      if (flowAnimRef.current) cancelAnimationFrame(flowAnimRef.current);
    };
  }, []);

  // ── Click handlers ──
  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Check cluster click
      const clusterLayers = ["god-view-clusters"].filter((id) => map.getLayer(id));
      const clusterFeatures = clusterLayers.length > 0
        ? map.queryRenderedFeatures(e.point, { layers: clusterLayers })
        : [];
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
                handleInteractionStart();
                map.easeTo({
                  center: geom.coordinates as [number, number],
                  zoom,
                  duration: 800,
                });
                setTimeout(() => handleInteractionEnd(), 1200);
              }
            });
        }
        return;
      }

      // Check route line click
      const routeLayers = [
        "god-view-route-line",
        "god-view-drawn-line",
        "god-view-route-glow",
        "god-view-drawn-glow",
      ].filter((id) => map.getLayer(id));
      if (routeLayers.length > 0) {
        const routeFeatures = map.queryRenderedFeatures(e.point, {
          layers: routeLayers,
        });
        if (routeFeatures.length > 0) {
          const lotCode = routeFeatures[0].properties?.lotCode;
          if (lotCode) {
            onBatchSelect(lotCode);
            return;
          }
        }
      }

      // Check unclustered point click
      const unclusteredClickLayers = ["god-view-unclustered"].filter((id) => map.getLayer(id));
      const pointFeatures = unclusteredClickLayers.length > 0
        ? map.queryRenderedFeatures(e.point, { layers: unclusteredClickLayers })
        : [];
      if (pointFeatures.length > 0) {
        const lotCode = pointFeatures[0].properties?.lotCode;
        if (lotCode) {
          onBatchSelect(lotCode);
          const geom = pointFeatures[0].geometry;
          if (geom.type === "Point") {
            handleInteractionStart();
            map.easeTo({
              center: geom.coordinates as [number, number],
              zoom: Math.max(map.getZoom(), 5),
              duration: 800,
            });
            setTimeout(() => handleInteractionEnd(), 1200);
          }
          return;
        }
      }

      // Click on empty space → deselect
      onBatchSelect(null);
    },
    [onBatchSelect, handleInteractionStart, handleInteractionEnd],
  );

  // Cursor management
  const handleMouseEnter = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "pointer";
  }, []);

  const handleMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map) map.getCanvas().style.cursor = "";
    setTooltip(null);
  }, []);

  // ── Hover tooltip ──
  const handleMouseMove = useCallback(
    (e: MapMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      // Check stage nodes first (smallest targets)
      const stageFeatures = map.queryRenderedFeatures(e.point, {
        layers: ["god-view-stage-nodes-icon", "god-view-stage-halo"].filter(
          (id) => map.getLayer(id),
        ),
      });
      if (stageFeatures.length > 0) {
        const props = stageFeatures[0].properties ?? {};
        setTooltip({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, type: "stage", properties: props });
        map.getCanvas().style.cursor = "pointer";
        return;
      }

      // Check batch points
      const unclusteredHoverLayers = ["god-view-unclustered"].filter((id) => map.getLayer(id));
      const pointFeatures = unclusteredHoverLayers.length > 0
        ? map.queryRenderedFeatures(e.point, { layers: unclusteredHoverLayers })
        : [];
      if (pointFeatures.length > 0) {
        const props = pointFeatures[0].properties ?? {};
        setTooltip({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, type: "batch", properties: props });
        map.getCanvas().style.cursor = "pointer";
        return;
      }

      // Check route lines
      const routeLayers = [
        "god-view-route-line",
        "god-view-drawn-line",
        "god-view-route-glow",
        "god-view-drawn-glow",
      ].filter((id) => map.getLayer(id));
      if (routeLayers.length > 0) {
        const routeFeatures = map.queryRenderedFeatures(e.point, { layers: routeLayers });
        if (routeFeatures.length > 0) {
          const props = routeFeatures[0].properties ?? {};
          setTooltip({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, type: "route", properties: props });
          map.getCanvas().style.cursor = "pointer";
          return;
        }
      }

      // Nothing hovered
      setTooltip(null);
      map.getCanvas().style.cursor = "";
    },
    [],
  );

  return (
    <>
    <MapGL
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        longitude: 20,
        latitude: 20,
        zoom: 2.2,
        pitch: 0,
        bearing: 0,
      }}
      style={MAP_STYLE}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      projection={{ name: "globe" }}
      onLoad={handleLoad}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      interactiveLayerIds={[
        "god-view-clusters",
        "god-view-unclustered",
        "god-view-route-line",
        "god-view-drawn-line",
      ]}
      dragRotate={true}
      touchPitch={false}
      pitchWithRotate={false}
      attributionControl={false}
      logoPosition="bottom-right"
    >
      {/* Route lines (full — shown after animation completes) */}
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

      {/* Lineage connectors (merge/split links between batches) */}
      {layers.routes && (
        <Source id="god-view-lineage" type="geojson" data={lineageData}>
          <Layer {...lineageGlowLayer} />
          <Layer {...lineageLineLayer} />
        </Source>
      )}

      {/* Flow particles — animated dots showing supply chain direction */}
      {layers.routes && (
        <Source id="god-view-flow-particles" type="geojson" data={EMPTY_FC}>
          <Layer {...flowParticleGlowLayer} />
          <Layer {...flowParticleLayer} />
        </Source>
      )}

      {/* Stage nodes — icon markers with anomaly halos */}
      {layers.routes && (
        <Source id="god-view-stage-nodes" type="geojson" data={stageNodesData}>
          <Layer {...stageNodeHaloLayer} />
          <Layer
            id="god-view-stage-nodes-icon"
            type="symbol"
            source="god-view-stage-nodes"
            layout={{
              "icon-image": STAGE_ICON_EXPRESSION as string,
              "icon-size": 0.6,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            }}
            paint={{
              "icon-opacity": 0.85,
            }}
          />
        </Source>
      )}

      {/* Batch point clusters */}
      {layers.clusters && (
        <Source
          id="god-view-batches"
          type="geojson"
          data={clusterData}
          cluster={!selectedBatchLotCode}
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
    </MapGL>

    <SupplyChainTooltip data={tooltip} />
    </>
  );
}
