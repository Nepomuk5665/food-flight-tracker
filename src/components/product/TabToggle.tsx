"use client";

import { Info, Map, MessageCircle } from "lucide-react";

export type TabId = "info" | "map" | "chat";

type TabToggleProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hiddenTabs?: TabId[];
};

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "map", label: "Map", icon: Map },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

export function TabToggle({ activeTab, onTabChange, hiddenTabs = [] }: TabToggleProps) {
  const visibleTabs = TABS.filter((t) => !hiddenTabs.includes(t.id));
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-white px-4">
      <div className="flex">
        {visibleTabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                isActive
                  ? "border-b-2 border-accent text-primary"
                  : "border-b-2 border-transparent text-muted hover:text-body"
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
