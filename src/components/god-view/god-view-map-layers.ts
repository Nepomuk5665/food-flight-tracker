import type {
  CircleLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "mapbox-gl";

// ---------------------------------------------------------------------------
// Risk level color mapping
// ---------------------------------------------------------------------------

export const RISK_COLORS = {
  safe: "#9eca45",
  warning: "#f5a623",
  critical: "#e74c3c",
} as const;

// Numeric encoding for Mapbox expressions: safe=0, warning=1, critical=2
export function riskLevelToNum(level: string): number {
  if (level === "warning") return 1;
  if (level === "critical") return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// Cluster layers
// ---------------------------------------------------------------------------

export const clusterCircleLayer: CircleLayerSpecification = {
  id: "god-view-clusters",
  type: "circle",
  source: "god-view-batches",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "maxRiskNum"],
      RISK_COLORS.safe,
      1, RISK_COLORS.warning,
      2, RISK_COLORS.critical,
    ] as unknown as string,
    "circle-radius": [
      "step",
      ["get", "point_count"],
      18,   // default
      5, 24,
      10, 30,
      25, 36,
    ] as unknown as number,
    "circle-opacity": 0.85,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.15)",
  },
};

export const clusterCountLayer: SymbolLayerSpecification = {
  id: "god-view-cluster-count",
  type: "symbol",
  source: "god-view-batches",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 13,
    "text-allow-overlap": true,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

// ---------------------------------------------------------------------------
// Unclustered point layers
// ---------------------------------------------------------------------------

export const unclusteredPointLayer: CircleLayerSpecification = {
  id: "god-view-unclustered",
  type: "circle",
  source: "god-view-batches",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": [
      "step",
      ["get", "riskLevelNum"],
      RISK_COLORS.safe,
      1, RISK_COLORS.warning,
      2, RISK_COLORS.critical,
    ] as unknown as string,
    "circle-radius": 8,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.3)",
  },
};

export const unclusteredPulseLayer: CircleLayerSpecification = {
  id: "god-view-unclustered-pulse",
  type: "circle",
  source: "god-view-batches",
  filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "riskLevelNum"], 2]],
  paint: {
    "circle-radius": 16,
    "circle-color": RISK_COLORS.critical,
    "circle-opacity": 0.25,
    "circle-blur": 1,
  },
};

// ---------------------------------------------------------------------------
// Route layers
// ---------------------------------------------------------------------------

export const routeGlowLayer: LineLayerSpecification = {
  id: "god-view-route-glow",
  type: "line",
  source: "god-view-routes",
  paint: {
    "line-color": [
      "step",
      ["get", "riskLevelNum"],
      RISK_COLORS.safe,
      1, RISK_COLORS.warning,
      2, RISK_COLORS.critical,
    ] as unknown as string,
    "line-width": 6,
    "line-opacity": 0.12,
    "line-blur": 4,
  },
};

export const routeLineLayer: LineLayerSpecification = {
  id: "god-view-route-line",
  type: "line",
  source: "god-view-routes",
  paint: {
    "line-color": [
      "step",
      ["get", "riskLevelNum"],
      RISK_COLORS.safe,
      1, RISK_COLORS.warning,
      2, RISK_COLORS.critical,
    ] as unknown as string,
    "line-width": 2,
    "line-opacity": 0.7,
    "line-dasharray": [4, 3],
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
};

// Drawn (animated) route layers
export const drawnRouteGlowLayer: LineLayerSpecification = {
  id: "god-view-drawn-glow",
  type: "line",
  source: "god-view-drawn-routes",
  paint: {
    "line-color": [
      "step",
      ["get", "riskLevelNum"],
      RISK_COLORS.safe,
      1, RISK_COLORS.warning,
      2, RISK_COLORS.critical,
    ] as unknown as string,
    "line-width": 8,
    "line-opacity": 0.2,
    "line-blur": 4,
  },
};

export const drawnRouteLineLayer: LineLayerSpecification = {
  id: "god-view-drawn-line",
  type: "line",
  source: "god-view-drawn-routes",
  paint: {
    "line-color": [
      "step",
      ["get", "riskLevelNum"],
      RISK_COLORS.safe,
      1, RISK_COLORS.warning,
      2, RISK_COLORS.critical,
    ] as unknown as string,
    "line-width": 2.5,
    "line-opacity": 0.9,
  },
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
};
