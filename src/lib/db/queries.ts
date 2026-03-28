import { eq, desc, asc, sql, and, gte, inArray } from "drizzle-orm";
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

export function getBarcodeForLotCode(lotCode: string): string | null {
  const batch = getBatchByLotCode(lotCode);
  if (!batch) return null;

  const product = db.select().from(products).where(eq(products.id, batch.productId)).get();
  return product?.barcode ?? null;
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

/** Returns batches grouped by supply-chain (lineage-connected components). */
export function getAllBatchesGrouped() {
  const rows = getAllBatches();
  const lineageEdges = db.select().from(batchLineage).all();

  // Union-find to cluster lineage-connected batches
  const parent = new Map<string, string>();

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur) ?? cur;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const { batch } of rows) parent.set(batch.id, batch.id);
  for (const edge of lineageEdges) {
    if (parent.has(edge.parentBatchId) && parent.has(edge.childBatchId)) {
      union(edge.parentBatchId, edge.childBatchId);
    }
  }

  // Group rows by chain root
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const root = find(row.batch.id);
    const list = groups.get(root) ?? [];
    list.push(row);
    groups.set(root, list);
  }

  return [...groups.values()].map((members) => {
    // Sort members by createdAt desc so the newest lot is the "primary"
    const sorted = [...members].sort(
      (a, b) => b.batch.createdAt.localeCompare(a.batch.createdAt),
    );
    const primary = sorted[0];

    return {
      productName: primary.product.name,
      lotCount: sorted.length,
      maxRiskScore: Math.max(...sorted.map((m) => m.batch.riskScore)),
      totalUnits: sorted.reduce((sum, m) => sum + (m.batch.unitCount ?? 0), 0),
      latestUpdate: sorted[0].batch.updatedAt,
      status: sorted.some((m) => m.batch.status === "recalled")
        ? "recalled"
        : sorted.some((m) => m.batch.status === "under_review")
          ? "under_review"
          : "active",
      lots: sorted.map(({ batch }) => ({
        lotCode: batch.lotCode,
        status: batch.status,
        riskScore: batch.riskScore,
        unitCount: batch.unitCount ?? 0,
        createdAt: batch.createdAt,
      })),
    };
  });
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

  const product = db.select().from(products).where(eq(products.id, batch.productId)).get();

  return {
    batch,
    product: product ? { name: product.name, brand: product.brand } : null,
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
// Full Lineage Tree (stages for all related batches)
// ---------------------------------------------------------------------------

function serializeStages(rawStages: ReturnType<typeof getBatchJourney> extends infer R ? R extends { stages: infer S } ? S : never : never) {
  return rawStages.map((stage) => ({
    stageId: stage.id,
    type: stage.stageType,
    name: stage.name,
    location: { name: stage.locationName, lat: stage.latitude, lng: stage.longitude },
    routeCoordinates: stage.routeCoords,
    startedAt: stage.startedAt,
    completedAt: stage.completedAt,
    operator: stage.operator,
    metadata: stage.metadata,
    sequenceOrder: stage.sequenceOrder,
    telemetry: {},
    anomalies: stage.anomalies,
  }));
}

export function getFullLineageTree(lotCode: string) {
  const mainJourney = getBatchJourney(lotCode);
  if (!mainJourney) return null;

  const lineage = getBatchLineage(mainJourney.batch.id);

  const parents = lineage.parents
    .map((p) => {
      const journey = getBatchJourney(p.parentBatch.lotCode);
      if (!journey) return null;
      return {
        lotCode: p.parentBatch.lotCode,
        pathRole: "parent" as const,
        relationship: p.lineage.relationship as "merge" | "split",
        ratio: p.lineage.ratio,
        stages: serializeStages(journey.stages),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const children = lineage.children
    .map((c) => {
      const journey = getBatchJourney(c.childBatch.lotCode);
      if (!journey) return null;
      return {
        lotCode: c.childBatch.lotCode,
        pathRole: "child" as const,
        relationship: c.lineage.relationship as "merge" | "split",
        ratio: c.lineage.ratio,
        stages: serializeStages(journey.stages),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

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
  const sinceIso = since.toISOString();

  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(consumerReports)
    .where(
      and(
        eq(consumerReports.deviceId, deviceId),
        gte(consumerReports.createdAt, sinceIso),
      ),
    )
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
  const allRecalls = db
    .select()
    .from(recalls)
    .orderBy(desc(recalls.createdAt))
    .all();

  const allLotLinks = db
    .select({ recallId: recallLots.recallId, lotCode: batches.lotCode })
    .from(recallLots)
    .innerJoin(batches, eq(recallLots.batchId, batches.id))
    .all();

  const lotsByRecall = new Map<string, string[]>();
  for (const link of allLotLinks) {
    const list = lotsByRecall.get(link.recallId) ?? [];
    list.push(link.lotCode);
    lotsByRecall.set(link.recallId, list);
  }

  return allRecalls.map((recall) => ({
    ...recall,
    affectedLots: lotsByRecall.get(recall.id) ?? [],
  }));
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
// Report Aggregates (for QA triage)
// ---------------------------------------------------------------------------

export function getReportAggregates() {
  const rows = db
    .select({
      lotCode: consumerReports.lotCode,
      category: consumerReports.category,
      count: sql<number>`count(*)`,
      latestAt: sql<string>`max(${consumerReports.createdAt})`,
    })
    .from(consumerReports)
    .groupBy(consumerReports.lotCode, consumerReports.category)
    .all();

  const byLot = new Map<string, { total: number; byCategory: Record<string, number>; latestAt: string }>();
  for (const row of rows) {
    const existing = byLot.get(row.lotCode) ?? { total: 0, byCategory: {}, latestAt: "" };
    existing.total += row.count;
    existing.byCategory[row.category] = row.count;
    if (row.latestAt > existing.latestAt) existing.latestAt = row.latestAt;
    byLot.set(row.lotCode, existing);
  }

  return [...byLot.entries()]
    .map(([lotCode, data]) => ({ lotCode, ...data }))
    .sort((a, b) => b.total - a.total);
}

// ---------------------------------------------------------------------------
// Recall lookup for a specific batch
// ---------------------------------------------------------------------------

export function getActiveRecallForBatch(batchId: string) {
  const row = db
    .select({ recall: recalls })
    .from(recallLots)
    .innerJoin(recalls, eq(recallLots.recallId, recalls.id))
    .where(and(eq(recallLots.batchId, batchId), eq(recalls.status, "active")))
    .limit(1)
    .get();

  return row?.recall ?? null;
}

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// God View (admin dashboard overview)
// ---------------------------------------------------------------------------

export function getGodViewData() {
  // Limit batches sent to the globe map to keep the visualization readable.
  // Pull all critical/warning first, then fill remaining slots with safe batches
  // so the map always shows a representative mix.
  const highRisk = db
    .select({ batch: batches, product: products })
    .from(batches)
    .innerJoin(products, eq(batches.productId, products.id))
    .where(sql`${batches.riskScore} > 20`)
    .orderBy(desc(batches.riskScore))
    .all();

  const safeLimit = Math.max(30 - highRisk.length, 10);
  const safe = db
    .select({ batch: batches, product: products })
    .from(batches)
    .innerJoin(products, eq(batches.productId, products.id))
    .where(sql`${batches.riskScore} <= 20`)
    .orderBy(desc(batches.updatedAt))
    .limit(safeLimit)
    .all();

  // Interleave so the staggered animation doesn't front-load all red/orange.
  const allBatchRows: typeof highRisk = [];
  const ratio = safe.length > 0 ? Math.max(1, Math.floor(safe.length / (highRisk.length || 1))) : 0;
  let hi = 0;
  let si = 0;
  while (hi < highRisk.length || si < safe.length) {
    for (let i = 0; i < ratio && si < safe.length; i++) allBatchRows.push(safe[si++]);
    if (hi < highRisk.length) allBatchRows.push(highRisk[hi++]);
  }
  while (si < safe.length) allBatchRows.push(safe[si++]);

  // ── Compute supply-chain groups via union-find on lineage edges ──
  const lineageEdges = db.select().from(batchLineage).all();
  const parent = new Map<string, string>();

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root) ?? root;
    // Path compression
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur) ?? cur;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Initialize each batch as its own root
  for (const { batch } of allBatchRows) {
    parent.set(batch.id, batch.id);
  }

  // Union batches connected by lineage
  for (const edge of lineageEdges) {
    if (parent.has(edge.parentBatchId) && parent.has(edge.childBatchId)) {
      union(edge.parentBatchId, edge.childBatchId);
    }
  }

  // Map batch ID → chain group (the root's lot code for readability)
  const batchIdToLotCode = new Map(allBatchRows.map(({ batch }) => [batch.id, batch.lotCode]));
  function chainGroupFor(batchId: string): string {
    const root = find(batchId);
    return batchIdToLotCode.get(root) ?? root;
  }

  // ── Batch-fetch all stages and anomalies in 2 queries (eliminates N+1) ──
  const batchIds = allBatchRows.map(({ batch }) => batch.id);

  const allStages = batchIds.length > 0
    ? db.select().from(batchStages)
        .where(inArray(batchStages.batchId, batchIds))
        .orderBy(asc(batchStages.sequenceOrder))
        .all()
    : [];

  const allAnomalies = batchIds.length > 0
    ? db.select().from(stageAnomalies)
        .where(inArray(stageAnomalies.batchId, batchIds))
        .all()
    : [];

  // Index by batchId for O(1) lookup
  const stagesByBatch = new Map<string, typeof allStages>();
  for (const s of allStages) {
    const list = stagesByBatch.get(s.batchId) ?? [];
    list.push(s);
    stagesByBatch.set(s.batchId, list);
  }

  const anomaliesByBatch = new Map<string, typeof allAnomalies>();
  for (const a of allAnomalies) {
    const list = anomaliesByBatch.get(a.batchId) ?? [];
    list.push(a);
    anomaliesByBatch.set(a.batchId, list);
  }

  const sevRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

  const godBatches = allBatchRows.map(({ batch, product }) => {
    const stages = stagesByBatch.get(batch.id) ?? [];
    const anomalies = anomaliesByBatch.get(batch.id) ?? [];

    const anomalyCountByStage = new Map<string, number>();
    const maxSevByStage = new Map<string, string>();
    let maxSev: string | null = null;

    for (const a of anomalies) {
      anomalyCountByStage.set(a.stageId, (anomalyCountByStage.get(a.stageId) ?? 0) + 1);
      const prev = maxSevByStage.get(a.stageId);
      if (!prev || (sevRank[a.severity] ?? 0) > (sevRank[prev] ?? 0)) {
        maxSevByStage.set(a.stageId, a.severity);
      }
      if (!maxSev || (sevRank[a.severity] ?? 0) > (sevRank[maxSev] ?? 0)) {
        maxSev = a.severity;
      }
    }

    const lastStage = stages.length > 0 ? stages[stages.length - 1] : null;

    const riskLevel =
      batch.riskScore <= 20 ? "safe" as const :
      batch.riskScore <= 60 ? "warning" as const :
      "critical" as const;

    return {
      lotCode: batch.lotCode,
      productName: product.name,
      productBrand: product.brand,
      status: batch.status as "active" | "under_review" | "recalled",
      riskScore: batch.riskScore,
      riskLevel,
      unitCount: batch.unitCount,
      stageCount: stages.length,
      anomalyCount: anomalies.length,
      maxSeverity: (maxSev as "low" | "medium" | "high" | "critical") ?? null,
      stages: stages.map((s) => ({
        stageId: s.id,
        type: s.stageType as "harvest" | "collection" | "processing" | "packaging" | "storage" | "transport" | "retail",
        name: s.name,
        location: {
          name: s.locationName ?? "",
          lat: s.latitude ?? 0,
          lng: s.longitude ?? 0,
        },
        routeCoordinates: s.routeCoords ? JSON.parse(s.routeCoords) : undefined,
        sequenceOrder: s.sequenceOrder,
        anomalyCount: anomalyCountByStage.get(s.id) ?? 0,
        maxSeverity: (maxSevByStage.get(s.id) as "low" | "medium" | "high" | "critical") ?? null,
      })),
      lastLocation: lastStage && lastStage.latitude && lastStage.longitude
        ? { name: lastStage.locationName ?? "", lat: lastStage.latitude, lng: lastStage.longitude }
        : null,
      updatedAt: batch.updatedAt,
      chainGroup: chainGroupFor(batch.id),
    };
  });

  // Alerts: all anomalies joined with batch + product + stage info
  const alertRows = db
    .select({
      anomaly: stageAnomalies,
      batch: batches,
      product: products,
      stage: batchStages,
    })
    .from(stageAnomalies)
    .innerJoin(batches, eq(stageAnomalies.batchId, batches.id))
    .innerJoin(products, eq(batches.productId, products.id))
    .innerJoin(batchStages, eq(stageAnomalies.stageId, batchStages.id))
    .orderBy(desc(stageAnomalies.detectedAt))
    .limit(50)
    .all();

  const alerts = alertRows.map((r) => ({
    id: r.anomaly.id,
    batchLotCode: r.batch.lotCode,
    productName: r.product.name,
    severity: r.anomaly.severity as "low" | "medium" | "high" | "critical",
    anomalyType: r.anomaly.anomalyType as "cold_chain_break" | "humidity_spike" | "delayed_transport" | "contamination_risk" | "temperature_high" | "temperature_low",
    description: r.anomaly.description,
    detectedAt: r.anomaly.detectedAt,
    stageType: r.stage.stageType as "harvest" | "collection" | "processing" | "packaging" | "storage" | "transport" | "retail",
    locationName: r.stage.locationName ?? "",
    lat: r.stage.latitude ?? 0,
    lng: r.stage.longitude ?? 0,
  }));

  // Recent consumer reports
  const reports = db
    .select()
    .from(consumerReports)
    .orderBy(desc(consumerReports.createdAt))
    .limit(20)
    .all()
    .map((r) => ({
      id: r.id,
      lotCode: r.lotCode,
      category: r.category,
      description: r.description,
      createdAt: r.createdAt,
    }));

  // Metrics — computed from the full dataset, not the limited map subset
  const metricRows = db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${batches.status} = 'active' then 1 else 0 end)`,
      recalled: sql<number>`sum(case when ${batches.status} = 'recalled' then 1 else 0 end)`,
      avgRisk: sql<number>`round(avg(${batches.riskScore}))`,
    })
    .from(batches)
    .get()!;
  const activeBatches = metricRows.active ?? 0;
  const recalledBatches = metricRows.recalled ?? 0;
  const openIncidents = alerts.filter((a) => a.severity === "critical" || a.severity === "high").length;
  const avgRiskScore = metricRows.avgRisk ?? 0;

  // Lineage edges mapped to lot codes for the frontend
  const godLineageEdges = lineageEdges
    .filter((e) => batchIdToLotCode.has(e.parentBatchId) && batchIdToLotCode.has(e.childBatchId))
    .map((e) => ({
      parentLotCode: batchIdToLotCode.get(e.parentBatchId)!,
      childLotCode: batchIdToLotCode.get(e.childBatchId)!,
      relationship: e.relationship as "merge" | "split",
    }));

  return {
    batches: godBatches,
    lineageEdges: godLineageEdges,
    alerts,
    recentReports: reports,
    metrics: { activeBatches, openIncidents, avgRiskScore, recalledBatches },
  };
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
