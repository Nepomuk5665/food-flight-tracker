"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Bell, PackageSearch } from "lucide-react";

const NAV_ITEMS = [
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/products", label: "Products", icon: PackageSearch },
  { href: "/alerts", label: "Alerts", icon: Bell },
] as const;

export function ConsumerNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#E5E7EB] bg-white/80 px-3 py-2 shadow-lg backdrop-blur-xl">
      <ul className="flex items-center gap-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          let isActive = false;
          if (href === "/products") {
            isActive = pathname === "/products" || pathname.startsWith("/product/") || pathname.startsWith("/journey/");
          } else {
            isActive = pathname === href || pathname.startsWith(`${href}/`);
          }

          return (
            <li key={href}>
              <Link
                href={href}
                className={`relative flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-full px-3 py-1.5 transition-colors ${
                  isActive ? "text-[#16A34A]" : "text-[#9CA3AF]"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-semibold leading-none">{label}</span>
                {isActive ? <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" /> : <span className="mt-0.5 h-1.5 w-1.5" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
