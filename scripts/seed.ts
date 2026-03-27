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

// ---------------------------------------------------------------------------
// 1. Products
// ---------------------------------------------------------------------------

console.log("Seeding products...");

const chocolate = db
  .insert(schema.products)
  .values({
    barcode: "4012345678901",
    name: "Swiss Dark Chocolate 100g",
    brand: "ChocoTrace",
    category: "chocolate",
    imageUrl: "/images/chocolate.jpg",
    source: "internal",
    nutriScore: "D",
    ecoScore: "C",
    ingredients: "Cocoa mass, sugar, cocoa butter, vanilla extract",
    allergens: JSON.stringify(["soy"]),
  })
  .returning()
  .get()!;

const yogurt = db
  .insert(schema.products)
  .values({
    barcode: "4098765432100",
    name: "Alpine Fresh Yogurt 200g",
    brand: "AlpenMilch",
    category: "dairy",
    imageUrl: "/images/yogurt.jpg",
    source: "internal",
    nutriScore: "B",
    ecoScore: "B",
    ingredients: "Pasteurized milk, live cultures (L. bulgaricus, S. thermophilus)",
    allergens: JSON.stringify(["milk"]),
  })
  .returning()
  .get()!;

const water = db
  .insert(schema.products)
  .values({
    barcode: "7610235000329",
    name: "Henniez Naturelle 1.5L",
    brand: "Henniez (Nestlé Waters)",
    category: "water",
    imageUrl: "https://images.openfoodfacts.org/images/products/761/023/500/0329/front_fr.47.400.jpg",
    source: "internal",
    nutriScore: "A",
    ecoScore: "B",
    ingredients: "Natural mineral water",
    allergens: JSON.stringify([]),
  })
  .returning()
  .get()!;

console.log(`  Products: ${chocolate.name}, ${yogurt.name}, ${water.name}`);

// ---------------------------------------------------------------------------
// 2. Batches — Chocolate (single linear chain)
// ---------------------------------------------------------------------------

console.log("Seeding batches...");

const chocBatch = db
  .insert(schema.batches)
  .values({
    lotCode: "L6029479302",
    productId: chocolate.id,
    status: "active",
    riskScore: 45,
    unitCount: 24000,
    createdAt: iso("2026-01-15T08:00:00Z"),
    updatedAt: iso("2026-01-30T05:00:00Z"),
  })
  .returning()
  .get()!;

// ---------------------------------------------------------------------------
// 3. Batches — Dairy (merge + split chain)
// ---------------------------------------------------------------------------

const farmA = db
  .insert(schema.batches)
  .values({
    lotCode: "M-FARM-A",
    productId: yogurt.id,
    status: "active",
    riskScore: 0,
    unitCount: 800,
    createdAt: iso("2026-03-01T06:00:00Z"),
    updatedAt: iso("2026-03-01T10:00:00Z"),
  })
  .returning()
  .get()!;

const farmB = db
  .insert(schema.batches)
  .values({
    lotCode: "M-FARM-B",
    productId: yogurt.id,
    status: "active",
    riskScore: 0,
    unitCount: 600,
    createdAt: iso("2026-03-01T06:30:00Z"),
    updatedAt: iso("2026-03-01T10:30:00Z"),
  })
  .returning()
  .get()!;

const vat = db
  .insert(schema.batches)
  .values({
    lotCode: "VAT-001",
    productId: yogurt.id,
    status: "active",
    riskScore: 0,
    unitCount: 1400,
    createdAt: iso("2026-03-02T08:00:00Z"),
    updatedAt: iso("2026-03-02T18:00:00Z"),
  })
  .returning()
  .get()!;

const cups = db
  .insert(schema.batches)
  .values({
    lotCode: "Y-CUP-001",
    productId: yogurt.id,
    status: "active",
    riskScore: 0,
    unitCount: 7000,
    createdAt: iso("2026-03-03T06:00:00Z"),
    updatedAt: iso("2026-03-05T12:00:00Z"),
  })
  .returning()
  .get()!;

console.log(
  `  Batches: ${chocBatch.lotCode}, ${farmA.lotCode}, ${farmB.lotCode}, ${vat.lotCode}, ${cups.lotCode}`,
);

// ---------------------------------------------------------------------------
// 4. Batch Lineage (merge/split)
// ---------------------------------------------------------------------------

console.log("Seeding batch lineage...");

db.insert(schema.batchLineage).values([
  {
    parentBatchId: farmA.id,
    childBatchId: vat.id,
    relationship: "merge",
    ratio: 0.57,
  },
  {
    parentBatchId: farmB.id,
    childBatchId: vat.id,
    relationship: "merge",
    ratio: 0.43,
  },
  {
    parentBatchId: vat.id,
    childBatchId: cups.id,
    relationship: "split",
    ratio: 1.0,
  },
]).run();

// ---------------------------------------------------------------------------
// 5. Batch Stages — Chocolate
// ---------------------------------------------------------------------------

console.log("Seeding batch stages...");

const chocStages = db
  .insert(schema.batchStages)
  .values([
    {
      batchId: chocBatch.id,
      stageType: "harvest",
      name: "Cocoa Harvest",
      locationName: "Kumasi Cocoa Farm, Ghana",
      latitude: 6.6885,
      longitude: -1.6244,
      operator: "GhanaCocoa Cooperative",
      metadata: JSON.stringify({
        harvestWeight: "2,400 kg",
        certification: "Fairtrade",
        variety: "Forastero",
      }),
      startedAt: iso("2026-01-15T08:00:00Z"),
      completedAt: iso("2026-01-18T16:00:00Z"),
      sequenceOrder: 1,
    },
    {
      batchId: chocBatch.id,
      stageType: "processing",
      name: "Fermentation & Drying",
      locationName: "Kumasi Processing Center, Ghana",
      latitude: 6.6936,
      longitude: -1.6163,
      operator: "GhanaCocoa Cooperative",
      metadata: JSON.stringify({
        process: "6-day fermentation, 7-day sun drying",
        moistureContent: "7.5%",
      }),
      startedAt: iso("2026-01-18T17:00:00Z"),
      completedAt: iso("2026-01-21T12:00:00Z"),
      sequenceOrder: 2,
    },
    {
      batchId: chocBatch.id,
      stageType: "transport",
      name: "Sea Freight Ghana → Belgium",
      locationName: "Port of Antwerp, Belgium",
      latitude: 51.2194,
      longitude: 4.4025,
      routeCoords: JSON.stringify([
        [6.6885, -1.6244],
        [5.6037, -0.187],
        [5.3364, -4.0083],
        [14.6937, -17.4441],
        [36.7783, -10.0],
        [43.2965, -5.3698],
        [48.8566, -1.0],
        [51.2194, 4.4025],
      ]),
      operator: "MaerskLine Logistics",
      metadata: JSON.stringify({
        vesselName: "Maersk Harmony",
        containerType: "Refrigerated 20ft",
        containerTemp: "2-6°C",
      }),
      startedAt: iso("2026-01-22T06:00:00Z"),
      completedAt: iso("2026-02-05T14:00:00Z"),
      sequenceOrder: 3,
    },
    {
      batchId: chocBatch.id,
      stageType: "processing",
      name: "Chocolate Manufacturing",
      locationName: "ChocoTrace Factory, Brussels, Belgium",
      latitude: 50.8503,
      longitude: 4.3517,
      operator: "ChocoTrace NV",
      metadata: JSON.stringify({
        process: "Roasting, conching, tempering",
        cocoaContent: "72%",
      }),
      startedAt: iso("2026-02-06T07:00:00Z"),
      completedAt: iso("2026-02-07T18:00:00Z"),
      sequenceOrder: 4,
    },
    {
      batchId: chocBatch.id,
      stageType: "packaging",
      name: "Packaging & Labeling",
      locationName: "ChocoTrace Factory, Brussels, Belgium",
      latitude: 50.8503,
      longitude: 4.3517,
      operator: "ChocoTrace NV",
      metadata: JSON.stringify({
        packagingType: "Foil wrap + cardboard sleeve",
        unitsProduced: "24,000 bars",
        bestBefore: "2026-08-07",
      }),
      startedAt: iso("2026-02-07T19:00:00Z"),
      completedAt: iso("2026-02-08T06:00:00Z"),
      sequenceOrder: 5,
    },
    {
      batchId: chocBatch.id,
      stageType: "transport",
      name: "Road Freight Belgium → Germany",
      locationName: "Munich Distribution Center, Germany",
      latitude: 48.1351,
      longitude: 11.582,
      routeCoords: JSON.stringify([
        [50.8503, 4.3517],
        [50.9375, 6.9603],
        [49.4521, 8.4519],
        [48.7758, 9.1829],
        [48.1351, 11.582],
      ]),
      operator: "DHL Freight",
      metadata: JSON.stringify({
        vehicleType: "Refrigerated truck",
        targetTemp: "15-18°C",
      }),
      startedAt: iso("2026-02-08T08:00:00Z"),
      completedAt: iso("2026-02-09T16:00:00Z"),
      sequenceOrder: 6,
    },
    {
      batchId: chocBatch.id,
      stageType: "storage",
      name: "Warehouse Storage",
      locationName: "Munich Distribution Center, Germany",
      latitude: 48.1351,
      longitude: 11.582,
      operator: "DHL Supply Chain",
      metadata: JSON.stringify({
        warehouseTemp: "15-18°C",
        storageZone: "Zone A-12",
      }),
      startedAt: iso("2026-02-09T17:00:00Z"),
      completedAt: iso("2026-02-10T06:00:00Z"),
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
        shelfLocation: "Aisle 5, Shelf B",
        retailPrice: "€2.49",
      }),
      startedAt: iso("2026-02-11T06:00:00Z"),
      completedAt: null,
      sequenceOrder: 8,
    },
  ])
  .returning()
  .all();

// ---------------------------------------------------------------------------
// 6. Batch Stages — Dairy
// ---------------------------------------------------------------------------

const dairyStages = db
  .insert(schema.batchStages)
  .values([
    // Farm A collection
    {
      batchId: farmA.id,
      stageType: "collection",
      name: "Milk Collection — Farm Huber",
      locationName: "Bauernhof Huber, Allgäu, Germany",
      latitude: 47.5763,
      longitude: 10.3215,
      operator: "Farm Huber",
      metadata: JSON.stringify({
        volume: "800L raw milk",
        fatContent: "3.8%",
        somatic: "< 200,000 /mL",
      }),
      startedAt: iso("2026-03-01T05:00:00Z"),
      completedAt: iso("2026-03-01T07:00:00Z"),
      sequenceOrder: 1,
    },
    // Farm B collection
    {
      batchId: farmB.id,
      stageType: "collection",
      name: "Milk Collection — Farm Berger",
      locationName: "Bauernhof Berger, Allgäu, Germany",
      latitude: 47.5528,
      longitude: 10.2964,
      operator: "Farm Berger",
      metadata: JSON.stringify({
        volume: "600L raw milk",
        fatContent: "4.0%",
        somatic: "< 180,000 /mL",
      }),
      startedAt: iso("2026-03-01T05:30:00Z"),
      completedAt: iso("2026-03-01T07:30:00Z"),
      sequenceOrder: 1,
    },
    // Processing vat (merge point)
    {
      batchId: vat.id,
      stageType: "processing",
      name: "Pasteurization & Fermentation",
      locationName: "AlpenMilch Plant, Kempten, Germany",
      latitude: 47.7267,
      longitude: 10.3168,
      operator: "AlpenMilch GmbH",
      metadata: JSON.stringify({
        process: "Pasteurization at 72°C/15s, culture addition, 8h fermentation",
        volume: "1,400L",
        cultures: "L. bulgaricus, S. thermophilus",
        pH: "4.3",
      }),
      startedAt: iso("2026-03-02T08:00:00Z"),
      completedAt: iso("2026-03-02T18:00:00Z"),
      sequenceOrder: 2,
    },
    // Packaging (split point)
    {
      batchId: cups.id,
      stageType: "packaging",
      name: "Cup Filling & Sealing",
      locationName: "AlpenMilch Plant, Kempten, Germany",
      latitude: 47.7267,
      longitude: 10.3168,
      operator: "AlpenMilch GmbH",
      metadata: JSON.stringify({
        packagingType: "200g PP cup with foil lid",
        unitsProduced: "7,000 cups",
        bestBefore: "2026-03-20",
      }),
      startedAt: iso("2026-03-03T06:00:00Z"),
      completedAt: iso("2026-03-03T14:00:00Z"),
      sequenceOrder: 3,
    },
    // Cold storage
    {
      batchId: cups.id,
      stageType: "storage",
      name: "Cold Storage",
      locationName: "AlpenMilch Cold Store, Kempten, Germany",
      latitude: 47.7267,
      longitude: 10.3168,
      operator: "AlpenMilch GmbH",
      metadata: JSON.stringify({
        storageTemp: "2-4°C",
        zone: "Dairy Hall B",
      }),
      startedAt: iso("2026-03-03T14:30:00Z"),
      completedAt: iso("2026-03-04T22:00:00Z"),
      sequenceOrder: 4,
    },
    // Transport to Munich
    {
      batchId: cups.id,
      stageType: "transport",
      name: "Refrigerated Transport → Munich",
      locationName: "Munich, Germany",
      latitude: 48.1351,
      longitude: 11.582,
      routeCoords: JSON.stringify([
        [47.7267, 10.3168],
        [47.8388, 10.8687],
        [47.9837, 11.1746],
        [48.1351, 11.582],
      ]),
      operator: "Kühne + Nagel",
      metadata: JSON.stringify({
        vehicleType: "Refrigerated truck",
        targetTemp: "2-4°C",
      }),
      startedAt: iso("2026-03-05T04:00:00Z"),
      completedAt: iso("2026-03-05T08:00:00Z"),
      sequenceOrder: 5,
    },
    // Retail
    {
      batchId: cups.id,
      stageType: "retail",
      name: "Retail Shelf",
      locationName: "EDEKA Munich-Schwabing, Germany",
      latitude: 48.1642,
      longitude: 11.5861,
      operator: "EDEKA Group",
      metadata: JSON.stringify({
        shelfLocation: "Dairy Cooler, Row 2",
        retailPrice: "€1.29",
        displayTemp: "4-6°C",
      }),
      startedAt: iso("2026-03-05T09:00:00Z"),
      completedAt: null,
      sequenceOrder: 6,
    },
  ])
  .returning()
  .all();

console.log(`  Stages: ${chocStages.length} chocolate, ${dairyStages.length} dairy`);

// ---------------------------------------------------------------------------
// 7. Telemetry Readings — Chocolate Transport (including anomaly)
// ---------------------------------------------------------------------------

console.log("Seeding telemetry readings...");

const seaTransportStage = chocStages[2]; // Sea Freight stage

// Normal readings for first 8 days, then anomaly, then recovery
const seaTempReadings: { time: string; temp: number; humidity: number }[] = [];

// Jan 22-29: Normal readings (every 6 hours)
for (let day = 22; day <= 29; day++) {
  for (const hour of [0, 6, 12, 18]) {
    seaTempReadings.push({
      time: `2026-01-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`,
      temp: 3.5 + Math.random() * 1.5, // 3.5-5.0°C normal range
      humidity: 60 + Math.random() * 10,
    });
  }
}

// Jan 30: Cold chain break (the anomaly!)
seaTempReadings.push(
  { time: "2026-01-30T00:00:00Z", temp: 4.1, humidity: 62 },
  { time: "2026-01-30T01:00:00Z", temp: 5.8, humidity: 64 },
  { time: "2026-01-30T02:00:00Z", temp: 7.3, humidity: 67 },
  { time: "2026-01-30T03:00:00Z", temp: 10.4, humidity: 71 },
  { time: "2026-01-30T03:15:00Z", temp: 12.8, humidity: 74 }, // Peak
  { time: "2026-01-30T04:00:00Z", temp: 11.2, humidity: 72 },
  { time: "2026-01-30T05:00:00Z", temp: 8.6, humidity: 69 },
  { time: "2026-01-30T05:14:00Z", temp: 6.1, humidity: 65 }, // End of anomaly window
  { time: "2026-01-30T06:00:00Z", temp: 4.5, humidity: 63 }, // Recovery
  { time: "2026-01-30T12:00:00Z", temp: 4.2, humidity: 62 },
  { time: "2026-01-30T18:00:00Z", temp: 3.9, humidity: 61 },
);

// Jan 31 - Feb 5: Normal readings again
for (let day = 31; day <= 31; day++) {
  for (const hour of [0, 6, 12, 18]) {
    seaTempReadings.push({
      time: `2026-01-${day}T${String(hour).padStart(2, "0")}:00:00Z`,
      temp: 3.5 + Math.random() * 1.5,
      humidity: 60 + Math.random() * 10,
    });
  }
}
for (let day = 1; day <= 5; day++) {
  for (const hour of [0, 6, 12, 18]) {
    seaTempReadings.push({
      time: `2026-02-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00Z`,
      temp: 3.5 + Math.random() * 1.5,
      humidity: 60 + Math.random() * 10,
    });
  }
}

// Insert all temperature + humidity readings for sea transport
const telemetryValues = seaTempReadings.flatMap((r) => [
  {
    stageId: seaTransportStage.id,
    readingType: "temperature" as const,
    value: Math.round(r.temp * 10) / 10,
    unit: "°C",
    recordedAt: iso(r.time),
  },
  {
    stageId: seaTransportStage.id,
    readingType: "humidity" as const,
    value: Math.round(r.humidity * 10) / 10,
    unit: "%",
    recordedAt: iso(r.time),
  },
]);

db.insert(schema.telemetryReadings).values(telemetryValues).run();

// Add normal readings for dairy cold storage + transport
const dairyColdStorage = dairyStages[4]; // Cold storage stage
const dairyTransport = dairyStages[5]; // Transport stage

const dairyReadings = [];
// Cold storage: every 2 hours for ~32 hours
for (let h = 0; h < 32; h += 2) {
  const time = new Date("2026-03-03T14:30:00Z");
  time.setHours(time.getHours() + h);
  dairyReadings.push(
    {
      stageId: dairyColdStorage.id,
      readingType: "temperature" as const,
      value: Math.round((2.5 + Math.random() * 1.5) * 10) / 10,
      unit: "°C",
      recordedAt: time.toISOString(),
    },
    {
      stageId: dairyColdStorage.id,
      readingType: "humidity" as const,
      value: Math.round((75 + Math.random() * 10) * 10) / 10,
      unit: "%",
      recordedAt: time.toISOString(),
    },
  );
}

// Transport: every 30 min for 4 hours
for (let m = 0; m < 240; m += 30) {
  const time = new Date("2026-03-05T04:00:00Z");
  time.setMinutes(time.getMinutes() + m);
  dairyReadings.push(
    {
      stageId: dairyTransport.id,
      readingType: "temperature" as const,
      value: Math.round((3.0 + Math.random() * 1.0) * 10) / 10,
      unit: "°C",
      recordedAt: time.toISOString(),
    },
  );
}

db.insert(schema.telemetryReadings).values(dairyReadings).run();

console.log(`  Telemetry readings: ${telemetryValues.length + dairyReadings.length} total`);

// ---------------------------------------------------------------------------
// 8. Stage Anomaly — Cold Chain Break on Chocolate Transport
// ---------------------------------------------------------------------------

console.log("Seeding anomalies...");

db.insert(schema.stageAnomalies)
  .values({
    stageId: seaTransportStage.id,
    batchId: chocBatch.id,
    anomalyType: "cold_chain_break",
    severity: "critical",
    description:
      "Temperature exceeded 10°C for 2h 14min during Atlantic crossing. Peak temperature: 12.8°C. Refrigeration unit malfunction suspected.",
    thresholdValue: 10.0,
    actualValue: 12.8,
    durationMinutes: 134,
    riskScoreImpact: 45,
    detectedAt: iso("2026-01-30T03:15:00Z"),
    resolvedAt: null,
  })
  .run();

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log("\nSeed complete!");
console.log(`  2 products, 5 batches, 3 lineage links`);
console.log(`  ${chocStages.length + dairyStages.length} stages`);
console.log(`  ${telemetryValues.length + dairyReadings.length} telemetry readings`);
console.log(`  1 anomaly (cold chain break)`);

sqlite.close();
