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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white">
      <ul className="mx-auto grid w-full max-w-[480px] grid-cols-3">
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
                className={`flex flex-col items-center justify-center gap-1 border-r border-border-light px-2 py-2 text-xs font-semibold uppercase last:border-r-0 ${
                  isActive
                    ? "border-t-2 border-t-accent text-accent"
                    : "border-t-2 border-t-transparent text-primary"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${isActive ? "text-accent" : "text-accent"}`}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
