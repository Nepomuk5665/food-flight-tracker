"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useGodViewData } from "@/hooks/use-god-view-data";
import { GodViewOverlay } from "@/components/god-view/GodViewOverlay";
import { BatchDetailPanel } from "@/components/god-view/BatchDetailPanel";
import { LayerToggles } from "@/components/god-view/LayerToggles";
import type { GodViewLayers, RippleTarget } from "@/components/god-view/GodViewMap";
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
  const [rippleTargets, setRippleTargets] = useState<RippleTarget[]>([]);
  const seenReportIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Fast-poll for new reports (every 3s) to trigger ripples near-instantly
  useEffect(() => {
    if (!data) return;

    // On first load, seed the seen set so we don't ripple all existing reports
    if (!initializedRef.current) {
      for (const r of data.recentReports) {
        seenReportIdsRef.current.add(r.id);
      }
      initializedRef.current = true;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/overview");
        if (!res.ok) return;
        const json = await res.json();
        const reports = json.data?.recentReports ?? [];
        const batches = json.data?.batches ?? data.batches;

        const newTargets: RippleTarget[] = [];
        for (const report of reports) {
          if (seenReportIdsRef.current.has(report.id)) continue;
          seenReportIdsRef.current.add(report.id);

          const batch = batches.find((b: { lotCode: string; lastLocation?: { lng: number; lat: number } }) => b.lotCode === report.lotCode);
          if (batch?.lastLocation) {
            newTargets.push({
              lng: batch.lastLocation.lng,
              lat: batch.lastLocation.lat,
              key: report.id,
            });
          }
        }

        if (newTargets.length > 0) {
          setRippleTargets(newTargets);
        }
      } catch {
        // Ignore fetch errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [data]);

  const selectedBatch = useMemo(
    () => data?.batches.find((b) => b.lotCode === selectedLotCode) ?? null,
    [data, selectedLotCode],
  );

  // All batches in the same chain group as the selected batch
  const chainBatches = useMemo(() => {
    if (!selectedBatch || !data) return [];
    return data.batches.filter((b) => b.chainGroup === selectedBatch.chainGroup);
  }, [data, selectedBatch]);

  // Lineage edges scoped to the chain group
  const chainEdges = useMemo(() => {
    if (!data || chainBatches.length <= 1) return [];
    const lotCodes = new Set(chainBatches.map((b) => b.lotCode));
    return data.lineageEdges.filter(
      (e) => lotCodes.has(e.parentLotCode) && lotCodes.has(e.childLotCode),
    );
  }, [data, chainBatches]);

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
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin border-2 border-white/30 border-t-white" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/30">
            Loading God View...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="border border-[#ff4d4f]/20 bg-[#ff4d4f]/5 px-6 py-4 text-center backdrop-blur-2xl">
          <p className="text-sm font-bold text-[#ff4d4f]">Failed to load overview</p>
          <p className="mt-1 text-xs text-white/40">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Title overlay */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
        <h1 className="text-sm font-bold uppercase tracking-[0.3em] bg-gradient-to-r from-white/50 to-white/20 bg-clip-text text-transparent">
          God View
        </h1>
      </div>

      {/* Map */}
      <GodViewMap
        batches={data.batches}
        lineageEdges={data.lineageEdges}
        selectedBatchLotCode={selectedLotCode}
        onBatchSelect={handleBatchSelect}
        layers={layers}
        flyToTarget={flyTarget}
        rippleTargets={rippleTargets}
      />

      {/* Overlay panels */}
      <GodViewOverlay
        metrics={data.metrics}
        alerts={data.alerts}
        reports={data.recentReports}
        onAlertClick={handleAlertClick}
      />

      <LayerToggles layers={layers} onChange={setLayers} />

      <BatchDetailPanel
        batch={selectedBatch}
        chainBatches={chainBatches}
        lineageEdges={chainEdges}
        onClose={() => setSelectedLotCode(null)}
        onNodeClick={(lng, lat) => setFlyTarget({ lng, lat })}
        onBatchSelect={(lotCode) => handleBatchSelect(lotCode)}
      />
    </div>
  );
}
