"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, List, X } from "lucide-react";

import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import type { JourneyStage, LineageTree } from "@/lib/types";

const JourneyMap = dynamic(
  () => import("@/components/journey/JourneyMap").then((m) => m.JourneyMap),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-[#111]" /> },
);

type DrawerState = "closed" | "open";

type MapTabProps = {
  journey: JourneyStage[];
  productName: string;
  loading: boolean;
  error: string | null;
  canGenerate: boolean;
  lineageTree?: LineageTree | null;
  onBack: () => void;
  onGenerate: () => void;
};

export function MapTab({ journey, productName, loading, error, canGenerate, lineageTree, onBack, onGenerate }: MapTabProps) {
  const [selectedStage, setSelectedStage] = useState<JourneyStage | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>("closed");
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const drawerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const dragging = useRef(false);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const velocityY = useRef(0);
  const hasTriggeredGenerate = useRef(false);

  useEffect(() => {
    if (!hasTriggeredGenerate.current && journey.length === 0 && !loading && !error && canGenerate) {
      hasTriggeredGenerate.current = true;
      onGenerate();
    }
  }, [journey.length, loading, error, canGenerate, onGenerate]);

  const handleStageSelect = useCallback((stage: JourneyStage | null) => {
    setSelectedStage(stage);
  }, []);

  const handleTimelineStageClick = useCallback((stage: JourneyStage) => {
    setSelectedStage(stage);
    setDrawer("closed");
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawer((prev) => (prev === "closed" ? "open" : "closed"));
  }, []);

  const handleDragStart = useCallback(
    (clientY: number) => {
      dragStartY.current = clientY;
      lastY.current = clientY;
      lastTime.current = Date.now();
      velocityY.current = 0;
      const currentPct = drawer === "open" ? 80 : 0;
      dragStartHeight.current = currentPct;
      dragging.current = true;
      setDragHeight(currentPct);
    },
    [drawer],
  );

  const handleDragMove = useCallback((clientY: number) => {
    if (!dragging.current) return;
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocityY.current = (clientY - lastY.current) / dt;
    }
    lastY.current = clientY;
    lastTime.current = now;

    const vh = window.innerHeight;
    const deltaPx = dragStartY.current - clientY;
    const deltaPct = (deltaPx / vh) * 100;
    const newHeight = Math.max(0, Math.min(90, dragStartHeight.current + deltaPct));
    setDragHeight(newHeight);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const h = dragHeight ?? 0;
    const flickDown = velocityY.current > 0.5;
    const flickUp = velocityY.current < -0.5;

    if (flickDown) {
      setDrawer("closed");
    } else if (flickUp) {
      setDrawer("open");
    } else if (h > 40) {
      setDrawer("open");
    } else {
      setDrawer("closed");
    }
    setDragHeight(null);
  }, [dragHeight]);

  if (loading) {
    return (
      <section className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111] font-sans">
        <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <span className="text-sm text-white/60">Generating journey...</span>
        </div>
      </section>
    );
  }

  if (error || journey.length === 0) {
    return (
      <section className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-surface p-8 font-sans">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center bg-primary">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold uppercase text-primary">Supply Chain Map Unavailable</h2>
          <p className="mt-2 text-sm text-muted">
            This product doesn&apos;t have tracked supply chain data yet. As more producers join Project Trace, journey maps will become available.
          </p>
          <button
            onClick={onBack}
            className="mt-6 flex items-center gap-1 mx-auto bg-accent px-6 py-3 text-xs font-bold uppercase text-white shadow-button transition-all hover:bg-[#333333]"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Product
          </button>
        </div>
      </section>
    );
  }

  const isVisible = drawer === "open" || dragHeight !== null;
  const heightPct =
    dragHeight !== null
      ? `${dragHeight}%`
      : drawer === "open"
        ? "80%"
        : "0%";

  return (
    <section className="fixed inset-0 z-[60] font-sans">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <JourneyMap
          stages={journey}
          lineageTree={lineageTree}
          selectedStage={selectedStage}
          onStageSelect={handleStageSelect}
        />
      </div>

      {/* Header overlay */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-white">
            <ChevronLeft className="h-6 w-6 stroke-white" strokeWidth={3} />
          </button>
          <span className="truncate text-sm font-semibold text-white">
            {productName}
          </span>
        </div>

        <button
          onClick={toggleDrawer}
          className="relative h-9 w-9 shrink-0 text-white active:opacity-70"
          aria-label={drawer === "open" ? "Close timeline" : "Show timeline"}
        >
          <List
            className={`absolute inset-0 m-auto h-5 w-5 transition-all duration-300 ${drawer === "open" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
          />
          <X
            className={`absolute inset-0 m-auto h-5 w-5 transition-all duration-300 ${drawer === "open" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`}
          />
        </button>
      </div>

      {/* Bottom sheet drawer */}
      <div
        ref={drawerRef}
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[24px] bg-[#fafafa] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] backdrop-blur-sm ${dragHeight !== null ? "" : "transition-all duration-300 ease-out"}`}
        style={{ height: heightPct }}
      >
        {/* Drag handle */}
        <div
          className="flex shrink-0 cursor-grab flex-col items-center px-5 pb-2 pt-3 active:cursor-grabbing"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => handleDragMove(e.clientY)}
          onMouseUp={handleDragEnd}
          onMouseLeave={() => { if (dragging.current) handleDragEnd(); }}
        >
          <div className="mb-3 h-[5px] w-10 rounded-full bg-[#d1d5db]" />
          <div className="flex w-full items-center">
            <h3 className="text-base font-bold text-[#1a1a2e] select-none">
              Supply Chain Journey
            </h3>
          </div>
        </div>

        {/* Scrollable timeline content */}
        {isVisible && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <JourneyTimeline
              stages={journey}
              activeStageId={selectedStage?.stageId ?? null}
              onStageClick={handleTimelineStageClick}
              lineageTree={lineageTree}
            />
          </div>
        )}
      </div>
    </section>
  );
}
