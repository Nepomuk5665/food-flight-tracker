"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, List, X } from "lucide-react";

import { JourneyTimeline } from "@/components/journey/JourneyTimeline";
import type { JourneyStage } from "@/lib/types";

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
  onBack: () => void;
  onGenerate: () => void;
};

export function MapTab({ journey, productName, loading, error, onBack, onGenerate }: MapTabProps) {
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
    if (!hasTriggeredGenerate.current && journey.length === 0 && !loading && !error) {
      hasTriggeredGenerate.current = true;
      onGenerate();
    }
  }, [journey.length, loading, error, onGenerate]);

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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#9eca45] border-t-transparent" />
          <span className="text-sm text-white/60">Generating journey...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[#111] p-4 font-sans">
        <div className="rounded border border-red-500/30 bg-red-950/50 p-4 text-center text-sm text-red-400">
          {error}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-[#9eca45]"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={() => {
              hasTriggeredGenerate.current = false;
              onGenerate();
            }}
            className="text-sm text-[#9eca45] underline"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (journey.length === 0) {
    return (
      <section className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-[#111] p-4 font-sans">
        <p className="text-sm text-white/60">No journey data available for this product.</p>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-[#9eca45]"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
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
            />
          </div>
        )}
      </div>
    </section>
  );
}
