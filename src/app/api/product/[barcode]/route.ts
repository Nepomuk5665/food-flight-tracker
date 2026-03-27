import { NextResponse } from "next/server";

type ProductRouteContext = {
  params: Promise<{ barcode: string }>;
};

export async function GET(_request: Request, context: ProductRouteContext) {
  const { barcode } = await context.params;

  try {
    const { resolveProductDetails } = await import("@/lib/product/resolve");
    const productDetails = await resolveProductDetails(barcode);

    if (!productDetails) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: `No product found for barcode ${barcode}`,
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: productDetails,
    });
  } catch (error) {
    console.error("Product lookup failed", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PRODUCT_LOOKUP_FAILED",
          message: "Unable to load product details right now",
        },
      },
      { status: 500 },
    );
  }
}