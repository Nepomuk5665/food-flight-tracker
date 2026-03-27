export type BatchStatus = "active" | "under_review" | "recalled";
export type Severity = "low" | "medium" | "high" | "critical";
export type StageType =
  | "harvest"
  | "collection"
  | "processing"
  | "packaging"
  | "storage"
  | "transport"
  | "retail";
export type ReportCategory =
  | "taste_quality"
  | "appearance"
  | "packaging"
  | "foreign_object"
  | "allergic_reaction"
  | "other";
export type AnomalyType =
  | "cold_chain_break"
  | "humidity_spike"
  | "delayed_transport"
  | "contamination_risk"
  | "temperature_high"
  | "temperature_low";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface JourneyStage {
  stageId: string;
  type: StageType;
  name: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  routeCoordinates?: [number, number][];
  startedAt: string;
  completedAt: string | null;
  operator: string;
  metadata: Record<string, string>;
  telemetry: {
    avgTemperature?: number;
    maxTemperature?: number;
    minTemperature?: number;
    avgHumidity?: number;
  };
  anomalies: Anomaly[];
  sequenceOrder: number;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  description: string;
  detectedAt: string;
  thresholdValue?: number;
  actualValue?: number;
  durationMinutes?: number;
  riskScoreImpact: number;
}

export interface AiRecommendation {
  riskScore: number;
  confidence: number;
  summary: string;
  recommendation: {
    action: "recall" | "targeted_recall" | "monitor" | "dismiss";
    scope: string;
    urgency: "immediate" | "within_24h" | "low";
    reasoning: string;
  };
  affectedBatches: string[];
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
