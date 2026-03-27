"use client";

import { useState, useEffect } from "react";
import { Monitor } from "lucide-react";
import Link from "next/link";

export default function DesktopGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0e1a] p-8 font-sans">
        <div className="max-w-md border border-[#1a1f35] bg-[#0f1320] p-10 text-center">
          <Monitor className="mx-auto mb-5 h-14 w-14 text-[#9eca45]" />
          <h1 className="text-2xl font-bold uppercase text-white">Desktop Only</h1>
          <p className="mt-3 text-sm text-[#64748b]">
            The QA Dashboard is designed for large screens. Open this URL on your computer:
          </p>
          <div className="mx-auto mt-6 border border-[#1a1f35] bg-[#0a0e1a] px-5 py-3">
            <p className="text-sm font-bold text-[#9eca45]">foodflighttracker.com/overview</p>
          </div>
          <p className="mt-6 text-sm text-[#64748b]">
            Looking for the Consumer App?
          </p>
          <Link
            href="/scan"
            className="mt-2 inline-block bg-[#9eca45] px-6 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#8bb83a]"
          >
            Open Scanner
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
