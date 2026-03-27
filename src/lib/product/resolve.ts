import { getProduct as getOpenFoodFactsProduct } from "@/lib/api/openfoodfacts";
import { getActiveLotForProduct, getBatchJourney, getProductByBarcode } from "@/lib/db/queries";
import { serializeJourneyStages } from "@/lib/journey/serialize";
import { inferOrigins, type OriginResult } from "@/lib/origin/mapper";
import type { JourneyStage } from "@/lib/types";

export interface ResolvedProduct {
  barcode: string;
  name: string;
  brand: string;
  category: string | null;
  imageUrl: string | null;
  source: "internal" | "open_food_facts" | "merged";
  ingredientsText: string | null;
  ingredients: string[];
  allergens: string[];
  nutriScore: string | null;
  ecoScore: string | null;
  labels: string[];
  origins: string[];
  manufacturingPlaces: string[];
  inferredOrigins: OriginResult[];
}

export interface ResolvedProductDetails {
  product: ResolvedProduct;
  activeLot: {
    lotCode: string;
    status: string;
    riskScore: number;
    createdAt: string;
    updatedAt: string;
  } | null;
  supplyChain: JourneyStage[];
}

const splitTextList = (value?: string | null): string[] =>
  (value ?? "")
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .map((entry) => entry.replace(/\.$/, ""))
    .filter(Boolean);

const dedupe = (values: string[]): string[] => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

const parseJsonArray = (value?: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return dedupe(parsed.map((entry) => String(entry)));
    }
  } catch {
    return dedupe(splitTextList(value));
  }

  return [];
};

async function lookupOpenFoodFacts(barcode: string) {
  try {
    return await getOpenFoodFactsProduct(barcode);
  } catch {
    return null;
  }
}

export async function resolveProductDetails(barcode: string): Promise<ResolvedProductDetails | null> {
  const internalProduct = getProductByBarcode(barcode);
  const offProduct = await lookupOpenFoodFacts(barcode);

  if (!internalProduct && !offProduct) {
    return null;
  }

  const activeLot = internalProduct ? getActiveLotForProduct(internalProduct.id) : null;
  const batchJourney = activeLot ? getBatchJourney(activeLot.lotCode) : null;
  const supplyChain = batchJourney ? serializeJourneyStages(batchJourney.stages) : [];

  const ingredients = dedupe(
    offProduct?.ingredients.length
      ? offProduct.ingredients
      : splitTextList(internalProduct?.ingredients),
  );
  const allergens = dedupe(
    offProduct?.allergens.length
      ? offProduct.allergens
      : parseJsonArray(internalProduct?.allergens),
  );

  return {
    product: {
      barcode,
      name: internalProduct?.name ?? offProduct?.name ?? "Unknown product",
      brand: internalProduct?.brand ?? offProduct?.brand ?? "Unknown brand",
      category: internalProduct?.category ?? offProduct?.categories[0] ?? null,
      imageUrl: internalProduct?.imageUrl ?? offProduct?.imageUrl ?? null,
      source: internalProduct && offProduct ? "merged" : internalProduct ? "internal" : "open_food_facts",
      ingredientsText: offProduct?.ingredientsText ?? internalProduct?.ingredients ?? null,
      ingredients,
      allergens,
      nutriScore: offProduct?.nutriScore ?? internalProduct?.nutriScore ?? null,
      ecoScore: offProduct?.ecoScore ?? internalProduct?.ecoScore ?? null,
      labels: offProduct?.labels ?? [],
      origins: offProduct?.origins ?? [],
      manufacturingPlaces: offProduct?.manufacturingPlaces ?? [],
      inferredOrigins: internalProduct ? [] : inferOrigins(ingredients),
    },
    activeLot: activeLot
      ? {
          lotCode: activeLot.lotCode,
          status: activeLot.status,
          riskScore: activeLot.riskScore,
          createdAt: activeLot.createdAt,
          updatedAt: activeLot.updatedAt,
        }
      : null,
    supplyChain,
  };
}
