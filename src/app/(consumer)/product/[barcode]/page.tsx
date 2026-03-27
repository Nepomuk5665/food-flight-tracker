import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ProductTabs from "./ProductTabs";

type ProductPageProps = {
  params: Promise<{ barcode: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { barcode } = await params;
  const { resolveProductDetails } = await import("@/lib/product/resolve");
  const productDetails = await resolveProductDetails(barcode);

  if (!productDetails) {
    return (
      <section className="space-y-4 font-sans">
        <header className="border border-border bg-white p-4 rounded-xl">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">Product Details</h1>
          <p className="mt-2 text-sm text-muted">Barcode: {barcode}</p>
        </header>

        <div className="space-y-3 border border-border bg-surface p-5 rounded-xl">
          <h2 className="text-xl font-bold uppercase tracking-wide text-primary">Product Not Found</h2>
          <p className="text-sm text-body">
            This barcode is not in our database and OpenFoodFacts did not return a matching product.
          </p>
          <Link href="/scan" className="flex items-center gap-1 text-sm text-accent">
            <ChevronLeft className="h-4 w-4" /> Back to scan
          </Link>
        </div>
      </section>
    );
  }

  const { product, activeLot, supplyChain } = productDetails;
  const canGenerateJourney = Boolean(activeLot || product.inferredOrigins.length > 0);

  const aiContext = [
    `PRODUCT: ${product.name} by ${product.brand}`,
    `Barcode: ${barcode}`,
    `Source: ${product.source}`,
    product.nutriScore ? `Nutri-Score: ${product.nutriScore}` : null,
    product.ecoScore ? `Eco-Score: ${product.ecoScore}` : null,
    product.ingredients.length > 0 ? `Ingredients: ${product.ingredients.join(", ")}` : null,
    product.allergens.length > 0 ? `Allergens: ${product.allergens.join(", ")}` : null,
    product.labels.length > 0 ? `Labels: ${product.labels.join(", ")}` : null,
    product.origins.length > 0 ? `Declared Origins: ${product.origins.join(", ")}` : null,
    product.manufacturingPlaces.length > 0 ? `Manufacturing: ${product.manufacturingPlaces.join(", ")}` : null,
    product.inferredOrigins.length > 0 ? `Inferred Origins: ${product.inferredOrigins.map((o) => `${o.ingredient} → ${o.country}`).join(", ")}` : null,
    activeLot ? `\nBATCH: ${activeLot.lotCode} (Status: ${activeLot.status}, Risk: ${activeLot.riskScore}/100)` : null,
  ].filter(Boolean).join("\n");

  return (
    <Suspense>
      <ProductTabs
        barcode={barcode}
        product={product}
        activeLot={activeLot ? { lotCode: activeLot.lotCode, status: activeLot.status, riskScore: activeLot.riskScore } : null}
        supplyChain={supplyChain}
        aiContext={aiContext}
        canGenerateJourney={canGenerateJourney}
      />
    </Suspense>
  );
}
