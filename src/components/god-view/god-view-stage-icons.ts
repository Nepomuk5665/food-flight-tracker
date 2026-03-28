import type { Map as MapboxMap } from "mapbox-gl";

/**
 * Registers stage-type icons with a Mapbox map instance.
 * Each icon is a white Lucide icon on a dark circular background.
 * Professional black & white design — no color.
 */

// Lucide SVG inner elements per stage type (24×24 viewBox)
const STAGE_SVG_INNER: Record<string, string> = {
  harvest: [
    '<path d="M2 22 16 8"/>',
    '<path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>',
    '<path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>',
    '<path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/>',
    '<path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/>',
    '<path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
    '<path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
    '<path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
  ].join(""),

  sourcing: [
    '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>',
    '<path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
  ].join(""),

  collection: [
    '<path d="M8 2h8"/>',
    '<path d="M9 2v1.343M15 2v2.789a4 4 0 0 0 .672 2.219l.656.984a4 4 0 0 1 .672 2.22v1.131M7.8 7.8l-.128.192A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3"/>',
    '<path d="M7 15a6.47 6.47 0 0 1 5 0 6.472 6.472 0 0 0 3.435.435"/>',
    '<line x1="2" x2="22" y1="2" y2="22"/>',
  ].join(""),

  processing: [
    '<path d="M12 16h.01"/>',
    '<path d="M16 16h.01"/>',
    '<path d="M3 19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a.5.5 0 0 0-.769-.422l-4.462 2.844A.5.5 0 0 1 15 10.5v-2a.5.5 0 0 0-.769-.422L9.77 10.922A.5.5 0 0 1 9 10.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>',
    '<path d="M8 16h.01"/>',
  ].join(""),

  packaging: [
    '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/>',
    '<path d="M12 22V12"/>',
    '<polyline points="3.29 7 12 12 20.71 7"/>',
    '<path d="m7.5 4.27 9 5.15"/>',
  ].join(""),

  storage: [
    '<path d="M18 21V10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v11"/>',
    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 1.132-1.803l7.95-3.974a2 2 0 0 1 1.837 0l7.948 3.974A2 2 0 0 1 22 8z"/>',
    '<path d="M6 13h12"/>',
    '<path d="M6 17h12"/>',
  ].join(""),

  transport: [
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>',
    '<path d="M15 18H9"/>',
    '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>',
    '<circle cx="17" cy="18" r="2"/>',
    '<circle cx="7" cy="18" r="2"/>',
  ].join(""),

  retail: [
    '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/>',
    '<path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/>',
    '<path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>',
  ].join(""),

  unknown: [
    '<circle cx="12" cy="12" r="10"/>',
    '<circle cx="12" cy="12" r="1"/>',
  ].join(""),
};

const ICON_PIXEL_SIZE = 48;

function buildSvgDataUrl(innerSvg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_PIXEL_SIZE}" height="${ICON_PIXEL_SIZE}" viewBox="0 0 ${ICON_PIXEL_SIZE} ${ICON_PIXEL_SIZE}">
    <circle cx="24" cy="24" r="22" fill="rgba(0,0,0,0.7)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    <g transform="translate(12,12)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${innerSvg}
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** All stage type icon IDs that will be registered. */
export const STAGE_ICON_IDS = Object.keys(STAGE_SVG_INNER).map(
  (type) => `stage-${type}`,
);

/** Mapbox expression that maps stageType property → icon image id. */
export const STAGE_ICON_EXPRESSION: unknown = [
  "match",
  ["get", "stageType"],
  "harvest", "stage-harvest",
  "sourcing", "stage-sourcing",
  "collection", "stage-collection",
  "processing", "stage-processing",
  "packaging", "stage-packaging",
  "storage", "stage-storage",
  "transport", "stage-transport",
  "retail", "stage-retail",
  "stage-unknown", // fallback
];

/**
 * Load all stage icon images into a Mapbox map.
 * Call once from onLoad. Returns a promise that resolves when all images are ready.
 */
export async function registerStageIcons(map: MapboxMap): Promise<void> {
  const entries = Object.entries(STAGE_SVG_INNER);

  await Promise.all(
    entries.map(
      ([type, innerSvg]) =>
        new Promise<void>((resolve, reject) => {
          const id = `stage-${type}`;
          if (map.hasImage(id)) {
            resolve();
            return;
          }

          const url = buildSvgDataUrl(innerSvg);
          const img = new Image(ICON_PIXEL_SIZE, ICON_PIXEL_SIZE);
          img.onload = () => {
            if (!map.hasImage(id)) {
              map.addImage(id, img, { pixelRatio: 1 });
            }
            resolve();
          };
          img.onerror = reject;
          img.src = url;
        }),
    ),
  );
}
