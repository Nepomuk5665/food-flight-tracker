import type { StageType } from "@/lib/types";
import {
  Wheat,
  MilkOff,
  Factory,
  Package,
  Warehouse,
  Truck,
  Store,
  Droplets,
  CircleDot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_SIZE = 36;
const LUCIDE_SIZE = 18;

function IconBadge({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shadow-sm"
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        backgroundColor: color,
      }}
    >
      <Icon size={LUCIDE_SIZE} color="#fff" strokeWidth={2} />
    </div>
  );
}

const STAGE_CONFIG: Record<string, { icon: LucideIcon; color: string }> = {
  harvest:    { icon: Wheat,     color: "#2d6a4f" },
  sourcing:   { icon: Droplets,  color: "#1a759f" },
  collection: { icon: MilkOff,   color: "#4a7c59" },
  processing: { icon: Factory,   color: "#6c4f3d" },
  packaging:  { icon: Package,   color: "#7b6b8a" },
  storage:    { icon: Warehouse, color: "#4a6fa5" },
  transport:  { icon: Truck,     color: "#5b7fa5" },
  retail:     { icon: Store,     color: "#d4a843" },
};

const FALLBACK = { icon: CircleDot, color: "#9CA3AF" };

export function getStageIcon(type: string) {
  const config = STAGE_CONFIG[type] ?? FALLBACK;
  return <IconBadge icon={config.icon} color={config.color} />;
}

export function getStageColor(type: string): string {
  return (STAGE_CONFIG[type] ?? FALLBACK).color;
}
