import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/openfoodfacts", () => ({
  getProduct: vi.fn(),
}));

vi.mock("@/lib/db/queries", () => ({
  getProductByBarcode: vi.fn(),
  getActiveLotForProduct: vi.fn(),
  getBatchJourney: vi.fn(),
}));

vi.mock("@/lib/journey/serialize", () => ({
  serializeJourneyStages: vi.fn(() => []),
}));

import { resolveProductDetails } from "@/lib/product/resolve";
import { getProduct as mockGetProduct } from "@/lib/api/openfoodfacts";
import {
  getProductByBarcode as mockGetProductByBarcode,
  getActiveLotForProduct as mockGetActiveLotForProduct,
  getBatchJourney as mockGetBatchJourney,
} from "@/lib/db/queries";
import { serializeJourneyStages as mockSerialize } from "@/lib/journey/serialize";

beforeEach(() => {
  vi.clearAllMocks();
});

const internalProduct = {
  id: "prod-1",
  barcode: "4012345678901",
  name: "Swiss Chocolate",
  brand: "ChocoBrand",
  category: "chocolate",
  imageUrl: "https://example.com/choc.jpg",
  source: "internal",
  nutriScore: "C",
  ecoScore: "B",
  ingredients: "cocoa; sugar; milk",
  allergens: '["milk","soy"]',
  offData: "{}",
  createdAt: "2026-01-01",
};

const offProduct = {
  name: "Nutella",
  brand: "Ferrero",
  imageUrl: "https://off.example.com/nutella.jpg",
  ingredientsText: "sugar; palm oil; hazelnuts",
  ingredients: ["sugar", "palm oil", "hazelnuts"],
  allergens: ["nuts", "milk"],
  nutriScore: "E",
  ecoScore: "C",
  labels: ["no-palm-oil"],
  origins: ["France"],
  manufacturingPlaces: ["Rouen"],
  categories: ["spreads"],
};

const activeLot = {
  id: "batch-1",
  lotCode: "L001",
  productId: "prod-1",
  status: "active",
  riskScore: 12,
  unitCount: 5000,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-15",
};

describe("resolveProductDetails", () => {
  it("returns null when neither internal nor OFF product found", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(undefined);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    const result = await resolveProductDetails("0000000000000");
    expect(result).toBeNull();
  });

  it("resolves internal-only product with supply chain", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(activeLot);
    vi.mocked(mockGetBatchJourney).mockReturnValue({ batch: activeLot, product: { name: "Swiss Chocolate", brand: "ChocoBrand" }, stages: [] });
    vi.mocked(mockSerialize).mockReturnValue([]);

    const result = await resolveProductDetails("4012345678901");
    expect(result).not.toBeNull();
    expect(result!.product.source).toBe("internal");
    expect(result!.product.name).toBe("Swiss Chocolate");
    expect(result!.product.brand).toBe("ChocoBrand");
    expect(result!.product.inferredOrigins).toEqual([]);
    expect(result!.activeLot).not.toBeNull();
    expect(result!.activeLot!.lotCode).toBe("L001");
  });

  it("resolves OFF-only product with inferred origins", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(undefined);
    vi.mocked(mockGetProduct).mockResolvedValue(offProduct);

    const result = await resolveProductDetails("3017624010701");
    expect(result).not.toBeNull();
    expect(result!.product.source).toBe("open_food_facts");
    expect(result!.product.name).toBe("Nutella");
    expect(result!.product.ingredients).toEqual(["sugar", "palm oil", "hazelnuts"]);
    expect(result!.product.allergens).toEqual(["nuts", "milk"]);
    expect(result!.product.inferredOrigins.length).toBeGreaterThan(0);
    expect(result!.activeLot).toBeNull();
    expect(result!.supplyChain).toEqual([]);
  });

  it("resolves merged product (both internal and OFF exist)", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue(offProduct);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(activeLot);
    vi.mocked(mockGetBatchJourney).mockReturnValue({ batch: activeLot, product: { name: "Swiss Chocolate", brand: "ChocoBrand" }, stages: [] });
    vi.mocked(mockSerialize).mockReturnValue([]);

    const result = await resolveProductDetails("4012345678901");
    expect(result).not.toBeNull();
    expect(result!.product.source).toBe("merged");
    expect(result!.product.name).toBe("Swiss Chocolate");
    expect(result!.product.nutriScore).toBe("E");
    expect(result!.product.ingredients).toEqual(["sugar", "palm oil", "hazelnuts"]);
    expect(result!.product.allergens).toEqual(["nuts", "milk"]);
  });

  it("falls back to internal ingredients when OFF has none", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue({ ...offProduct, ingredients: [] });
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.product.ingredients).toEqual(["cocoa", "sugar", "milk"]);
  });

  it("falls back to internal allergens when OFF has none", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue({ ...offProduct, allergens: [] });
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.product.allergens).toEqual(["milk", "soy"]);
  });

  it("handles OFF fetch failure gracefully", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockRejectedValue(new Error("Network error"));
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result).not.toBeNull();
    expect(result!.product.source).toBe("internal");
  });

  it("returns null activeLot when product has no batches", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.activeLot).toBeNull();
    expect(result!.supplyChain).toEqual([]);
  });

  it("serializes supply chain stages from batch journey", async () => {
    const mockStages = [{ id: "s1", stageType: "processing", sequenceOrder: 1 }];
    const mockSerialized = [{ stageId: "s1", type: "processing", name: "Test", sequenceOrder: 1 }];

    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(activeLot);
    vi.mocked(mockGetBatchJourney).mockReturnValue({ batch: activeLot, product: { name: "X", brand: "Y" }, stages: mockStages as never });
    vi.mocked(mockSerialize).mockReturnValue(mockSerialized as never);

    const result = await resolveProductDetails("4012345678901");
    expect(mockSerialize).toHaveBeenCalledWith(mockStages);
    expect(result!.supplyChain).toEqual(mockSerialized);
  });

  it("includes OFF labels, origins, manufacturingPlaces", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(undefined);
    vi.mocked(mockGetProduct).mockResolvedValue(offProduct);

    const result = await resolveProductDetails("3017624010701");
    expect(result!.product.labels).toEqual(["no-palm-oil"]);
    expect(result!.product.origins).toEqual(["France"]);
    expect(result!.product.manufacturingPlaces).toEqual(["Rouen"]);
  });

  it("defaults to empty arrays for labels/origins when OFF not available", async () => {
    vi.mocked(mockGetProductByBarcode).mockReturnValue(internalProduct);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.product.labels).toEqual([]);
    expect(result!.product.origins).toEqual([]);
    expect(result!.product.manufacturingPlaces).toEqual([]);
  });

  it("parses allergens from non-JSON CSV string in internal product", async () => {
    const productWithCsvAllergens = {
      ...internalProduct,
      allergens: "milk, soy, wheat",
    };
    vi.mocked(mockGetProductByBarcode).mockReturnValue(productWithCsvAllergens);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.product.allergens).toEqual(["milk", "soy", "wheat"]);
  });

  it("handles internal product with non-array JSON allergens", async () => {
    const productWithObjAllergens = {
      ...internalProduct,
      allergens: '{"note":"none"}',
    };
    vi.mocked(mockGetProductByBarcode).mockReturnValue(productWithObjAllergens);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.product.allergens).toEqual([]);
  });

  it("handles internal product with null allergens", async () => {
    const productWithNullAllergens = {
      ...internalProduct,
      allergens: null,
    };
    vi.mocked(mockGetProductByBarcode).mockReturnValue(productWithNullAllergens);
    vi.mocked(mockGetProduct).mockResolvedValue(null);
    vi.mocked(mockGetActiveLotForProduct).mockReturnValue(undefined);

    const result = await resolveProductDetails("4012345678901");
    expect(result!.product.allergens).toEqual([]);
  });
});
