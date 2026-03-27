import type { JourneyStage, LineageTree, PathRole } from "@/lib/types";

type Coord = [number, number]; // [lng, lat] for Mapbox

interface RouteFeature {
  type: "Feature";
  properties: { pathRole: PathRole; lotCode: string };
  geometry: { type: "LineString"; coordinates: Coord[] };
}

interface RouteCollection {
  type: "FeatureCollection";
  features: RouteFeature[];
}

function stageCoords(stages: JourneyStage[]): Coord[] {
  return [...stages]
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((s) => [s.location.lng, s.location.lat]);
}

function makeFeature(
  pathRole: PathRole,
  lotCode: string,
  coordinates: Coord[],
): RouteFeature {
  return {
    type: "Feature",
    properties: { pathRole, lotCode },
    geometry: { type: "LineString", coordinates },
  };
}

/**
 * Build a FeatureCollection with separate LineStrings for parent, main, and child paths.
 * Parent paths extend to the merge point (first main stage).
 * Child paths start from the split point (last main stage).
 */
export function buildLineageGeoJSON(tree: LineageTree): RouteCollection {
  const features: RouteFeature[] = [];
  const mainCoords = stageCoords(tree.main.stages);

  if (mainCoords.length === 0) {
    return { type: "FeatureCollection", features: [] };
  }

  const mergePoint = mainCoords[0];
  const splitPoint = mainCoords[mainCoords.length - 1];

  // Parent paths: their stages → merge point
  for (const parent of tree.parents) {
    const coords = stageCoords(parent.stages);
    if (coords.length === 0) continue;
    // Append merge point so the line connects to the main path
    const extended = [...coords, mergePoint];
    features.push(makeFeature("parent", parent.lotCode, extended));
  }

  // Main path
  if (mainCoords.length >= 2) {
    features.push(makeFeature("main", tree.main.lotCode, mainCoords));
  }

  // Child paths: split point → their stages
  for (const child of tree.children) {
    const coords = stageCoords(child.stages);
    if (coords.length === 0) continue;
    // Prepend split point so the line connects from the main path
    const extended = [splitPoint, ...coords];
    features.push(makeFeature("child", child.lotCode, extended));
  }

  return { type: "FeatureCollection", features };
}

/** Collect all stages from the entire lineage tree for bounds computation. */
export function allLineageStages(tree: LineageTree): JourneyStage[] {
  return [
    ...tree.main.stages,
    ...tree.parents.flatMap((p) => p.stages),
    ...tree.children.flatMap((c) => c.stages),
  ];
}
