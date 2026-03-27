import { NextResponse } from "next/server";
import {
  getProductByBarcode,
  getActiveLotForProduct,
  upsertProductFromOFF,
} from "@/lib/db/queries";
import { getProduct as getOFFProduct } from "@/lib/api/openfoodfacts";

type Ctx = { params: Promise<{ barcode: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { barcode } = await context.params;

  let product = getProductByBarcode(barcode);

  if (!product) {
    try {
      const off = await getOFFProduct(barcode);
      if (off) {
        product = upsertProductFromOFF({
          barcode,
          name: off.name,
          brand: off.brand,
          category: "unknown",
          imageUrl: off.imageUrl,
          nutriScore: off.nutriScore,
          ecoScore: off.ecoScore,
          ingredients: off.ingredients.join(", "),
          allergens: [],
          offData: {
            labels: off.labels,
            origins: off.origins,
            manufacturingPlaces: off.manufacturingPlaces,
          },
        });
      }
    } catch {
      // OpenFoodFacts unavailable — continue with null
    }
  }

  if (!product) {
    return NextResponse.json(
      { success: false, error: { code: "PRODUCT_NOT_FOUND", message: `No product found for barcode ${barcode}` } },
      { status: 404 },
    );
  }

  const activeLot = getActiveLotForProduct(product.id);

  return NextResponse.json({
    success: true,
    data: {
      product: {
        ...product,
        allergens: JSON.parse(product.allergens ?? "[]"),
        offData: product.offData ? JSON.parse(product.offData) : null,
      },
      activeLot: activeLot
        ? {
            lotCode: activeLot.lotCode,
            status: activeLot.status,
            riskScore: activeLot.riskScore,
          }
        : null,
    },
  });
}
