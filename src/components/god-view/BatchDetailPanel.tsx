"use client";

import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GodViewBatch } from "@/lib/types";
import { getStageIcon, getStageColor } from "@/components/journey/stage-icons";
import { RISK_COLORS } from "./god-view-map-layers";

const GLASS =
  "border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_-8px_rgba(0,0,0,0.5)] rounded-none";

interface BatchDetailPanelProps {
  batch: GodViewBatch | null;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "border-white/20 text-white/80",
    under_review: "border-[#faad14]/40 text-[#faad14]",
    recalled: "border-[#ff4d4f]/40 text-[#ff4d4f]",
  };

  return (
    <span
      className={`border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none bg-white/[0.03] ${
        colors[status] ?? "border-white/10 text-white/50"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function RiskBadge({ riskLevel, riskScore }: { riskLevel: string; riskScore: number }) {
  const color = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? RISK_COLORS.safe;

  return (
    <div
      className="inline-flex items-center gap-1.5 border px-2 py-1 rounded-none bg-white/[0.03]"
      style={{ borderColor: `${color}40` }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
      />
      <span className="text-xs font-bold" style={{ color }}>
        Risk {riskScore}
      </span>
    </div>
  );
}

export function BatchDetailPanel({ batch, onClose }: BatchDetailPanelProps) {
  return (
    <AnimatePresence>
      {batch && (
        <motion.aside
          key="batch-detail"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.3, ease: "easeOut" }}
          className="absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-white/[0.08] bg-black/80 backdrop-blur-2xl shadow-[-8px_0_32px_-8px_rgba(0,0,0,0.5)] rounded-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/[0.06] px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-white">{batch.productName}</h2>
              <p className="mt-0.5 text-xs text-white/40">
                {batch.productBrand} &bull; {batch.lotCode}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-1 text-white/30 transition-colors hover:text-white rounded-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Status + Risk */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <StatusBadge status={batch.status} />
            <RiskBadge riskLevel={batch.riskLevel} riskScore={batch.riskScore} />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-px border-b border-white/[0.06] bg-white/[0.04]">
            {[
              { label: "Stages", value: batch.stageCount },
              { label: "Anomalies", value: batch.anomalyCount },
              { label: "Units", value: batch.unitCount ?? "\u2014" },
            ].map((stat) => (
              <div key={stat.label} className="bg-black/60 px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/30">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Mini timeline */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              Supply Chain Journey
            </p>
            <ul className="relative border-l border-white/[0.08] pl-4">
              {batch.stages
                .sort((a, z) => a.sequenceOrder - z.sequenceOrder)
                .map((stage) => (
                  <li key={stage.stageId} className="relative mb-3 last:mb-0">
                    <span
                      className="absolute -left-[21px] top-0.5 h-3 w-3 border-2 border-black rounded-none"
                      style={{ backgroundColor: getStageColor(stage.type) }}
                    />
                    <div className="flex items-start gap-2">
                      <span style={{ color: getStageColor(stage.type) }}>
                        {getStageIcon(stage.type)}
                      </span>
                      <div>
                        <p className="text-xs font-medium text-white/90">{stage.name}</p>
                        <p className="text-[10px] text-white/30">
                          {stage.location.name}
                          {stage.anomalyCount > 0 && (
                            <span className="ml-1 text-[#ff4d4f]">
                              &bull; {stage.anomalyCount} anomal{stage.anomalyCount === 1 ? "y" : "ies"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          {/* Footer link */}
          <div className="border-t border-white/[0.06] px-4 py-3">
            <Link
              href={`/batch/${batch.lotCode}`}
              className="flex items-center justify-center gap-2 border border-white/20 bg-white/[0.05] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/80 transition-all duration-200 hover:bg-white/[0.1] hover:border-white/30 hover:text-white rounded-none"
            >
              View Full Detail
              <ExternalLink size={14} />
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
