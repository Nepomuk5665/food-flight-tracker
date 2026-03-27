"use client";

import { Route, Circle } from "lucide-react";
import type { GodViewLayers } from "./GodViewMap";

interface LayerTogglesProps {
  layers: GodViewLayers;
  onChange: (layers: GodViewLayers) => void;
}

export function LayerToggles({ layers, onChange }: LayerTogglesProps) {
  const toggles: { key: keyof GodViewLayers; label: string; icon: React.ReactNode }[] = [
    { key: "routes", label: "Routes", icon: <Route size={14} /> },
    { key: "clusters", label: "Clusters", icon: <Circle size={14} /> },
  ];

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-10 flex gap-1.5">
      {toggles.map((t) => {
        const active = layers[t.key];
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange({ ...layers, [t.key]: !active })}
            className={`flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors rounded-none ${
              active
                ? "border-[#9eca45] bg-[#9eca45]/15 text-[#9eca45]"
                : "border-[#1e2a3a] bg-[#0f1923]/90 text-[#5a6a7a] hover:text-[#8b9db6]"
            } backdrop-blur-sm`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
