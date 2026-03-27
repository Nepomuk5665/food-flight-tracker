import type { Anomaly, AnomalyType, JourneyStage, StageType } from "../types";

type RawTelemetryReading = {
  readingType: string;
  value: number;
};

type RawAnomaly = {
  id: string;
  anomalyType: string;
  severity: string;
  description: string;
  detectedAt: string;
  thresholdValue: number | null;
  actualValue: number | null;
  durationMinutes: number | null;
  riskScoreImpact: number;
};

type RawJourneyStage = {
  id: string;
  stageType: string;
  name: string;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  routeCoords: [number, number][] | null;
  operator: string | null;
  metadata: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  sequenceOrder: number;
  telemetry: RawTelemetryReading[];
  anomalies: RawAnomaly[];
};

const round = (value: number): number => Math.round(value * 10) / 10;

const average = (values: number[]): number | undefined => {
  if (values.length === 0) {
    return undefined;
  }

  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const toMetadataRecord = (metadata: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, String(value)]));

const toAnomaly = (anomaly: RawAnomaly): Anomaly => ({
  id: anomaly.id,
  type: anomaly.anomalyType as AnomalyType,
  severity: anomaly.severity as Anomaly["severity"],
  description: anomaly.description,
  detectedAt: anomaly.detectedAt,
  thresholdValue: anomaly.thresholdValue ?? undefined,
  actualValue: anomaly.actualValue ?? undefined,
  durationMinutes: anomaly.durationMinutes ?? undefined,
  riskScoreImpact: anomaly.riskScoreImpact,
});

const summarizeTelemetry = (telemetry: RawTelemetryReading[]): JourneyStage["telemetry"] => {
  const temperatures = telemetry
    .filter((reading) => reading.readingType === "temperature")
    .map((reading) => reading.value);
  const humidities = telemetry
    .filter((reading) => reading.readingType === "humidity")
    .map((reading) => reading.value);

  return {
    avgTemperature: average(temperatures),
    maxTemperature: temperatures.length > 0 ? round(Math.max(...temperatures)) : undefined,
    minTemperature: temperatures.length > 0 ? round(Math.min(...temperatures)) : undefined,
    avgHumidity: average(humidities),
  };
};

export function serializeJourneyStages(stages: RawJourneyStage[]): JourneyStage[] {
  return [...stages]
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
    .map((stage) => ({
      stageId: stage.id,
      type: stage.stageType as StageType,
      name: stage.name,
      location: {
        name: stage.locationName ?? "Unknown location",
        lat: stage.latitude ?? 0,
        lng: stage.longitude ?? 0,
      },
      routeCoordinates: stage.routeCoords ?? undefined,
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
      operator: stage.operator ?? "Unknown operator",
      metadata: toMetadataRecord(stage.metadata),
      telemetry: summarizeTelemetry(stage.telemetry),
      anomalies: stage.anomalies.map(toAnomaly),
      sequenceOrder: stage.sequenceOrder,
    }));
}
