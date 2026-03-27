import { eq, desc, asc, sql } from "drizzle-orm";
import { db } from "./index";
import {
  products,
  batches,
  batchLineage,
  batchStages,
  telemetryReadings,
  stageAnomalies,
  consumerReports,
  recalls,
  recallLots,
  type NewConsumerReport,
  type NewRecall,
} from "./schema";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function getProductByBarcode(barcode: string) {
  return db.select().from(products).where(eq(products.barcode, barcode)).get();
}

export function getProductById(id: string) {
  return db.select().from(products).where(eq(products.id, id)).get();
}

export function upsertProductFromOFF(data: {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  nutriScore: string | null;
  ecoScore: string | null;
  ingredients: string | null;
  allergens: string[];
  offData: Record<string, unknown>;
}) {
  const existing = getProductByBarcode(data.barcode);
  if (existing) return existing;

  const product = db
    .insert(products)
    .values({
      barcode: data.barcode,
      name: data.name,
      brand: data.brand,
      category: data.category,
      imageUrl: data.imageUrl,
      source: "open_food_facts",
      nutriScore: data.nutriScore,
      ecoScore: data.ecoScore,
      ingredients: data.ingredients,
      allergens: JSON.stringify(data.allergens),
      offData: JSON.stringify(data.offData),
    })
    .returning()
    .get()!;

  return product;
}

// ---------------------------------------------------------------------------
// Batches
// ---------------------------------------------------------------------------

export function getActiveLotForProduct(productId: string) {
  return db
    .select()
    .from(batches)
    .where(eq(batches.productId, productId))
    .orderBy(desc(batches.createdAt))
    .limit(1)
    .get();
}

export function getBatchByLotCode(lotCode: string) {
  return db.select().from(batches).where(eq(batches.lotCode, lotCode)).get();
}

export function getAllBatches() {
  return db
    .select({
      batch: batches,
      product: products,
    })
    .from(batches)
    .innerJoin(products, eq(batches.productId, products.id))
    .orderBy(desc(batches.updatedAt))
    .all();
}

export function updateBatchStatus(
  lotCode: string,
  status: string,
  riskScore?: number,
) {
  const updates: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (riskScore !== undefined) {
    updates.riskScore = riskScore;
  }

  return db
    .update(batches)
    .set(updates)
    .where(eq(batches.lotCode, lotCode))
    .run();
}

// ---------------------------------------------------------------------------
// Batch Journey (stages + telemetry + anomalies)
// ---------------------------------------------------------------------------

export function getBatchJourney(lotCode: string) {
  const batch = getBatchByLotCode(lotCode);
  if (!batch) return null;

  const stages = db
    .select()
    .from(batchStages)
    .where(eq(batchStages.batchId, batch.id))
    .orderBy(asc(batchStages.sequenceOrder))
    .all();

  const stagesWithDetails = stages.map((stage) => {
    const telemetry = db
      .select()
      .from(telemetryReadings)
      .where(eq(telemetryReadings.stageId, stage.id))
      .orderBy(asc(telemetryReadings.recordedAt))
      .all();

    const anomalies = db
      .select()
      .from(stageAnomalies)
      .where(eq(stageAnomalies.stageId, stage.id))
      .all();

    return {
      ...stage,
      metadata: JSON.parse(stage.metadata),
      routeCoords: stage.routeCoords ? JSON.parse(stage.routeCoords) : null,
      telemetry,
      anomalies,
    };
  });

  return {
    batch,
    stages: stagesWithDetails,
  };
}

// ---------------------------------------------------------------------------
// Batch Lineage (merge/split tree)
// ---------------------------------------------------------------------------

export function getBatchLineage(batchId: string) {
  // Parents (upstream trace)
  const parents = db
    .select({
      lineage: batchLineage,
      parentBatch: batches,
    })
    .from(batchLineage)
    .innerJoin(batches, eq(batchLineage.parentBatchId, batches.id))
    .where(eq(batchLineage.childBatchId, batchId))
    .all();

  // Children (downstream trace)
  const children = db
    .select({
      lineage: batchLineage,
      childBatch: batches,
    })
    .from(batchLineage)
    .innerJoin(batches, eq(batchLineage.childBatchId, batches.id))
    .where(eq(batchLineage.parentBatchId, batchId))
    .all();

  return { parents, children };
}

// ---------------------------------------------------------------------------
// Consumer Reports
// ---------------------------------------------------------------------------

export function createConsumerReport(data: NewConsumerReport) {
  const batch = data.lotCode
    ? getBatchByLotCode(data.lotCode)
    : undefined;

  const report = db
    .insert(consumerReports)
    .values({
      ...data,
      batchId: batch?.id ?? null,
    })
    .returning()
    .get()!;

  return report;
}

export function getReportsForLot(lotCode: string) {
  return db
    .select()
    .from(consumerReports)
    .where(eq(consumerReports.lotCode, lotCode))
    .orderBy(desc(consumerReports.createdAt))
    .all();
}

export function getAllReports() {
  return db
    .select()
    .from(consumerReports)
    .orderBy(desc(consumerReports.createdAt))
    .all();
}

export function getReportCountForDevice(deviceId: string, sinceHoursAgo = 1) {
  const since = new Date();
  since.setHours(since.getHours() - sinceHoursAgo);

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(consumerReports)
    .where(eq(consumerReports.deviceId, deviceId))
    .get();

  return result?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Recalls
// ---------------------------------------------------------------------------

export function createRecall(data: {
  reason: string;
  severity: string;
  triggeredBy: string;
  affectedRegions: string[];
  lotCodes: string[];
}) {
  const recall = db
    .insert(recalls)
    .values({
      reason: data.reason,
      severity: data.severity,
      triggeredBy: data.triggeredBy,
      affectedRegions: JSON.stringify(data.affectedRegions),
      estimatedUnits: 0,
    })
    .returning()
    .get()!;

  let totalUnits = 0;

  for (const lotCode of data.lotCodes) {
    const batch = getBatchByLotCode(lotCode);
    if (batch) {
      db.insert(recallLots)
        .values({ recallId: recall.id, batchId: batch.id })
        .run();

      db.update(batches)
        .set({ status: "recalled", updatedAt: new Date().toISOString() })
        .where(eq(batches.id, batch.id))
        .run();

      totalUnits += batch.unitCount ?? 0;
    }
  }

  db.update(recalls)
    .set({ estimatedUnits: totalUnits })
    .where(eq(recalls.id, recall.id))
    .run();

  return { ...recall, estimatedUnits: totalUnits, affectedLots: data.lotCodes.length };
}

export function getAllRecalls() {
  return db
    .select()
    .from(recalls)
    .orderBy(desc(recalls.createdAt))
    .all();
}

export function endRecall(recallId: string) {
  db.update(recalls)
    .set({ status: "ended", endedAt: new Date().toISOString() })
    .where(eq(recalls.id, recallId))
    .run();

  // Get affected batches and set them back to active
  const affectedLots = db
    .select()
    .from(recallLots)
    .where(eq(recallLots.recallId, recallId))
    .all();

  for (const lot of affectedLots) {
    db.update(batches)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(batches.id, lot.batchId))
      .run();
  }
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

export function getAnomaliesByBatch(batchId: string) {
  return db
    .select()
    .from(stageAnomalies)
    .where(eq(stageAnomalies.batchId, batchId))
    .orderBy(desc(stageAnomalies.detectedAt))
    .all();
}

export function getAllCriticalAnomalies() {
  return db
    .select({
      anomaly: stageAnomalies,
      batch: batches,
      product: products,
    })
    .from(stageAnomalies)
    .innerJoin(batches, eq(stageAnomalies.batchId, batches.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .where(eq(stageAnomalies.severity, "critical"))
    .orderBy(desc(stageAnomalies.detectedAt))
    .all();
}
