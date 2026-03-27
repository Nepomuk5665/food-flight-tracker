"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, AlertTriangle, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/batches", label: "Batches", icon: Package },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f7f9fa]">
      {/* Top Bar */}
      <header className="h-16 bg-[#0a0e1a] flex items-center justify-between px-6 border-b border-[#1a1f35] shrink-0 z-20 relative">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg tracking-widest uppercase">
            Project Trace
          </span>
          <span className="w-2 h-2 bg-[#9eca45] rounded-full animate-pulse"></span>
        </div>
        
        <div className="hidden md:flex items-center">
          <span className="bg-[#1a1f35] text-[#9eca45] text-xs font-bold uppercase px-3 py-1 border border-[#2a3145]">
            QA Dashboard
          </span>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-white p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar (Desktop) & Top Nav (Mobile) */}
        <aside className={`
          bg-[#0f1320] border-r border-[#1a1f35] shrink-0
          md:w-[240px] md:flex md:flex-col
          ${mobileMenuOpen ? 'block' : 'hidden'}
        `}>
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 text-sm font-semibold uppercase tracking-wider transition-all
                    ${isActive 
                      ? "bg-[#1a1f35] text-white border-l-4 border-[#9eca45]" 
                      : "text-[#64748b] border-l-4 border-transparent hover:bg-[#1a1f35]/50 hover:text-white"
                    }
                  `}
                >
                  <Icon size={18} className={isActive ? "text-[#9eca45]" : ""} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-[#f7f9fa]">
          {children}
        </main>
      </div>
    </div>
  );
}
