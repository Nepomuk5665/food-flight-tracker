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

/* ── Severity utils ────────────────────────────────────────── */

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#e74c3c",
  high: "#f5a623",
  medium: "#f5a623",
  low: "#9eca45",
};

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
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

/* ── MetricsCards ──────────────────────────────────────────── */

function MetricsCards({ metrics }: { metrics: GodViewMetrics }) {
  const cards = [
    {
      label: "Active Batches",
      value: metrics.activeBatches,
      icon: <Activity size={16} className="text-[#9eca45]" />,
      color: "text-white",
    },
    {
      label: "Open Incidents",
      value: metrics.openIncidents,
      icon: <AlertTriangle size={16} className="text-[#f5a623]" />,
      color: metrics.openIncidents > 0 ? "text-[#f5a623]" : "text-white",
    },
    {
      label: "Avg Risk Score",
      value: metrics.avgRiskScore,
      icon: <BarChart3 size={16} className="text-[#8b9db6]" />,
      color: metrics.avgRiskScore > 60 ? "text-[#e74c3c]" : metrics.avgRiskScore > 20 ? "text-[#f5a623]" : "text-white",
    },
    {
      label: "Recalled",
      value: metrics.recalledBatches,
      icon: <ShieldAlert size={16} className="text-[#e74c3c]" />,
      color: metrics.recalledBatches > 0 ? "text-[#e74c3c]" : "text-white",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-[#1e2a3a] bg-[#0f1923]/90 px-3 py-2 backdrop-blur-sm rounded-none"
        >
          <div className="flex items-center gap-1.5">
            {card.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8b9db6]">
              {card.label}
            </span>
          </div>
          <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── AlertsPanel ──────────────────────────────────────────── */

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
    <div className="border border-[#1e2a3a] bg-[#0f1923]/90 backdrop-blur-sm rounded-none">
      <div className="flex items-center gap-1.5 border-b border-[#1e2a3a] px-3 py-2">
        <AlertTriangle size={14} className="text-[#f5a623]" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#8b9db6]">
          Active Alerts ({alerts.length})
        </span>
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {sorted.slice(0, 15).map((alert) => (
          <li key={alert.id}>
            <button
              type="button"
              onClick={() => onAlertClick(alert)}
              className="flex w-full items-start gap-2 border-b border-[#1e2a3a]/50 px-3 py-2 text-left transition-colors hover:bg-[#162433] rounded-none"
            >
              <span
                className="mt-0.5 flex-shrink-0"
                style={{ color: SEVERITY_COLOR[alert.severity] }}
              >
                {anomalyIcon(alert.anomalyType)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {alert.description}
                </p>
                <p className="mt-0.5 text-[10px] text-[#8b9db6]">
                  {alert.batchLotCode} &bull; {alert.locationName} &bull;{" "}
                  <span style={{ color: SEVERITY_COLOR[alert.severity] }}>
                    {alert.severity}
                  </span>
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] text-[#5a6a7a]">
                {timeAgo(alert.detectedAt)}
              </span>
            </button>
          </li>
        ))}
        {alerts.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-[#5a6a7a]">No active alerts</li>
        )}
      </ul>
    </div>
  );
}

/* ── ReportsPanel ─────────────────────────────────────────── */

function ReportsPanel({ reports }: { reports: GodViewReport[] }) {
  const categoryLabel: Record<string, string> = {
    taste_quality: "Taste",
    appearance: "Appearance",
    packaging: "Packaging",
    foreign_object: "Foreign Object",
    allergic_reaction: "Allergy",
    other: "Other",
  };

  return (
    <div className="border border-[#1e2a3a] bg-[#0f1923]/90 backdrop-blur-sm rounded-none">
      <div className="flex items-center gap-1.5 border-b border-[#1e2a3a] px-3 py-2">
        <MessageSquareWarning size={14} className="text-[#8b9db6]" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-[#8b9db6]">
          Recent Reports ({reports.length})
        </span>
      </div>
      <ul className="max-h-36 overflow-y-auto">
        {reports.slice(0, 10).map((r) => (
          <li
            key={r.id}
            className="flex items-start gap-2 border-b border-[#1e2a3a]/50 px-3 py-2"
          >
            <Clock size={12} className="mt-0.5 flex-shrink-0 text-[#5a6a7a]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white">
                <span className="font-medium text-[#f5a623]">
                  {categoryLabel[r.category] ?? r.category}
                </span>{" "}
                &mdash; {r.description ?? "No description"}
              </p>
              <p className="mt-0.5 text-[10px] text-[#5a6a7a]">
                {r.lotCode} &bull; {timeAgo(r.createdAt)}
              </p>
            </div>
          </li>
        ))}
        {reports.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-[#5a6a7a]">No reports yet</li>
        )}
      </ul>
    </div>
  );
}

/* ── Main Overlay ─────────────────────────────────────────── */

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
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex w-72 flex-col gap-3">
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
