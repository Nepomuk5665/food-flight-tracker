import { describe, it, expect } from "vitest";
import { buildLineageGeoJSON, allLineageStages } from "@/lib/journey/lineage-geo";
import type { JourneyStage, LineageTree } from "@/lib/types";

function makeStage(overrides: Partial<JourneyStage> & { stageId: string }): JourneyStage {
  return {
    type: "processing",
    name: "Test Stage",
    location: { name: "Test", lat: 0, lng: 0 },
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T01:00:00Z",
    operator: "Test Op",
    metadata: {},
    telemetry: {},
    anomalies: [],
    sequenceOrder: 1,
    ...overrides,
  };
}

const farmAStage = makeStage({
  stageId: "farm-a",
  type: "collection",
  name: "Farm A Collection",
  location: { name: "Farm A", lat: 47.5763, lng: 10.3215 },
  sequenceOrder: 1,
});

const farmBStage = makeStage({
  stageId: "farm-b",
  type: "collection",
  name: "Farm B Collection",
  location: { name: "Farm B", lat: 47.5528, lng: 10.2964 },
  sequenceOrder: 1,
});

const vatStage = makeStage({
  stageId: "vat-1",
  type: "processing",
  name: "Pasteurization",
  location: { name: "Kempten Plant", lat: 47.7267, lng: 10.3168 },
  sequenceOrder: 2,
});

const storageStage = makeStage({
  stageId: "storage-1",
  type: "storage",
  name: "Cold Storage",
  location: { name: "Kempten Cold Store", lat: 47.7267, lng: 10.3168 },
  sequenceOrder: 3,
});

const cupStage = makeStage({
  stageId: "cup-1",
  type: "packaging",
  name: "Cup Filling",
  location: { name: "Kempten Plant", lat: 47.7267, lng: 10.3168 },
  sequenceOrder: 3,
});

const retailStage = makeStage({
  stageId: "retail-1",
  type: "retail",
  name: "Retail Display",
  location: { name: "Munich Supermarket", lat: 48.1351, lng: 11.582 },
  sequenceOrder: 5,
});

function buildTree(): LineageTree {
  return {
    main: {
      lotCode: "VAT-001",
      pathRole: "main",
      relationship: null,
      ratio: null,
      stages: [vatStage, storageStage],
    },
    parents: [
      {
        lotCode: "M-FARM-A",
        pathRole: "parent",
        relationship: "merge",
        ratio: 0.57,
        stages: [farmAStage],
      },
      {
        lotCode: "M-FARM-B",
        pathRole: "parent",
        relationship: "merge",
        ratio: 0.43,
        stages: [farmBStage],
      },
    ],
    children: [
      {
        lotCode: "Y-CUP-001",
        pathRole: "child",
        relationship: "split",
        ratio: 1.0,
        stages: [cupStage, retailStage],
      },
    ],
  };
}

describe("buildLineageGeoJSON", () => {
  it("produces a FeatureCollection with correct number of features", () => {
    const result = buildLineageGeoJSON(buildTree());
    expect(result.type).toBe("FeatureCollection");
    // 2 parents + 1 main + 1 child = 4 features
    expect(result.features).toHaveLength(4);
  });

  it("tags each feature with the correct pathRole", () => {
    const result = buildLineageGeoJSON(buildTree());
    const roles = result.features.map((f) => f.properties.pathRole);
    expect(roles).toEqual(["parent", "parent", "main", "child"]);
  });

  it("tags each feature with the correct lotCode", () => {
    const result = buildLineageGeoJSON(buildTree());
    const codes = result.features.map((f) => f.properties.lotCode);
    expect(codes).toEqual(["M-FARM-A", "M-FARM-B", "VAT-001", "Y-CUP-001"]);
  });

  it("parent paths end at the merge point (first main stage)", () => {
    const result = buildLineageGeoJSON(buildTree());
    const parentA = result.features[0];
    const parentB = result.features[1];
    const mergePoint: [number, number] = [vatStage.location.lng, vatStage.location.lat];

    // Last coordinate of each parent should be the merge point
    const lastA = parentA.geometry.coordinates[parentA.geometry.coordinates.length - 1];
    const lastB = parentB.geometry.coordinates[parentB.geometry.coordinates.length - 1];
    expect(lastA).toEqual(mergePoint);
    expect(lastB).toEqual(mergePoint);
  });

  it("child paths start from the split point (last main stage)", () => {
    const result = buildLineageGeoJSON(buildTree());
    const child = result.features[3];
    const splitPoint: [number, number] = [storageStage.location.lng, storageStage.location.lat];

    expect(child.geometry.coordinates[0]).toEqual(splitPoint);
  });

  it("main path has correct coordinates in sequence order", () => {
    const result = buildLineageGeoJSON(buildTree());
    const main = result.features[2];
    expect(main.geometry.coordinates).toEqual([
      [vatStage.location.lng, vatStage.location.lat],
      [storageStage.location.lng, storageStage.location.lat],
    ]);
  });

  it("returns empty FeatureCollection when main has no stages", () => {
    const tree = buildTree();
    tree.main.stages = [];
    const result = buildLineageGeoJSON(tree);
    expect(result.features).toHaveLength(0);
  });

  it("handles tree with no parents or children (linear path)", () => {
    const tree: LineageTree = {
      main: {
        lotCode: "BATCH-1",
        pathRole: "main",
        relationship: null,
        ratio: null,
        stages: [vatStage, storageStage],
      },
      parents: [],
      children: [],
    };
    const result = buildLineageGeoJSON(tree);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties.pathRole).toBe("main");
  });

  it("skips parent batches with no stages", () => {
    const tree = buildTree();
    tree.parents[0].stages = [];
    const result = buildLineageGeoJSON(tree);
    // Only 1 parent (B) + main + child = 3
    expect(result.features).toHaveLength(3);
  });
});

describe("allLineageStages", () => {
  it("collects all stages from all batches", () => {
    const tree = buildTree();
    const all = allLineageStages(tree);
    // main: 2, parents: 1+1, children: 2 = 6
    expect(all).toHaveLength(6);
  });

  it("includes stages from parents, main, and children", () => {
    const tree = buildTree();
    const ids = allLineageStages(tree).map((s) => s.stageId);
    expect(ids).toContain("farm-a");
    expect(ids).toContain("farm-b");
    expect(ids).toContain("vat-1");
    expect(ids).toContain("storage-1");
    expect(ids).toContain("cup-1");
    expect(ids).toContain("retail-1");
  });
});
