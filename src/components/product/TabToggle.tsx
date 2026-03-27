"use client";

import { Info, Map, MessageCircle } from "lucide-react";

export type TabId = "info" | "map" | "chat";

type TabToggleProps = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const TABS: { id: TabId; label: string; icon: typeof Info }[] = [
  { id: "info", label: "Info", icon: Info },
  { id: "map", label: "Map", icon: Map },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

export function TabToggle({ activeTab, onTabChange }: TabToggleProps) {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-[#dddddd] bg-white px-4">
      <div className="flex">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                isActive
                  ? "border-b-2 border-[#9eca45] text-[#003a5d]"
                  : "border-b-2 border-transparent text-[#999999] hover:text-[#424242]"
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
