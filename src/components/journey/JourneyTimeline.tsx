"use client";

import { useState } from "react";
import { ChevronRight, GitMerge, GitBranch, ChevronDown } from "lucide-react";
import type { JourneyStage, LineageTree, LineageBatchJourney } from "@/lib/types";
import { getStageColor } from "./stage-icons";

function formatDateRange(start: string, end: string | null): string {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  const startStr = s.toLocaleDateString("en-GB", opts);
  if (!end) return `${startStr} — Ongoing`;
  const e = new Date(end);
  const endStr = e.toLocaleDateString("en-GB", opts);
  return `${startStr} — ${endStr}`;
}

function StageCard({
  stage,
  isActive,
  onClick,
  compact,
  dark,
}: {
  stage: JourneyStage;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
  dark?: boolean;
}) {
  const hasAnomaly = stage.anomalies.length > 0;
  const color = getStageColor(stage.type);

  const lightClass = hasAnomaly
    ? "bg-red-50 shadow-sm ring-1 ring-red-200"
    : isActive
      ? "bg-white shadow-md ring-1 ring-[#16A34A]/30"
      : "bg-white shadow-sm ring-1 ring-black/[0.04]";

  const darkClass = hasAnomaly
    ? "bg-[#ff4d4f]/[0.06] border border-[#ff4d4f]/20"
    : isActive
      ? "bg-white/[0.06] border border-white/20"
      : "bg-white/[0.03] border border-white/[0.08]";

  return (
    <button
      type="button"
      className={`w-full p-4 text-left transition-all ${dark ? darkClass : `rounded-2xl ${lightClass}`} ${compact ? "py-3" : ""}`}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: color, borderRadius: dark ? 0 : 9999 }}
        >
          {stage.type}
        </span>
        {hasAnomaly && (
          <span className={dark
            ? "border border-[#ff4d4f]/30 bg-[#ff4d4f]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ff4d4f]"
            : "rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600"
          }>
            Alert
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={`mb-0.5 font-semibold ${dark ? "text-white/80" : "text-[#1A1A1A]"} ${compact ? "text-[13px]" : "text-[15px]"}`}>
            {stage.name}
          </p>
          <p className={`mb-0.5 text-xs ${dark ? "text-white/40" : "text-[#6b7280]"}`}>{stage.location.name}</p>
          <p className={`text-xs ${dark ? "text-white/25" : "text-[#9ca3af]"}`}>
            {formatDateRange(stage.startedAt, stage.completedAt)}
          </p>
        </div>
        <ChevronRight className={`h-4 w-4 shrink-0 ${dark ? "text-white/15" : "text-[#d1d5db]"}`} />
      </div>
    </button>
  );
}

function LineageAnnotation({
  type,
  batches,
  dark,
}: {
  type: "merge" | "split";
  batches: LineageBatchJourney[];
  dark?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMerge = type === "merge";
  const Icon = isMerge ? GitMerge : GitBranch;
  const label = isMerge ? "Merged from" : "Split into";

  const borderColor = dark
    ? (isMerge ? "border-white/10" : "border-white/[0.06]")
    : (isMerge ? "border-[#1A1A1A]/30" : "border-[#9CA3AF]/30");
  const bgColor = dark
    ? "bg-white/[0.03]"
    : (isMerge ? "bg-[#1A1A1A]/5" : "bg-[#9CA3AF]/5");
  const iconColor = dark
    ? "text-white/50"
    : (isMerge ? "text-[#1A1A1A]" : "text-[#9CA3AF]");

  return (
    <li className="relative pb-5 pl-7 last:pb-0">
      <span className={`absolute -left-[7px] top-1 flex h-3 w-3 items-center justify-center rounded-full ${dark ? "ring-[3px] ring-black" : "ring-[3px] ring-[#fafafa]"} ${isMerge ? (dark ? "bg-white/40" : "bg-[#1A1A1A]") : (dark ? "bg-white/20" : "bg-[#9CA3AF]")}`} />

      <button
        type="button"
        className={`w-full border ${borderColor} ${bgColor} p-4 text-left transition-all ${dark ? "hover:bg-white/[0.05]" : "rounded-2xl hover:shadow-sm"}`}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className={`text-sm font-semibold ${dark ? "text-white/70" : "text-[#1A1A1A]"}`}>{label}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 ${dark ? "text-white/20" : "text-[#9ca3af]"} transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {batches.map((b) => (
            <span
              key={b.lotCode}
              className={dark
                ? "border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-white/50 font-mono"
                : "rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#424242] ring-1 ring-black/[0.06]"
              }
            >
              {b.lotCode}
              {b.ratio != null && b.ratio < 1 ? ` (${Math.round(b.ratio * 100)}%)` : ""}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className={`mt-2 ml-2 border-l-2 ${borderColor} pl-4 space-y-2`}>
          {batches.flatMap((b) =>
            [...b.stages]
              .sort((a, c) => a.sequenceOrder - c.sequenceOrder)
              .map((stage) => (
                <div key={stage.stageId} className="opacity-80">
                  <StageCard stage={stage} isActive={false} onClick={() => {}} compact dark={dark} />
                </div>
              )),
          )}
        </div>
      )}
    </li>
  );
}

export function JourneyTimeline({
  stages,
  activeStageId,
  onStageClick,
  lineageTree,
  variant = "light",
}: {
  stages: JourneyStage[];
  activeStageId: string | null;
  onStageClick: (stage: JourneyStage) => void;
  lineageTree?: LineageTree | null;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  const sorted = [...stages].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const hasParents = (lineageTree?.parents.length ?? 0) > 0;
  const hasChildren = (lineageTree?.children.length ?? 0) > 0;

  return (
    <div className="px-5 pb-16 pt-2">
      <ol className={`relative ml-3 border-l-2 ${dark ? "border-white/[0.08]" : "border-[#e5e7eb]"}`}>
        {hasParents && (
          <LineageAnnotation
            type="merge"
            batches={lineageTree!.parents}
            dark={dark}
          />
        )}

        {sorted.map((stage) => {
          const hasAnomaly = stage.anomalies.length > 0;
          const color = getStageColor(stage.type);
          const isActive = stage.stageId === activeStageId;

          return (
            <li
              key={stage.stageId}
              className={`relative pb-5 pl-7 last:pb-0 transition-opacity ${isActive ? "opacity-100" : "opacity-75 hover:opacity-100"}`}
            >
              <span
                className={`absolute -left-[7px] top-1 flex h-3 w-3 items-center justify-center rounded-full ${dark ? "ring-[3px] ring-black" : "ring-[3px] ring-[#fafafa]"}`}
                style={{ backgroundColor: hasAnomaly ? "#ef4444" : color }}
              />
              <StageCard
                stage={stage}
                isActive={isActive}
                onClick={() => onStageClick(stage)}
                dark={dark}
              />
            </li>
          );
        })}

        {hasChildren && (
          <LineageAnnotation
            type="split"
            batches={lineageTree!.children}
            dark={dark}
          />
        )}
      </ol>
    </div>
  );
}
