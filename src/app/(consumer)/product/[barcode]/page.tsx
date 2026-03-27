import GenerateJourneyButton from "./generate-journey-button";
import SaveToHistory from "./save-to-history";
import AiInsights from "@/components/ai-insights";

type ProductPageProps = {
  params: Promise<{ barcode: string }>;
};

const SCORE_STYLES: Record<string, string> = {
  A: "border-[#2e7d32] bg-[#2e7d32] text-white",
  B: "border-[#7cb342] bg-[#7cb342] text-white",
  C: "border-[#f9a825] bg-[#f9a825] text-[#1f1f1f]",
  D: "border-[#ef6c00] bg-[#ef6c00] text-white",
  E: "border-[#c62828] bg-[#c62828] text-white",
};

const SOURCE_LABELS = {
  internal: "Supply chain from our DB",
  open_food_facts: "OpenFoodFacts fallback",
  merged: "Merged DB + OpenFoodFacts",
} as const;

const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const toTitleCase = (value: string): string =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

const isAllergenIngredient = (ingredient: string, allergens: string[]): boolean => {
  const normalizedIngredient = normalize(ingredient);

  return allergens.some((allergen) => {
    const normalizedAllergen = normalize(allergen);
    if (!normalizedAllergen) {
      return false;
    }

    return (
      normalizedIngredient.includes(normalizedAllergen) ||
      normalizedAllergen
        .split(" ")
        .filter((token) => token.length > 2)
        .some((token) => normalizedIngredient.includes(token))
    );
  });
};

const scoreBadgeClass = (score: string | null): string =>
  score
    ? SCORE_STYLES[score] ?? "border-[#777777] bg-[#777777] text-white"
    : "border-[#dddddd] bg-white text-[#777777]";

function ScoreCard({
  label,
  score,
}: {
  label: string;
  score: string | null;
}) {
  return (
    <article className="space-y-3 border border-[#dddddd] bg-[#f7f9fa] p-4 rounded-none">
      <h2 className="text-xs font-bold uppercase text-[#003a5d]">{label}</h2>
      <div
        className={`inline-flex min-w-20 items-center justify-center border px-4 py-2 text-2xl font-bold uppercase ${scoreBadgeClass(score)}`}
      >
        {score ?? "N/A"}
      </div>
    </article>
  );
}

function BadgeList({
  items,
  emptyLabel,
  tone = "neutral",
}: {
  items: string[];
  emptyLabel: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#9eca45] bg-[#f3f9e7] text-[#003a5d]"
      : tone === "warning"
        ? "border-[#d9b86a] bg-[#fff7e0] text-[#6c4c00]"
        : "border-[#dddddd] bg-white text-[#424242]";

  if (items.length === 0) {
    return <p className="text-sm text-[#777777]">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`border px-2 py-1 text-xs font-semibold uppercase ${toneClass}`}>
          {toTitleCase(item)}
        </span>
      ))}
    </div>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { barcode } = await params;
  const { resolveProductDetails } = await import("@/lib/product/resolve");
  const productDetails = await resolveProductDetails(barcode);

  if (!productDetails) {
    return (
      <section className="space-y-4 font-sans">
        <header className="border border-[#dddddd] bg-white p-4 rounded-none">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Product Details</h1>
          <p className="mt-2 text-sm text-[#777777]">Barcode: {barcode}</p>
        </header>

        <div className="space-y-3 border border-[#dddddd] bg-[#f7f9fa] p-5 rounded-none">
          <h2 className="text-xl font-bold uppercase tracking-wide text-[#003a5d]">Product Not Found</h2>
          <p className="text-sm text-[#424242]">
            This barcode is not in our database and OpenFoodFacts did not return a matching product.
          </p>
        </div>
      </section>
    );
  }

  const { product, activeLot, supplyChain } = productDetails;
  const canGenerateJourney = Boolean(activeLot || product.inferredOrigins.length > 0);

   return (
    <section className="space-y-4 font-sans">
      <SaveToHistory
        barcode={barcode}
        name={product.name}
        brand={product.brand}
        imageUrl={product.imageUrl}
        nutriScore={product.nutriScore}
        source={product.source}
      />
      <header className="space-y-4 border border-[#dddddd] bg-white p-4 rounded-none">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">{product.name}</h1>
          <p className="text-sm text-[#424242]">{product.brand}</p>
          <p className="text-sm text-[#777777]">Barcode: {barcode}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-[#9eca45] bg-[#f3f9e7] px-2 py-1 text-xs font-bold uppercase text-[#003a5d]">
            {SOURCE_LABELS[product.source]}
          </span>
          {activeLot ? (
            <span className="border border-[#dddddd] bg-white px-2 py-1 text-xs font-bold uppercase text-[#003a5d]">
              Active lot {activeLot.lotCode}
            </span>
          ) : null}
        </div>

        <GenerateJourneyButton barcode={barcode} disabled={!canGenerateJourney} />
      </header>

      <div className="grid gap-4 border border-[#dddddd] bg-white p-4 rounded-none sm:grid-cols-[140px_1fr]">
        <div className="overflow-hidden border border-[#dddddd] bg-[#f7f9fa]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[140px] items-center justify-center text-xs font-bold uppercase text-[#777777]">
              No image
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase text-[#003a5d]">Product Info</h2>
            <p className="text-sm text-[#424242]">
              {product.category ? `Category: ${toTitleCase(product.category)}` : "Category unavailable"}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#003a5d]">Labels</h3>
            <BadgeList items={product.labels} emptyLabel="No labels listed." tone="success" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#003a5d]">Manufacturing</h3>
            <BadgeList items={product.manufacturingPlaces} emptyLabel="Manufacturing place unavailable." />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[#003a5d]">Declared Origins</h3>
            <BadgeList items={product.origins} emptyLabel="No declared origins from product data." tone="warning" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Nutri-Score" score={product.nutriScore} />
        <ScoreCard label="Eco-Score" score={product.ecoScore} />
      </div>

      <div className="space-y-4 border border-[#dddddd] bg-[#f7f9fa] p-4 rounded-none">
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase text-[#003a5d]">Ingredients</h2>
          {product.ingredients.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.ingredients.map((ingredient) => {
                const highlighted = isAllergenIngredient(ingredient, product.allergens);
                return (
                  <span
                    key={ingredient}
                    className={`border px-2 py-1 text-xs font-semibold uppercase ${
                      highlighted
                        ? "border-[#c62828] bg-[#fdecea] text-[#8c1d18]"
                        : "border-[#dddddd] bg-white text-[#424242]"
                    }`}
                  >
                    {toTitleCase(ingredient)}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#777777]">No ingredient list available.</p>
          )}
          {product.ingredientsText ? <p className="text-sm text-[#424242]">{product.ingredientsText}</p> : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-[#003a5d]">Allergens</h3>
          <BadgeList items={product.allergens} emptyLabel="No allergens listed." tone="warning" />
        </div>
      </div>

      {product.inferredOrigins.length > 0 ? (
        <div className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-none">
          <h2 className="text-xs font-bold uppercase text-[#003a5d]">Inferred Origins</h2>
          <ul className="space-y-2 text-sm text-[#424242]">
            {product.inferredOrigins.map((origin) => (
              <li key={`${origin.ingredient}-${origin.country}`} className="border-l-2 border-[#9eca45] pl-3">
                {toTitleCase(origin.ingredient)} likely from {origin.likelyCountries.join(" / ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeLot && supplyChain.length > 0 ? (
        <div className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase text-[#003a5d]">Supply Chain</h2>
            <span className="text-xs font-semibold uppercase text-[#777777]">Risk score {activeLot.riskScore}</span>
          </div>

          <ul className="space-y-3">
            {supplyChain.map((stage) => (
              <li key={stage.stageId} className="border-l-2 border-[#9eca45] pl-3">
                <p className="text-xs font-bold uppercase text-[#003a5d]">{stage.type}</p>
                <p className="text-sm font-semibold text-[#424242]">{stage.name}</p>
                <p className="text-sm text-[#777777]">{stage.location.name}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AiInsights
        barcode={barcode}
        lotCode={activeLot?.lotCode}
        autoPrompt={`Give a brief safety summary for this product${activeLot ? " including its supply chain status" : ""}. Mention any concerns.`}
        suggestions={[
          "Is this safe to eat?",
          "Tell me about the ingredients",
          "Any allergen concerns?",
          activeLot ? "Explain the supply chain" : "Where do the ingredients come from?",
        ]}
      />
    </section>
  );
}
