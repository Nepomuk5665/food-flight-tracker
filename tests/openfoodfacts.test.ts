import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getProduct } from "@/lib/api/openfoodfacts";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function okResponse(product: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 1, product }),
  };
}

describe("getProduct", () => {
  it("returns null for 404 response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await getProduct("0000000000000");
    expect(result).toBeNull();
  });

  it("returns null for 429 rate-limited response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    const result = await getProduct("0000000000000");
    expect(result).toBeNull();
  });

  it("returns null for non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await getProduct("0000000000000");
    expect(result).toBeNull();
  });

  it("returns null when payload has status 0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 0, product: {} }),
    });
    const result = await getProduct("0000000000000");
    expect(result).toBeNull();
  });

  it("returns null when product field is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 1 }),
    });
    const result = await getProduct("0000000000000");
    expect(result).toBeNull();
  });

  it("parses a full product correctly", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        product_name: " Nutella ",
        brands: " Ferrero ",
        image_front_url: "https://images.openfoodfacts.org/images/products/301/762/401/0701/front_fr.99.400.jpg",
        ingredients_text: "sugar; palm oil; hazelnuts",
        ingredients_tags: ["en:sugar", "en:palm-oil", "en:hazelnuts"],
        allergens_tags: ["en:nuts"],
        allergens: "nuts",
        allergens_from_ingredients: "hazelnuts",
        traces_tags: ["en:milk"],
        traces: "milk",
        nutriscore_grade: "e",
        ecoscore_grade: "c",
        labels_tags: ["en:no-palm-oil"],
        origins_tags: ["en:france"],
        manufacturing_places_tags: [],
        manufacturing_places: "Rouen, France",
        categories_tags: ["en:spreads", "en:chocolate-spreads"],
      }),
    );

    const result = await getProduct("3017624010701");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Nutella");
    expect(result!.brand).toBe("Ferrero");
    expect(result!.nutriScore).toBe("E");
    expect(result!.ecoScore).toBe("C");
    expect(result!.ingredients).toEqual(["sugar", "palm oil", "hazelnuts"]);
    expect(result!.allergens).toContain("nuts");
    expect(result!.allergens).toContain("hazelnuts");
    expect(result!.allergens).toContain("milk");
    expect(result!.labels).toEqual(["no palm oil"]);
    expect(result!.origins).toEqual(["france"]);
    expect(result!.manufacturingPlaces).toEqual(["Rouen", "France"]);
    expect(result!.categories).toEqual(["spreads", "chocolate spreads"]);
  });

  it("upgrades image URL to full resolution", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        image_front_url: "https://images.openfoodfacts.org/images/products/123/front.42.400.jpg",
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.imageUrl).toBe(
      "https://images.openfoodfacts.org/images/products/123/front.42.full.jpg",
    );
  });

  it("falls back to image_url when image_front_url is missing", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        image_url: "https://images.openfoodfacts.org/images/products/123/1.100.jpg",
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.imageUrl).toBe(
      "https://images.openfoodfacts.org/images/products/123/1.full.jpg",
    );
  });

  it("returns null imageUrl when no image provided", async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    const result = await getProduct("1234567890123");
    expect(result!.imageUrl).toBeNull();
  });

  it("defaults name to 'Unknown product' when missing", async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    const result = await getProduct("1234567890123");
    expect(result!.name).toBe("Unknown product");
  });

  it("defaults brand to 'Unknown brand' when missing", async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    const result = await getProduct("1234567890123");
    expect(result!.brand).toBe("Unknown brand");
  });

  it("returns null nutriScore when not available", async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    const result = await getProduct("1234567890123");
    expect(result!.nutriScore).toBeNull();
  });

  it("prefers ingredients_text over ingredients_tags", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        ingredients_text: "flour; water; salt",
        ingredients_tags: ["en:flour", "en:water"],
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.ingredients).toEqual(["flour", "water", "salt"]);
  });

  it("falls back to ingredients_tags when ingredients_text is empty", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        ingredients_text: "",
        ingredients_tags: ["en:flour", "en:water"],
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.ingredients).toEqual(["flour", "water"]);
  });

  it("deduplicates allergen sources", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        allergens_tags: ["en:milk"],
        allergens: "milk",
        allergens_from_ingredients: "milk",
        traces_tags: ["en:milk"],
        traces: "milk",
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.allergens).toEqual(["milk"]);
  });

  it("cleans language prefix and underscores from tags", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        categories_tags: ["en:plant_based-foods", "fr:some-category"],
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.categories).toContain("plant based foods");
    expect(result!.categories).toContain("some category");
  });

  it("removes trailing period from CSV entries", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        ingredients_text: "sugar.; flour.",
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.ingredients).toEqual(["sugar", "flour"]);
  });

  it("sends correct User-Agent header", async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await getProduct("1234567890123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://world.openfoodfacts.org/api/v2/product/1234567890123.json",
      { headers: { "User-Agent": "FoodFlightTracker/1.0" } },
    );
  });

  it("prefers labels_tags over labels text", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        labels_tags: ["en:organic"],
        labels: "Organic, Fair Trade",
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.labels).toEqual(["organic"]);
  });

  it("falls back to labels text when labels_tags is empty", async () => {
    mockFetch.mockResolvedValue(
      okResponse({
        labels_tags: [],
        labels: "Organic; Fair Trade",
      }),
    );
    const result = await getProduct("1234567890123");
    expect(result!.labels).toEqual(["Organic", "Fair Trade"]);
  });
});
