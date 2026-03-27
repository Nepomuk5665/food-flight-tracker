export interface OpenFoodFactsProduct {
  name: string;
  brand: string;
  imageUrl: string | null;
  ingredientsText: string | null;
  ingredients: string[];
  allergens: string[];
  nutriScore: string | null;
  ecoScore: string | null;
  labels: string[];
  origins: string[];
  manufacturingPlaces: string[];
  categories: string[];
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
    allergens?: string;
    allergens_tags?: string[];
    allergens_from_ingredients?: string;
    traces?: string;
    traces_tags?: string[];
    nutriscore_grade?: string;
    ecoscore_grade?: string;
    labels_tags?: string[];
    labels?: string;
    origins?: string;
    origins_tags?: string[];
    manufacturing_places?: string;
    manufacturing_places_tags?: string[];
    categories_tags?: string[];
    categories?: string;
  };
}

/**
 * Rewrite an OFF image URL to request the full-resolution version.
 * OFF URLs end with `.{rev}.{size}.jpg` where size is 100|200|400.
 * Replacing the size segment with `full` returns the original upload.
 */
function toFullResUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/\.\d+\.jpg$/, ".full.jpg");
}

const splitCsv = (value?: string): string[] =>
  (value ?? "")
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .map((entry) => entry.replace(/\.$/, ""))
    .filter(Boolean);

const cleanEntry = (entry: string): string =>
  entry
    .replace(/^[a-z]{2}:/, "")
    .replace(/[_-]+/g, " ")
    .trim();

const dedupe = (values: string[]): string[] => [...new Set(values.filter(Boolean))];

const normalizeTags = (values?: string[]): string[] => dedupe((values ?? []).map(cleanEntry).filter(Boolean));

const normalizeTextValues = (value?: string): string[] => dedupe(splitCsv(value).map(cleanEntry).filter(Boolean));

export async function getProduct(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
    headers: {
      "User-Agent": "FoodFlightTracker/1.0",
    },
  });

  if (response.status === 404 || response.status === 429) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  if (!payload.product || payload.status === 0) {
    return null;
  }

  const product = payload.product;

  const ingredientsFromText = splitCsv(product.ingredients_text);
  const ingredientsFromTags = normalizeTags(product.ingredients_tags);
  const allergens = dedupe([
    ...normalizeTags(product.allergens_tags),
    ...normalizeTextValues(product.allergens),
    ...normalizeTextValues(product.allergens_from_ingredients),
    ...normalizeTags(product.traces_tags),
    ...normalizeTextValues(product.traces),
  ]);

  return {
    name: product.product_name?.trim() || "Unknown product",
    brand: product.brands?.trim() || "Unknown brand",
    imageUrl: toFullResUrl(product.image_front_url ?? product.image_url ?? null),
    ingredientsText: product.ingredients_text?.trim() || null,
    ingredients: ingredientsFromText.length > 0 ? ingredientsFromText : ingredientsFromTags,
    allergens,
    nutriScore: product.nutriscore_grade?.toUpperCase() || null,
    ecoScore: product.ecoscore_grade?.toUpperCase() || null,
    labels:
      normalizeTags(product.labels_tags).length > 0
        ? normalizeTags(product.labels_tags)
        : normalizeTextValues(product.labels),
    origins:
      normalizeTags(product.origins_tags).length > 0
        ? normalizeTags(product.origins_tags)
        : normalizeTextValues(product.origins),
    manufacturingPlaces:
      normalizeTags(product.manufacturing_places_tags).length > 0
        ? normalizeTags(product.manufacturing_places_tags)
        : normalizeTextValues(product.manufacturing_places),
    categories: normalizeTags(product.categories_tags),
  };
}
