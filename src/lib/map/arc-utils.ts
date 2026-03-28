import type { GodViewBatch } from "@/lib/types";

// ---------------------------------------------------------------------------
// Great-circle arc generation for cinematic globe visualization
// ---------------------------------------------------------------------------

interface LatLng {
  lat: number;
  lng: number;
}

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Haversine distance in km between two points. */
function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * sinLng * sinLng;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Convert lat/lng to unit-sphere cartesian. */
function toCartesian(p: LatLng): [number, number, number] {
  const la = p.lat * DEG;
  const lo = p.lng * DEG;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

/** Convert unit-sphere cartesian back to lat/lng. */
function toLatLng(x: number, y: number, z: number): LatLng {
  const len = Math.sqrt(x * x + y * y + z * z);
  return {
    lat: Math.asin(z / len) * RAD,
    lng: Math.atan2(y, x) * RAD,
  };
}

/** Cross product of two 3-vectors. */
function cross(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Normalize a 3-vector in place. */
function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len === 0) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Generate a high-arched curve between two points on a globe.
 *
 * The arc is created by:
 * 1. Finding the great-circle midpoint
 * 2. Offsetting it perpendicular to the great circle (away from Earth center)
 * 3. Interpolating a smooth quadratic bezier through [start, offsetMid, end]
 *
 * Returns [lng, lat] pairs (Mapbox coordinate order).
 */
export function generateArc(
  start: LatLng,
  end: LatLng,
  numPoints = 40,
  arcHeightFactor = 0.5,
): [number, number][] {
  const dist = haversineKm(start, end);

  // For very short distances, just return a straight line
  if (dist < 50) {
    return [
      [start.lng, start.lat],
      [end.lng, end.lat],
    ];
  }

  // Scale arc height by distance: longer = taller, dramatic arcs
  // At 10,000km the arc peaks ~40% of the globe radius above the great circle
  const heightScale = Math.min(arcHeightFactor * (dist / 3000), 0.8);

  const A = toCartesian(start);
  const B = toCartesian(end);

  // Great-circle midpoint (on the surface)
  const mid: [number, number, number] = [
    (A[0] + B[0]) / 2,
    (A[1] + B[1]) / 2,
    (A[2] + B[2]) / 2,
  ];
  const midNorm = normalize(mid);

  // Perpendicular offset: push midpoint away from Earth center
  // This creates the "high arch" effect by inflating the midpoint outward
  const offsetMid: [number, number, number] = [
    midNorm[0] * (1 + heightScale),
    midNorm[1] * (1 + heightScale),
    midNorm[2] * (1 + heightScale),
  ];

  // Also compute a secondary perpendicular for extra curvature variety
  const AB = cross(A, B);
  const perpNorm = normalize(AB);
  // Add a subtle lateral offset to break symmetry
  const lateralOffset = heightScale * 0.15;
  const controlPoint: [number, number, number] = [
    offsetMid[0] + perpNorm[0] * lateralOffset,
    offsetMid[1] + perpNorm[1] * lateralOffset,
    offsetMid[2] + perpNorm[2] * lateralOffset,
  ];

  const points: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Quadratic bezier in 3D cartesian space
    const omt = 1 - t;
    const x = omt * omt * A[0] + 2 * omt * t * controlPoint[0] + t * t * B[0];
    const y = omt * omt * A[1] + 2 * omt * t * controlPoint[1] + t * t * B[1];
    const z = omt * omt * A[2] + 2 * omt * t * controlPoint[2] + t * t * B[2];

    const ll = toLatLng(x, y, z);
    points.push([ll.lng, ll.lat]);
  }

  return points;
}

/**
 * Build arc coordinates for each consecutive stage pair in a batch.
 * Returns an array of arc coordinate arrays (one per hop).
 */
export function buildHopArcs(
  stages: { location: { lat: number; lng: number }; sequenceOrder: number }[],
): [number, number][][] {
  const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const arcs: [number, number][][] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const from = sorted[i].location;
    const to = sorted[i + 1].location;
    arcs.push(generateArc(from, to));
  }

  return arcs;
}

/**
 * Build a GeoJSON FeatureCollection of all stage-to-stage arcs
 * from an array of GodViewBatches.
 */
export function buildArcFeatureCollection(batches: GodViewBatch[]) {
  const features: GeoJSON.Feature[] = [];

  for (const batch of batches) {
    if (batch.stages.length < 2) continue;
    const arcs = buildHopArcs(batch.stages);

    for (const arc of arcs) {
      if (arc.length < 2) continue;
      features.push({
        type: "Feature",
        properties: { lotCode: batch.lotCode },
        geometry: { type: "LineString", coordinates: arc },
      });
    }
  }

  return { type: "FeatureCollection" as const, features };
}
