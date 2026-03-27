export interface OpenFoodFactsProduct {
  name: string;
  brand: string;
  imageUrl: string | null;
  ingredients: string[];
  nutriScore: string | null;
  ecoScore: string | null;
  labels: string[];
  origins: string[];
  manufacturingPlaces: string[];
}

interface OpenFoodFactsResponse {
  status?: number;
  product?: {
    product_name?: string;
    brands?: string;
    image_front_url?: string;
    image_url?: string;
    ingredients_text?: string;
    ingredients_tags?: string[];
    nutriscore_grade?: string;
    ecoscore_grade?: string;
    labels_tags?: string[];
    labels?: string;
    origins?: string;
    origins_tags?: string[];
    manufacturing_places?: string;
    manufacturing_places_tags?: string[];
  };
}

const splitCsv = (value?: string): string[] =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeTags = (values?: string[]): string[] =>
  (values ?? []).map((entry) => entry.replace(/^[a-z]{2}:/, "").trim()).filter(Boolean);

export async function getProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
    headers: {
      "User-Agent": "FoodFlightTracker/1.0",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`OpenFoodFacts request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  if (!payload.product || payload.status === 0) {
    return null;
  }

  const product = payload.product;

  const ingredientsFromText = splitCsv(product.ingredients_text);
  const ingredientsFromTags = normalizeTags(product.ingredients_tags);

  return {
    name: product.product_name?.trim() || "Unknown product",
    brand: product.brands?.trim() || "Unknown brand",
    imageUrl: product.image_front_url ?? product.image_url ?? null,
    ingredients: ingredientsFromText.length > 0 ? ingredientsFromText : ingredientsFromTags,
    nutriScore: product.nutriscore_grade?.toUpperCase() || null,
    ecoScore: product.ecoscore_grade?.toUpperCase() || null,
    labels: normalizeTags(product.labels_tags).length > 0 ? normalizeTags(product.labels_tags) : splitCsv(product.labels),
    origins: normalizeTags(product.origins_tags).length > 0 ? normalizeTags(product.origins_tags) : splitCsv(product.origins),
    manufacturingPlaces:
      normalizeTags(product.manufacturing_places_tags).length > 0
        ? normalizeTags(product.manufacturing_places_tags)
        : splitCsv(product.manufacturing_places),
  };
}
