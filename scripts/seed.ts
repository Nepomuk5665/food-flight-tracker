import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../src/lib/db/schema";

const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") || "./data/trace.db";
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

// ---------------------------------------------------------------------------
// Clear existing data (idempotent re-runs)
// ---------------------------------------------------------------------------

console.log("Clearing existing data...");
sqlite.exec(`
  DELETE FROM recall_lots;
  DELETE FROM recalls;
  DELETE FROM consumer_reports;
  DELETE FROM stage_anomalies;
  DELETE FROM telemetry_readings;
  DELETE FROM batch_stages;
  DELETE FROM batch_lineage;
  DELETE FROM batches;
  DELETE FROM products;
`);

// ===========================================================================
// SUPPLY CHAIN 1: Nestlé Chocolat au lait (Ivory Coast → Switzerland → Munich)
// Realistic GS1 Digital Link: https://qr.nestle.com/01/07613031085385
// ===========================================================================

console.log("\n── Supply Chain 1: Chocolat au lait (linear) ──");

const chocolate = db
  .insert(schema.products)
  .values({
    barcode: "7613031085385",
    name: "Chocolat au lait",
    brand: "Nestlé",
    category: "chocolate",
    imageUrl: "https://images.openfoodfacts.org/images/products/761/303/108/5385/front_fr.45.400.jpg",
    source: "internal",
    nutriScore: "D",
    ecoScore: "C",
    ingredients:
      "Sugar, whole milk powder, cocoa butter, cocoa mass, emulsifier (soya lecithin), vanilla extract",
    allergens: JSON.stringify(["milk", "soy"]),
  })
  .returning()
  .get()!;

const chocBatch = db
  .insert(schema.batches)
  .values({
    lotCode: "CH2603-AP7",
    productId: chocolate.id,
    status: "active",
    riskScore: 62,
    unitCount: 18000,
    createdAt: iso("2026-01-10T06:00:00Z"),
    updatedAt: iso("2026-02-28T14:00:00Z"),
  })
  .returning()
  .get()!;

console.log(`  Product: ${chocolate.name} (barcode: ${chocolate.barcode})`);
console.log(`  Batch: ${chocBatch.lotCode} (risk: ${chocBatch.riskScore})`);

// Stages: harvest → fermentation → sea freight → rail → manufacturing → warehouse (ANOMALY) → road → retail
const chocStages = db
  .insert(schema.batchStages)
  .values([
    {
      batchId: chocBatch.id,
      stageType: "harvest",
      name: "Cocoa Harvest",
      locationName: "Coopérative CAYAT, San-Pédro, Ivory Coast",
      latitude: 4.7485,
      longitude: -6.6363,
      operator: "CAYAT Cooperative",
      metadata: JSON.stringify({
        harvestWeight: "3,200 kg dried beans",
        certification: "Rainforest Alliance, UTZ",
        variety: "Forastero (Amelonado)",
        farmAltitude: "180m",
      }),
      startedAt: iso("2026-01-10T06:00:00Z"),
      completedAt: iso("2026-01-14T17:00:00Z"),
      sequenceOrder: 1,
    },
    {
      batchId: chocBatch.id,
      stageType: "processing",
      name: "Fermentation & Sun Drying",
      locationName: "CAYAT Processing Station, San-Pédro, Ivory Coast",
      latitude: 4.7512,
      longitude: -6.6318,
      operator: "CAYAT Cooperative",
      metadata: JSON.stringify({
        process: "5-day heap fermentation under banana leaves, 6-day raised-bed sun drying",
        fermentationTemp: "45-50°C peak",
        finalMoisture: "7.2%",
        beanCount: "~98 beans/100g (Grade 1)",
      }),
      startedAt: iso("2026-01-15T07:00:00Z"),
      completedAt: iso("2026-01-26T16:00:00Z"),
      sequenceOrder: 2,
    },
    {
      batchId: chocBatch.id,
      stageType: "transport",
      name: "Sea Freight Abidjan → Hamburg",
      locationName: "Port of Hamburg, Germany",
      latitude: 53.5333,
      longitude: 9.9667,
      routeCoords: JSON.stringify([
        [-4.0167, 5.3167],  // Port of Abidjan
        [-5.5, 4.8],        // Off Ivory Coast
        [-8.0, 4.5],        // Off Liberia
        [-13.0, 7.0],       // Off Sierra Leone
        [-17.5, 12.0],      // Off Senegal
        [-17.8, 18.0],      // Off Mauritania
        [-17.0, 24.0],      // Off Western Sahara
        [-13.5, 28.5],      // Off Canary Islands
        [-10.0, 34.0],      // Off Morocco
        [-9.5, 38.5],       // Off Portugal
        [-9.0, 43.0],       // Off Galicia
        [-5.0, 47.5],       // Bay of Biscay
        [-4.5, 48.5],       // Off Brittany
        [-2.0, 49.5],       // English Channel west
        [1.0, 50.8],        // English Channel east
        [3.0, 51.5],        // North Sea south
        [6.5, 53.5],        // North Sea east
        [8.7, 53.9],        // Elbe estuary
        [9.9667, 53.5333],  // Port of Hamburg
      ]),
      operator: "CMA CGM Logistics",
      metadata: JSON.stringify({
        vesselName: "CMA CGM Trocadéro",
        containerType: "20ft ventilated dry container",
        containerTemp: "ambient (18-25°C)",
        transitDays: 14,
        departurePort: "Port of Abidjan, Ivory Coast",
      }),
      startedAt: iso("2026-01-28T08:00:00Z"),
      completedAt: iso("2026-02-11T06:00:00Z"),
      sequenceOrder: 3,
    },
    {
      batchId: chocBatch.id,
      stageType: "transport",
      name: "Intermodal Rail Hamburg → Buchs AG",
      locationName: "Buchs AG Rail Terminal, Switzerland",
      latitude: 47.3875,
      longitude: 8.0814,
      operator: "SBB Cargo International",
      metadata: JSON.stringify({
        vehicleType: "Intermodal rail wagon",
        transitHours: 18,
        targetTemp: "15-20°C",
      }),
      startedAt: iso("2026-02-11T14:00:00Z"),
      completedAt: iso("2026-02-12T08:00:00Z"),
      sequenceOrder: 4,
    },
    {
      batchId: chocBatch.id,
      stageType: "processing",
      name: "Chocolate Manufacturing",
      locationName: "Nestlé Factory, Broc, Switzerland",
      latitude: 46.6119,
      longitude: 7.0972,
      operator: "Nestlé Suisse S.A.",
      metadata: JSON.stringify({
        process: "Roasting (130°C/25min), winnowing, conching (72h), tempering (28-31°C), molding",
        cocoaContent: "30% (milk chocolate)",
        milkPowder: "Swiss whole milk powder (22%)",
        conchingTime: "72 hours",
      }),
      startedAt: iso("2026-02-13T06:00:00Z"),
      completedAt: iso("2026-02-16T18:00:00Z"),
      sequenceOrder: 5,
    },
    {
      batchId: chocBatch.id,
      stageType: "storage",
      name: "Distribution Warehouse",
      locationName: "Nestlé DC Suhr, Aargau, Switzerland",
      latitude: 47.3714,
      longitude: 8.0803,
      operator: "Nestlé Distribution AG",
      metadata: JSON.stringify({
        warehouseZone: "Zone C-04 (Confectionery)",
        targetTemp: "16-18°C",
        targetHumidity: "50-60%",
        palletId: "PAL-2026-CH2603-AP7-0042",
      }),
      startedAt: iso("2026-02-17T07:00:00Z"),
      completedAt: iso("2026-02-24T06:00:00Z"),
      sequenceOrder: 6,
    },
    {
      batchId: chocBatch.id,
      stageType: "transport",
      name: "Road Freight Suhr → Munich",
      locationName: "Munich Distribution Hub, Germany",
      latitude: 48.1351,
      longitude: 11.582,
      operator: "Planzer Transport AG",
      metadata: JSON.stringify({
        vehicleType: "Climate-controlled truck",
        targetTemp: "15-18°C",
        transitHours: 5,
      }),
      startedAt: iso("2026-02-24T08:00:00Z"),
      completedAt: iso("2026-02-24T13:00:00Z"),
      sequenceOrder: 7,
    },
    {
      batchId: chocBatch.id,
      stageType: "retail",
      name: "Retail Shelf",
      locationName: "REWE Munich-Pasing, Germany",
      latitude: 48.1418,
      longitude: 11.4614,
      operator: "REWE Group",
      metadata: JSON.stringify({
        shelfLocation: "Aisle 4, Shelf C — Imported Chocolate",
        retailPrice: "€1.99",
        bestBefore: "2026-09-30",
      }),
      startedAt: iso("2026-02-25T06:00:00Z"),
      completedAt: null,
      sequenceOrder: 8,
    },
  ])
  .returning()
  .all();

console.log(`  Stages: ${chocStages.length}`);

// ---------------------------------------------------------------------------
// Telemetry — warehouse storage with heat + humidity excursion
// ---------------------------------------------------------------------------

const warehouseStage = chocStages[5]; // Distribution Warehouse (sequenceOrder 6)

const warehouseReadings: { time: string; temp: number; humidity: number }[] = [];

// Feb 17-19: Normal conditions (every 4 hours)
for (let day = 17; day <= 19; day++) {
  for (const hour of [0, 4, 8, 12, 16, 20]) {
    warehouseReadings.push({
      time: `2026-02-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`,
      temp: 16.5 + Math.random() * 1.5,
      humidity: 52 + Math.random() * 6,
    });
  }
}

// Feb 20: COOLING FAILURE — temperature spikes, humidity rises
// This is the anomaly window: 4+ hours above 30°C
warehouseReadings.push(
  { time: "2026-02-20T00:00:00Z", temp: 17.2, humidity: 54 },
  { time: "2026-02-20T04:00:00Z", temp: 17.8, humidity: 55 },
  { time: "2026-02-20T06:00:00Z", temp: 21.4, humidity: 58 },
  { time: "2026-02-20T07:00:00Z", temp: 25.7, humidity: 63 },
  { time: "2026-02-20T08:00:00Z", temp: 29.3, humidity: 68 },
  { time: "2026-02-20T08:30:00Z", temp: 31.1, humidity: 72 },
  { time: "2026-02-20T09:00:00Z", temp: 32.6, humidity: 76 },  // Peak
  { time: "2026-02-20T09:30:00Z", temp: 32.1, humidity: 78 },  // Peak humidity
  { time: "2026-02-20T10:00:00Z", temp: 30.8, humidity: 75 },
  { time: "2026-02-20T10:30:00Z", temp: 28.4, humidity: 71 },
  { time: "2026-02-20T11:00:00Z", temp: 24.9, humidity: 66 },
  { time: "2026-02-20T12:00:00Z", temp: 21.3, humidity: 61 },  // Cooling restored
  { time: "2026-02-20T14:00:00Z", temp: 18.6, humidity: 57 },
  { time: "2026-02-20T16:00:00Z", temp: 17.4, humidity: 55 },
  { time: "2026-02-20T20:00:00Z", temp: 17.0, humidity: 53 },
);

// Feb 21-23: Normal again
for (let day = 21; day <= 23; day++) {
  for (const hour of [0, 4, 8, 12, 16, 20]) {
    warehouseReadings.push({
      time: `2026-02-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`,
      temp: 16.5 + Math.random() * 1.5,
      humidity: 52 + Math.random() * 6,
    });
  }
}

const chocTelemetry = warehouseReadings.flatMap((r) => [
  {
    stageId: warehouseStage.id,
    readingType: "temperature" as const,
    value: Math.round(r.temp * 10) / 10,
    unit: "°C",
    recordedAt: iso(r.time),
  },
  {
    stageId: warehouseStage.id,
    readingType: "humidity" as const,
    value: Math.round(r.humidity * 10) / 10,
    unit: "%",
    recordedAt: iso(r.time),
  },
]);

db.insert(schema.telemetryReadings).values(chocTelemetry).run();
console.log(`  Telemetry: ${chocTelemetry.length} readings`);

// ---------------------------------------------------------------------------
// Anomaly: heat + humidity excursion causing fat/sugar bloom
// ---------------------------------------------------------------------------

db.insert(schema.stageAnomalies)
  .values({
    stageId: warehouseStage.id,
    batchId: chocBatch.id,
    anomalyType: "temperature_excursion",
    severity: "critical",
    description:
      "Warehouse cooling system failure in Zone C-04. Temperature rose from 17°C to 32.6°C over 3 hours (06:00-09:00 UTC, Feb 20). " +
      "Cocoa butter softening point (27°C) exceeded for 2h 45min. Peak humidity 78% concurrent with heat spike. " +
      "Conditions consistent with partial fat bloom and sugar bloom formation — cocoa butter migration to surface causes whitish " +
      "discoloration and grainy texture; dissolved surface sugar recrystallizes as gritty coating. " +
      "Affected product likely exhibits bitter, chalky off-taste and reduced snap. " +
      "Root cause: HVAC compressor bearing seizure in cooling unit CU-C04-02.",
    thresholdValue: 20.0,
    actualValue: 32.6,
    durationMinutes: 285,
    riskScoreImpact: 62,
    detectedAt: iso("2026-02-20T08:30:00Z"),
    resolvedAt: iso("2026-02-20T12:00:00Z"),
  })
  .run();

console.log("  Anomaly: warehouse heat excursion (fat/sugar bloom risk)");

// ---------------------------------------------------------------------------
// Consumer report: someone noticed bitter taste
// ---------------------------------------------------------------------------

db.insert(schema.consumerReports)
  .values({
    lotCode: chocBatch.lotCode,
    batchId: chocBatch.id,
    deviceId: "demo-device-001",
    category: "taste_quality",
    description:
      "Schokolade schmeckt bitter und kreidig, nicht wie gewohnt. Oberfläche sieht leicht weißlich aus. Habe das Produkt bei REWE gekauft.",
    status: "new",
  })
  .run();

console.log("  Consumer report: bitter taste complaint seeded");

// ===========================================================================
// SUPPLY CHAIN 2: Allgäu Bio-Bergkäse (many-to-many)
// 2 farms MERGE → cheese making → aging → inspection → SPLIT into slices + wheels
// ===========================================================================

console.log("\n── Supply Chain 2: Cheese (many-to-many) ──");

const cheese = db
  .insert(schema.products)
  .values({
    barcode: "4099887766550",
    name: "Allgäu Bio-Bergkäse 250g",
    brand: "AlpenMilch",
    category: "dairy",
    imageUrl: null,
    source: "internal",
    nutriScore: "C",
    ecoScore: "A",
    ingredients:
      "Pasteurized milk, salt, rennet, cultures (Lactococcus lactis, Lactobacillus helveticus)",
    allergens: JSON.stringify(["milk"]),
  })
  .returning()
  .get()!;

// 5 batches: 2 source farms → 1 processing → 2 output products
const cheeseFarmH = db
  .insert(schema.batches)
  .values({
    lotCode: "K-FARM-H",
    productId: cheese.id,
    status: "active",
    riskScore: 0,
    unitCount: 1200,
    createdAt: iso("2026-02-10T05:00:00Z"),
    updatedAt: iso("2026-02-10T08:00:00Z"),
  })
  .returning()
  .get()!;

const cheeseFarmS = db
  .insert(schema.batches)
  .values({
    lotCode: "K-FARM-S",
    productId: cheese.id,
    status: "active",
    riskScore: 0,
    unitCount: 900,
    createdAt: iso("2026-02-10T05:30:00Z"),
    updatedAt: iso("2026-02-10T08:30:00Z"),
  })
  .returning()
  .get()!;

const cheeseMake = db
  .insert(schema.batches)
  .values({
    lotCode: "K-MAKE-001",
    productId: cheese.id,
    status: "active",
    riskScore: 12,
    unitCount: 420,
    createdAt: iso("2026-03-20T06:00:00Z"),
    updatedAt: iso("2026-03-20T12:00:00Z"),
  })
  .returning()
  .get()!;

const cheeseSlice = db
  .insert(schema.batches)
  .values({
    lotCode: "K-SLICE-001",
    productId: cheese.id,
    status: "active",
    riskScore: 5,
    unitCount: 1680,
    createdAt: iso("2026-03-16T06:00:00Z"),
    updatedAt: iso("2026-03-20T12:00:00Z"),
  })
  .returning()
  .get()!;

const cheeseWheel = db
  .insert(schema.batches)
  .values({
    lotCode: "K-WHEEL-001",
    productId: cheese.id,
    status: "active",
    riskScore: 0,
    unitCount: 42,
    createdAt: iso("2026-03-16T07:00:00Z"),
    updatedAt: iso("2026-03-18T10:00:00Z"),
  })
  .returning()
  .get()!;

console.log(`  Product: ${cheese.name}`);
console.log(
  `  Batches: ${cheeseFarmH.lotCode}, ${cheeseFarmS.lotCode}, ${cheeseMake.lotCode}, ${cheeseSlice.lotCode}, ${cheeseWheel.lotCode}`,
);

// Lineage: 2 farms merge → cheese → splits into slices + wheels
db.insert(schema.batchLineage)
  .values([
    { parentBatchId: cheeseFarmH.id, childBatchId: cheeseMake.id, relationship: "merge", ratio: 0.57 },
    { parentBatchId: cheeseFarmS.id, childBatchId: cheeseMake.id, relationship: "merge", ratio: 0.43 },
    { parentBatchId: cheeseMake.id, childBatchId: cheeseSlice.id, relationship: "split", ratio: 0.8 },
    { parentBatchId: cheeseMake.id, childBatchId: cheeseWheel.id, relationship: "split", ratio: 0.2 },
  ])
  .run();

console.log("  Lineage: 2 merges + 2 splits");

// Stages across all 5 batches
const cheeseStages = db
  .insert(schema.batchStages)
  .values([
    // Farm Huber → collection
    {
      batchId: cheeseFarmH.id,
      stageType: "collection",
      name: "Milk Collection — Farm Huber",
      locationName: "Bauernhof Huber, Oberstdorf, Germany",
      latitude: 47.4095,
      longitude: 10.2789,
      operator: "Farm Huber",
      metadata: JSON.stringify({ volume: "1,200L raw milk", fatContent: "4.2%", organic: true }),
      startedAt: iso("2026-02-10T05:00:00Z"),
      completedAt: iso("2026-02-10T07:00:00Z"),
      sequenceOrder: 1,
    },
    // Farm Schneider → collection
    {
      batchId: cheeseFarmS.id,
      stageType: "collection",
      name: "Milk Collection — Farm Schneider",
      locationName: "Bauernhof Schneider, Sonthofen, Germany",
      latitude: 47.5148,
      longitude: 10.2817,
      operator: "Farm Schneider",
      metadata: JSON.stringify({ volume: "900L raw milk", fatContent: "3.9%", organic: true }),
      startedAt: iso("2026-02-10T05:30:00Z"),
      completedAt: iso("2026-02-10T07:30:00Z"),
      sequenceOrder: 1,
    },
    // Merge point → processing
    {
      batchId: cheeseMake.id,
      stageType: "processing",
      name: "Curdling & Pressing",
      locationName: "AlpenMilch Käserei, Kempten, Germany",
      latitude: 47.7267,
      longitude: 10.3168,
      operator: "AlpenMilch GmbH",
      metadata: JSON.stringify({
        process: "Pasteurization, rennet addition, curd cutting, pressing into wheels",
        volume: "2,100L milk → 420 wheels",
        temperature: "32°C curdling, 52°C scalding",
      }),
      startedAt: iso("2026-02-11T06:00:00Z"),
      completedAt: iso("2026-02-11T18:00:00Z"),
      sequenceOrder: 2,
    },
    // Aging
    {
      batchId: cheeseMake.id,
      stageType: "storage",
      name: "Cave Aging (4 weeks)",
      locationName: "AlpenMilch Aging Cellar, Kempten, Germany",
      latitude: 47.728,
      longitude: 10.319,
      operator: "AlpenMilch GmbH",
      metadata: JSON.stringify({
        duration: "28 days",
        temperature: "12-14°C",
        humidity: "92-95%",
        treatment: "Brine wash twice weekly",
      }),
      startedAt: iso("2026-02-12T00:00:00Z"),
      completedAt: iso("2026-03-12T00:00:00Z"),
      sequenceOrder: 3,
    },
    // Quality inspection
    {
      batchId: cheeseMake.id,
      stageType: "inspection",
      name: "Quality Inspection",
      locationName: "AlpenMilch QA Lab, Kempten, Germany",
      latitude: 47.7267,
      longitude: 10.3168,
      operator: "AlpenMilch QA",
      metadata: JSON.stringify({
        tests: "Moisture 38%, fat 48% FDM, pH 5.3, rind integrity OK",
        grade: "A — Premium",
        passRate: "97.6% (10 wheels rejected)",
      }),
      startedAt: iso("2026-03-12T08:00:00Z"),
      completedAt: iso("2026-03-12T16:00:00Z"),
      sequenceOrder: 4,
    },
    // Split → Slices: packaging
    {
      batchId: cheeseSlice.id,
      stageType: "packaging",
      name: "Slicing & Vacuum Packing",
      locationName: "AlpenMilch Packaging, Kempten, Germany",
      latitude: 47.7267,
      longitude: 10.3168,
      operator: "AlpenMilch GmbH",
      metadata: JSON.stringify({
        packagingType: "250g vacuum pack",
        unitsProduced: "1,680 packs",
        bestBefore: "2026-05-12",
      }),
      startedAt: iso("2026-03-16T06:00:00Z"),
      completedAt: iso("2026-03-16T14:00:00Z"),
      sequenceOrder: 5,
    },
    // Split → Slices: transport to Munich
    {
      batchId: cheeseSlice.id,
      stageType: "transport",
      name: "Refrigerated Transport → Munich",
      locationName: "Munich, Germany",
      latitude: 48.1351,
      longitude: 11.582,
      operator: "Kühne + Nagel",
      metadata: JSON.stringify({ vehicleType: "Refrigerated truck", targetTemp: "4-8°C" }),
      startedAt: iso("2026-03-17T04:00:00Z"),
      completedAt: iso("2026-03-17T08:00:00Z"),
      sequenceOrder: 6,
    },
    // Split → Slices: retail (Munich)
    {
      batchId: cheeseSlice.id,
      stageType: "retail",
      name: "Retail Shelf",
      locationName: "REWE Munich-Pasing, Germany",
      latitude: 48.1418,
      longitude: 11.4614,
      operator: "REWE Group",
      metadata: JSON.stringify({ shelfLocation: "Deli Cooler, Row 3", retailPrice: "€4.99" }),
      startedAt: iso("2026-03-18T06:00:00Z"),
      completedAt: null,
      sequenceOrder: 7,
    },
    // Split → Wheels: transport to Augsburg
    {
      batchId: cheeseWheel.id,
      stageType: "transport",
      name: "Deli Distribution → Augsburg",
      locationName: "Augsburg, Germany",
      latitude: 48.3706,
      longitude: 10.8978,
      operator: "Regional Logistics",
      metadata: JSON.stringify({
        vehicleType: "Refrigerated van",
        targetTemp: "4-8°C",
        units: "42 wheels",
      }),
      startedAt: iso("2026-03-16T08:00:00Z"),
      completedAt: iso("2026-03-16T12:00:00Z"),
      sequenceOrder: 5,
    },
    // Split → Wheels: specialty shop (Augsburg)
    {
      batchId: cheeseWheel.id,
      stageType: "retail",
      name: "Specialty Cheese Shop",
      locationName: "Käsehaus Augsburg, Germany",
      latitude: 48.3654,
      longitude: 10.8947,
      operator: "Käsehaus Augsburg",
      metadata: JSON.stringify({ shelfLocation: "Alpine section", retailPrice: "€32.00/kg" }),
      startedAt: iso("2026-03-17T09:00:00Z"),
      completedAt: null,
      sequenceOrder: 6,
    },
  ])
  .returning()
  .all();

console.log(`  Stages: ${cheeseStages.length}`);

// Telemetry for cheese aging (temperature + humidity over 28 days)
const cheeseAgingStage = cheeseStages[3]; // Cave Aging stage
const cheeseAgingReadings = [];
for (let day = 0; day < 28; day += 2) {
  const time = new Date("2026-02-12T00:00:00Z");
  time.setDate(time.getDate() + day);
  cheeseAgingReadings.push(
    {
      stageId: cheeseAgingStage.id,
      readingType: "temperature" as const,
      value: Math.round((12.5 + Math.random() * 1.5) * 10) / 10,
      unit: "°C",
      recordedAt: time.toISOString(),
    },
    {
      stageId: cheeseAgingStage.id,
      readingType: "humidity" as const,
      value: Math.round((92 + Math.random() * 3) * 10) / 10,
      unit: "%",
      recordedAt: time.toISOString(),
    },
  );
}
db.insert(schema.telemetryReadings).values(cheeseAgingReadings).run();

console.log(`  Telemetry: ${cheeseAgingReadings.length} readings`);

// ===========================================================================
// SUPPLY CHAIN 3: Volvic Tee Minze (Shizuoka tea + Provence mint + Auvergne water)
// Japan → France → Switzerland retail
// ===========================================================================

console.log("\n── Supply Chain 3: Volvic Tee Minze (linear) ──");

const volvic = db
  .insert(schema.products)
  .values({
    barcode: "3057640478468",
    name: "Volvic Tee Minze 75cl PET",
    brand: "Volvic",
    category: "beverages",
    imageUrl: "https://images.openfoodfacts.org/images/products/305/764/047/8468/front_fr.31.400.jpg",
    source: "internal",
    nutriScore: "C",
    ecoScore: "A",
    ingredients:
      "Natürliches Mineralwasser Volvic (94%), Zucker (4,4%), Zitronensaft aus Konzentrat (1,2%), natürliches Minz-Aroma, natürliches Aroma, Grüntee-Extrakt",
    allergens: JSON.stringify([]),
  })
  .returning()
  .get()!;

const volvicBatch = db
  .insert(schema.batches)
  .values({
    lotCode: "VM2603-F19",
    productId: volvic.id,
    status: "active",
    riskScore: 38,
    unitCount: 42000,
    createdAt: iso("2026-02-01T06:00:00Z"),
    updatedAt: iso("2026-03-18T10:00:00Z"),
  })
  .returning()
  .get()!;

console.log(`  Product: ${volvic.name} (barcode: ${volvic.barcode})`);
console.log(`  Batch: ${volvicBatch.lotCode} (risk: ${volvicBatch.riskScore})`);

const volvicStages = db
  .insert(schema.batchStages)
  .values([
    {
      batchId: volvicBatch.id,
      stageType: "harvest",
      name: "Green Tea Harvest",
      locationName: "Makinohara Tea Plantation, Shizuoka, Japan",
      latitude: 34.7231,
      longitude: 138.2292,
      operator: "Makinohara Tea Cooperative",
      metadata: JSON.stringify({
        variety: "Yabukita sencha",
        harvestFlush: "First flush (Ichibancha)",
        harvestWeight: "480 kg dried leaf",
        altitude: "250m",
      }),
      startedAt: iso("2026-02-01T05:00:00Z"),
      completedAt: iso("2026-02-03T16:00:00Z"),
      sequenceOrder: 1,
    },
    {
      batchId: volvicBatch.id,
      stageType: "transport",
      name: "Air Freight Shizuoka → Lyon",
      locationName: "Lyon-Saint Exupéry Airport, France",
      latitude: 45.7256,
      longitude: 5.0811,
      routeCoords: JSON.stringify([
        [138.2, 34.7],   // Shizuoka
        [135.0, 34.5],   // Osaka
        [121.0, 31.0],   // Shanghai
        [104.0, 30.5],   // Chengdu
        [69.0, 41.3],    // Tashkent
        [51.4, 35.7],    // Tehran
        [32.9, 39.9],    // Ankara
        [23.7, 37.9],    // Athens
        [12.5, 41.9],    // Rome
        [5.0811, 45.7256], // Lyon
      ]),
      operator: "Air France Cargo",
      metadata: JSON.stringify({
        flightRoute: "NRT → CDG → LYS",
        containerType: "Temperature-controlled air container",
        targetTemp: "2-8°C",
        transitHours: 28,
      }),
      startedAt: iso("2026-02-05T10:00:00Z"),
      completedAt: iso("2026-02-06T14:00:00Z"),
      sequenceOrder: 2,
    },
    {
      batchId: volvicBatch.id,
      stageType: "harvest",
      name: "Mint Harvest",
      locationName: "Domaine de la Menthe, Valensole, Provence, France",
      latitude: 43.8372,
      longitude: 5.9828,
      operator: "Domaine de la Menthe SARL",
      metadata: JSON.stringify({
        variety: "Mentha spicata (spearmint)",
        harvestWeight: "120 kg fresh leaves",
        distillation: "Steam-distilled for natural aroma extract",
        organic: true,
      }),
      startedAt: iso("2026-02-10T07:00:00Z"),
      completedAt: iso("2026-02-11T15:00:00Z"),
      sequenceOrder: 3,
    },
    {
      batchId: volvicBatch.id,
      stageType: "collection",
      name: "Water Extraction",
      locationName: "Source Clairvic, Volvic, Auvergne, France",
      latitude: 45.8833,
      longitude: 2.9500,
      operator: "Société des Eaux de Volvic",
      metadata: JSON.stringify({
        source: "Volcanic aquifer, Chaîne des Puys",
        filtrationDepth: "~90m through volcanic rock",
        mineralContent: "130 mg/L TDS",
        pH: "7.0",
        extractionVolume: "32,000 L",
      }),
      startedAt: iso("2026-02-15T06:00:00Z"),
      completedAt: iso("2026-02-15T18:00:00Z"),
      sequenceOrder: 4,
    },
    {
      batchId: volvicBatch.id,
      stageType: "processing",
      name: "Blending & Bottling",
      locationName: "Volvic Factory, Volvic, Auvergne, France",
      latitude: 45.8847,
      longitude: 2.9525,
      operator: "Société des Eaux de Volvic",
      metadata: JSON.stringify({
        process: "Ingredient blending, pasteurization, PET bottle filling, capping, labeling",
        lineSpeed: "24,000 bottles/hour",
        bottleSize: "75cl PET",
        unitsProduced: "42,000 bottles",
        bestBefore: "2026-09-15",
      }),
      startedAt: iso("2026-02-18T06:00:00Z"),
      completedAt: iso("2026-02-18T18:00:00Z"),
      sequenceOrder: 5,
    },
    {
      batchId: volvicBatch.id,
      stageType: "storage",
      name: "Cold Storage",
      locationName: "Volvic Distribution Center, Clermont-Ferrand, France",
      latitude: 45.7772,
      longitude: 3.0870,
      operator: "Volvic Logistics",
      metadata: JSON.stringify({
        warehouseTemp: "4-8°C",
        storageZone: "Zone B-7, Beverage Cold Room",
        pallets: 175,
      }),
      startedAt: iso("2026-02-19T08:00:00Z"),
      completedAt: iso("2026-03-10T06:00:00Z"),
      sequenceOrder: 6,
    },
    {
      batchId: volvicBatch.id,
      stageType: "transport",
      name: "Road Freight Clermont-Ferrand → Zürich",
      locationName: "Coop Distribution Center, Pratteln, Switzerland",
      latitude: 47.5215,
      longitude: 7.6936,
      routeCoords: JSON.stringify([
        [3.087, 45.777],   // Clermont-Ferrand
        [3.85, 45.76],     // A89 east
        [4.83, 45.76],     // Lyon outskirts
        [5.36, 46.20],     // Bourg-en-Bresse
        [5.87, 46.67],     // Lons-le-Saunier
        [6.15, 46.95],     // Pontarlier
        [6.63, 47.23],     // Swiss border
        [7.35, 47.37],     // Delémont
        [7.6936, 47.5215], // Pratteln
      ]),
      operator: "Frigo Transports SA",
      metadata: JSON.stringify({
        vehicleType: "Refrigerated semi-trailer",
        targetTemp: "4-8°C",
        transitHours: 9,
        driver: "Route A89 → A46 → A39 → A36 → E27",
      }),
      startedAt: iso("2026-03-10T04:00:00Z"),
      completedAt: iso("2026-03-10T15:00:00Z"),
      sequenceOrder: 7,
    },
    {
      batchId: volvicBatch.id,
      stageType: "retail",
      name: "Retail Shelf",
      locationName: "Coop Zürich-Oerlikon, Switzerland",
      latitude: 47.4111,
      longitude: 8.5445,
      operator: "Coop Genossenschaft",
      metadata: JSON.stringify({
        shelfLocation: "Beverages aisle, Cooler 3",
        retailPrice: "CHF 2.30",
      }),
      startedAt: iso("2026-03-12T06:00:00Z"),
      completedAt: null,
      sequenceOrder: 8,
    },
  ])
  .returning()
  .all();

console.log(`  Stages: ${volvicStages.length}`);

const volvicTransportStage = volvicStages[6]; // Road freight stage
const volvicTelemetry: {
  stageId: string;
  readingType: "temperature" | "humidity";
  value: number;
  unit: string;
  recordedAt: string;
}[] = [];

for (let hour = 0; hour < 11; hour++) {
  const time = new Date("2026-03-10T04:00:00Z");
  time.setHours(time.getHours() + hour);

  let temp: number;
  if (hour >= 4 && hour <= 7) {
    temp = hour === 4 ? 8.2 : hour === 5 ? 18.5 : hour === 6 ? 31.4 : 34.1;
  } else if (hour === 8) {
    temp = 22.0;
  } else if (hour === 9) {
    temp = 12.3;
  } else if (hour === 10) {
    temp = 6.8;
  } else {
    temp = 4.5 + Math.random() * 2;
  }

  volvicTelemetry.push(
    {
      stageId: volvicTransportStage.id,
      readingType: "temperature" as const,
      value: Math.round(temp * 10) / 10,
      unit: "°C",
      recordedAt: time.toISOString(),
    },
    {
      stageId: volvicTransportStage.id,
      readingType: "humidity" as const,
      value: Math.round((55 + Math.random() * 10) * 10) / 10,
      unit: "%",
      recordedAt: time.toISOString(),
    },
  );
}

db.insert(schema.telemetryReadings).values(volvicTelemetry).run();
console.log(`  Telemetry: ${volvicTelemetry.length} readings`);

db.insert(schema.stageAnomalies)
  .values({
    stageId: volvicTransportStage.id,
    batchId: volvicBatch.id,
    anomalyType: "temperature_high",
    severity: "high",
    description:
      "Refrigeration compressor failure on A36 near Mulhouse during heatwave. Cargo temp rose from 6°C to 34.1°C over 3 hours. Replacement truck dispatched — cold chain restored after 4h total. Green tea catechins degrade above 25°C: risk of oxidation, color change, and off-flavors.",
    thresholdValue: 8.0,
    actualValue: 34.1,
    durationMinutes: 240,
    riskScoreImpact: 38,
    detectedAt: iso("2026-03-10T09:15:00Z"),
    resolvedAt: iso("2026-03-10T12:00:00Z"),
  })
  .run();

console.log("  Anomaly: transport refrigeration failure (green tea oxidation risk)");

// ===========================================================================
// Summary
// ===========================================================================

console.log("\n── Seed Complete ──");
console.log("  3 products, 7 batches, 4 lineage links");
console.log(`  ${chocStages.length + cheeseStages.length + volvicStages.length} stages`);
console.log(`  ${chocTelemetry.length + cheeseAgingReadings.length + volvicTelemetry.length} telemetry readings`);
console.log("  2 anomalies");
console.log("  1 consumer report (bitter taste complaint)");
console.log("");
console.log("  Chain 1 — Chocolat au lait: CH2603-AP7 (linear, 8 stages, Ivory Coast → Switzerland → Munich)");
console.log("  Chain 2 — Cheese:           K-FARM-H + K-FARM-S → K-MAKE-001 → K-SLICE-001 + K-WHEEL-001");
console.log("  Chain 3 — Volvic Tee Minze: VM2603-F19 (linear, 8 stages, Japan + France → Switzerland)");

sqlite.close();
