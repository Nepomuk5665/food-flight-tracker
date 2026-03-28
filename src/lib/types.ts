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

// ---------------------------------------------------------------------------
// Lineage (merge/split batch relationships)
// ---------------------------------------------------------------------------

export type PathRole = "parent" | "main" | "child";

export interface LineageBatchJourney {
  lotCode: string;
  pathRole: PathRole;
  relationship: "merge" | "split" | null;
  ratio: number | null;
  stages: JourneyStage[];
}

export interface LineageTree {
  main: LineageBatchJourney;
  parents: LineageBatchJourney[];
  children: LineageBatchJourney[];
}

// ---------------------------------------------------------------------------
// God View (admin dashboard overview)
// ---------------------------------------------------------------------------

export type RiskLevel = "safe" | "warning" | "critical";

export function deriveRiskLevel(riskScore: number): RiskLevel {
  if (riskScore <= 20) return "safe";
  if (riskScore <= 60) return "warning";
  return "critical";
}

export interface GodViewBatchStage {
  stageId: string;
  type: StageType;
  name: string;
  location: { name: string; lat: number; lng: number };
  routeCoordinates?: [number, number][];
  sequenceOrder: number;
  anomalyCount: number;
  maxSeverity: Severity | null;
}

export interface GodViewBatch {
  lotCode: string;
  productName: string;
  productBrand: string;
  status: BatchStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  unitCount: number | null;
  stageCount: number;
  anomalyCount: number;
  maxSeverity: Severity | null;
  stages: GodViewBatchStage[];
  lastLocation: { name: string; lat: number; lng: number } | null;
  updatedAt: string;
  /** Connected component ID — all batches sharing lineage edges belong to the same chain. */
  chainGroup: string;
}

export interface GodViewAlert {
  id: string;
  batchLotCode: string;
  productName: string;
  severity: Severity;
  anomalyType: AnomalyType;
  description: string;
  detectedAt: string;
  stageType: StageType;
  locationName: string;
  lat: number;
  lng: number;
}

export interface GodViewMetrics {
  activeBatches: number;
  openIncidents: number;
  avgRiskScore: number;
  recalledBatches: number;
}

export interface GodViewReport {
  id: string;
  lotCode: string;
  category: string;
  description: string | null;
  createdAt: string;
}

export interface GodViewLineageEdge {
  parentLotCode: string;
  childLotCode: string;
  relationship: "merge" | "split";
}

export interface GodViewData {
  batches: GodViewBatch[];
  lineageEdges: GodViewLineageEdge[];
  alerts: GodViewAlert[];
  recentReports: GodViewReport[];
  metrics: GodViewMetrics;
}
