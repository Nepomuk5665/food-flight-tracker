"use client";

import { useRef, useEffect, useState } from "react";
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
  const navRef = useRef<HTMLUListElement>(null);
  const [dotStyle, setDotStyle] = useState<{ left: number; width: number } | null>(null);

  const getActiveIndex = () => {
    if (pathname === "/alerts" || pathname.startsWith("/alerts/")) return 2;
    if (pathname === "/products" || pathname.startsWith("/product/") || pathname.startsWith("/journey/")) return 1;
    return 0;
  };
  const activeIndex = getActiveIndex();

  const measureDot = () => {
    if (!navRef.current || activeIndex < 0) return;
    const items = navRef.current.querySelectorAll("li");
    const activeItem = items[activeIndex];
    if (!activeItem) return;

    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    setDotStyle({
      left: itemRect.left - navRect.left + itemRect.width / 2 - 3,
      width: 6,
    });
  };

  useEffect(() => {
    measureDot();
    requestAnimationFrame(measureDot);
  }, [activeIndex, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-white/30 bg-white/50 px-3 py-2 shadow-lg backdrop-blur-2xl backdrop-saturate-150">
      <ul ref={navRef} className="relative flex items-center gap-2">
        {dotStyle && (
          <span
            className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-[#16A34A] transition-all duration-300 ease-out"
            style={{ left: dotStyle.left }}
          />
        )}
        {NAV_ITEMS.map(({ href, label, icon: Icon }, i) => {
          const isActive = i === activeIndex;
          return (
            <li key={href}>
              <Link
                href={href}
                className="relative flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-full px-3 py-1.5"
              >
                <Icon className="h-5 w-5" style={{ color: isActive ? "#16A34A" : "#9CA3AF" }} aria-hidden="true" />
                <span className="text-[10px] font-semibold leading-none" style={{ color: isActive ? "#16A34A" : "#9CA3AF" }}>{label}</span>
                <span className="mt-0.5 h-1.5 w-1.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
