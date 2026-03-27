import { NextResponse } from "next/server";

// TODO: replace mock response with real DB query once src/lib/db is implemented.
import type {} from "@/lib/db";

type ProductRouteContext = {
  params: Promise<{ barcode: string }>;
};

export async function GET(_request: Request, context: ProductRouteContext) {
  const { barcode } = await context.params;

  return NextResponse.json({
    success: true,
    data: {
      product: {
        barcode,
        name: "Demo Product",
        brand: "Demo",
      },
      activeLot: null,
    },
  });
}
