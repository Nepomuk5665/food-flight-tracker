import type { StageType } from "@/lib/types";
import {
  Wheat,
  MilkOff,
  Factory,
  Package,
  Warehouse,
  Truck,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_SIZE = 32;
const LUCIDE_SIZE = 16;
const OFFSET = (ICON_SIZE - LUCIDE_SIZE) / 2;

function IconBadge({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-full"
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

const STAGE_CONFIG: Record<StageType, { icon: LucideIcon; color: string }> = {
  harvest:    { icon: Wheat,     color: "#2d6a4f" },
  collection: { icon: MilkOff,   color: "#4a7c59" },
  processing: { icon: Factory,   color: "#6c4f3d" },
  packaging:  { icon: Package,   color: "#7b6b8a" },
  storage:    { icon: Warehouse, color: "#4a6fa5" },
  transport:  { icon: Truck,     color: "#c44536" },
  retail:     { icon: Store,     color: "#d4a843" },
};

export function getStageIcon(type: StageType) {
  const config = STAGE_CONFIG[type];
  return <IconBadge icon={config.icon} color={config.color} />;
}

export function getStageColor(type: StageType): string {
  return STAGE_CONFIG[type].color;
}
