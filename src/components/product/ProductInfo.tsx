import { TriangleAlert, AlertCircle } from "lucide-react";
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
  A: "bg-[#2e7d32] text-white",
  B: "bg-[#7cb342] text-white",
  C: "bg-[#f9a825] text-[#1f1f1f]",
  D: "bg-[#ef6c00] text-white",
  E: "bg-[#c62828] text-white",
};

const SOURCE_LABELS = {
  internal: "Supply chain from our DB",
  open_food_facts: "OpenFoodFacts fallback",
  merged: "Merged DB + OpenFoodFacts",
} as const;

const FILTERED_LABEL_PATTERNS = [
  /nutri.?score/i,
  /eco.?score/i,
  /nova.?group/i,
];

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

const VALID_SCORES = new Set(Object.keys(SCORE_STYLES));

const scoreBadgeClass = (score: string | null): string =>
  score && VALID_SCORES.has(score)
    ? SCORE_STYLES[score]
    : "bg-[#F3F4F6] text-[#9CA3AF]";

function ScoreCard({ label, score }: { label: string; score: string | null }) {
  const display = score && VALID_SCORES.has(score) ? score : "–";

  return (
    <div className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${scoreBadgeClass(score)}`}
      >
        {display}
      </div>
      <span className="text-sm font-semibold text-[#1A1A1A]">{label}</span>
    </div>
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
      {activeLot?.status === "recalled" && (
        <div className="flex items-start gap-3 border border-[#dc2626] bg-[#fef2f2] p-4 rounded-xl">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#dc2626]" />
          <div>
            <p className="text-sm font-bold uppercase text-[#991b1b]">Product Recalled</p>
            <p className="mt-1 text-sm text-[#991b1b]">
              This product has been recalled. Do not consume. Check the alerts page for details.
            </p>
          </div>
        </div>
      )}

      {activeLot?.status === "under_review" && (
        <div className="flex items-start gap-3 border border-[#f59e0b] bg-[#fffbeb] p-4 rounded-xl">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#d97706]" />
          <div>
            <p className="text-sm font-bold uppercase text-[#92400e]">Under Review</p>
            <p className="mt-1 text-sm text-[#92400e]">
              This product is currently under quality review. Check back for updates.
            </p>
          </div>
        </div>
      )}

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
            <BadgeList items={product.labels.filter((l) => !FILTERED_LABEL_PATTERNS.some((p) => p.test(l)))} emptyLabel="No labels listed." tone="success" />
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

      <div className="flex gap-3">
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
