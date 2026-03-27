"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PackageSearch, Trash2, Camera } from "lucide-react";
import { getScanHistory, clearScanHistory, type ScanHistoryEntry } from "@/lib/scan-history";

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
        <div className="flex h-20 w-20 items-center justify-center bg-[#f7f9fa] text-[#777777]">
          <PackageSearch className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold uppercase text-[#003a5d]">No Products Scanned</h1>
          <p className="mt-2 text-[#424242]">Scan a barcode to see your history here.</p>
        </div>
        <Link
          href="/scan"
          className="flex items-center gap-2 bg-[#9eca45] px-7 py-3.5 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#333333]"
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
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#003a5d]">Scan History</h1>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 border border-[#dddddd] bg-white px-3 py-2 text-[10px] font-bold uppercase text-[#777777] transition-all hover:border-[#dc2626] hover:text-[#dc2626]"
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
            className="flex items-center gap-3 border border-[#dddddd] bg-white p-3 transition-all hover:border-[#9eca45]"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden border border-[#eeeeee] bg-[#f7f9fa]">
              {entry.imageUrl ? (
                <img src={entry.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <PackageSearch className="h-5 w-5 text-[#dddddd]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#060606]">{entry.name}</p>
              <p className="truncate text-xs text-[#777777]">{entry.brand}</p>
              {entry.aiSummary ? (
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[#9eca45]">✦ {entry.aiSummary.replace(/[*#_`]/g, "").slice(0, 120)}</p>
              ) : (
                <p className="text-[10px] text-[#bbbbbb]">{entry.barcode}</p>
              )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              {entry.nutriScore && (
                <span
                  className={`flex h-6 w-6 items-center justify-center text-[10px] font-bold text-white ${SCORE_COLORS[entry.nutriScore] ?? "bg-[#777777]"}`}
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
