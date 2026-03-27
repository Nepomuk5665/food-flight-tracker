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
            className={`flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 rounded-none backdrop-blur-2xl ${
              active
                ? "border-white/20 bg-white/[0.08] text-white/80 shadow-[0_0_12px_-4px_rgba(255,255,255,0.15)]"
                : "border-white/[0.06] bg-white/[0.03] text-white/30 hover:text-white/50 hover:border-white/10"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
