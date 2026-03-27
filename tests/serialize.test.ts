import { describe, it, expect } from "vitest";
import { serializeJourneyStages } from "@/lib/journey/serialize";

function makeRawStage(overrides: Record<string, unknown> = {}) {
  return {
    id: "stage-1",
    stageType: "processing",
    name: "Test Stage",
    locationName: "Test Location",
    latitude: 48.0,
    longitude: 11.0,
    routeCoords: null,
    operator: "Test Op",
    metadata: {},
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T06:00:00Z",
    sequenceOrder: 1,
    telemetry: [],
    anomalies: [],
    ...overrides,
  };
}

describe("serializeJourneyStages", () => {
  it("serializes a single stage with all fields", () => {
    const stages = [makeRawStage()];
    const result = serializeJourneyStages(stages as never);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      stageId: "stage-1",
      type: "processing",
      name: "Test Stage",
      location: { name: "Test Location", lat: 48.0, lng: 11.0 },
      routeCoordinates: undefined,
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T06:00:00Z",
      operator: "Test Op",
      metadata: {},
      telemetry: {
        avgTemperature: undefined,
        maxTemperature: undefined,
        minTemperature: undefined,
        avgHumidity: undefined,
      },
      anomalies: [],
      sequenceOrder: 1,
    });
  });

  it("sorts stages by sequenceOrder", () => {
    const stages = [
      makeRawStage({ id: "s3", sequenceOrder: 3, name: "Third" }),
      makeRawStage({ id: "s1", sequenceOrder: 1, name: "First" }),
      makeRawStage({ id: "s2", sequenceOrder: 2, name: "Second" }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result.map((s) => s.name)).toEqual(["First", "Second", "Third"]);
  });

  it("uses 'Unknown location' when locationName is null", () => {
    const stages = [makeRawStage({ locationName: null })];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].location.name).toBe("Unknown location");
  });

  it("uses 0 for null latitude and longitude", () => {
    const stages = [makeRawStage({ latitude: null, longitude: null })];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].location.lat).toBe(0);
    expect(result[0].location.lng).toBe(0);
  });

  it("uses 'Unknown operator' when operator is null", () => {
    const stages = [makeRawStage({ operator: null })];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].operator).toBe("Unknown operator");
  });

  it("passes through routeCoords when present", () => {
    const coords: [number, number][] = [[11.0, 48.0], [12.0, 49.0]];
    const stages = [makeRawStage({ routeCoords: coords })];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].routeCoordinates).toEqual(coords);
  });

  it("converts metadata values to strings", () => {
    const stages = [makeRawStage({ metadata: { count: 42, flag: true, name: "test" } })];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].metadata).toEqual({
      count: "42",
      flag: "true",
      name: "test",
    });
  });

  it("handles empty stages array", () => {
    expect(serializeJourneyStages([])).toEqual([]);
  });
});

describe("telemetry summarization", () => {
  it("computes average, max, min temperature from readings", () => {
    const stages = [
      makeRawStage({
        telemetry: [
          { readingType: "temperature", value: 2.0 },
          { readingType: "temperature", value: 4.0 },
          { readingType: "temperature", value: 6.0 },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].telemetry.avgTemperature).toBe(4);
    expect(result[0].telemetry.maxTemperature).toBe(6);
    expect(result[0].telemetry.minTemperature).toBe(2);
  });

  it("computes average humidity", () => {
    const stages = [
      makeRawStage({
        telemetry: [
          { readingType: "humidity", value: 50 },
          { readingType: "humidity", value: 70 },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].telemetry.avgHumidity).toBe(60);
  });

  it("returns undefined for empty telemetry", () => {
    const stages = [makeRawStage({ telemetry: [] })];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].telemetry.avgTemperature).toBeUndefined();
    expect(result[0].telemetry.maxTemperature).toBeUndefined();
    expect(result[0].telemetry.minTemperature).toBeUndefined();
    expect(result[0].telemetry.avgHumidity).toBeUndefined();
  });

  it("handles mixed temperature and humidity readings", () => {
    const stages = [
      makeRawStage({
        telemetry: [
          { readingType: "temperature", value: 3.0 },
          { readingType: "humidity", value: 65 },
          { readingType: "temperature", value: 5.0 },
          { readingType: "humidity", value: 75 },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].telemetry.avgTemperature).toBe(4);
    expect(result[0].telemetry.avgHumidity).toBe(70);
  });

  it("rounds values to 1 decimal place", () => {
    const stages = [
      makeRawStage({
        telemetry: [
          { readingType: "temperature", value: 3.33 },
          { readingType: "temperature", value: 4.67 },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].telemetry.avgTemperature).toBe(4);
    expect(result[0].telemetry.maxTemperature).toBe(4.7);
    expect(result[0].telemetry.minTemperature).toBe(3.3);
  });
});

describe("anomaly serialization", () => {
  it("serializes anomalies with all fields", () => {
    const stages = [
      makeRawStage({
        anomalies: [
          {
            id: "anom-1",
            anomalyType: "cold_chain_break",
            severity: "high",
            description: "Temperature exceeded threshold",
            detectedAt: "2026-01-01T03:00:00Z",
            thresholdValue: 4.0,
            actualValue: 8.5,
            durationMinutes: 45,
            riskScoreImpact: 15,
          },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].anomalies).toHaveLength(1);
    expect(result[0].anomalies[0]).toEqual({
      id: "anom-1",
      type: "cold_chain_break",
      severity: "high",
      description: "Temperature exceeded threshold",
      detectedAt: "2026-01-01T03:00:00Z",
      thresholdValue: 4.0,
      actualValue: 8.5,
      durationMinutes: 45,
      riskScoreImpact: 15,
    });
  });

  it("converts null optional fields to undefined", () => {
    const stages = [
      makeRawStage({
        anomalies: [
          {
            id: "anom-2",
            anomalyType: "humidity_spike",
            severity: "low",
            description: "Brief spike",
            detectedAt: "2026-01-01T02:00:00Z",
            thresholdValue: null,
            actualValue: null,
            durationMinutes: null,
            riskScoreImpact: 5,
          },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    const anomaly = result[0].anomalies[0];
    expect(anomaly.thresholdValue).toBeUndefined();
    expect(anomaly.actualValue).toBeUndefined();
    expect(anomaly.durationMinutes).toBeUndefined();
  });

  it("preserves multiple anomalies per stage", () => {
    const stages = [
      makeRawStage({
        anomalies: [
          { id: "a1", anomalyType: "cold_chain_break", severity: "high", description: "Break 1", detectedAt: "2026-01-01T01:00:00Z", thresholdValue: null, actualValue: null, durationMinutes: null, riskScoreImpact: 10 },
          { id: "a2", anomalyType: "humidity_spike", severity: "medium", description: "Spike 1", detectedAt: "2026-01-01T02:00:00Z", thresholdValue: null, actualValue: null, durationMinutes: null, riskScoreImpact: 5 },
        ],
      }),
    ];
    const result = serializeJourneyStages(stages as never);
    expect(result[0].anomalies).toHaveLength(2);
  });
});
