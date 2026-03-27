"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { TabToggle, type TabId } from "@/components/product/TabToggle";
import { ProductInfo } from "@/components/product/ProductInfo";
import { MapTab } from "@/components/product/MapTab";
import AiInsights from "@/components/ai-insights";
import SaveToHistory from "./save-to-history";
import { useJourneyData } from "@/hooks/use-journey-data";
import type { ResolvedProduct } from "@/lib/product/resolve";
import type { JourneyStage } from "@/lib/types";

type ProductTabsProps = {
  barcode: string;
  product: ResolvedProduct;
  activeLot: {
    lotCode: string;
    status: string;
    riskScore: number;
  } | null;
  supplyChain: JourneyStage[];
  aiContext: string;
  canGenerateJourney: boolean;
};

function isValidTab(value: string | null): value is TabId {
  return value === "info" || value === "map" || value === "chat";
}

export default function ProductTabs({
  barcode,
  product,
  activeLot,
  supplyChain,
  aiContext,
  canGenerateJourney,
}: ProductTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabId = isValidTab(rawTab) ? rawTab : "info";

  const journey = useJourneyData(barcode, supplyChain, activeLot, product.name);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "info") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const qs = params.toString();
      router.replace(`/product/${encodeURIComponent(barcode)}${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    },
    [router, barcode, searchParams],
  );

  const fullAiContext = useMemo(() => {
    if (!journey.payload) return aiContext;

    const journeyLines = [
      `\nJOURNEY (${journey.payload.journey.length} stages):`,
      ...journey.payload.journey.map(
        (s) =>
          `${s.sequenceOrder}. [${s.type}] ${s.name} — ${s.location.name}${
            s.anomalies.length > 0
              ? ` ⚠ ${s.anomalies.length} anomal${s.anomalies.length === 1 ? "y" : "ies"}`
              : ""
          }`,
      ),
      ...(journey.payload.journey.some((s) => s.anomalies.length > 0)
        ? [
            `\nANOMALIES:`,
            ...journey.payload.journey.flatMap((s) =>
              s.anomalies.map(
                (a) => `- [${a.severity.toUpperCase()}] ${a.type}: ${a.description}`,
              ),
            ),
          ]
        : []),
    ].join("\n");

    return aiContext + journeyLines;
  }, [aiContext, journey.payload]);

  return (
    <>
      <SaveToHistory
        barcode={barcode}
        name={product.name}
        brand={product.brand}
        imageUrl={product.imageUrl}
        nutriScore={product.nutriScore}
        source={product.source}
      />

      {activeTab !== "map" && (
        <TabToggle activeTab={activeTab} onTabChange={handleTabChange} />
      )}

      {activeTab === "info" && (
        <ProductInfo
          product={product}
          activeLot={activeLot}
          supplyChain={supplyChain}
        />
      )}

      {activeTab === "map" && (
        <MapTab
          journey={journey.payload?.journey ?? []}
          productName={product.name}
          loading={journey.loading}
          error={journey.error}
          onBack={() => handleTabChange("info")}
          onGenerate={journey.generate}
        />
      )}

      {activeTab === "chat" && (
        <div className="flex flex-1 flex-col" style={{ minHeight: "calc(100vh - 180px)" }}>
          <AiInsights
            barcode={barcode}
            lotCode={activeLot?.lotCode}
            context={fullAiContext}
            fullPage
            autoPrompt={`Give a brief safety summary for this product${activeLot ? " including its supply chain status" : ""}. Mention any concerns.`}
            suggestions={[
              "Is this safe to eat?",
              "Tell me about the ingredients",
              "Any allergen concerns?",
              journey.payload ? "Explain the supply chain" : "Where do the ingredients come from?",
            ]}
          />
        </div>
      )}
    </>
  );
}
