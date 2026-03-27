"use client";

import { Info, Map } from "lucide-react";

export type TabId = "info" | "map" | "chat";

type TabToggleProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hiddenTabs?: TabId[];
};

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "map", label: "Map", icon: Map },
];

export function TabToggle({ activeTab, onTabChange, hiddenTabs = [] }: TabToggleProps) {
  const visibleTabs = TABS.filter((t) => !hiddenTabs.includes(t.id));
  return (
    <div className="sticky top-0 z-20 mb-4 bg-background py-1">
      <div className="inline-flex rounded-full bg-[#F3F4F6] p-1">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex min-w-[92px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-colors ${
                isActive
                  ? "bg-white text-foreground shadow-sm"
                  : "text-[#9CA3AF] hover:text-body"
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
