"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import type { LineLayerSpecification, CircleLayerSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import type { JourneyStage, LineageTree } from "@/lib/types";
import { buildLineageGeoJSON, allLineageStages } from "@/lib/journey/lineage-geo";
import { getStageIcon } from "./stage-icons";
import { StagePopup } from "./StagePopup";
import { INITIAL_VIEW_STATE, MAP_INTERACTION_CONFIG } from "./journey-map-config";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" } as const;

/* ── Layer styles ───────────────────────────────────────────── */

// Ghost line: faint outline of the full route (visible during animation)
const routeGhostStyle: LineLayerSpecification = {
  id: "route-ghost",
  type: "line",
  filter: ["==", ["get", "pathRole"], "main"],
  paint: {
    "line-color": "#16A34A",
    "line-width": 1,
    "line-opacity": 0.12,
    "line-dasharray": [2, 4],
  },
  source: "route",
};

// Data-driven styles for lineage paths (parent/child)
const routeLineStyle: LineLayerSpecification = {
  id: "route-line",
  type: "line",
  filter: ["!=", ["get", "pathRole"], "main"],
  paint: {
    "line-color": [
      "match", ["get", "pathRole"],
      "parent", "#1A1A1A",
      "child", "#9CA3AF",
      "#16A34A",
    ] as unknown as string,
    "line-width": [
      "match", ["get", "pathRole"],
      "parent", 2,
      "child", 2,
      3,
    ] as unknown as number,
    "line-dasharray": [3, 2],
    "line-opacity": [
      "match", ["get", "pathRole"],
      "parent", 0.6,
      "child", 0.5,
      0.8,
    ] as unknown as number,
  },
  source: "route",
};

// Wide soft glow on the drawn portion
const drawnGlowOuterStyle: LineLayerSpecification = {
  id: "drawn-glow-outer",
  type: "line",
  paint: {
    "line-color": "#16A34A",
    "line-width": 14,
    "line-opacity": 0.08,
    "line-blur": 8,
  },
  source: "drawn-route",
};

// Inner glow on the drawn portion
const drawnGlowStyle: LineLayerSpecification = {
  id: "drawn-glow",
  type: "line",
  paint: {
    "line-color": "#16A34A",
    "line-width": 6,
    "line-opacity": 0.25,
    "line-blur": 3,
  },
  source: "drawn-route",
};

// Solid drawn route line
const drawnLineStyle: LineLayerSpecification = {
  id: "drawn-line",
  type: "line",
  paint: {
    "line-color": "#16A34A",
    "line-width": 2.5,
    "line-opacity": 0.9,
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  source: "drawn-route",
};

// After animation completes, show the full route styled
const routeCompleteGlowStyle: LineLayerSpecification = {
  id: "route-complete-glow",
  type: "line",
  filter: ["==", ["get", "pathRole"], "main"],
  paint: {
    "line-color": "#16A34A",
    "line-width": 8,
    "line-opacity": 0.15,
    "line-blur": 4,
  },
  source: "route",
};

const routeCompleteLineStyle: LineLayerSpecification = {
  id: "route-complete-line",
  type: "line",
  filter: ["==", ["get", "pathRole"], "main"],
  paint: {
    "line-color": "#16A34A",
    "line-width": 2.5,
    "line-dasharray": [4, 3],
    "line-opacity": 0.8,
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  source: "route",
};

// Animated dot: outer halo
const animatedDotHaloStyle: CircleLayerSpecification = {
  id: "animated-dot-halo",
  type: "circle",
  paint: {
    "circle-radius": 14,
    "circle-color": "#16A34A",
    "circle-opacity": 0.2,
    "circle-blur": 1,
  },
  source: "animated-dot",
};

// Animated dot: inner
const animatedDotStyle: CircleLayerSpecification = {
  id: "animated-dot",
  type: "circle",
  paint: {
    "circle-radius": 5,
    "circle-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-stroke-color": "#16A34A",
    "circle-opacity": 1,
  },
  source: "animated-dot",
};

/* ── Helpers ────────────────────────────────────────────────── */

function buildRouteGeoJSON(stages: JourneyStage[]) {
  const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const coordinates: [number, number][] = [];

  for (let i = 0; i < sorted.length; i++) {
    const stage = sorted[i];
    if (stage.routeCoordinates && stage.routeCoordinates.length > 0) {
      coordinates.push(...(stage.routeCoordinates as [number, number][]));
    } else {
      coordinates.push([stage.location.lng, stage.location.lat]);
    }
  }

  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: { pathRole: "main", lotCode: "" },
      geometry: { type: "LineString" as const, coordinates },
    }],
  };
}

function computeBounds(stages: JourneyStage[]): [[number, number], [number, number]] {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;

  for (const stage of stages) {
    const { lng, lat } = stage.location;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return [[minLng, minLat], [maxLng, maxLat]];
}

/** Build a truncated LineString that only shows coordinates up to `progress` (0–1). */
function buildDrawnRouteGeoJSON(
  coords: (number[] | [number, number])[],
  progress: number,
) {
  if (coords.length < 2 || progress <= 0) {
    return {
      type: "FeatureCollection" as const,
      features: [] as { type: "Feature"; properties: Record<string, never>; geometry: { type: "LineString"; coordinates: [number, number][] } }[],
    };
  }

  const totalSegments = coords.length - 1;
  const clamped = Math.min(progress, 1);
  const exactIdx = clamped * totalSegments;
  const idx = Math.floor(exactIdx);
  const segProgress = exactIdx - idx;

  const drawn: [number, number][] = [];
  for (let i = 0; i <= Math.min(idx, coords.length - 1); i++) {
    drawn.push(coords[i] as [number, number]);
  }

  if (idx < totalSegments && segProgress > 0) {
    const start = coords[idx];
    const end = coords[idx + 1];
    drawn.push([
      start[0] + (end[0] - start[0]) * segProgress,
      start[1] + (end[1] - start[1]) * segProgress,
    ]);
  }

  if (drawn.length < 2) {
    return { type: "FeatureCollection" as const, features: [] as never[] };
  }

  return {
    type: "FeatureCollection" as const,
    features: [{
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: drawn },
    }],
  };
}

/* ── Clustering ────────────────────────────────────────────── */

type MarkerStage = JourneyStage & { _pathRole?: string };

/** Pixel distance below which markers are grouped into a cluster. */
const CLUSTER_RADIUS_PX = 40;

interface ClusterGroup {
  /** All stages in this cluster. */
  stages: MarkerStage[];
  /** Representative coordinate (average of group). */
  lng: number;
  lat: number;
}

/**
 * Group markers that overlap on screen at the current zoom.
 * Uses the map's `project()` to get pixel coords, then groups by proximity.
 */
function clusterMarkers(
  stages: MarkerStage[],
  project: (lngLat: [number, number]) => { x: number; y: number },
): ClusterGroup[] {
  if (stages.length === 0) return [];

  const projected = stages.map((s) => ({
    stage: s,
    px: project([s.location.lng, s.location.lat]),
  }));

  const assigned = new Set<number>();
  const groups: ClusterGroup[] = [];

  for (let i = 0; i < projected.length; i++) {
    if (assigned.has(i)) continue;
    assigned.add(i);

    const group: MarkerStage[] = [projected[i].stage];
    let sumLng = projected[i].stage.location.lng;
    let sumLat = projected[i].stage.location.lat;

    for (let j = i + 1; j < projected.length; j++) {
      if (assigned.has(j)) continue;
      const dx = projected[i].px.x - projected[j].px.x;
      const dy = projected[i].px.y - projected[j].px.y;
      if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_RADIUS_PX) {
        assigned.add(j);
        group.push(projected[j].stage);
        sumLng += projected[j].stage.location.lng;
        sumLat += projected[j].stage.location.lat;
      }
    }

    groups.push({
      stages: group,
      lng: sumLng / group.length,
      lat: sumLat / group.length,
    });
  }

  return groups;
}

/* ── Component ──────────────────────────────────────────────── */

const ANIMATION_DURATION = 4000;

export function JourneyMap({
  stages,
  lineageTree,
  selectedStage,
  onStageSelect,
}: {
  stages: JourneyStage[];
  lineageTree?: LineageTree | null;
  selectedStage: JourneyStage | null;
  onStageSelect: (stage: JourneyStage | null) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [clusters, setClusters] = useState<ClusterGroup[]>([]);
  const [flying, setFlying] = useState(false);
  const animationRef = useRef<number | null>(null);
  const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAnimated = useRef(false);
  const interacting = useRef(false);
  const wasPinching = useRef(false);

  const animationDone = animationProgress >= 1;

  // Build the GeoJSON: lineage tree if available, else simple linear route
  const routeGeoJSON = useMemo(() => {
    if (lineageTree) return buildLineageGeoJSON(lineageTree);
    return buildRouteGeoJSON(stages);
  }, [stages, lineageTree]);

  // Extract main path coordinates for animation
  const mainCoords = useMemo(() => {
    const mainFeature = routeGeoJSON.features.find(
      (f) => f.properties.pathRole === "main",
    );
    return mainFeature?.geometry.coordinates ?? [];
  }, [routeGeoJSON]);

  // Progressive line reveal — only the portion drawn so far
  const drawnRouteGeoJSON = useMemo(
    () => buildDrawnRouteGeoJSON(mainCoords, animationProgress),
    [mainCoords, animationProgress],
  );

  // All stages for bounds (including lineage)
  const allStages = useMemo(() => {
    if (lineageTree) return allLineageStages(lineageTree);
    return stages;
  }, [stages, lineageTree]);

  // All stages for markers (tagged with pathRole)
  const markerStages: MarkerStage[] = useMemo(() => {
    if (!lineageTree) return stages;

    const result: MarkerStage[] = [];
    for (const s of lineageTree.main.stages) {
      result.push({ ...s, _pathRole: "main" });
    }
    for (const parent of lineageTree.parents) {
      for (const s of parent.stages) {
        result.push({ ...s, _pathRole: "parent" });
      }
    }
    for (const child of lineageTree.children) {
      for (const s of child.stages) {
        result.push({ ...s, _pathRole: "child" });
      }
    }
    return result;
  }, [stages, lineageTree]);

  const animatedDotGeoJSON = useMemo(() => {
    if (mainCoords.length === 0) {
      return {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: [0, 0] as [number, number] },
      };
    }
    if (mainCoords.length === 1) {
      return {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: mainCoords[0] },
      };
    }

    const totalSegments = mainCoords.length - 1;
    const clampedProgress = Math.max(0, Math.min(animationProgress, 0.9999));
    const idx = Math.floor(clampedProgress * totalSegments);
    const segProgress = clampedProgress * totalSegments - idx;
    const start = mainCoords[idx];
    const end = mainCoords[idx + 1] ?? start;

    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Point" as const,
        coordinates: [
          start[0] + (end[0] - start[0]) * segProgress,
          start[1] + (end[1] - start[1]) * segProgress,
        ],
      },
    };
  }, [mainCoords, animationProgress]);

  const recluster = useCallback(() => {
    const map = mapRef.current;
    if (!map || markerStages.length === 0) return;
    const project = (lngLat: [number, number]) => {
      const p = map.project(lngLat);
      return { x: p.x, y: p.y };
    };
    setClusters(clusterMarkers(markerStages, project));
  }, [markerStages]);

  const startFly = useCallback((durationMs: number) => {
    if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    setFlying(true);
    flyTimerRef.current = setTimeout(() => {
      setFlying(false);
      recluster();
    }, durationMs + 100);
  }, [recluster]);

  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || allStages.length === 0) return;
    startFly(1200);
    const bounds = computeBounds(allStages);
    mapRef.current.fitBounds(bounds, {
      padding: 60,
      duration: 1200,
      pitch: Math.min(35, MAP_INTERACTION_CONFIG.maxPitch),
      bearing: -12,
    });
  }, [allStages]);

  const startAnimation = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      // Ease-out cubic for a smooth deceleration
      const t = Math.min(elapsed / ANIMATION_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimationProgress(eased);

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (flyTimerRef.current) clearTimeout(flyTimerRef.current);
    };
  }, []);

  const prevSelectedRef = useRef<JourneyStage | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedStage) {
      startFly(2000);
      mapRef.current.flyTo({
        center: [selectedStage.location.lng, selectedStage.location.lat],
        zoom: 8,
        duration: 2000,
        pitch: MAP_INTERACTION_CONFIG.maxPitch,
        bearing: -15,
        curve: 1.5,
        essential: true,
      });
    } else if (prevSelectedRef.current) {
      fitMapBounds();
    }

    prevSelectedRef.current = selectedStage;
  }, [selectedStage, fitMapBounds]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);

    // Configure globe atmosphere
    const map = mapRef.current?.getMap();
    if (map) {
      map.setFog({
        color: "rgb(12, 15, 20)",
        "high-color": "rgb(35, 45, 75)",
        "horizon-blend": 0.06,
        "star-intensity": 0.12,
        "space-color": "rgb(8, 8, 14)",
      });
    }

    fitMapBounds();
    startAnimation();
    // Initial cluster after bounds are set
    setTimeout(recluster, 1300);
  }, [fitMapBounds, startAnimation, recluster]);

  const handleMarkerClick = useCallback(
    (stage: JourneyStage) => {
      onStageSelect(stage);
      startFly(800);
      mapRef.current?.flyTo({
        center: [stage.location.lng, stage.location.lat],
        zoom: 6,
        duration: 800,
      });
    },
    [onStageSelect, startFly],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-[#111] text-sm text-muted">
        Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the map
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" style={{ touchAction: "none" }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        projection={{ name: "globe" }}
        initialViewState={INITIAL_VIEW_STATE}
        touchPitch={MAP_INTERACTION_CONFIG.touchPitch}
        maxPitch={MAP_INTERACTION_CONFIG.maxPitch}
        style={MAP_CONTAINER_STYLE}
        onLoad={handleMapLoad}
        onMoveStart={() => { interacting.current = true; }}
        onMoveEnd={() => { setTimeout(() => { interacting.current = false; }, 300); recluster(); }}
        onTouchStart={(e) => {
          if (e.originalEvent.touches.length >= 2) wasPinching.current = true;
        }}
        onTouchEnd={() => { setTimeout(() => { wasPinching.current = false; }, 400); }}
        onClick={() => {
          if (!interacting.current && !wasPinching.current) onStageSelect(null);
        }}
        attributionControl={false}
      >
        {mapLoaded && (
          <>
            {/* Full route source — used for ghost line + final completed line */}
            <Source id="route" type="geojson" data={routeGeoJSON}>
              {/* During animation: faint ghost of the full route */}
              {!animationDone && <Layer {...routeGhostStyle} />}

              {/* Non-main lineage paths (parent/child) always visible */}
              <Layer {...routeLineStyle} />

              {/* After animation: show full main route with glow */}
              {animationDone && (
                <>
                  <Layer {...routeCompleteGlowStyle} />
                  <Layer {...routeCompleteLineStyle} />
                </>
              )}
            </Source>

            {/* Drawn route source — progressively revealed during animation */}
            {!animationDone && (
              <Source id="drawn-route" type="geojson" data={drawnRouteGeoJSON}>
                <Layer {...drawnGlowOuterStyle} />
                <Layer {...drawnGlowStyle} />
                <Layer {...drawnLineStyle} />
              </Source>
            )}

            {/* Animated leading dot with halo */}
            {!animationDone && (
              <Source id="animated-dot" type="geojson" data={animatedDotGeoJSON}>
                <Layer {...animatedDotHaloStyle} />
                <Layer {...animatedDotStyle} />
              </Source>
            )}
          </>
        )}

        {/* Stage markers — always mounted, visibility animated via CSS transitions */}
        {(() => {
          const activeClusters = clusters.length > 0
            ? clusters
            : markerStages.map((s) => ({ stages: [s], lng: s.location.lng, lat: s.location.lat }));

          // Build lookup: stageId → its cluster (only for multi-member clusters)
          const clusterOf = new globalThis.Map<string, ClusterGroup>();
          for (const c of activeClusters) {
            if (c.stages.length > 1) {
              for (const s of c.stages) clusterOf.set(s.stageId, c);
            }
          }

          return (
            <>
              {/* Individual markers — fade/scale in when unclustered */}
              {markerStages.map((stage) => {
                const isClustered = clusterOf.has(stage.stageId);
                const hasAnomaly = stage.anomalies.length > 0;
                const role = stage._pathRole;
                const isSecondary = role === "parent" || role === "child";
                const size = isSecondary ? 24 : 36;
                const markerZ = isClustered ? 0 : isSecondary ? 1 : 2;

                return (
                  <Marker
                    key={stage.stageId}
                    longitude={stage.location.lng}
                    latitude={stage.location.lat}
                    anchor="center"
                    style={{ zIndex: markerZ }}
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      if (!isClustered) handleMarkerClick(stage);
                    }}
                  >
                    <div
                      className="relative cursor-pointer"
                      style={{
                        width: size,
                        height: size,
                        opacity: flying ? 0 : isClustered ? 0 : isSecondary ? 0.7 : 1,
                        transform: flying ? "scale(0.5)" : isClustered ? "scale(0.3)" : "scale(1)",
                        transition: "opacity 250ms ease-out, transform 250ms ease-out",
                        pointerEvents: flying || isClustered ? "none" : "auto",
                      }}
                    >
                      {hasAnomaly && !isSecondary && !isClustered && (
                        <span className="pointer-events-none absolute -inset-3 animate-ping rounded-full bg-red-500 opacity-40" />
                      )}
                      <div className="h-full w-full rounded-full shadow-lg">
                        {getStageIcon(stage.type)}
                      </div>
                    </div>
                  </Marker>
                );
              })}

              {/* Cluster badges — fade/scale in when formed */}
              {activeClusters
                .filter((c) => c.stages.length > 1)
                .map((cluster) => {
                  const topStage = cluster.stages[0];
                  const hasAnyAnomaly = cluster.stages.some((s) => s.anomalies.length > 0);
                  const clusterKey = cluster.stages.map((s) => s.stageId).sort().join(",");

                  return (
                    <Marker
                      key={`cluster-${clusterKey}`}
                      longitude={cluster.lng}
                      latitude={cluster.lat}
                      anchor="center"
                      style={{ zIndex: 3 }}
                      onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        mapRef.current?.flyTo({
                          center: [cluster.lng, cluster.lat],
                          zoom: (mapRef.current.getZoom() ?? 4) + 2.5,
                          duration: 600,
                        });
                      }}
                    >
                      <div
                        className="relative cursor-pointer"
                        style={{
                          width: 40,
                          height: 40,
                          opacity: flying ? 0 : 1,
                          transform: flying ? "scale(0.5)" : "scale(1)",
                          transition: "opacity 250ms ease-out, transform 250ms ease-out",
                          pointerEvents: flying ? "none" : "auto",
                        }}
                      >
                        {hasAnyAnomaly && (
                          <span className="pointer-events-none absolute -inset-3 animate-ping rounded-full bg-red-500 opacity-40" />
                        )}
                        <div className="h-full w-full rounded-full shadow-lg">
                          {getStageIcon(topStage.type)}
                        </div>
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1A1A1A] px-1 text-[10px] font-bold text-white shadow-md">
                          +{cluster.stages.length - 1}
                        </span>
                      </div>
                    </Marker>
                  );
                })}
            </>
          );
        })()}

      </Map>

      {selectedStage && (
        <div className="absolute inset-x-3 bottom-28 z-20">
          <StagePopup stage={selectedStage} onClose={() => onStageSelect(null)} />
        </div>
      )}
    </div>
  );
}
