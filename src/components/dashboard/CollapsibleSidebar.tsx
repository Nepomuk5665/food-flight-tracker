"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Package, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Overview", icon: <Globe size={18} /> },
  { href: "/batch/demo-lot", label: "Batches", icon: <Package size={18} /> },
  { href: "/incidents", label: "Incidents", icon: <AlertTriangle size={18} /> },
];

export function CollapsibleSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={`hidden md:flex fixed top-0 left-0 z-40 flex-col border-r border-white/[0.06] bg-black min-h-screen transition-all duration-300 ease-in-out ${
        expanded ? "w-52" : "w-[48px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-3">
        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8">
          <Image src="/icon.svg" alt="Trace" width={28} height={28} />
        </span>
        <span
          className={`text-sm font-bold uppercase tracking-widest text-white whitespace-nowrap transition-opacity duration-200 ${
            expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
          }`}
        >
          Trace
        </span>
      </div>

      {/* Divider */}
      <div className="mx-2 border-t border-white/[0.10]" />

      <nav className="flex-1 py-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-3 px-2 py-2 rounded-none transition-all duration-200 ${
                    active
                      ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                      : "text-white/50 hover:bg-white/[0.10] hover:text-white"
                  }`}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-white">
                    {item.icon}
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider whitespace-nowrap text-white transition-opacity duration-200 ${
                      expanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
