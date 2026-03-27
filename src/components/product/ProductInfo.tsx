
import Link from "next/link";
import type { ResolvedProduct } from "@/lib/product/resolve";
import type { JourneyStage } from "@/lib/types";
import { ProductPlaceholder } from "@/components/product/ProductPlaceholder";
import AiInsights from "@/components/ai-insights";

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
    <article className="rounded-xl border border-border bg-card p-4 text-center shadow-sm">
      <h2 className="text-[11px] font-semibold text-secondary">{label}</h2>
      <div
        className={`mx-auto mt-3 inline-flex min-w-16 items-center justify-center rounded-lg border px-4 py-2 text-2xl font-bold uppercase ${scoreBadgeClass(score)}`}
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
  const journeyHref = activeLot ? `/journey/${encodeURIComponent(activeLot.lotCode)}` : `/products`;

  return (
    <div className="space-y-5 pb-2">
      <header className="space-y-4">
        <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="max-h-[210px] w-full object-contain" />
          ) : (
            <div className="w-full rounded-xl bg-surface p-4">
              <ProductPlaceholder name={product.name} category={product.category} />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold leading-tight text-foreground">{product.name}</h1>
          <p className="text-sm text-secondary">{product.brand || "Unknown brand"}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
              {SOURCE_LABELS[product.source]}
            </span>
            <span className="text-xs text-muted">Barcode: {product.barcode}</span>
            {activeLot ? (
              <span className="rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-medium text-body">
                Lot {activeLot.lotCode}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <ScoreCard label="Nutri-Score" score={product.nutriScore} />
        <ScoreCard label="Risk" score={activeLot ? String(activeLot.riskScore) : null} />
        <ScoreCard label="Eco-Score" score={product.ecoScore} />
      </section>

      {supplyChain.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Journey preview</h2>
            {activeLot ? <span className="text-xs text-muted">Risk {activeLot.riskScore}</span> : null}
          </div>
          <div className="overflow-x-auto pb-1">
            <Link href={journeyHref} className="block min-w-max">
              <div className="flex min-w-max items-center px-1">
                {supplyChain.map((stage, index) => (
                  <div key={stage.stageId} className="flex items-center">
                    <div className="flex flex-col items-center gap-1 px-1 text-center" aria-label={`View stage ${stage.name}`}>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#16A34A] shadow-sm" />
                      <span className="max-w-[92px] text-[10px] font-medium leading-tight text-secondary">{stage.name}</span>
                    </div>
                    {index < supplyChain.length - 1 ? <span className="mx-1 h-[2px] w-8 rounded-full bg-[#bbf7d0]" /> : null}
                  </div>
                ))}
              </div>
            </Link>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Ingredients</h2>
        {product.ingredients.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {product.ingredients.map((ingredient) => {
              const highlighted = isAllergenIngredient(ingredient, product.allergens);
              return (
                <span
                  key={ingredient}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    highlighted
                      ? "border-red-200 bg-red-50 text-red-700"
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
        {product.ingredientsText ? <p className="text-sm leading-relaxed text-body">{product.ingredientsText}</p> : null}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-secondary">Allergens</h3>
          <BadgeList items={product.allergens} emptyLabel="No allergens listed." tone="warning" />
        </div>
      </section>

      {(product.labels.length > 0 || product.manufacturingPlaces.length > 0 || product.origins.length > 0 || product.inferredOrigins.length > 0) ? (
        <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">More details</h2>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-secondary">Labels</h3>
            <BadgeList items={product.labels} emptyLabel="No labels listed." tone="success" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-secondary">Manufacturing</h3>
            <BadgeList items={product.manufacturingPlaces} emptyLabel="Manufacturing place unavailable." />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-secondary">Declared origins</h3>
            <BadgeList items={product.origins} emptyLabel="No declared origins from product data." tone="warning" />
          </div>
          {product.inferredOrigins.length > 0 ? (
            <ul className="space-y-2 text-sm text-body">
              {product.inferredOrigins.map((origin) => (
                <li key={`${origin.ingredient}-${origin.country}`} className="rounded-lg border border-border bg-surface px-3 py-2">
                  {toTitleCase(origin.ingredient)} likely from {origin.likelyCountries.join(" / ")}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">AI Safety Analysis</h2>
        <AiInsights
          lotCode={activeLot?.lotCode}
          barcode={product.barcode}
          context={`Product: ${product.name}. Brand: ${product.brand}. Nutri-Score: ${product.nutriScore ?? "N/A"}. Eco-Score: ${product.ecoScore ?? "N/A"}.`}
          suggestions={[
            "Is this safe to eat regularly?",
            "Any allergen concerns?",
            "How does this compare nutritionally?",
          ]}
        />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href={journeyHref}
          className="inline-flex items-center justify-center rounded-xl bg-[#16A34A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#15803D]"
        >
          View Full Journey
        </Link>
        <Link
          href="/scan"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-surface"
        >
          Scan Another
        </Link>
      </div>
    </div>
  );
}
