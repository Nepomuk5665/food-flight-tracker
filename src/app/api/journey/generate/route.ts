import { NextResponse } from "next/server";
import { buildJourney } from "@/lib/origin/mapper";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { barcode?: string };
    const barcode = body.barcode?.trim();

    if (!barcode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_BARCODE",
            message: "Barcode is required",
          },
        },
        { status: 400 },
      );
    }

    const { resolveProductDetails } = await import("@/lib/product/resolve");
    const productDetails = await resolveProductDetails(barcode);

    if (!productDetails) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        },
        { status: 404 },
      );
    }

    if (productDetails.activeLot && productDetails.supplyChain.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          generated: false,
          batch: {
            lotCode: productDetails.activeLot.lotCode,
            status: productDetails.activeLot.status,
            riskScore: productDetails.activeLot.riskScore,
            productName: productDetails.product.name,
          },
          journey: productDetails.supplyChain,
        },
      });
    }

    if (productDetails.product.inferredOrigins.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "JOURNEY_UNAVAILABLE",
            message: "Journey could not be inferred for this product",
          },
        },
        { status: 422 },
      );
    }

    const generatedJourney = buildJourney(
      productDetails.product.inferredOrigins,
      productDetails.product.manufacturingPlaces[0],
    );

    return NextResponse.json({
      success: true,
      data: {
        generated: true,
        batch: {
          lotCode: `INF-${barcode}`,
          status: "inferred",
          riskScore: 0,
          productName: productDetails.product.name,
        },
        journey: generatedJourney,
      },
    });
  } catch (error) {
    console.error("Journey generation failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "JOURNEY_GENERATION_FAILED",
          message: "Unable to generate journey right now",
        },
      },
      { status: 500 },
    );
  }
}