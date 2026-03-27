"use client";

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
  { href: "/overview", label: "Overview", icon: <Globe size={18} className="text-white" /> },
  { href: "/batch/demo-lot", label: "Batches", icon: <Package size={18} className="text-white" /> },
  { href: "/incidents", label: "Incidents", icon: <AlertTriangle size={18} className="text-white" /> },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="p-2">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                className={`flex items-center gap-3 border px-2.5 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-none transition-all duration-200 overflow-hidden whitespace-nowrap ${
                  active
                    ? "border-white/20 bg-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                    : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <span className="flex-shrink-0 flex items-center justify-center w-5">{item.icon}</span>
                <span className={`md:opacity-0 md:transition-opacity md:duration-200 md:group-hover/sidebar:opacity-100 ${
                  active ? "text-white" : "text-white/50"
                }`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
