import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";

// These tests require a seeded database. Run `pnpm db:reset` first.
// They test the query layer directly (no HTTP server needed).

let queries: typeof import("@/lib/db/queries");

beforeAll(async () => {
  // Ensure DB is seeded
  try {
    execSync("pnpm db:reset", { cwd: process.cwd(), stdio: "pipe" });
  } catch {
    // If reset fails, seed data may already exist
  }
  queries = await import("@/lib/db/queries");
});

describe("getBatchLineage", () => {
  it("returns parents for VAT-001 (merge target)", () => {
    const batch = queries.getBatchByLotCode("VAT-001");
    expect(batch).toBeTruthy();
    const lineage = queries.getBatchLineage(batch!.id);
    expect(lineage.parents).toHaveLength(2);
    expect(lineage.parents.map((p) => p.parentBatch.lotCode).sort()).toEqual(["M-FARM-A", "M-FARM-B"]);
  });

  it("returns children for VAT-001 (split source)", () => {
    const batch = queries.getBatchByLotCode("VAT-001");
    expect(batch).toBeTruthy();
    const lineage = queries.getBatchLineage(batch!.id);
    expect(lineage.children).toHaveLength(1);
    expect(lineage.children[0].childBatch.lotCode).toBe("Y-CUP-001");
  });

  it("returns no lineage for a batch with no relationships", () => {
    const batch = queries.getBatchByLotCode("L6029479302");
    expect(batch).toBeTruthy();
    const lineage = queries.getBatchLineage(batch!.id);
    expect(lineage.parents).toHaveLength(0);
    expect(lineage.children).toHaveLength(0);
  });

  it("includes correct ratios on merge relationships", () => {
    const batch = queries.getBatchByLotCode("VAT-001");
    const lineage = queries.getBatchLineage(batch!.id);
    const ratios = lineage.parents
      .map((p) => ({ lot: p.parentBatch.lotCode, ratio: p.lineage.ratio }))
      .sort((a, b) => a.lot.localeCompare(b.lot));
    expect(ratios).toEqual([
      { lot: "M-FARM-A", ratio: 0.57 },
      { lot: "M-FARM-B", ratio: 0.43 },
    ]);
  });
});

describe("getFullLineageTree", () => {
  it("returns parent stages for VAT-001", () => {
    const tree = queries.getFullLineageTree("VAT-001");
    expect(tree).toBeTruthy();
    expect(tree!.parents).toHaveLength(2);
    for (const parent of tree!.parents) {
      expect(parent.stages.length).toBeGreaterThan(0);
      expect(parent.pathRole).toBe("parent");
    }
  });

  it("returns child stages for VAT-001", () => {
    const tree = queries.getFullLineageTree("VAT-001");
    expect(tree).toBeTruthy();
    expect(tree!.children).toHaveLength(1);
    expect(tree!.children[0].stages.length).toBeGreaterThan(0);
    expect(tree!.children[0].pathRole).toBe("child");
  });

  it("returns null for non-existent lot code", () => {
    const tree = queries.getFullLineageTree("NONEXISTENT");
    expect(tree).toBeNull();
  });

  it("returns empty arrays for batch without lineage", () => {
    const tree = queries.getFullLineageTree("L6029479302");
    expect(tree).toBeTruthy();
    expect(tree!.parents).toHaveLength(0);
    expect(tree!.children).toHaveLength(0);
  });

  it("returns full tree for cheese K-MAKE-001 (2 parents + 2 children)", () => {
    const tree = queries.getFullLineageTree("K-MAKE-001");
    expect(tree).toBeTruthy();
    expect(tree!.parents).toHaveLength(2);
    expect(tree!.children).toHaveLength(2);

    const parentLots = tree!.parents.map((p) => p.lotCode).sort();
    expect(parentLots).toEqual(["K-FARM-H", "K-FARM-S"]);

    const childLots = tree!.children.map((c) => c.lotCode).sort();
    expect(childLots).toEqual(["K-SLICE-001", "K-WHEEL-001"]);

    // Each parent and child should have stages
    for (const p of tree!.parents) {
      expect(p.stages.length).toBeGreaterThan(0);
    }
    for (const c of tree!.children) {
      expect(c.stages.length).toBeGreaterThan(0);
    }
  });

  it("cheese K-MAKE-001 is the active lot for the cheese product", () => {
    const product = queries.getProductByBarcode("4099887766550");
    expect(product).toBeTruthy();
    const activeLot = queries.getActiveLotForProduct(product!.id);
    expect(activeLot).toBeTruthy();
    expect(activeLot!.lotCode).toBe("K-MAKE-001");
  });

  it("parent stages include location data", () => {
    const tree = queries.getFullLineageTree("VAT-001");
    const farmA = tree!.parents.find((p) => p.lotCode === "M-FARM-A");
    expect(farmA).toBeTruthy();
    expect(farmA!.stages[0].location.lat).toBeCloseTo(47.5763, 2);
    expect(farmA!.stages[0].location.lng).toBeCloseTo(10.3215, 2);
  });
});
