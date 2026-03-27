import { NextResponse } from "next/server";

type BatchRouteContext = {
  params: Promise<{ lotCode: string }>;
};

export async function GET(_request: Request, context: BatchRouteContext) {
  const { lotCode } = await context.params;

  return NextResponse.json({
    success: true,
    data: {
      batch: {
        lotCode,
        status: "active",
      },
      journey: [
        {
          stageId: "stage-1",
          name: "Origin Farm",
          type: "harvest",
          location: "Kumasi, Ghana",
        },
        {
          stageId: "stage-2",
          name: "Processing Plant",
          type: "processing",
          location: "Brussels, Belgium",
        },
        {
          stageId: "stage-3",
          name: "Retail Distribution",
          type: "distribution",
          location: "Munich, Germany",
        },
      ],
    },
  });
}
