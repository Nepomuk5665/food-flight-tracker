import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const nowIso = () => new Date().toISOString();
const defaultId = () => crypto.randomUUID();

export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  barcode: text("barcode").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  source: text("source").default("internal"),
  nutriScore: text("nutri_score"),
  ecoScore: text("eco_score"),
  ingredients: text("ingredients"),
  allergens: text("allergens").default("[]"),
  offData: text("off_data").default("{}"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const batches = sqliteTable("batches", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  lotCode: text("lot_code").notNull().unique(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  status: text("status").notNull().default("active"),
  riskScore: integer("risk_score").notNull().default(0),
  unitCount: integer("unit_count"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
  updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
});

export const batchLineage = sqliteTable("batch_lineage", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  parentBatchId: text("parent_batch_id")
    .notNull()
    .references(() => batches.id),
  childBatchId: text("child_batch_id")
    .notNull()
    .references(() => batches.id),
  relationship: text("relationship").notNull(),
  ratio: real("ratio"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const batchStages = sqliteTable("batch_stages", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  batchId: text("batch_id")
    .notNull()
    .references(() => batches.id),
  stageType: text("stage_type").notNull(),
  name: text("name").notNull(),
  locationName: text("location_name"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  routeCoords: text("route_coords"),
  operator: text("operator"),
  metadata: text("metadata").notNull().default("{}"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  sequenceOrder: integer("sequence_order").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const telemetryReadings = sqliteTable("telemetry_readings", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  stageId: text("stage_id")
    .notNull()
    .references(() => batchStages.id),
  readingType: text("reading_type").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  recordedAt: text("recorded_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const stageAnomalies = sqliteTable("stage_anomalies", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  stageId: text("stage_id")
    .notNull()
    .references(() => batchStages.id),
  batchId: text("batch_id")
    .notNull()
    .references(() => batches.id),
  anomalyType: text("anomaly_type").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  thresholdValue: real("threshold_value"),
  actualValue: real("actual_value"),
  durationMinutes: integer("duration_minutes"),
  riskScoreImpact: integer("risk_score_impact").notNull().default(0),
  detectedAt: text("detected_at").notNull(),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const consumerReports = sqliteTable("consumer_reports", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  lotCode: text("lot_code").notNull(),
  batchId: text("batch_id").references(() => batches.id),
  deviceId: text("device_id").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
});

export const recalls = sqliteTable("recalls", {
  id: text("id").primaryKey().$defaultFn(defaultId),
  reason: text("reason").notNull(),
  severity: text("severity").notNull(),
  status: text("status").notNull().default("active"),
  triggeredBy: text("triggered_by"),
  affectedRegions: text("affected_regions").notNull().default("[]"),
  estimatedUnits: integer("estimated_units"),
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
  endedAt: text("ended_at"),
});

export const recallLots = sqliteTable(
  "recall_lots",
  {
    recallId: text("recall_id")
      .notNull()
      .references(() => recalls.id),
    batchId: text("batch_id")
      .notNull()
      .references(() => batches.id),
  },
  (table) => [primaryKey({ columns: [table.recallId, table.batchId] })],
);

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type Batch = InferSelectModel<typeof batches>;
export type NewBatch = InferInsertModel<typeof batches>;

export type BatchLineage = InferSelectModel<typeof batchLineage>;
export type NewBatchLineage = InferInsertModel<typeof batchLineage>;

export type BatchStage = InferSelectModel<typeof batchStages>;
export type NewBatchStage = InferInsertModel<typeof batchStages>;

export type TelemetryReading = InferSelectModel<typeof telemetryReadings>;
export type NewTelemetryReading = InferInsertModel<typeof telemetryReadings>;

export type StageAnomaly = InferSelectModel<typeof stageAnomalies>;
export type NewStageAnomaly = InferInsertModel<typeof stageAnomalies>;

export type ConsumerReport = InferSelectModel<typeof consumerReports>;
export type NewConsumerReport = InferInsertModel<typeof consumerReports>;

export type Recall = InferSelectModel<typeof recalls>;
export type NewRecall = InferInsertModel<typeof recalls>;

export type RecallLot = InferSelectModel<typeof recallLots>;
export type NewRecallLot = InferInsertModel<typeof recallLots>;
