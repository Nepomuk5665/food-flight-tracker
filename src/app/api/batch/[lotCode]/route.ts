import { NextResponse } from "next/server";
import { getBatchJourney, getBatchLineage, getFullLineageTree, getActiveRecallForBatch } from "@/lib/db/queries";

type Ctx = { params: Promise<{ lotCode: string }> };

export async function GET(request: Request, context: Ctx) {
  const { lotCode } = await context.params;
  const url = new URL(request.url);
  const includeLineageStages = url.searchParams.get("include") === "lineage-stages";

  const journey = getBatchJourney(lotCode);

  if (!journey) {
    return NextResponse.json(
      { success: false, error: { code: "BATCH_NOT_FOUND", message: `No batch found for lot code ${lotCode}` } },
      { status: 404 },
    );
  }

  const lineage = getBatchLineage(journey.batch.id);

  const telemetrySummaries = journey.stages.map((stage) => {
    const temps = stage.telemetry.filter((t) => t.readingType === "temperature");
    const humids = stage.telemetry.filter((t) => t.readingType === "humidity");

    return {
      stageId: stage.id,
      type: stage.stageType,
      name: stage.name,
      location: {
        name: stage.locationName,
        lat: stage.latitude,
        lng: stage.longitude,
      },
      routeCoordinates: stage.routeCoords,
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
      operator: stage.operator,
      metadata: stage.metadata,
      sequenceOrder: stage.sequenceOrder,
      telemetry: {
        avgTemperature: temps.length ? +(temps.reduce((s, t) => s + t.value, 0) / temps.length).toFixed(1) : null,
        maxTemperature: temps.length ? +Math.max(...temps.map((t) => t.value)).toFixed(1) : null,
        minTemperature: temps.length ? +Math.min(...temps.map((t) => t.value)).toFixed(1) : null,
        avgHumidity: humids.length ? +(humids.reduce((s, t) => s + t.value, 0) / humids.length).toFixed(1) : null,
        readings: stage.telemetry,
      },
      anomalies: stage.anomalies,
    };
  });

  const lineageTree = includeLineageStages
    ? getFullLineageTree(lotCode)
    : undefined;

  const recall = journey.batch.status === "recalled"
    ? getActiveRecallForBatch(journey.batch.id)
    : null;

  return NextResponse.json({
    success: true,
    data: {
      batch: journey.batch,
      product: journey.product,
      journey: telemetrySummaries,
      lineage: {
        parents: lineage.parents.map((p) => ({
          lotCode: p.parentBatch.lotCode,
          relationship: p.lineage.relationship,
          ratio: p.lineage.ratio,
        })),
        children: lineage.children.map((c) => ({
          lotCode: c.childBatch.lotCode,
          relationship: c.lineage.relationship,
          ratio: c.lineage.ratio,
        })),
      },
      ...(lineageTree ? { lineageTree } : {}),
      ...(recall ? { recall: { id: recall.id, reason: recall.reason, severity: recall.severity, createdAt: recall.createdAt } } : {}),
    },
  });
}
