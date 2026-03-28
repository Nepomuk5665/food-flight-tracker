"use client";

import { useEffect, useState } from "react";
import { AlertsList, type Alert } from "@/components/alerts-list";

type RecallData = {
  id: string;
  reason: string;
  severity: string;
  status: string;
  createdAt: string;
  affectedLots?: string[];
};

const SEVERITY_MAP: Record<string, "Critical" | "Warning" | "Info"> = {
  critical: "Critical",
  high: "Warning",
  medium: "Info",
};

const STATUS_MAP: Record<string, "Active" | "Resolved" | "Under Review"> = {
  active: "Active",
  ended: "Resolved",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapRecallToAlerts(recall: RecallData): Alert[] {
  const lots = recall.affectedLots ?? [];
  if (lots.length === 0) {
    return [{
      id: recall.id,
      severity: SEVERITY_MAP[recall.severity] ?? "Info",
      title: recall.reason,
      description: `Recall issued. No specific lot codes listed.`,
      timestamp: timeAgo(recall.createdAt),
      lotCode: "N/A",
      status: STATUS_MAP[recall.status] ?? "Active",
    }];
  }

  return lots.map((lotCode) => ({
    id: `${recall.id}-${lotCode}`,
    severity: SEVERITY_MAP[recall.severity] ?? "Info",
    title: recall.reason,
    description: `This lot has been recalled. Do not consume products from lot ${lotCode}.`,
    timestamp: timeAgo(recall.createdAt),
    lotCode,
    status: STATUS_MAP[recall.status] ?? "Active",
  }));
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecalls() {
      try {
        const res = await fetch("/api/recalls");
        if (!res.ok) return;
        const json = await res.json();
        const recalls: RecallData[] = json.data?.recalls ?? [];
        setAlerts(recalls.flatMap(mapRecallToAlerts));
      } catch {
        // Silently fall back to empty alerts
      } finally {
        setLoading(false);
      }
    }
    fetchRecalls();
  }, []);

  if (loading) {
    return (
      <section className="space-y-4 font-sans">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">Active Recalls</h1>
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted animate-pulse">
          Loading recalls...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 font-sans">
      <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">Active Recalls</h1>
      {alerts.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted">
          No active recalls. All products are safe.
        </div>
      ) : (
        <AlertsList alerts={alerts} />
      )}
    </section>
  );
}
