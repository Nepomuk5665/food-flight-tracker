"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  ShieldAlert,
  MessageSquareWarning,
  ThermometerSun,
  Droplets,
  Truck,
  Clock,
} from "lucide-react";
import type { GodViewMetrics, GodViewAlert, GodViewReport, Severity } from "@/lib/types";

/* ── Glass card base ─────────────────────────────────────── */

const GLASS =
  "border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_1px_0_rgba(255,255,255,0.05),0_8px_32px_-8px_rgba(0,0,0,0.5)] rounded-none";

const GLASS_INNER =
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]";

/* ── Severity utils ──────────────────────────────────────── */

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ff4d4f",
  high: "#faad14",
  medium: "#faad14",
  low: "#52c41a",
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_GLOW: Record<Severity, string> = {
  critical: "shadow-[0_0_12px_-2px_rgba(255,77,79,0.4)]",
  high: "shadow-[0_0_8px_-2px_rgba(250,173,20,0.3)]",
  medium: "",
  low: "",
};

function anomalyIcon(type: string) {
  switch (type) {
    case "cold_chain_break":
    case "temperature_high":
    case "temperature_low":
      return <ThermometerSun size={14} />;
    case "humidity_spike":
      return <Droplets size={14} />;
    case "delayed_transport":
      return <Truck size={14} />;
    default:
      return <AlertTriangle size={14} />;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── MetricsCards ─────────────────────────────────────────── */

function MetricsCards({ metrics }: { metrics: GodViewMetrics }) {
  const cards = [
    {
      label: "Active Batches",
      value: metrics.activeBatches,
      icon: <Activity size={14} className="text-white/50" />,
      accent: "text-white",
      glow: "",
    },
    {
      label: "Open Incidents",
      value: metrics.openIncidents,
      icon: <AlertTriangle size={14} className="text-[#faad14]" />,
      accent: metrics.openIncidents > 0 ? "text-[#faad14]" : "text-white",
      glow: metrics.openIncidents > 0 ? "shadow-[0_0_20px_-4px_rgba(250,173,20,0.25)]" : "",
    },
    {
      label: "Avg Risk Score",
      value: metrics.avgRiskScore,
      icon: <BarChart3 size={14} className="text-white/40" />,
      accent: metrics.avgRiskScore > 60 ? "text-[#ff4d4f]" : metrics.avgRiskScore > 20 ? "text-[#faad14]" : "text-white",
      glow: "",
    },
    {
      label: "Recalled",
      value: metrics.recalledBatches,
      icon: <ShieldAlert size={14} className="text-[#ff4d4f]/60" />,
      accent: metrics.recalledBatches > 0 ? "text-[#ff4d4f]" : "text-white/60",
      glow: metrics.recalledBatches > 0 ? "shadow-[0_0_20px_-4px_rgba(255,77,79,0.3)]" : "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${GLASS} ${GLASS_INNER} ${card.glow} px-3 py-3 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.12]`}
        >
          <div className="flex items-center gap-1.5">
            {card.icon}
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              {card.label}
            </span>
          </div>
          <p className={`mt-1.5 text-2xl font-bold tracking-tight ${card.accent}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── AlertsPanel ─────────────────────────────────────────── */

function AlertsPanel({
  alerts,
  onAlertClick,
}: {
  alerts: GodViewAlert[];
  onAlertClick: (alert: GodViewAlert) => void;
}) {
  const sorted = [...alerts].sort(
    (a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0),
  );

  return (
    <div className={`${GLASS} overflow-hidden`}>
      <div className={`${GLASS_INNER} flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2.5`}>
        <AlertTriangle size={13} className="text-[#faad14]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Active Alerts ({alerts.length})
        </span>
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {sorted.slice(0, 15).map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => onAlertClick(alert)}
              className={`flex w-full items-start gap-2 border-b border-white/[0.04] px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.04] rounded-none ${SEVERITY_GLOW[alert.severity]}`}
            >
              <span
                className="mt-0.5 flex-shrink-0"
                style={{ color: SEVERITY_COLOR[alert.severity] }}
              >
                {anomalyIcon(alert.anomalyType)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/90">
                  {alert.description}
                </p>
                <p className="mt-0.5 text-[10px] text-white/30">
                  {alert.batchLotCode} &bull; {alert.locationName} &bull;{" "}
                  <span
                    className="font-medium"
                    style={{ color: SEVERITY_COLOR[alert.severity] }}
                  >
                    {alert.severity}
                  </span>
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] text-white/20">
                {timeAgo(alert.detectedAt)}
              </span>
            </button>
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-white/20">No active alerts</li>
        )}
      </ul>
    </div>
  );
}

/* ── ReportsPanel ────────────────────────────────────────── */

function ReportsPanel({ reports }: { reports: GodViewReport[] }) {
  if (reports.length === 0) return null;

  const categoryLabel: Record<string, string> = {
    taste_quality: "Taste",
    appearance: "Appearance",
    packaging: "Packaging",
    foreign_object: "Foreign Object",
    allergic_reaction: "Allergy",
    other: "Other",
  };

  return (
    <div className={`${GLASS} overflow-hidden`}>
      <div className={`${GLASS_INNER} flex items-center gap-1.5 border-b border-white/[0.06] px-3 py-2.5`}>
        <MessageSquareWarning size={13} className="text-white/40" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
          Recent Reports ({reports.length})
        </span>
      </div>
      <ul className="max-h-36 overflow-y-auto">
        {reports.slice(0, 10).map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-2 border-b border-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
          >
            <Clock size={12} className="mt-0.5 flex-shrink-0 text-white/20" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/80">
                <span className="font-medium text-[#faad14]">
                  {categoryLabel[r.category] ?? r.category}
                </span>{" "}
                &mdash; {r.description ?? "No description"}
              </p>
              <p className="mt-0.5 text-[10px] text-white/20">
                {r.lotCode} &bull; {timeAgo(r.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Main Overlay ────────────────────────────────────────── */

interface GodViewOverlayProps {
  metrics: GodViewMetrics;
  alerts: GodViewAlert[];
  reports: GodViewReport[];
  onAlertClick: (alert: GodViewAlert) => void;
}

export function GodViewOverlay({
  metrics,
  alerts,
  reports,
  onAlertClick,
}: GodViewOverlayProps) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 flex w-72 flex-col gap-3">
      <div className="pointer-events-auto">
        <MetricsCards metrics={metrics} />
      </div>
      <div className="pointer-events-auto">
        <AlertsPanel alerts={alerts} onAlertClick={onAlertClick} />
      </div>
      <div className="pointer-events-auto">
        <ReportsPanel reports={reports} />
      </div>
    </div>
  );
}
