import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./data/trace.db";
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// ---------------------------------------------------------------------------
// Location database
// ---------------------------------------------------------------------------

interface Location {
  name: string;
  lat: number;
  lng: number;
  region: string;
}

const HARVEST_LOCATIONS: Location[] = [
  // Cocoa
  { name: "Kumasi Cocoa Farm", lat: 6.6885, lng: -1.6244, region: "Ghana" },
  { name: "Abidjan Cocoa Plantation", lat: 5.3600, lng: -4.0083, region: "Ivory Coast" },
  { name: "Guayaquil Cocoa Estate", lat: -2.1710, lng: -79.9223, region: "Ecuador" },
  { name: "Douala Cocoa Cooperative", lat: 4.0511, lng: 9.7679, region: "Cameroon" },
  // Coffee
  { name: "Yirgacheffe Coffee Farm", lat: 6.1628, lng: 38.2058, region: "Ethiopia" },
  { name: "Medellín Coffee Estate", lat: 6.2476, lng: -75.5658, region: "Colombia" },
  { name: "Da Lat Coffee Plantation", lat: 11.9404, lng: 108.4583, region: "Vietnam" },
  { name: "Santos Coffee Fazenda", lat: -23.9608, lng: -46.3336, region: "Brazil" },
  { name: "Nairobi Coffee Cooperative", lat: -1.2864, lng: 36.8172, region: "Kenya" },
  { name: "Antigua Coffee Farm", lat: 14.5586, lng: -90.7295, region: "Guatemala" },
  // Spices
  { name: "Kerala Spice Garden", lat: 10.8505, lng: 76.2711, region: "India" },
  { name: "Kandy Cinnamon Plantation", lat: 7.2906, lng: 80.6337, region: "Sri Lanka" },
  { name: "Sulawesi Clove Farm", lat: -1.4300, lng: 121.4456, region: "Indonesia" },
  { name: "Zanzibar Spice Farm", lat: -6.1659, lng: 39.1989, region: "Tanzania" },
  { name: "Antananarivo Vanilla Estate", lat: -18.9137, lng: 47.5361, region: "Madagascar" },
  // Seafood
  { name: "Phuket Shrimp Farm", lat: 7.8804, lng: 98.3923, region: "Thailand" },
  { name: "Tromsø Salmon Farm", lat: 69.6496, lng: 18.9560, region: "Norway" },
  { name: "Lima Fish Market", lat: -12.0464, lng: -77.0428, region: "Peru" },
  { name: "Hokkaido Fishery", lat: 43.0646, lng: 141.3468, region: "Japan" },
  { name: "Galway Oyster Farm", lat: 53.2707, lng: -9.0568, region: "Ireland" },
  { name: "Cape Town Fish Port", lat: -33.9249, lng: 18.4241, region: "South Africa" },
  // Grains
  { name: "Kansas Wheat Farm", lat: 38.5266, lng: -96.7265, region: "USA" },
  { name: "Odessa Grain Terminal", lat: 46.4825, lng: 30.7233, region: "Ukraine" },
  { name: "Perth Wheat Station", lat: -31.9505, lng: 115.8605, region: "Australia" },
  { name: "Buenos Aires Soy Farm", lat: -34.6037, lng: -58.3816, region: "Argentina" },
  { name: "Punjab Rice Paddy", lat: 31.1471, lng: 75.3412, region: "India" },
  { name: "Sacramento Rice Farm", lat: 38.5816, lng: -121.4944, region: "USA" },
  // Fruit
  { name: "Valparaíso Grape Vineyard", lat: -33.0472, lng: -71.6127, region: "Chile" },
  { name: "Valencia Orange Grove", lat: 39.4699, lng: -0.3763, region: "Spain" },
  { name: "Nakuru Avocado Farm", lat: -0.3031, lng: 36.0800, region: "Kenya" },
  { name: "Davao Banana Plantation", lat: 7.1907, lng: 125.4553, region: "Philippines" },
  { name: "Marrakech Date Farm", lat: 31.6295, lng: -7.9811, region: "Morocco" },
  { name: "Chiang Mai Mango Farm", lat: 18.7883, lng: 98.9853, region: "Thailand" },
  { name: "Martinique Pineapple Estate", lat: 14.6415, lng: -61.0242, region: "Martinique" },
  // Tea
  { name: "Darjeeling Tea Garden", lat: 27.0410, lng: 88.2663, region: "India" },
  { name: "Hangzhou Tea Plantation", lat: 30.2741, lng: 120.1551, region: "China" },
  { name: "Nuwara Eliya Tea Estate", lat: 6.9497, lng: 80.7891, region: "Sri Lanka" },
  // Dairy
  { name: "Allgäu Alpine Dairy", lat: 47.5769, lng: 10.4515, region: "Germany" },
  { name: "Normandy Dairy Farm", lat: 48.8799, lng: -0.1712, region: "France" },
  { name: "Waikato Dairy Farm", lat: -37.7870, lng: 175.2793, region: "New Zealand" },
  // Olive Oil
  { name: "Kalamata Olive Grove", lat: 37.0388, lng: 22.1143, region: "Greece" },
  { name: "Jaén Olive Estate", lat: 37.7796, lng: -3.7849, region: "Spain" },
  { name: "Sfax Olive Plantation", lat: 34.7406, lng: 10.7603, region: "Tunisia" },
  // Nuts
  { name: "Giresun Hazelnut Farm", lat: 40.9128, lng: 38.3895, region: "Turkey" },
  { name: "Sacramento Almond Orchard", lat: 38.7296, lng: -121.8375, region: "USA" },
  { name: "Maputo Cashew Farm", lat: -25.9653, lng: 32.5892, region: "Mozambique" },
];

const COLLECTION_LOCATIONS: Location[] = [
  { name: "Tema Port", lat: 5.6371, lng: -0.0166, region: "Ghana" },
  { name: "Abidjan Port", lat: 5.2653, lng: -3.9964, region: "Ivory Coast" },
  { name: "Addis Ababa Hub", lat: 9.0250, lng: 38.7469, region: "Ethiopia" },
  { name: "Bangkok Collection", lat: 13.7563, lng: 100.5018, region: "Thailand" },
  { name: "Santos Port", lat: -23.9608, lng: -46.3336, region: "Brazil" },
  { name: "Mumbai Port", lat: 18.9220, lng: 72.8347, region: "India" },
  { name: "Jakarta Hub", lat: -6.2088, lng: 106.8456, region: "Indonesia" },
  { name: "Mombasa Port", lat: -4.0435, lng: 39.6682, region: "Kenya" },
  { name: "Guayaquil Port", lat: -2.1894, lng: -79.8891, region: "Ecuador" },
  { name: "Ho Chi Minh Collection", lat: 10.8231, lng: 106.6297, region: "Vietnam" },
  { name: "Valparaíso Port", lat: -33.0472, lng: -71.6127, region: "Chile" },
  { name: "Yokohama Port", lat: 35.4437, lng: 139.6380, region: "Japan" },
  { name: "Auckland Hub", lat: -36.8485, lng: 174.7633, region: "New Zealand" },
  { name: "Casablanca Port", lat: 33.5731, lng: -7.5898, region: "Morocco" },
];

const PROCESSING_LOCATIONS: Location[] = [
  { name: "Hamburg Processing Plant", lat: 53.5511, lng: 9.9937, region: "Germany" },
  { name: "Rotterdam Food Factory", lat: 51.9244, lng: 4.4777, region: "Netherlands" },
  { name: "Antwerp Processing Center", lat: 51.2194, lng: 4.4025, region: "Belgium" },
  { name: "Chicago Food Processing", lat: 41.8781, lng: -87.6298, region: "USA" },
  { name: "Shanghai Processing Hub", lat: 31.2304, lng: 121.4737, region: "China" },
  { name: "Tokyo Food Factory", lat: 35.6762, lng: 139.6503, region: "Japan" },
  { name: "São Paulo Processing", lat: -23.5505, lng: -46.6333, region: "Brazil" },
  { name: "Milan Food Plant", lat: 45.4642, lng: 9.1900, region: "Italy" },
  { name: "Barcelona Processing", lat: 41.3874, lng: 2.1686, region: "Spain" },
  { name: "Lyon Food Factory", lat: 45.7640, lng: 4.8357, region: "France" },
  { name: "Bergen Fish Processing", lat: 60.3913, lng: 5.3221, region: "Norway" },
  { name: "Dubai Food Hub", lat: 25.2048, lng: 55.2708, region: "UAE" },
];

const STORAGE_LOCATIONS: Location[] = [
  { name: "Rotterdam Distribution Hub", lat: 51.9244, lng: 4.4777, region: "Netherlands" },
  { name: "Singapore Logistics Center", lat: 1.3521, lng: 103.8198, region: "Singapore" },
  { name: "Hamburg Cold Storage", lat: 53.5511, lng: 9.9937, region: "Germany" },
  { name: "Los Angeles Warehouse", lat: 33.9425, lng: -118.4081, region: "USA" },
  { name: "Dubai Free Zone", lat: 25.2048, lng: 55.2708, region: "UAE" },
  { name: "Antwerp Warehouse", lat: 51.2194, lng: 4.4025, region: "Belgium" },
  { name: "Shanghai Cold Storage", lat: 31.2304, lng: 121.4737, region: "China" },
  { name: "Munich Distribution", lat: 48.1351, lng: 11.5820, region: "Germany" },
];

const RETAIL_LOCATIONS: Location[] = [
  { name: "Munich Retail", lat: 48.1351, lng: 11.5820, region: "Germany" },
  { name: "Berlin Market", lat: 52.5200, lng: 13.4050, region: "Germany" },
  { name: "Zurich Store", lat: 47.3769, lng: 8.5417, region: "Switzerland" },
  { name: "Vienna Supermarket", lat: 48.2082, lng: 16.3738, region: "Austria" },
  { name: "Paris Épicerie", lat: 48.8566, lng: 2.3522, region: "France" },
  { name: "London Market", lat: 51.5074, lng: -0.1278, region: "UK" },
  { name: "Amsterdam Store", lat: 52.3676, lng: 4.9041, region: "Netherlands" },
  { name: "Milan Deli", lat: 45.4642, lng: 9.1900, region: "Italy" },
  { name: "Barcelona Mercat", lat: 41.3874, lng: 2.1686, region: "Spain" },
  { name: "Copenhagen Market", lat: 55.6761, lng: 12.5683, region: "Denmark" },
  { name: "Stockholm Store", lat: 59.3293, lng: 18.0686, region: "Sweden" },
  { name: "Prague Market", lat: 50.0755, lng: 14.4378, region: "Czech Republic" },
  { name: "New York Deli", lat: 40.7128, lng: -74.0060, region: "USA" },
  { name: "Tokyo Market", lat: 35.6762, lng: 139.6503, region: "Japan" },
  { name: "Sydney Store", lat: -33.8688, lng: 151.2093, region: "Australia" },
  { name: "Dubai Mall", lat: 25.2048, lng: 55.2708, region: "UAE" },
];

// ---------------------------------------------------------------------------
// Product templates
// ---------------------------------------------------------------------------

interface ProductTemplate {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  nutriScore: string;
  ecoScore: string;
  ingredients: string;
  harvests: string[];
  harvestRegions: string[];
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    name: "Single-Origin Coffee Beans 250g",
    brand: "TraceRoast",
    category: "coffee",
    barcode: "500000",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Arabica coffee beans",
    harvests: ["Ethiopia", "Colombia", "Vietnam", "Brazil", "Kenya", "Guatemala"],
    harvestRegions: ["Ethiopia", "Colombia", "Vietnam", "Brazil", "Kenya", "Guatemala"],
  },
  {
    name: "Dark Chocolate Bar 85% 100g",
    brand: "CacaoTrace",
    category: "chocolate",
    barcode: "500100",
    nutriScore: "C",
    ecoScore: "B",
    ingredients: "Cocoa mass, cocoa butter, sugar, vanilla",
    harvests: ["Ghana", "Ivory Coast", "Ecuador", "Cameroon"],
    harvestRegions: ["Ghana", "Ivory Coast", "Ecuador", "Cameroon"],
  },
  {
    name: "Wild-Caught Shrimp 500g",
    brand: "OceanTrace",
    category: "seafood",
    barcode: "500200",
    nutriScore: "A",
    ecoScore: "C",
    ingredients: "Tiger shrimp, salt, water",
    harvests: ["Thailand"],
    harvestRegions: ["Thailand"],
  },
  {
    name: "Atlantic Salmon Fillet 300g",
    brand: "NordFish",
    category: "seafood",
    barcode: "500300",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Atlantic salmon",
    harvests: ["Norway", "Ireland"],
    harvestRegions: ["Norway", "Ireland"],
  },
  {
    name: "Organic Basmati Rice 1kg",
    brand: "GrainTrace",
    category: "grains",
    barcode: "500400",
    nutriScore: "A",
    ecoScore: "A",
    ingredients: "Organic basmati rice",
    harvests: ["India"],
    harvestRegions: ["India"],
  },
  {
    name: "Premium Wheat Flour 2kg",
    brand: "MillTrace",
    category: "grains",
    barcode: "500500",
    nutriScore: "B",
    ecoScore: "A",
    ingredients: "Wheat flour, enriched",
    harvests: ["USA", "Ukraine", "Australia", "Argentina"],
    harvestRegions: ["USA", "Ukraine", "Australia", "Argentina"],
  },
  {
    name: "Extra Virgin Olive Oil 500ml",
    brand: "MedTrace",
    category: "oils",
    barcode: "500600",
    nutriScore: "C",
    ecoScore: "A",
    ingredients: "Cold-pressed olives",
    harvests: ["Greece", "Spain", "Tunisia"],
    harvestRegions: ["Greece", "Spain", "Tunisia"],
  },
  {
    name: "Ceylon Cinnamon Sticks 50g",
    brand: "SpiceTrace",
    category: "spices",
    barcode: "500700",
    nutriScore: "A",
    ecoScore: "A",
    ingredients: "Ceylon cinnamon bark",
    harvests: ["Sri Lanka"],
    harvestRegions: ["Sri Lanka"],
  },
  {
    name: "Organic Turmeric Powder 100g",
    brand: "SpiceTrace",
    category: "spices",
    barcode: "500800",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Organic turmeric root",
    harvests: ["India", "Indonesia"],
    harvestRegions: ["India", "Indonesia"],
  },
  {
    name: "Madagascar Vanilla Extract 100ml",
    brand: "SpiceTrace",
    category: "spices",
    barcode: "500900",
    nutriScore: "B",
    ecoScore: "C",
    ingredients: "Vanilla beans, ethanol, water",
    harvests: ["Madagascar"],
    harvestRegions: ["Madagascar"],
  },
  {
    name: "Darjeeling First Flush 100g",
    brand: "LeafTrace",
    category: "tea",
    barcode: "501000",
    nutriScore: "A",
    ecoScore: "A",
    ingredients: "Darjeeling tea leaves",
    harvests: ["India"],
    harvestRegions: ["India"],
  },
  {
    name: "Longjing Green Tea 75g",
    brand: "LeafTrace",
    category: "tea",
    barcode: "501100",
    nutriScore: "A",
    ecoScore: "A",
    ingredients: "Chinese green tea leaves",
    harvests: ["China"],
    harvestRegions: ["China"],
  },
  {
    name: "Fresh Mozzarella 250g",
    brand: "DairyTrace",
    category: "dairy",
    barcode: "501200",
    nutriScore: "B",
    ecoScore: "B",
    ingredients: "Pasteurized milk, salt, rennet",
    harvests: ["France", "Germany"],
    harvestRegions: ["France", "Germany"],
  },
  {
    name: "New Zealand Butter 250g",
    brand: "DairyTrace",
    category: "dairy",
    barcode: "501300",
    nutriScore: "D",
    ecoScore: "C",
    ingredients: "Pasteurized cream, salt",
    harvests: ["New Zealand"],
    harvestRegions: ["New Zealand"],
  },
  {
    name: "Organic Bananas 1kg",
    brand: "FruitTrace",
    category: "fruit",
    barcode: "501400",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Organic bananas",
    harvests: ["Philippines", "Martinique"],
    harvestRegions: ["Philippines", "Martinique"],
  },
  {
    name: "Hass Avocado 4-Pack",
    brand: "FruitTrace",
    category: "fruit",
    barcode: "501500",
    nutriScore: "A",
    ecoScore: "C",
    ingredients: "Hass avocados",
    harvests: ["Kenya", "Chile"],
    harvestRegions: ["Kenya", "Chile"],
  },
  {
    name: "Medjool Dates 400g",
    brand: "FruitTrace",
    category: "fruit",
    barcode: "501600",
    nutriScore: "B",
    ecoScore: "B",
    ingredients: "Medjool dates",
    harvests: ["Morocco"],
    harvestRegions: ["Morocco"],
  },
  {
    name: "Thai Mango Dried 150g",
    brand: "FruitTrace",
    category: "fruit",
    barcode: "501700",
    nutriScore: "C",
    ecoScore: "B",
    ingredients: "Dried mango, sugar",
    harvests: ["Thailand"],
    harvestRegions: ["Thailand"],
  },
  {
    name: "Premium Hazelnuts 200g",
    brand: "NutTrace",
    category: "nuts",
    barcode: "501800",
    nutriScore: "A",
    ecoScore: "A",
    ingredients: "Roasted hazelnuts",
    harvests: ["Turkey"],
    harvestRegions: ["Turkey"],
  },
  {
    name: "Roasted Cashews 250g",
    brand: "NutTrace",
    category: "nuts",
    barcode: "501900",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Cashews, sea salt",
    harvests: ["Mozambique"],
    harvestRegions: ["Mozambique"],
  },
  {
    name: "Sashimi-Grade Tuna 200g",
    brand: "OceanTrace",
    category: "seafood",
    barcode: "502000",
    nutriScore: "A",
    ecoScore: "C",
    ingredients: "Bluefin tuna",
    harvests: ["Japan"],
    harvestRegions: ["Japan"],
  },
  {
    name: "Cape Town Oysters 12-Pack",
    brand: "OceanTrace",
    category: "seafood",
    barcode: "502100",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Pacific oysters",
    harvests: ["South Africa"],
    harvestRegions: ["South Africa"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two locations. */
function distKm(a: Location, b: Location): number {
  const DEG = Math.PI / 180;
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * sinLng * sinLng;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Pick the closest location from a list to a reference point. */
function findClosest(ref: Location, candidates: Location[]): Location {
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = distKm(ref, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function findHarvestLocation(region: string): Location {
  const match = HARVEST_LOCATIONS.find((l) => l.region === region);
  return match ?? pick(HARVEST_LOCATIONS);
}

function findCollectionNear(region: string): Location {
  const match = COLLECTION_LOCATIONS.find((l) => l.region === region);
  return match ?? pick(COLLECTION_LOCATIONS);
}

function generateLotCode(productIdx: number, chainIdx: number): string {
  const year = 2026;
  const month = String(randInt(1, 3)).padStart(2, "0");
  const day = String(randInt(1, 28)).padStart(2, "0");
  return `GL-${year}${month}${day}-${String(productIdx).padStart(2, "0")}${String(chainIdx).padStart(3, "0")}`;
}

function isoDate(daysAgo: number): string {
  const d = new Date("2026-03-15T00:00:00Z");
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Generate supply chains
// ---------------------------------------------------------------------------

console.log("Generating global supply chains...");

let totalProducts = 0;
let totalBatches = 0;
let totalStages = 0;

for (let tplIdx = 0; tplIdx < PRODUCT_TEMPLATES.length; tplIdx++) {
  const tpl = PRODUCT_TEMPLATES[tplIdx];
  const chainsPerProduct = tpl.harvestRegions.length <= 2 ? randInt(2, 3) : randInt(1, 2);

  // Insert product
  const barcode = tpl.barcode + String(tplIdx).padStart(4, "0");
  const product = db
    .insert(schema.products)
    .values({
      barcode,
      name: tpl.name,
      brand: tpl.brand,
      category: tpl.category,
      source: "generated",
      nutriScore: tpl.nutriScore,
      ecoScore: tpl.ecoScore,
      ingredients: tpl.ingredients,
      allergens: JSON.stringify([]),
    })
    .returning()
    .get()!;
  totalProducts++;

  for (let chainIdx = 0; chainIdx < chainsPerProduct; chainIdx++) {
    const harvestRegion = tpl.harvestRegions[chainIdx % tpl.harvestRegions.length];
    const harvestLoc = findHarvestLocation(harvestRegion);
    const collectionLoc = findCollectionNear(harvestRegion);
    // Each subsequent stage picks the closest location to the previous one,
    // so the supply chain flows geographically from origin to destination.
    const processingLoc = findClosest(collectionLoc, PROCESSING_LOCATIONS);
    const storageLoc = findClosest(processingLoc, STORAGE_LOCATIONS);
    const retailLoc = findClosest(storageLoc, RETAIL_LOCATIONS);

    // Risk: mostly safe, some warning, few critical
    const riskRoll = rand();
    const riskScore = riskRoll < 0.85 ? randInt(0, 20) : riskRoll < 0.95 ? randInt(30, 55) : randInt(60, 90);

    const lotCode = generateLotCode(tplIdx, chainIdx);
    const daysAgo = randInt(5, 80);

    const batch = db
      .insert(schema.batches)
      .values({
        lotCode,
        productId: product.id,
        status: riskScore > 60 ? "under_review" : "active",
        riskScore,
        unitCount: randInt(100, 15000),
        createdAt: isoDate(daysAgo),
        updatedAt: isoDate(daysAgo - randInt(0, 3)),
      })
      .returning()
      .get()!;
    totalBatches++;

    // Build stages
    let order = 1;
    const stages: { type: string; name: string; loc: Location; daysOffset: number }[] = [];

    // Harvest
    stages.push({
      type: "harvest",
      name: `${tpl.category} harvest — ${harvestLoc.region}`,
      loc: harvestLoc,
      daysOffset: 0,
    });

    // Collection
    stages.push({
      type: "collection",
      name: `Collection at ${collectionLoc.name}`,
      loc: collectionLoc,
      daysOffset: randInt(1, 3),
    });

    // Transport to processing
    stages.push({
      type: "transport",
      name: `Sea/air freight → ${processingLoc.region}`,
      loc: processingLoc,
      daysOffset: randInt(5, 18),
    });

    // Processing
    stages.push({
      type: "processing",
      name: `Processing at ${processingLoc.name}`,
      loc: processingLoc,
      daysOffset: randInt(1, 3),
    });

    // Packaging (50% of chains)
    if (rand() > 0.5) {
      stages.push({
        type: "packaging",
        name: `Packaging at ${processingLoc.name}`,
        loc: processingLoc,
        daysOffset: randInt(1, 2),
      });
    }

    // Storage
    stages.push({
      type: "storage",
      name: `Storage at ${storageLoc.name}`,
      loc: storageLoc,
      daysOffset: randInt(2, 7),
    });

    // Transport to retail
    stages.push({
      type: "transport",
      name: `Distribution → ${retailLoc.region}`,
      loc: retailLoc,
      daysOffset: randInt(1, 4),
    });

    // Retail
    stages.push({
      type: "retail",
      name: `${retailLoc.name}`,
      loc: retailLoc,
      daysOffset: 0,
    });

    let cumulativeDays = daysAgo;
    for (const s of stages) {
      cumulativeDays -= s.daysOffset;
      const stageStart = isoDate(cumulativeDays);
      const stageEnd = isoDate(cumulativeDays - 1);

      db.insert(schema.batchStages)
        .values({
          batchId: batch.id,
          stageType: s.type,
          name: s.name,
          locationName: s.loc.name,
          latitude: s.loc.lat,
          longitude: s.loc.lng,
          operator: `${s.loc.region} Operations`,
          startedAt: stageStart,
          completedAt: stageEnd,
          sequenceOrder: order++,
        })
        .run();
      totalStages++;
    }

    // Add anomalies for high-risk batches — biased toward transport stages
    if (riskScore > 50) {
      // Find transport stages first; fall back to any middle stage
      const insertedStages = db
        .select()
        .from(schema.batchStages)
        .where(eq(schema.batchStages.batchId, batch.id))
        .all();

      const transportStages = insertedStages.filter((s) => s.stageType === "transport");
      const target = transportStages.length > 0
        ? pick(transportStages)
        : insertedStages[randInt(1, insertedStages.length - 2)] ?? insertedStages[0];

      if (target) {
        const anomalyTypes = ["cold_chain_break", "humidity_spike", "delayed_transport", "temperature_high"] as const;
        db.insert(schema.stageAnomalies)
          .values({
            stageId: target.id,
            batchId: batch.id,
            anomalyType: pick([...anomalyTypes]),
            severity: riskScore > 70 ? "critical" : "high",
            description: `Automated anomaly detection — risk score ${riskScore}`,
            thresholdValue: 10.0,
            actualValue: 10 + rand() * 5,
            durationMinutes: randInt(15, 300),
            riskScoreImpact: randInt(10, 30),
            detectedAt: isoDate(cumulativeDays),
          })
          .run();
      }
    }
  }
}

console.log(`Done! Generated ${totalProducts} products, ${totalBatches} batches, ${totalStages} stages.`);
sqlite.close();
