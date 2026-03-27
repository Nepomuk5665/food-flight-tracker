"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useGodViewData } from "@/hooks/use-god-view-data";
import { GodViewOverlay } from "@/components/god-view/GodViewOverlay";
import { BatchDetailPanel } from "@/components/god-view/BatchDetailPanel";
import { LayerToggles } from "@/components/god-view/LayerToggles";
import type { GodViewLayers } from "@/components/god-view/GodViewMap";
import type { GodViewAlert } from "@/lib/types";

const GodViewMap = dynamic(
  () => import("@/components/god-view/GodViewMap").then((m) => ({ default: m.GodViewMap })),
  { ssr: false },
);

export default function OverviewPage() {
  const { data, loading, error } = useGodViewData();
  const [selectedLotCode, setSelectedLotCode] = useState<string | null>(null);
  const [layers, setLayers] = useState<GodViewLayers>({ routes: true, clusters: true });
  const [flyTarget, setFlyTarget] = useState<{ lng: number; lat: number } | null>(null);

  const selectedBatch = useMemo(
    () => data?.batches.find((b) => b.lotCode === selectedLotCode) ?? null,
    [data, selectedLotCode],
  );

  const handleAlertClick = useCallback((alert: GodViewAlert) => {
    setSelectedLotCode(alert.batchLotCode);
    setFlyTarget({ lng: alert.lng, lat: alert.lat });
  }, []);

  const handleBatchSelect = useCallback((lotCode: string | null) => {
    setSelectedLotCode(lotCode);
    if (lotCode) {
      const batch = data?.batches.find((b) => b.lotCode === lotCode);
      if (batch?.lastLocation) {
        setFlyTarget({ lng: batch.lastLocation.lng, lat: batch.lastLocation.lat });
      }
    }
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin border-2 border-[#9eca45] border-t-transparent" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8b9db6]">
            Loading God View...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center">
        <div className="border border-[#e74c3c] bg-[#e74c3c]/10 px-6 py-4 text-center">
          <p className="text-sm font-bold text-[#e74c3c]">Failed to load overview</p>
          <p className="mt-1 text-xs text-[#8b9db6]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative h-[calc(100vh-57px)] w-full overflow-hidden">
      {/* Title overlay */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
        <h1 className="text-sm font-bold uppercase tracking-widest text-white/60">
          God View
        </h1>
      </div>

      {/* Map */}
      <GodViewMap
        batches={data.batches}
        selectedBatchLotCode={selectedLotCode}
        onBatchSelect={handleBatchSelect}
        layers={layers}
        flyToTarget={flyTarget}
      />

      {/* Overlay panels (left side) */}
      <GodViewOverlay
        metrics={data.metrics}
        alerts={data.alerts}
        reports={data.recentReports}
        onAlertClick={handleAlertClick}
      />

      {/* Layer toggles (bottom right) */}
      <LayerToggles layers={layers} onChange={setLayers} />

      {/* Batch detail slide-in (right side) */}
      <BatchDetailPanel batch={selectedBatch} onClose={() => setSelectedLotCode(null)} />
    </div>
  );
}
