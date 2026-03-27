import type { JourneyStage, StageType } from "../types";

export interface OriginData {
  country: string;
  lat: number | null;
  lng: number | null;
  share: number;
}

export interface OriginResult extends OriginData {
  ingredient: string;
}

export const INGREDIENT_ORIGINS: Record<string, OriginData[]> = {
  cocoa: [
    { country: "Ivory Coast", lat: 6.8276, lng: -5.2893, share: 0.38 },
    { country: "Ghana", lat: 7.9465, lng: -1.0232, share: 0.17 },
    { country: "Ecuador", lat: -1.8312, lng: -78.1834, share: 0.07 },
    { country: "Cameroon", lat: 7.3697, lng: 12.3547, share: 0.06 },
  ],
  "palm oil": [
    { country: "Indonesia", lat: -0.7893, lng: 113.9213, share: 0.55 },
    { country: "Malaysia", lat: 4.2105, lng: 101.9758, share: 0.27 },
  ],
  sugar: [
    { country: "Brazil", lat: -14.235, lng: -51.9253, share: 0.22 },
    { country: "India", lat: 20.5937, lng: 78.9629, share: 0.18 },
    { country: "Thailand", lat: 15.87, lng: 100.9925, share: 0.1 },
  ],
  hazelnuts: [
    { country: "Turkey", lat: 41.0082, lng: 28.9784, share: 0.7 },
    { country: "Italy", lat: 41.8719, lng: 12.5674, share: 0.13 },
  ],
  vanilla: [{ country: "Madagascar", lat: -18.7669, lng: 46.8691, share: 0.75 }],
  coffee: [
    { country: "Brazil", lat: -14.235, lng: -51.9253, share: 0.35 },
    { country: "Vietnam", lat: 14.0583, lng: 108.2772, share: 0.17 },
    { country: "Colombia", lat: 4.5709, lng: -74.2973, share: 0.08 },
  ],
  milk: [{ country: "local", lat: null, lng: null, share: 1.0 }],
};

const MANUFACTURING_COORDINATES: Record<string, { lat: number; lng: number }> = {
  aachen: { lat: 50.7753, lng: 6.0839 },
  brussels: { lat: 50.8503, lng: 4.3517 },
  munich: { lat: 48.1351, lng: 11.582 },
  kempten: { lat: 47.7267, lng: 10.3139 },
  germany: { lat: 51.1657, lng: 10.4515 },
};

const STAGE_INTERVAL_MS = 1000 * 60 * 60 * 24 * 2;

const topOriginByIngredient = (ingredient: string): OriginResult | null => {
  const key = ingredient.trim().toLowerCase();
  const mappingEntry = Object.entries(INGREDIENT_ORIGINS).find(([mappedIngredient]) => key.includes(mappedIngredient));
  if (!mappingEntry) {
    return null;
  }

  const [matchedIngredient, origins] = mappingEntry;
  const best = [...origins].sort((a, b) => b.share - a.share)[0];
  return {
    ingredient: matchedIngredient,
    country: best.country,
    lat: best.lat,
    lng: best.lng,
    share: best.share,
  };
};

export function inferOrigins(ingredients: string[]): OriginResult[] {
  const seen = new Set<string>();
  const inferred: OriginResult[] = [];

  for (const ingredient of ingredients) {
    const origin = topOriginByIngredient(ingredient);
    if (!origin) {
      continue;
    }

    const uniqueKey = `${origin.ingredient}:${origin.country}`;
    if (seen.has(uniqueKey)) {
      continue;
    }
    seen.add(uniqueKey);
    inferred.push(origin);
  }

  return inferred;
}

const resolveManufacturingCoordinates = (manufacturingPlace?: string): { name: string; lat: number; lng: number } => {
  const normalized = manufacturingPlace?.toLowerCase().trim();
  if (normalized) {
    for (const [name, coords] of Object.entries(MANUFACTURING_COORDINATES)) {
      if (normalized.includes(name)) {
        return { name: manufacturingPlace!, lat: coords.lat, lng: coords.lng };
      }
    }
  }

  return { name: manufacturingPlace || "Unknown manufacturing location", lat: 48.1351, lng: 11.582 };
};

const stage = (
  sequenceOrder: number,
  type: StageType,
  name: string,
  location: { name: string; lat: number; lng: number },
  routeCoordinates?: [number, number][],
): JourneyStage => {
  const startedAt = new Date(Date.now() + sequenceOrder * STAGE_INTERVAL_MS).toISOString();
  const completedAt = new Date(Date.now() + (sequenceOrder + 1) * STAGE_INTERVAL_MS).toISOString();

  return {
    stageId: `${type}-${sequenceOrder}`,
    type,
    name,
    location,
    routeCoordinates,
    startedAt,
    completedAt,
    operator: "Inferred supply chain model",
    metadata: {
      source: "origin-intelligence-layer",
      confidence: "inferred",
    },
    telemetry: {},
    anomalies: [],
    sequenceOrder,
  };
};

export function buildJourney(origins: OriginResult[], manufacturingPlace?: string): JourneyStage[] {
  const manufacturing = resolveManufacturingCoordinates(manufacturingPlace);
  const journey: JourneyStage[] = [];
  let order = 1;

  for (const origin of origins) {
    const lat = origin.lat ?? manufacturing.lat;
    const lng = origin.lng ?? manufacturing.lng;
    const originPoint = { name: `${origin.country} origin (${origin.ingredient})`, lat, lng };

    journey.push(stage(order++, "harvest", `Raw ingredient sourcing: ${origin.ingredient}`, originPoint));
    journey.push(
      stage(
        order++,
        "transport",
        `Transport ${origin.country} → ${manufacturing.name}`,
        { name: `In transit to ${manufacturing.name}`, lat: manufacturing.lat, lng: manufacturing.lng },
        [
          [lat, lng],
          [manufacturing.lat, manufacturing.lng],
        ],
      ),
    );
  }

  journey.push(stage(order++, "processing", "Manufacturing & processing", manufacturing));
  journey.push(
    stage(order++, "storage", "Distribution warehouse", {
      name: "Regional distribution hub",
      lat: 48.1374,
      lng: 11.5755,
    }),
  );
  journey.push(
    stage(order, "retail", "Retail shelf", {
      name: "Consumer retail location",
      lat: 48.133,
      lng: 11.5676,
    }),
  );

  return journey;
}
