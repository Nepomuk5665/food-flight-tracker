import { NextResponse } from "next/server";

type BatchRouteContext = {
  params: Promise<{ lotCode: string }>;
};

export async function GET(_request: Request, context: BatchRouteContext) {
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
          message: "Journey not found",
        },
      },
      { status: 404 },
    );
  }

  const product = getProductById(batchJourney.batch.productId);

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
    },
  });
}
