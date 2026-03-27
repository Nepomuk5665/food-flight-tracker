"use client";

import { useRef, useEffect, useState } from "react";
import { Sparkles, Info, Map } from "lucide-react";

export type TabId = "info" | "map" | "chat";

type TabToggleProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hiddenTabs?: TabId[];
};

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "map", label: "Map", icon: Map },
  { id: "chat", label: "AI", icon: Sparkles },
];

export function TabToggle({ activeTab, onTabChange, hiddenTabs = [] }: TabToggleProps) {
  const visibleTabs = TABS.filter((t) => !hiddenTabs.includes(t.id));
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  const activeIdx = visibleTabs.findIndex((t) => t.id === activeTab);

  useEffect(() => {
    if (!containerRef.current || activeIdx < 0) return;
    const buttons = containerRef.current.querySelectorAll("button");
    const btn = buttons[activeIdx];
    if (!btn) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setPillStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [activeIdx, visibleTabs.length]);

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 bg-white px-4 py-2">
      <div ref={containerRef} className="relative flex gap-1 rounded-full bg-[#F3F4F6] p-1">
        {pillStyle && (
          <span
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-300 ease-out"
            style={{ left: pillStyle.left, width: pillStyle.width }}
          />
        )}
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold tracking-wide transition-colors duration-200 ${
                isActive ? "text-[#1A1A1A]" : "text-[#9CA3AF] hover:text-[#6B7280]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
