"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import type { LineLayerSpecification, CircleLayerSpecification } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import type { JourneyStage } from "@/lib/types";
import { getStageIcon, getStageColor } from "./stage-icons";
import { StagePopup } from "./StagePopup";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" } as const;

const routeLineStyle: LineLayerSpecification = {
  id: "route-line",
  type: "line",
  paint: {
    "line-color": "#9eca45",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.8,
  },
  source: "route",
};

const routeGlowStyle: LineLayerSpecification = {
  id: "route-glow",
  type: "line",
  paint: {
    "line-color": "#9eca45",
    "line-width": 8,
    "line-opacity": 0.15,
    "line-blur": 4,
  },
  source: "route",
};

const animatedDotStyle: CircleLayerSpecification = {
  id: "animated-dot",
  type: "circle",
  paint: {
    "circle-radius": 6,
    "circle-color": "#9eca45",
    "circle-opacity": 1,
    "circle-blur": 0.3,
  },
  source: "animated-dot",
};

function buildRouteGeoJSON(stages: JourneyStage[]) {
  const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const coordinates: [number, number][] = [];

  for (const stage of sorted) {
    if (stage.routeCoordinates && stage.routeCoordinates.length > 0) {
      for (const coord of stage.routeCoordinates) {
        coordinates.push([coord[1], coord[0]]);
      }
    } else {
      coordinates.push([stage.location.lng, stage.location.lat]);
    }
  }

  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  };
}

function computeBounds(stages: JourneyStage[]): [[number, number], [number, number]] {
  let minLng = 180,
    maxLng = -180,
    minLat = 90,
    maxLat = -90;

  for (const stage of stages) {
    const { lng, lat } = stage.location;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;

    if (stage.routeCoordinates) {
      for (const [rLat, rLng] of stage.routeCoordinates) {
        if (rLng < minLng) minLng = rLng;
        if (rLng > maxLng) maxLng = rLng;
        if (rLat < minLat) minLat = rLat;
        if (rLat > maxLat) maxLat = rLat;
      }
    }
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function JourneyMap({
  stages,
  selectedStage,
  onStageSelect,
}: {
  stages: JourneyStage[];
  selectedStage: JourneyStage | null;
  onStageSelect: (stage: JourneyStage | null) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const hasAnimated = useRef(false);
  const interacting = useRef(false);
  const wasPinching = useRef(false);

  const routeGeoJSON = useMemo(() => buildRouteGeoJSON(stages), [stages]);

  const animatedDotGeoJSON = useMemo(() => {
    const coords = routeGeoJSON.geometry.coordinates;
    if (coords.length === 0) {
      return {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: [0, 0] as [number, number] },
      };
    }
    if (coords.length === 1) {
      return {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: coords[0] },
      };
    }

    const totalSegments = coords.length - 1;
    const clampedProgress = Math.max(0, Math.min(animationProgress, 0.9999));
    const idx = Math.floor(clampedProgress * totalSegments);
    const segProgress = clampedProgress * totalSegments - idx;
    const start = coords[idx];
    const end = coords[idx + 1] ?? start;

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
  }, [routeGeoJSON, animationProgress]);

  const fitMapBounds = useCallback(() => {
    if (!mapRef.current || stages.length === 0) return;
    const bounds = computeBounds(stages);
    mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
  }, [stages]);

  const startAnimation = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 3000;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Cinematic fly to selected stage (e.g. when tapped from timeline)
  useEffect(() => {
    if (!selectedStage || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [selectedStage.location.lng, selectedStage.location.lat],
      zoom: 8,
      duration: 2000,
      pitch: 45,
      bearing: -15,
      curve: 1.5,
      essential: true,
    });
  }, [selectedStage]);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    fitMapBounds();
    startAnimation();
  }, [fitMapBounds, startAnimation]);

  const handleMarkerClick = useCallback(
    (stage: JourneyStage) => {
      onStageSelect(stage);
      mapRef.current?.flyTo({
        center: [stage.location.lng, stage.location.lat],
        zoom: 6,
        duration: 800,
      });
    },
    [onStageSelect],
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
        initialViewState={{ longitude: 10, latitude: 30, zoom: 2 }}
        style={MAP_CONTAINER_STYLE}
        onLoad={handleMapLoad}
        onMoveStart={() => { interacting.current = true; }}
        onMoveEnd={() => { setTimeout(() => { interacting.current = false; }, 300); }}
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
            <Source id="route" type="geojson" data={routeGeoJSON}>
              <Layer {...routeGlowStyle} />
              <Layer {...routeLineStyle} />
            </Source>

            {animationProgress < 1 && (
              <Source id="animated-dot" type="geojson" data={animatedDotGeoJSON}>
                <Layer {...animatedDotStyle} />
              </Source>
            )}
          </>
        )}

        {stages.map((stage) => {
          const hasAnomaly = stage.anomalies.length > 0;

          return (
            <Marker
              key={stage.stageId}
              longitude={stage.location.lng}
              latitude={stage.location.lat}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(stage);
              }}
            >
              <div
                className="relative cursor-pointer"
                style={{ width: 32, height: 32 }}
              >
                {hasAnomaly && (
                  <span className="pointer-events-none absolute -inset-3 animate-ping rounded-full bg-red-500 opacity-40" />
                )}
                <div
                  className={`h-full w-full rounded-full ring-2 ${hasAnomaly ? "ring-red-500" : "ring-white/40"}`}
                >
                  {getStageIcon(stage.type)}
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedStage && (
          <Popup
            longitude={selectedStage.location.lng}
            latitude={selectedStage.location.lat}
            anchor="bottom"
            onClose={() => onStageSelect(null)}
            closeOnClick={false}
            maxWidth="300px"
          >
            <StagePopup stage={selectedStage} />
          </Popup>
        )}
      </Map>
    </div>
  );
}
