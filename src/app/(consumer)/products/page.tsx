"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { PackageSearch, Trash2, Camera } from "lucide-react";
import { getScanHistory, clearScanHistory, type ScanHistoryEntry } from "@/lib/scan-history";
import { ProductPlaceholder } from "@/components/product/ProductPlaceholder";

const SCORE_COLORS: Record<string, string> = {
  A: "bg-[#2e7d32]",
  B: "bg-[#7cb342]",
  C: "bg-[#f9a825]",
  D: "bg-[#ef6c00]",
  E: "bg-[#c62828]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProductsPage() {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getScanHistory());
  }, []);

  const handleClear = () => {
    clearScanHistory();
    setHistory([]);
  };

  if (history.length === 0) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center font-sans">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] text-[#16A34A] shadow-sm">
          <PackageSearch className="h-10 w-10" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">No products scanned yet</h1>
          <p className="mt-2 text-body">Scan a barcode to see your history here.</p>
        </div>
        <Link
          href="/scan"
          className="flex items-center gap-2 rounded-xl bg-[#16A34A] px-7 py-3.5 text-xs font-bold uppercase text-white shadow-sm transition-all hover:bg-[#15803D]"
        >
          <Camera className="h-4 w-4" />
          Scan Product
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Scan history</h1>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-[10px] font-semibold uppercase text-muted transition-all hover:border-danger hover:text-danger"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {history.map((entry) => (
          <Link
            key={entry.barcode}
            href={`/product/${entry.barcode}`}
            className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-sm transition-all hover:border-[#16A34A]/50"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
              {entry.imageUrl ? (
                <Image src={entry.imageUrl} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <ProductPlaceholder name={entry.name} iconSize={24} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{entry.name}</p>
              <p className="truncate text-xs text-muted">{entry.brand}</p>
              {entry.aiSummary ? (
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[#16A34A]">✦ {entry.aiSummary.replace(/[*#_`]/g, "").slice(0, 120)}</p>
              ) : (
                <p className="text-[10px] text-[#bbbbbb]">{entry.barcode}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {entry.nutriScore && (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white ${SCORE_COLORS[entry.nutriScore] ?? "bg-muted"}`}
                >
                  {entry.nutriScore}
                </span>
              )}
              <span className="text-[10px] text-[#bbbbbb]">{timeAgo(entry.scannedAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
