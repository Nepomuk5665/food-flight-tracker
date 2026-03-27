import { NextResponse } from "next/server";
import { getAllBatches, getAllCriticalAnomalies, getAllRecalls, getAllReports } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { batchStages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const allBatches = getAllBatches();
  const anomalies = getAllCriticalAnomalies();
  const recalls = getAllRecalls();
  const reports = getAllReports();

  const batchesWithProduct = allBatches.map(({ batch, product }) => {
    const lastStage = db.select({ lat: batchStages.latitude, lng: batchStages.longitude })
      .from(batchStages)
      .where(eq(batchStages.batchId, batch.id))
      .orderBy(asc(batchStages.sequenceOrder))
      .limit(1)
      .get();

    return {
      lotCode: batch.lotCode,
      productName: product?.name ?? "Unknown",
      productBarcode: product?.barcode ?? "",
      status: batch.status,
      riskScore: batch.riskScore,
      unitCount: batch.unitCount,
      createdAt: batch.createdAt,
      latitude: lastStage?.lat ?? null,
      longitude: lastStage?.lng ?? null,
    };
  });

  const metrics = {
    totalBatches: allBatches.length,
    activeBatches: allBatches.filter(({ batch }) => batch.status === "active").length,
    criticalAnomalies: anomalies.length,
    activeRecalls: recalls.filter((r) => r.status === "active").length,
    consumerReports: reports.length,
    avgRiskScore: allBatches.length
      ? Math.round(allBatches.reduce((s, { batch }) => s + batch.riskScore, 0) / allBatches.length)
      : 0,
  };

  return NextResponse.json({
    success: true,
    data: { batches: batchesWithProduct, anomalies, recalls, reports, metrics },
  });
}
