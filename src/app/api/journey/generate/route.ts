import { NextResponse } from "next/server";
import { getProduct } from "@/lib/api/openfoodfacts";
import { inferOrigins, buildJourney } from "@/lib/origin/mapper";

export async function POST(request: Request) {
  const { barcode } = await request.json();

  if (!barcode) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_INPUT", message: "barcode is required" } },
      { status: 400 },
    );
  }

  const product = await getProduct(barcode);

  if (!product) {
    return NextResponse.json(
      { success: false, error: { code: "PRODUCT_NOT_FOUND", message: "Product not found on OpenFoodFacts" } },
      { status: 404 },
    );
  }

  const origins = inferOrigins(product.ingredients);
  const manufacturingPlace = product.manufacturingPlaces[0] ?? undefined;
  const journey = buildJourney(origins, manufacturingPlace);

  return NextResponse.json({
    success: true,
    data: {
      product: {
        name: product.name,
        brand: product.brand,
        barcode,
      },
      origins,
      journey,
    },
  });
}
