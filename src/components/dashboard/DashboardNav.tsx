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
  { href: "/overview", label: "Overview", icon: <Globe size={16} /> },
  { href: "/batch/demo-lot", label: "Batches", icon: <Package size={16} /> },
  { href: "/incidents", label: "Incidents", icon: <AlertTriangle size={16} /> },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="p-4">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-2 border px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-none transition-colors ${
                  active
                    ? "border-[#9eca45] border-l-2 bg-[#162433] text-[#9eca45]"
                    : "border-[#1e2a3a] text-[#8b9db6] hover:bg-[#162433] hover:text-[#9eca45]"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
