
import type { ResolvedProduct } from "@/lib/product/resolve";
import type { JourneyStage } from "@/lib/types";
import { ProductPlaceholder } from "@/components/product/ProductPlaceholder";

type ProductInfoProps = {
  product: ResolvedProduct;
  activeLot: {
    lotCode: string;
    status: string;
    riskScore: number;
  } | null;
  supplyChain: JourneyStage[];
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
    : "border-border bg-white text-muted";

function ScoreCard({ label, score }: { label: string; score: string | null }) {
  return (
    <article className="space-y-3 border border-border bg-surface p-4 rounded-xl">
      <h2 className="text-xs font-bold uppercase text-primary">{label}</h2>
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
      ? "border-accent bg-[#f3f9e7] text-primary"
      : tone === "warning"
        ? "border-[#d9b86a] bg-[#fff7e0] text-[#6c4c00]"
        : "border-border bg-white text-body";

  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
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

export function ProductInfo({ product, activeLot, supplyChain }: ProductInfoProps) {
  return (
    <div className="space-y-4">
      <header className="space-y-4 border border-border bg-white p-4 rounded-xl">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">{product.name}</h1>
          <p className="text-sm text-body">{product.brand}</p>
          <p className="text-sm text-muted">Barcode: {product.barcode}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="border border-accent bg-[#f3f9e7] px-2 py-1 text-xs font-bold uppercase text-primary">
            {SOURCE_LABELS[product.source]}
          </span>
          {activeLot ? (
            <span className="border border-border bg-white px-2 py-1 text-xs font-bold uppercase text-primary">
              Active lot {activeLot.lotCode}
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 border border-border bg-white p-4 rounded-xl sm:grid-cols-[180px_1fr]">
        <div className="flex min-h-[180px] items-center justify-center overflow-hidden border border-border bg-white p-2">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-h-[180px] w-auto object-contain"
            />
          ) : (
            <ProductPlaceholder name={product.name} category={product.category} />
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase text-primary">Product Info</h2>
            <p className="text-sm text-body">
              {product.category ? `Category: ${toTitleCase(product.category)}` : "Category unavailable"}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-primary">Labels</h3>
            <BadgeList items={product.labels} emptyLabel="No labels listed." tone="success" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-primary">Manufacturing</h3>
            <BadgeList items={product.manufacturingPlaces} emptyLabel="Manufacturing place unavailable." />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-primary">Declared Origins</h3>
            <BadgeList items={product.origins} emptyLabel="No declared origins from product data." tone="warning" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Nutri-Score" score={product.nutriScore} />
        <ScoreCard label="Eco-Score" score={product.ecoScore} />
      </div>

      <div className="space-y-4 border border-border bg-surface p-4 rounded-xl">
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase text-primary">Ingredients</h2>
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
                        : "border-border bg-white text-body"
                    }`}
                  >
                    {toTitleCase(ingredient)}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No ingredient list available.</p>
          )}
          {product.ingredientsText && product.ingredients.length === 0 ? <p className="text-sm text-body">{product.ingredientsText}</p> : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-primary">Allergens</h3>
          <BadgeList items={product.allergens} emptyLabel="No allergens listed." tone="warning" />
        </div>
      </div>

      {product.inferredOrigins.length > 0 ? (
        <div className="space-y-3 border border-border bg-white p-4 rounded-xl">
          <h2 className="text-xs font-bold uppercase text-primary">Inferred Origins</h2>
          <ul className="space-y-2 text-sm text-body">
            {product.inferredOrigins.map((origin) => (
              <li key={`${origin.ingredient}-${origin.country}`} className="border-l-2 border-[#16A34A] pl-3">
                {toTitleCase(origin.ingredient)} likely from {origin.likelyCountries.join(" / ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeLot && supplyChain.length > 0 ? (
        <div className="space-y-3 border border-border bg-white p-4 rounded-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase text-primary">Supply Chain</h2>
            <span className="text-xs font-semibold uppercase text-muted">Risk score {activeLot.riskScore}</span>
          </div>

          <ul className="space-y-3">
            {supplyChain.map((stage) => (
              <li key={stage.stageId} className="border-l-2 border-[#16A34A] pl-3">
                <p className="text-xs font-bold uppercase text-primary">{stage.type}</p>
                <p className="text-sm font-semibold text-body">{stage.name}</p>
                <p className="text-sm text-muted">{stage.location.name}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
