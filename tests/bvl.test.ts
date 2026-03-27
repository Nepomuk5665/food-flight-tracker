import { describe, it, expect } from "vitest";
import { getRecalls, type Recall } from "@/lib/api/bvl";

describe("getRecalls", () => {
  it("returns an array of recalls", async () => {
    const recalls = await getRecalls();
    expect(Array.isArray(recalls)).toBe(true);
    expect(recalls.length).toBeGreaterThan(0);
  });

  it("returns placeholder recall with correct structure", async () => {
    const recalls = await getRecalls();
    const recall: Recall = recalls[0];
    expect(recall.id).toBe("placeholder-recall-1");
    expect(recall.productName).toBe("Demo Product");
    expect(recall.reason).toBe("Placeholder recall record");
    expect(recall.severity).toBe("warning");
    expect(recall.affectedBatches).toEqual(["LOT-DEMO-001"]);
    expect(recall.source).toBe("bvl");
    expect(recall.createdAt).toBeTruthy();
  });

  it("createdAt is a valid ISO date string", async () => {
    const recalls = await getRecalls();
    const date = new Date(recalls[0].createdAt);
    expect(date.getTime()).not.toBeNaN();
  });
});
