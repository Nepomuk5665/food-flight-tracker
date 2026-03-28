"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";

import { TabToggle, type TabId } from "@/components/product/TabToggle";
import { ReportSheet } from "@/components/product/ReportSheet";
import { ProductInfo } from "@/components/product/ProductInfo";
import { MapTab } from "@/components/product/MapTab";
import AiInsights from "@/components/ai-insights";
import SaveToHistory from "./save-to-history";
import { useJourneyData } from "@/hooks/use-journey-data";
import { useLineageData } from "@/hooks/use-lineage-data";
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
  const lineage = useLineageData(activeLot?.lotCode, journey.payload?.journey ?? []);
  const [reportOpen, setReportOpen] = useState(false);

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

      <div className={`fixed inset-x-0 top-0 z-[60] px-4 pt-3 pb-3 ${activeTab === "map" ? "bg-gradient-to-b from-black/60 to-transparent" : "bg-[#FAFAF8]/60 backdrop-blur-xl"}`}>
        <div className="mx-auto max-w-lg">
          <div className="mb-2">
            <Link
              href="/products"
              className={`inline-flex items-center gap-1 text-sm transition-colors ${activeTab === "map" ? "text-white/70 hover:text-white" : "text-[#9CA3AF] hover:text-[#16A34A]"}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
          <TabToggle activeTab={activeTab} onTabChange={handleTabChange} hiddenTabs={canGenerateJourney ? [] : ["map"]} transparent dark={activeTab === "map"} />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "info" && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="pt-[100px]"
          >
            <ProductInfo
              product={product}
              activeLot={activeLot}
              supplyChain={supplyChain}
            />
          </motion.div>
        )}

        {activeTab === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[50]"
          >
            <MapTab
              journey={journey.payload?.journey ?? []}
              loading={journey.loading}
              error={journey.error}
              canGenerate={canGenerateJourney}
              onBack={() => handleTabChange("info")}
              onGenerate={journey.generate}
            />
          </motion.div>
        )}

        {activeTab === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <AiInsights
              barcode={barcode}
              lotCode={activeLot?.lotCode}
              context={fullAiContext}
              autoPrompt={`Give a brief safety summary for this product${activeLot ? " including its supply chain status" : ""}. Mention any concerns.`}
              suggestions={[
                "Is this safe to eat?",
                "Tell me about the ingredients",
                "Any allergen concerns?",
                journey.payload ? "Explain the supply chain" : "Where do the ingredients come from?",
              ]}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {activeLot && activeLot.status !== "recalled" && (
        <>
          <button
            data-testid="report-trigger"
            onClick={() => setReportOpen(true)}
            className="fixed bottom-20 right-4 z-[75] flex h-12 w-12 items-center justify-center rounded-full bg-[#dc2626] text-white shadow-lg transition-transform active:scale-90 animate-[report-pulse_2s_ease-in-out_infinite]"
            aria-label="Report an issue"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>
          <ReportSheet
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            lotCode={activeLot.lotCode}
            barcode={barcode}
            productName={product.name}
          />
        </>
      )}
    </>
  );
}
