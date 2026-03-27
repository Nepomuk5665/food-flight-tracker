"use client";

import { useState } from "react";
import { TriangleAlert, AlertCircle, Info } from "lucide-react";

type Severity = "Critical" | "Warning" | "Info";

export type Alert = {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  timestamp: string;
  lotCode: string;
  status: "Active" | "Resolved" | "Under Review";
};

const SEVERITY_STYLES = {
  Critical: {
    border: "border-l-[#dc2626]",
    badgeBg: "bg-danger",
    icon: TriangleAlert,
    iconColor: "text-danger",
  },
  Warning: {
    border: "border-l-[#f59e0b]",
    badgeBg: "bg-warning",
    icon: AlertCircle,
    iconColor: "text-warning",
  },
  Info: {
    border: "border-l-[#009ee3]",
    badgeBg: "bg-info",
    icon: Info,
    iconColor: "text-info",
  },
};

export function AlertsList({ alerts }: { alerts: Alert[] }) {
  const [filter, setFilter] = useState<Severity | "All">("All");

  const filteredAlerts = alerts.filter(
    (alert) => filter === "All" || alert.severity === filter
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["All", "Critical", "Warning", "Info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-surface-dim text-body hover:bg-[#e2e8f0]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity];
          const Icon = styles.icon;

          return (
            <article
              key={alert.id}
              className={`border border-border border-l-4 bg-white p-4 ${styles.border}`}
            >
              <div className="mb-2 flex items-start gap-2">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.iconColor}`} aria-hidden="true" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${styles.badgeBg}`}
                    >
                      {alert.severity}
                    </span>
                    <h2 className="text-sm font-bold text-primary">{alert.title}</h2>
                  </div>
                </div>
              </div>
              
              <p className="mb-3 text-sm text-body">{alert.description}</p>
              
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-light pt-2 text-xs text-muted">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-primary">Lot: {alert.lotCode}</span>
                  <span>{alert.timestamp}</span>
                </div>
                <span
                  className={`font-semibold ${
                    alert.status === "Active"
                      ? "text-danger"
                      : alert.status === "Resolved"
                      ? "text-accent"
                      : "text-warning"
                  }`}
                >
                  {alert.status}
                </span>
              </div>
            </article>
          );
        })}
        {filteredAlerts.length === 0 && (
          <div className="border border-border bg-white p-8 text-center text-sm text-muted">
            No alerts found for this filter.
          </div>
        )}
      </div>
    </div>
  );
}
