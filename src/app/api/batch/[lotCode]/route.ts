import { NextResponse } from "next/server";
import { getBatchLineage } from "@/lib/db/queries";

type Ctx = { params: Promise<{ lotCode: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { lotCode } = await context.params;

  const [{ getBatchJourney, getProductById }, { serializeJourneyStages }] = await Promise.all([
    import("@/lib/db/queries"),
    import("@/lib/journey/serialize"),
  ]);

  const batchJourney = getBatchJourney(lotCode);

  if (!batchJourney) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BATCH_NOT_FOUND",
          message: `No batch found for lot code ${lotCode}`,
        },
      },
      { status: 404 },
    );
  }

  const product = getProductById(batchJourney.batch.productId);
  const lineage = getBatchLineage(batchJourney.batch.id);

  return NextResponse.json({
    success: true,
    data: {
      generated: false,
      batch: {
        lotCode: batchJourney.batch.lotCode,
        status: batchJourney.batch.status,
        riskScore: batchJourney.batch.riskScore,
        productName: product?.name ?? "Unknown product",
      },
      journey: serializeJourneyStages(batchJourney.stages),
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
    },
  });
}
