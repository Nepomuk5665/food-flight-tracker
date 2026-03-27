import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { inferOrigins, buildJourney, INGREDIENT_ORIGINS } from "@/lib/origin/mapper";

describe("inferOrigins", () => {
  it("returns empty array when no ingredients match", () => {
    expect(inferOrigins(["water", "salt", "pepper"])).toEqual([]);
  });

  it("infers top origin for cocoa", () => {
    const result = inferOrigins(["cocoa"]);
    expect(result).toHaveLength(1);
    expect(result[0].ingredient).toBe("cocoa");
    expect(result[0].country).toBe("Ivory Coast");
    expect(result[0].share).toBe(0.38);
  });

  it("infers origin for sugar", () => {
    const result = inferOrigins(["sugar"]);
    expect(result).toHaveLength(1);
    expect(result[0].country).toBe("Brazil");
  });

  it("infers origin for hazelnuts", () => {
    const result = inferOrigins(["hazelnuts"]);
    expect(result).toHaveLength(1);
    expect(result[0].country).toBe("Turkey");
    expect(result[0].share).toBe(0.7);
  });

  it("infers multiple origins for different ingredients", () => {
    const result = inferOrigins(["cocoa", "sugar", "vanilla"]);
    expect(result).toHaveLength(3);
    expect(result.map((o) => o.ingredient)).toEqual(["cocoa", "sugar", "vanilla"]);
  });

  it("deduplicates same ingredient appearing twice", () => {
    const result = inferOrigins(["cocoa", "cocoa butter", "cocoa"]);
    const cocoaResults = result.filter((o) => o.ingredient === "cocoa");
    expect(cocoaResults).toHaveLength(1);
  });

  it("matches partial ingredient names (case-insensitive)", () => {
    const result = inferOrigins(["Palm Oil (refined)"]);
    expect(result).toHaveLength(1);
    expect(result[0].ingredient).toBe("palm oil");
    expect(result[0].country).toBe("Indonesia");
  });

  it("returns likelyCountries with top-2 producers", () => {
    const result = inferOrigins(["cocoa"]);
    expect(result[0].likelyCountries).toEqual(["Ivory Coast", "Ghana"]);
  });

  it("handles milk with null coordinates", () => {
    const result = inferOrigins(["milk"]);
    expect(result).toHaveLength(1);
    expect(result[0].country).toBe("local");
    expect(result[0].lat).toBeNull();
    expect(result[0].lng).toBeNull();
  });

  it("returns coffee origin correctly", () => {
    const result = inferOrigins(["coffee beans"]);
    expect(result).toHaveLength(1);
    expect(result[0].ingredient).toBe("coffee");
    expect(result[0].country).toBe("Brazil");
  });

  it("handles empty ingredients array", () => {
    expect(inferOrigins([])).toEqual([]);
  });
});

describe("buildJourney", () => {
  const dateNow = new Date("2026-03-27T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(dateNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates harvest + transport + processing + storage + retail for one origin", () => {
    const origins = inferOrigins(["vanilla"]);
    const journey = buildJourney(origins);
    expect(journey).toHaveLength(5);
    expect(journey.map((s) => s.type)).toEqual([
      "harvest",
      "transport",
      "processing",
      "storage",
      "retail",
    ]);
  });

  it("creates 2*(harvest+transport) + processing + storage + retail for two origins", () => {
    const origins = inferOrigins(["cocoa", "sugar"]);
    const journey = buildJourney(origins);
    expect(journey).toHaveLength(7);
    expect(journey[0].type).toBe("harvest");
    expect(journey[1].type).toBe("transport");
    expect(journey[2].type).toBe("harvest");
    expect(journey[3].type).toBe("transport");
    expect(journey[4].type).toBe("processing");
  });

  it("uses manufacturing location coordinates when recognized", () => {
    const origins = inferOrigins(["sugar"]);
    const journey = buildJourney(origins, "Aachen, Germany");
    const processing = journey.find((s) => s.type === "processing")!;
    expect(processing.location.lat).toBeCloseTo(50.7753, 2);
    expect(processing.location.lng).toBeCloseTo(6.0839, 2);
  });

  it("falls back to default coordinates for unknown manufacturing place", () => {
    const origins = inferOrigins(["sugar"]);
    const journey = buildJourney(origins, "Mars Colony");
    const processing = journey.find((s) => s.type === "processing")!;
    expect(processing.location.lat).toBeCloseTo(48.1351, 2);
    expect(processing.location.lng).toBeCloseTo(11.582, 2);
    expect(processing.location.name).toBe("Mars Colony");
  });

  it("falls back to default when no manufacturing place given", () => {
    const origins = inferOrigins(["sugar"]);
    const journey = buildJourney(origins);
    const processing = journey.find((s) => s.type === "processing")!;
    expect(processing.location.name).toBe("Unknown manufacturing location");
  });

  it("assigns sequential sequenceOrder", () => {
    const origins = inferOrigins(["cocoa"]);
    const journey = buildJourney(origins);
    const orders = journey.map((s) => s.sequenceOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
    }
  });

  it("assigns timestamps with correct intervals", () => {
    const origins = inferOrigins(["vanilla"]);
    const journey = buildJourney(origins);
    for (const stage of journey) {
      expect(new Date(stage.startedAt).getTime()).toBeGreaterThan(dateNow);
      expect(new Date(stage.completedAt!).getTime()).toBeGreaterThan(new Date(stage.startedAt).getTime());
    }
  });

  it("marks all stages as inferred with correct metadata", () => {
    const origins = inferOrigins(["cocoa"]);
    const journey = buildJourney(origins);
    for (const stage of journey) {
      expect(stage.operator).toBe("Inferred supply chain model");
      expect(stage.metadata.source).toBe("origin-intelligence-layer");
      expect(stage.metadata.confidence).toBe("inferred");
    }
  });

  it("stageId follows pattern type-sequenceOrder", () => {
    const origins = inferOrigins(["vanilla"]);
    const journey = buildJourney(origins);
    expect(journey[0].stageId).toBe("harvest-1");
    expect(journey[1].stageId).toBe("transport-2");
    expect(journey[2].stageId).toBe("processing-3");
  });

  it("uses local coordinates for milk ingredient (null lat/lng fallback)", () => {
    const origins = inferOrigins(["milk"]);
    const journey = buildJourney(origins, "Kempten");
    const harvest = journey[0];
    expect(harvest.location.lat).toBeCloseTo(47.7267, 2);
    expect(harvest.location.lng).toBeCloseTo(10.3139, 2);
  });

  it("handles empty origins array", () => {
    const journey = buildJourney([]);
    expect(journey).toHaveLength(3);
    expect(journey.map((s) => s.type)).toEqual(["processing", "storage", "retail"]);
  });

  it("returns empty anomalies and telemetry for all stages", () => {
    const origins = inferOrigins(["sugar"]);
    const journey = buildJourney(origins);
    for (const stage of journey) {
      expect(stage.anomalies).toEqual([]);
      expect(stage.telemetry).toEqual({});
    }
  });
});

describe("INGREDIENT_ORIGINS", () => {
  it("has entries for expected ingredients", () => {
    const keys = Object.keys(INGREDIENT_ORIGINS);
    expect(keys).toContain("cocoa");
    expect(keys).toContain("palm oil");
    expect(keys).toContain("sugar");
    expect(keys).toContain("hazelnuts");
    expect(keys).toContain("vanilla");
    expect(keys).toContain("coffee");
    expect(keys).toContain("milk");
  });

  it("each origin has country, share, and coordinate fields", () => {
    for (const origins of Object.values(INGREDIENT_ORIGINS)) {
      for (const origin of origins) {
        expect(origin).toHaveProperty("country");
        expect(origin).toHaveProperty("share");
        expect(typeof origin.share).toBe("number");
      }
    }
  });
});
