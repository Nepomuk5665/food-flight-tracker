# PROJECT TRACE — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-27
**Team Size:** 4
**Timeline:** 24 hours (hackathon)
**Status:** Draft — pending team review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture](#4-system-architecture)
5. [Component Specifications](#5-component-specifications)
   - 5.1 Consumer PWA
   - 5.2 B2B QA Dashboard
   - 5.3 Backend API
   - 5.4 Database Schema
   - 5.5 AI Pipeline
   - 5.6 Real-Time Event System
   - 5.7 Seed Data & Telemetry Simulator
6. [Data Model](#6-data-model)
7. [API Contracts](#7-api-contracts)
8. [AI Specification](#8-ai-specification)
9. [Demo Script](#9-demo-script)
10. [Team Workstreams & Parallel Tracks](#10-team-workstreams--parallel-tracks)
11. [Tech Stack](#11-tech-stack)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Out of Scope](#13-out-of-scope)
14. [Risk Register](#14-risk-register)

---

## 1. Executive Summary

PROJECT TRACE is a B2B Decentralized Quality Assurance SaaS platform that makes food supply chains visible, traceable, and safe. It bridges factory-floor telemetry with consumer feedback to enable instant root-cause analysis and real-time recall management.

The system consists of two applications:

- **Consumer PWA** — A zero-install, account-free mobile web app where consumers scan a product barcode, see its full geographic journey on an interactive Mapbox map, and report quality issues.
- **B2B QA Dashboard** — A desktop command center for QA teams showing an aggregate map of all active batches, AI-powered anomaly detection, root-cause traceback, and one-click recall triggers.

**Core thesis:** Food is not a parcel — it splits, mixes, and merges. Our data model captures this reality. Our AI detects risks before consumers are harmed. Our real-time system ensures recalls happen in seconds, not days.

---

## 2. Problem Statement

| Problem | Impact | Our Solution |
|---------|--------|-------------|
| No supply chain transparency | Consumers cannot verify origin or safety | Map-based journey visualization per scanned product |
| Slow recall processes | Dangerous products stay on shelves for days/weeks | One-click recall with instant PWA status flip via WebSocket |
| Fragmented data across actors | Each supply chain participant sees only their segment | Unified data model with full chain visibility |
| Invisible quality risks | Cold chain breaks, contamination go undetected | Rule-based anomaly detection + AI risk scoring |
| No consumer feedback loop | Quality issues reported through slow, disconnected channels | Zero-friction "Report Issue" directly from PWA to QA Dashboard |

---

## 3. Solution Overview

```
Consumer scans barcode
        |
        v
  +-----------+        WebSocket         +------------------+
  |  Consumer  | <---------------------> |   B2B QA         |
  |    PWA     |   (recall status push)  |   Dashboard      |
  +-----------+                          +------------------+
        |                                        |
        | REST API                        REST API |
        v                                        v
  +------------------------------------------------+
  |              Backend API Server                 |
  |  (Next.js API Routes + WebSocket Server)        |
  +------------------------------------------------+
        |                    |
        v                    v
  +-----------+     +------------------+
  | PostgreSQL |     |   AI Pipeline    |
  |  Database  |     | (Rules + OpenAI) |
  +-----------+     +------------------+
```

---

## 4. System Architecture

### 4.1 High-Level Architecture

The system follows a **monorepo** structure with two Next.js applications sharing a common backend:

```
food-flight-tracker/
├── apps/
│   ├── consumer/          # Consumer PWA (Next.js)
│   └── dashboard/         # B2B QA Dashboard (Next.js)
├── packages/
│   ├── api/               # Shared API routes & business logic
│   ├── db/                # Database schema, migrations, queries
│   ├── ai/                # AI pipeline (rules engine + OpenAI)
│   ├── shared/            # Shared types, utils, constants
│   └── ws/                # WebSocket server
├── scripts/
│   ├── seed.ts            # Database seed script
│   └── simulate.ts        # Telemetry event simulator
└── docs/
```

### 4.2 Infrastructure (AWS)

| Component | Service | Notes |
|-----------|---------|-------|
| Consumer PWA | EC2 / Docker | Next.js standalone build |
| Dashboard | EC2 / Docker | Next.js standalone build |
| API Server | EC2 / Docker | Shared backend process |
| WebSocket | Same EC2 instance | Separate port (e.g., 3001) |
| Database | PostgreSQL on EC2 or RDS | Single instance, sufficient for demo |
| Reverse Proxy | Nginx | Routes traffic to correct service |

### 4.3 Shared Infrastructure Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo tool | Turborepo | Fast builds, shared deps, familiar to Next.js teams |
| Package manager | pnpm | Workspace support, disk efficient |
| Database access | Drizzle ORM | Type-safe, lightweight, good PostgreSQL support |
| Validation | Zod | Runtime + TypeScript type inference |
| Map | Mapbox GL JS via react-map-gl | Free tier (50k loads/mo), native feel |
| LLM | OpenAI GPT-4o / GPT-4o-mini | Well-documented, fast to integrate |
| Real-time | Native WebSocket (ws library) | Lightweight, full control |
| Auth (Dashboard only) | Simple session/JWT | Single demo user, minimal implementation |

---

## 5. Component Specifications

### 5.1 Consumer PWA

**Purpose:** Zero-friction product scanning and traceability visualization for consumers. No app install, no account required.

**Access method:** Native iOS/Android camera scans barcode → opens PWA URL → auto-resolves to active demo lot.

#### 5.1.1 Screens

**Screen 1: Scan Landing**
- URL: `/{productId}` (resolved from barcode lookup)
- Hero element: Full-screen Mapbox map showing the product's geographic journey
- Map pins at each supply chain stage, connected by route lines
- Tapping a pin opens a metadata popup (see 5.1.2)
- Sticky bottom bar with:
  - Product name + brand + image
  - Health status badge: `SAFE` (green) or `RECALLED` (red, pulsing)
  - "Report an Issue" button

**Screen 2: Pin Detail Popup (Map Overlay)**
- Triggered by tapping a map pin
- Displays per-stage metadata:
  - Stage name (e.g., "Cocoa Harvest", "Processing Plant", "Cold Storage")
  - Location name + coordinates
  - Date/time range
  - Key telemetry readings (temperature, humidity)
  - Supplier/operator name
  - Status indicator (normal / warning / critical)
- Anomaly badge if that stage triggered an alert (e.g., "Cold chain interrupted — 2h above threshold")

**Screen 3: Report Issue (Bottom Sheet)**
- Triggered by "Report an Issue" button
- Fields:
  - Issue category (dropdown): `Taste/Quality`, `Appearance`, `Packaging Damage`, `Foreign Object`, `Allergic Reaction`, `Other`
  - Description (optional text, max 500 chars)
  - Photo upload (optional, max 1 image, camera or gallery)
  - Submit button
- On submit: confirmation message + localStorage token saved for device fingerprint
- No personal data collected

**Screen 4: AI Chat (Bottom Sheet or Expandable)**
- Floating chat icon in corner
- Opens a conversational interface
- Scoped to the current product/lot only
- Example queries: "Is this product safe?", "Where was this made?", "What's the carbon footprint?"
- Powered by GPT-4o-mini with product context injected as system prompt

**Screen 5: Recall Alert (Overlay)**
- Triggered via WebSocket when QA team initiates recall
- Full-screen overlay with red background
- Message: "PRODUCT RECALL — This product has been recalled. Do not consume."
- Recall reason text
- "Learn More" link to detailed info
- Cannot be dismissed (stays persistent)

#### 5.1.2 Map Specification (Consumer)

| Property | Value |
|----------|-------|
| Library | react-map-gl + mapbox-gl |
| Style | `mapbox://styles/mapbox/light-v11` (clean, minimal) |
| Initial view | Auto-fit to product journey bounds with padding |
| Pins | Custom SVG markers per stage type (farm, factory, ship, truck, store) |
| Route lines | Dashed line connecting pins in chronological order |
| Animation | Optional: animated dot traveling along route on first load |
| Popups | Custom React components rendered via Mapbox popup API |
| Mobile | Touch-optimized, pinch-zoom, full viewport height |
| Anomaly pins | Red pulsing ring around pins with detected anomalies |

#### 5.1.3 Device Fingerprinting

- On first visit, generate a UUID v4 and store in `localStorage` as `trace_device_id`
- Send with every issue report submission
- Backend uses this to:
  - Rate-limit: max 5 reports per device per hour
  - Deduplicate: flag duplicate reports from same device for same lot
- No personal data, no cookies, no tracking beyond this single key

#### 5.1.4 PWA Configuration

```json
{
  "name": "Project Trace",
  "short_name": "Trace",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#10B981",
  "background_color": "#FFFFFF",
  "icons": [{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }]
}
```

- Installable via "Add to Home Screen" but not required
- Service worker for offline caching of map tiles (stretch goal)

---

### 5.2 B2B QA Dashboard

**Purpose:** Incident command center for Quality Assurance teams. Aggregates consumer reports, detects anomalies, enables root-cause analysis, and triggers recalls.

**Access:** Desktop-optimized web app. Single demo user for hackathon (hardcoded JWT or session).

#### 5.2.1 Screens

**Screen 1: Overview / God View**
- Full-width Mapbox map showing all active batches as clustered dots
  - Green dots: normal batches
  - Yellow dots: batches with minor anomalies
  - Red dots: batches with critical anomalies or active recalls
  - Cluster numbers show batch count in dense areas
- Click a dot → drill into single batch detail (Screen 2)
- Sidebar panels:
  - **Active Alerts** (sorted by severity, newest first)
  - **Recent Consumer Reports** (live feed via WebSocket)
  - **Key Metrics** (active batches, open incidents, avg risk score)

**Screen 2: Batch Detail**
- Reached by clicking a batch on the overview map or from alerts/search
- Top section: Batch header
  - Lot code (e.g., `L6029479302`)
  - Product name + type
  - Current risk score (0-100 gauge)
  - Status badge: `Active`, `Under Review`, `Recalled`
- Middle section: Map journey view (same Mapbox map as consumer, but with additional data layers)
  - Telemetry overlay: temperature/humidity readings along the route
  - Anomaly markers with detailed metadata
- Bottom section: Tabbed panels
  - **Timeline**: Chronological event log (stage transitions, telemetry readings, anomalies)
  - **Lineage**: Visual graph showing parent/child batch relationships (merge/split)
  - **Consumer Reports**: All reports filed against this batch
  - **AI Analysis**: AI-generated risk assessment and recommendation

**Screen 3: Incident Response**
- Triggered when AI flags a critical anomaly or manual escalation
- Prominent red banner with anomaly details
- AI recommendation panel:
  - Risk score with confidence percentage
  - Plain-language explanation of the anomaly
  - Specific recommendation (e.g., "Initiate recall for 2,400 units in Region South")
  - Affected batch lineage (parent vats, sibling batches)
- Action buttons:
  - **Accept & Recall** → triggers recall for all affected lots
  - **Targeted Recall** → select specific sub-batches to recall
  - **Monitor** → mark as "Under Review", set up enhanced monitoring
  - **Dismiss** → mark as false positive (requires reason)

**Screen 4: Recall Management**
- List of all active and historical recalls
- Per recall: affected lots, trigger reason, timestamp, status, number of consumer views since recall
- Ability to end a recall (status flips back to green on consumer PWA)

**Screen 5: AI Assistant (Side Panel)**
- Persistent chat panel on the right side of the Dashboard
- Full data access — can query across all batches, suppliers, time ranges
- Example queries:
  - "Show me all batches with temperature anomalies this week"
  - "What's the risk pattern for Supplier GhanaCocoa Ltd?"
  - "Compare defect rates between Vat 1 and Vat 2 this month"
  - "Summarize all consumer reports for lot L6029479302"
- Powered by GPT-4o with full database context via function calling

#### 5.2.2 Map Specification (Dashboard)

| Property | Value |
|----------|-------|
| Library | react-map-gl + mapbox-gl |
| Style | `mapbox://styles/mapbox/dark-v11` (command center aesthetic) |
| Initial view | World view, auto-fit to all active batch locations |
| Clustering | Mapbox GL JS `cluster` source with custom cluster rendering |
| Batch dots | Color-coded by risk level (green/yellow/red), size by batch volume |
| Click behavior | Cluster → zoom in; single dot → open batch detail |
| Layers | Toggle-able: temperature heatmap, route lines, anomaly zones |
| Real-time | New anomaly dots pulse/animate when they appear via WebSocket |

#### 5.2.3 Dashboard Layout

```
+------------------------------------------------------------------+
|  Logo   |  Search [lot code]  |  Alerts(3)  |  User  |          |
+------------------------------------------------------------------+
|                                              |                    |
|          MAP (God View)                      |   AI Assistant     |
|          - Clustered batch dots              |   Chat Panel       |
|          - Click to drill in                 |                    |
|                                              |                    |
+----------------------------------------------+                    |
|  Active Alerts  |  Consumer Reports  | Stats |                    |
|  - Temp spike   |  - "Tastes off"    | 847   |                    |
|  - Cold chain   |  - "Mold on lid"   | active|                    |
+----------------------------------------------+--------------------+
```

---

### 5.3 Backend API

**Purpose:** Unified API serving both Consumer PWA and B2B Dashboard. Handles product lookups, batch tracing, consumer reports, recall management, and AI orchestration.

#### 5.3.1 API Route Structure

```
/api/
├── products/
│   ├── GET    /api/products/:barcode        # Lookup product by barcode → resolve active lot
│   └── GET    /api/products/:barcode/lots   # List known lots for a product
├── batches/
│   ├── GET    /api/batches/:lotCode                # Full batch detail + journey
│   ├── GET    /api/batches/:lotCode/timeline        # Ordered stage events
│   ├── GET    /api/batches/:lotCode/telemetry       # Telemetry readings
│   ├── GET    /api/batches/:lotCode/lineage         # Parent/child batch graph
│   ├── GET    /api/batches/:lotCode/reports          # Consumer reports for this lot
│   └── GET    /api/batches                           # List all batches (Dashboard)
├── reports/
│   ├── POST   /api/reports                           # Submit consumer report
│   └── GET    /api/reports                           # List all reports (Dashboard)
├── recalls/
│   ├── POST   /api/recalls                           # Trigger recall (Dashboard)
│   ├── PATCH  /api/recalls/:id                       # Update recall status
│   └── GET    /api/recalls                           # List recalls (Dashboard)
├── ai/
│   ├── POST   /api/ai/chat                           # Conversational assistant
│   ├── GET    /api/ai/risk/:lotCode                  # Risk assessment for a batch
│   └── POST   /api/ai/analyze-anomaly               # Detailed anomaly analysis
├── telemetry/
│   └── POST   /api/telemetry/events                  # Inject telemetry events (simulator)
└── health/
    └── GET    /api/health                             # Health check
```

#### 5.3.2 Key API Behaviors

**Product Barcode Resolution:**
```
GET /api/products/4012345678901

Response:
{
  "product": {
    "barcode": "4012345678901",
    "name": "Swiss Dark Chocolate 100g",
    "brand": "ChocoTrace",
    "category": "chocolate",
    "imageUrl": "/images/chocolate.jpg"
  },
  "activeLot": {
    "lotCode": "L6029479302",
    "status": "active",        // "active" | "under_review" | "recalled"
    "riskScore": 23,
    "journeyStages": 5
  }
}
```

**Batch Journey (with geographic data for map):**
```
GET /api/batches/L6029479302

Response:
{
  "batch": {
    "lotCode": "L6029479302",
    "productBarcode": "4012345678901",
    "status": "active",
    "riskScore": 23,
    "createdAt": "2026-01-15T08:00:00Z"
  },
  "journey": [
    {
      "stageId": "stage_001",
      "type": "harvest",
      "name": "Cocoa Harvest",
      "location": {
        "name": "Kumasi Cocoa Farm, Ghana",
        "lat": 6.6885,
        "lng": -1.6244
      },
      "startedAt": "2026-01-15T08:00:00Z",
      "completedAt": "2026-01-18T16:00:00Z",
      "operator": "GhanaCocoa Cooperative",
      "metadata": {
        "harvestWeight": "2,400 kg",
        "certification": "Fairtrade"
      },
      "telemetry": {
        "avgTemperature": 28.3,
        "avgHumidity": 72.1
      },
      "anomalies": []
    },
    {
      "stageId": "stage_003",
      "type": "transport",
      "name": "Sea Freight Ghana → Belgium",
      "location": {
        "name": "Port of Antwerp, Belgium",
        "lat": 51.2194,
        "lng": 4.4025
      },
      "routeCoordinates": [
        [6.6885, -1.6244],
        [5.6037, -0.1870],
        [51.2194, 4.4025]
      ],
      "startedAt": "2026-01-22T06:00:00Z",
      "completedAt": "2026-02-05T14:00:00Z",
      "operator": "MaerskLine Logistics",
      "metadata": {
        "vesselName": "Maersk Harmony",
        "containerTemp": "2-6°C"
      },
      "telemetry": {
        "avgTemperature": 4.2,
        "maxTemperature": 12.8,
        "avgHumidity": 65.0
      },
      "anomalies": [
        {
          "id": "anom_001",
          "type": "cold_chain_break",
          "severity": "critical",
          "detectedAt": "2026-01-30T03:15:00Z",
          "description": "Temperature exceeded 10°C for 2h 14min during Atlantic crossing",
          "readings": [
            { "time": "2026-01-30T01:00:00Z", "temp": 4.1 },
            { "time": "2026-01-30T02:00:00Z", "temp": 7.3 },
            { "time": "2026-01-30T03:00:00Z", "temp": 12.8 },
            { "time": "2026-01-30T04:00:00Z", "temp": 11.2 },
            { "time": "2026-01-30T05:00:00Z", "temp": 4.5 }
          ]
        }
      ]
    }
  ]
}
```

**Consumer Report Submission:**
```
POST /api/reports

Body:
{
  "lotCode": "L6029479302",
  "deviceId": "uuid-v4-from-localstorage",
  "category": "taste_quality",
  "description": "Chocolate tastes stale and has white coating",
  "photoUrl": null
}

Response:
{
  "reportId": "rpt_001",
  "status": "received",
  "message": "Thank you. The manufacturer has been notified."
}
```

**Trigger Recall:**
```
POST /api/recalls

Body:
{
  "lotCodes": ["L6029479302", "L6029479303"],
  "reason": "Cold chain break detected — 78% spoilage risk. AI recommendation accepted.",
  "severity": "critical",
  "affectedRegions": ["DE-South", "DE-West"],
  "triggeredBy": "qa_operator"
}

Response:
{
  "recallId": "rcl_001",
  "status": "active",
  "affectedLots": 2,
  "estimatedUnits": 4800,
  "websocketBroadcast": true
}
```

---

### 5.4 Database Schema

**Purpose:** Relational model designed for food supply chain realities — many-to-many relationships, merge/split batch lineage, and temporal telemetry data.

#### 5.4.1 Entity Relationship Overview

```
products ──< batches ──< batch_stages ──< telemetry_readings
                │                │
                │                └──< stage_anomalies
                │
                ├──< batch_lineage (parent_id, child_id)
                │
                ├──< consumer_reports
                │
                └──< recalls ──< recall_lots
```

#### 5.4.2 Table Definitions

**products**
```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode         VARCHAR(20) UNIQUE NOT NULL,    -- EAN/GTIN
    name            VARCHAR(255) NOT NULL,
    brand           VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL,            -- 'chocolate', 'dairy'
    image_url       VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**batches**
```sql
CREATE TABLE batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code        VARCHAR(50) UNIQUE NOT NULL,     -- e.g., 'L6029479302'
    product_id      UUID NOT NULL REFERENCES products(id),
    status          VARCHAR(20) DEFAULT 'active',    -- 'active', 'under_review', 'recalled'
    risk_score      INTEGER DEFAULT 0,               -- 0-100
    unit_count      INTEGER,                         -- estimated units in this batch
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_batches_lot_code ON batches(lot_code);
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_status ON batches(status);
```

**batch_lineage** (enables merge/split tracking)
```sql
CREATE TABLE batch_lineage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_batch_id UUID NOT NULL REFERENCES batches(id),
    child_batch_id  UUID NOT NULL REFERENCES batches(id),
    relationship    VARCHAR(20) NOT NULL,            -- 'merge', 'split'
    ratio           DECIMAL(5,4),                    -- e.g., 0.6000 means 60% of parent
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_batch_id, child_batch_id)
);
```

**Example merge/split:**
- Farm A milk (Batch M001) + Farm B milk (Batch M002) → merge → Vat 1 (Batch V001)
  - `batch_lineage`: `(M001, V001, 'merge', 0.60)`, `(M002, V001, 'merge', 0.40)`
- Vat 1 (Batch V001) → split → 10,000 cups (Batch C001)
  - `batch_lineage`: `(V001, C001, 'split', 1.00)`

**batch_stages**
```sql
CREATE TABLE batch_stages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id        UUID NOT NULL REFERENCES batches(id),
    stage_type      VARCHAR(50) NOT NULL,            -- 'harvest', 'processing', 'transport', 'storage', 'retail'
    name            VARCHAR(255) NOT NULL,
    location_name   VARCHAR(255),
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    route_coords    JSONB,                           -- array of [lat, lng] for transport routes
    operator        VARCHAR(255),
    metadata        JSONB DEFAULT '{}',              -- flexible key-value per stage
    started_at      TIMESTAMPTZ NOT NULL,
    completed_at    TIMESTAMPTZ,
    sequence_order  INTEGER NOT NULL,                -- display order in timeline
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_batch_stages_batch_id ON batch_stages(batch_id);
```

**telemetry_readings**
```sql
CREATE TABLE telemetry_readings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id        UUID NOT NULL REFERENCES batch_stages(id),
    reading_type    VARCHAR(50) NOT NULL,            -- 'temperature', 'humidity', 'pressure', 'co2'
    value           DECIMAL(10, 4) NOT NULL,
    unit            VARCHAR(20) NOT NULL,            -- '°C', '%', 'hPa', 'ppm'
    recorded_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_telemetry_stage_id ON telemetry_readings(stage_id);
CREATE INDEX idx_telemetry_recorded_at ON telemetry_readings(recorded_at);
```

**stage_anomalies**
```sql
CREATE TABLE stage_anomalies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id        UUID NOT NULL REFERENCES batch_stages(id),
    batch_id        UUID NOT NULL REFERENCES batches(id),
    anomaly_type    VARCHAR(50) NOT NULL,            -- 'cold_chain_break', 'humidity_spike', 'delayed_transport', 'contamination_risk'
    severity        VARCHAR(20) NOT NULL,            -- 'low', 'medium', 'high', 'critical'
    description     TEXT NOT NULL,
    threshold_value DECIMAL(10, 4),                  -- the threshold that was exceeded
    actual_value    DECIMAL(10, 4),                   -- the actual reading
    duration_minutes INTEGER,                        -- how long the anomaly lasted
    risk_score_impact INTEGER DEFAULT 0,             -- points added to batch risk score
    detected_at     TIMESTAMPTZ NOT NULL,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_anomalies_batch_id ON stage_anomalies(batch_id);
CREATE INDEX idx_anomalies_severity ON stage_anomalies(severity);
```

**consumer_reports**
```sql
CREATE TABLE consumer_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_code        VARCHAR(50) NOT NULL,
    batch_id        UUID REFERENCES batches(id),
    device_id       VARCHAR(100) NOT NULL,           -- localStorage fingerprint
    category        VARCHAR(50) NOT NULL,            -- 'taste_quality', 'appearance', 'packaging', 'foreign_object', 'allergic_reaction', 'other'
    description     TEXT,
    photo_url       VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'new',       -- 'new', 'reviewed', 'escalated', 'resolved'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reports_lot_code ON consumer_reports(lot_code);
CREATE INDEX idx_reports_device_id ON consumer_reports(device_id);
CREATE INDEX idx_reports_created_at ON consumer_reports(created_at);
```

**recalls**
```sql
CREATE TABLE recalls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason          TEXT NOT NULL,
    severity        VARCHAR(20) NOT NULL,            -- 'warning', 'critical'
    status          VARCHAR(20) DEFAULT 'active',    -- 'active', 'ended'
    triggered_by    VARCHAR(100),
    affected_regions JSONB DEFAULT '[]',
    estimated_units INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    ended_at        TIMESTAMPTZ
);
```

**recall_lots** (join table — a recall can affect multiple lots)
```sql
CREATE TABLE recall_lots (
    recall_id       UUID NOT NULL REFERENCES recalls(id),
    batch_id        UUID NOT NULL REFERENCES batches(id),
    PRIMARY KEY (recall_id, batch_id)
);
```

---

### 5.5 AI Pipeline

**Purpose:** Two-layer intelligence system — fast rule-based anomaly detection for real-time alerts, and LLM-powered analysis for deeper insights and conversational interaction.

#### 5.5.1 Layer 1: Rule-Based Anomaly Detection

Runs on every telemetry event insertion. Zero latency, deterministic.

**Threshold Rules:**

| Rule ID | Condition | Severity | Risk Score Impact |
|---------|-----------|----------|-------------------|
| TEMP_HIGH_CHOC | Chocolate batch temp > 25°C for > 30min | high | +25 |
| TEMP_HIGH_DAIRY | Dairy batch temp > 8°C for > 15min | critical | +40 |
| TEMP_LOW | Any batch temp < -2°C for > 60min | medium | +15 |
| HUMIDITY_HIGH | Humidity > 85% for > 60min | medium | +15 |
| HUMIDITY_LOW | Humidity < 30% for > 120min | low | +10 |
| TRANSPORT_DELAY | Transit time exceeds expected by > 200% | high | +20 |
| COLD_CHAIN_BREAK | Refrigerated product temp > threshold for > 30min | critical | +45 |

**Risk Score Calculation:**
```
batch_risk_score = min(100, sum(anomaly.risk_score_impact for each unresolved anomaly))
```

**Risk Levels:**
- 0-25: `green` (safe)
- 26-50: `yellow` (monitor)
- 51-75: `orange` (under review)
- 76-100: `red` (critical — AI generates recommendation)

When risk score crosses 75, the system automatically:
1. Sets batch status to `under_review`
2. Generates AI analysis (Layer 2)
3. Pushes alert to Dashboard via WebSocket
4. Creates incident for QA team response

#### 5.5.2 Layer 2: LLM-Powered Intelligence (OpenAI)

**Consumer Assistant (GPT-4o-mini):**

System prompt template:
```
You are a food safety assistant for Project Trace. You help consumers
understand the journey and safety of the product they scanned.

Product: {product.name} by {product.brand}
Lot Code: {batch.lotCode}
Current Status: {batch.status}
Risk Score: {batch.riskScore}/100

Supply Chain Journey:
{journey_stages_summary}

Anomalies Detected:
{anomalies_summary}

Rules:
- Only discuss THIS specific product and lot.
- If status is "recalled", prominently warn the user.
- Be honest about detected anomalies but avoid unnecessary alarm.
- Keep answers under 150 words.
- If asked something outside your data, say "I don't have that information for this product."
```

**Dashboard Assistant (GPT-4o with function calling):**

Available functions for the LLM to call:
```typescript
const dashboardFunctions = [
  {
    name: "search_batches",
    description: "Search batches by product, supplier, date range, or risk level",
    parameters: { query: string, filters: { supplier?, dateFrom?, dateTo?, minRisk? } }
  },
  {
    name: "get_batch_detail",
    description: "Get full detail for a specific batch including journey, anomalies, and reports",
    parameters: { lotCode: string }
  },
  {
    name: "get_anomaly_patterns",
    description: "Analyze anomaly patterns across batches for a given time period or supplier",
    parameters: { groupBy: "supplier" | "stage_type" | "anomaly_type", dateFrom?, dateTo? }
  },
  {
    name: "get_report_summary",
    description: "Summarize consumer reports by category, batch, or time period",
    parameters: { lotCode?: string, category?: string, dateFrom?, dateTo? }
  },
  {
    name: "compare_batches",
    description: "Compare metrics between two or more batches",
    parameters: { lotCodes: string[] }
  }
]
```

**AI Risk Recommendation (triggered automatically at risk > 75):**

```
POST /api/ai/analyze-anomaly

Input: { lotCode, anomalies, batchHistory, relatedBatches }

Output:
{
  "riskScore": 78,
  "confidence": 0.85,
  "summary": "Batch L6029479302 experienced a critical cold chain break during Atlantic transport on Jan 30. Temperature exceeded 10°C for 2h 14min. Based on product type (dark chocolate) and exposure duration, there is a 78% probability of quality degradation.",
  "recommendation": {
    "action": "recall",
    "scope": "Targeted recall for 2,400 units in Region South (DE-BY, DE-BW)",
    "urgency": "immediate",
    "reasoning": "Chocolate is temperature-sensitive above 25°C but this batch reached 12.8°C during refrigerated transport, suggesting container failure. Consumer reports (2) corroborate quality issues."
  },
  "affectedBatches": ["L6029479302", "L6029479303"],
  "relatedSupplier": "MaerskLine Logistics"
}
```

---

### 5.6 Real-Time Event System

**Purpose:** Push updates from backend to both applications instantly. Critical for the live recall demo moment.

#### 5.6.1 WebSocket Architecture

```
WebSocket Server (ws library, port 3001)
├── Channel: consumer:{lotCode}
│   ├── Event: recall_status_changed    → PWA flips to red/green
│   ├── Event: anomaly_detected         → PWA shows warning on map pin
│   └── Event: risk_score_updated       → PWA updates status badge
├── Channel: dashboard:alerts
│   ├── Event: new_anomaly              → Dashboard shows new alert
│   ├── Event: new_consumer_report      → Dashboard live feed updates
│   ├── Event: risk_threshold_crossed   → Dashboard triggers incident view
│   └── Event: recall_initiated         → Dashboard confirms recall broadcast
└── Channel: dashboard:batches
    ├── Event: batch_status_changed     → Dashboard map dot color updates
    └── Event: telemetry_update         → Dashboard telemetry graphs update
```

#### 5.6.2 Event Flow: Recall Trigger

```
1. QA operator clicks "Accept & Recall" on Dashboard
2. Dashboard → POST /api/recalls
3. API creates recall record in DB
4. API updates batch status to "recalled" for all affected lots
5. API sends WebSocket events:
   a. consumer:{lotCode} → recall_status_changed { status: "recalled", reason: "..." }
   b. dashboard:alerts → recall_initiated { recallId, affectedLots }
6. Consumer PWA receives event → renders full-screen recall overlay
7. Dashboard receives confirmation → updates recall management view
```

**Latency target:** < 500ms from button click to consumer PWA showing recall overlay.

#### 5.6.3 Event Flow: Anomaly Detection

```
1. Telemetry simulator sends POST /api/telemetry/events
2. API inserts telemetry reading into DB
3. Rule engine evaluates reading against thresholds
4. If anomaly detected:
   a. Insert into stage_anomalies table
   b. Recalculate batch risk score
   c. If risk > 75: trigger AI analysis (async)
   d. WebSocket push: dashboard:alerts → new_anomaly
   e. WebSocket push: consumer:{lotCode} → anomaly_detected
5. When AI analysis completes:
   a. WebSocket push: dashboard:alerts → risk_threshold_crossed { analysis }
```

---

### 5.7 Seed Data & Telemetry Simulator

**Purpose:** Populate the database with realistic demo data and provide a way to inject live events during the pitch.

#### 5.7.1 Seed Data: Two Product Chains

**Product 1: Swiss Dark Chocolate 100g**
```
Barcode: 4012345678901
Brand: ChocoTrace

Supply Chain:
  Stage 1: Cocoa Harvest (Kumasi, Ghana) — Jan 15-18, 2026
    └── Batch: L6029479302 (2,400 kg raw cocoa)
  Stage 2: Processing (Brussels, Belgium) — Jan 20-21, 2026
    └── Roasting, conching, tempering
  Stage 3: Sea Transport (Ghana → Belgium) — Jan 22 - Feb 5, 2026
    └── ⚠️ ANOMALY: Cold chain break on Jan 30 (temp hit 12.8°C for 2h)
  Stage 4: Packaging (Brussels) — Feb 6-7, 2026
    └── Split: 2,400 kg → 24,000 bars (Batch C-CHOC-001)
  Stage 5: Distribution (Munich, Germany) — Feb 8-10, 2026
    └── Warehouse cold storage
  Stage 6: Retail (REWE Munich-Pasing) — Feb 11, 2026
    └── On shelf
```

**Product 2: Alpine Fresh Yogurt 200g**
```
Barcode: 4098765432100
Brand: AlpenMilch

Supply Chain:
  Stage 1a: Milk Collection (Farm Huber, Allgäu) — Mar 1, 2026
    └── Batch: M-FARM-A (800L raw milk)
  Stage 1b: Milk Collection (Farm Berger, Allgäu) — Mar 1, 2026
    └── Batch: M-FARM-B (600L raw milk)
  Stage 2: Processing Vat (AlpenMilch Plant, Kempten) — Mar 2, 2026
    └── MERGE: M-FARM-A + M-FARM-B → VAT-001 (1,400L)
    └── Pasteurization, culture addition, fermentation
  Stage 3: Packaging (Kempten) — Mar 3, 2026
    └── SPLIT: VAT-001 → 7,000 cups (Batch Y-CUP-001)
  Stage 4: Cold Storage (Kempten) — Mar 3-4, 2026
    └── 2-4°C maintained
  Stage 5: Distribution (Munich, Germany) — Mar 5, 2026
    └── Refrigerated truck
  Stage 6: Retail (EDEKA Munich-Schwabing) — Mar 5, 2026
    └── On shelf, best before Mar 20
```

#### 5.7.2 Telemetry Simulator

A script that can be triggered via API or CLI to inject telemetry events in real-time during the pitch demo.

**API Endpoint:**
```
POST /api/telemetry/events

Body:
{
  "stageId": "stage_003",
  "readings": [
    { "type": "temperature", "value": 12.8, "unit": "°C" },
    { "type": "humidity", "value": 78.2, "unit": "%" }
  ]
}
```

**Simulator Script (for automated demo):**
```
npm run simulate -- --scenario cold-chain-break --lot L6029479302 --speed 5x
```

Scenarios:
- `cold-chain-break`: Gradually increases temperature over transport stage, triggers anomaly
- `normal-journey`: Clean data, no anomalies, shows happy path
- `consumer-report-spike`: Simulates 3 consumer reports in quick succession
- `full-demo`: Runs the complete pitch sequence automatically with pauses for narration

---

## 6. Data Model

### 6.1 Merge/Split Logic

The `batch_lineage` table is the key differentiator. It enables:

**Upstream trace (root cause):** Given a defective yogurt cup (Y-CUP-001), trace backward:
```sql
-- Find all ancestor batches
WITH RECURSIVE ancestors AS (
    SELECT parent_batch_id, child_batch_id, relationship, 1 AS depth
    FROM batch_lineage
    WHERE child_batch_id = (SELECT id FROM batches WHERE lot_code = 'Y-CUP-001')

    UNION ALL

    SELECT bl.parent_batch_id, bl.child_batch_id, bl.relationship, a.depth + 1
    FROM batch_lineage bl
    JOIN ancestors a ON bl.child_batch_id = a.parent_batch_id
)
SELECT b.lot_code, a.relationship, a.depth
FROM ancestors a
JOIN batches b ON b.id = a.parent_batch_id;

-- Result: VAT-001 (split, depth 1), M-FARM-A (merge, depth 2), M-FARM-B (merge, depth 2)
```

**Downstream trace (impact blast radius):** Given a contaminated vat, find all affected end products:
```sql
-- Find all descendant batches
WITH RECURSIVE descendants AS (
    SELECT parent_batch_id, child_batch_id, 1 AS depth
    FROM batch_lineage
    WHERE parent_batch_id = (SELECT id FROM batches WHERE lot_code = 'VAT-001')

    UNION ALL

    SELECT bl.parent_batch_id, bl.child_batch_id, d.depth + 1
    FROM batch_lineage bl
    JOIN descendants d ON bl.parent_batch_id = d.child_batch_id
)
SELECT b.lot_code, d.depth
FROM descendants d
JOIN batches b ON b.id = d.child_batch_id;
```

### 6.2 Risk Score Propagation

When an anomaly is detected on a parent batch, risk propagates to children:
- **Split**: Children inherit 100% of parent's risk (same physical material)
- **Merge**: Children inherit weighted risk based on merge ratio

---

## 7. API Contracts

All API endpoints follow a consistent envelope:

```typescript
// Success response
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Error response
interface ApiError {
  success: false;
  error: {
    code: string;        // e.g., 'BATCH_NOT_FOUND'
    message: string;     // human-readable
  };
}
```

### 7.1 Shared TypeScript Types

```typescript
// packages/shared/types.ts

type BatchStatus = 'active' | 'under_review' | 'recalled';
type Severity = 'low' | 'medium' | 'high' | 'critical';
type StageType = 'harvest' | 'collection' | 'processing' | 'packaging' | 'storage' | 'transport' | 'retail';
type ReportCategory = 'taste_quality' | 'appearance' | 'packaging' | 'foreign_object' | 'allergic_reaction' | 'other';
type AnomalyType = 'cold_chain_break' | 'humidity_spike' | 'delayed_transport' | 'contamination_risk' | 'temperature_high' | 'temperature_low';

interface GeoPoint {
  lat: number;
  lng: number;
}

interface JourneyStage {
  stageId: string;
  type: StageType;
  name: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  routeCoordinates?: [number, number][]; // for transport stages
  startedAt: string;                     // ISO 8601
  completedAt: string | null;
  operator: string;
  metadata: Record<string, string>;
  telemetry: {
    avgTemperature?: number;
    maxTemperature?: number;
    minTemperature?: number;
    avgHumidity?: number;
  };
  anomalies: Anomaly[];
  sequenceOrder: number;
}

interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: Severity;
  description: string;
  detectedAt: string;
  thresholdValue?: number;
  actualValue?: number;
  durationMinutes?: number;
  riskScoreImpact: number;
}

interface AiRecommendation {
  riskScore: number;
  confidence: number;
  summary: string;
  recommendation: {
    action: 'recall' | 'targeted_recall' | 'monitor' | 'dismiss';
    scope: string;
    urgency: 'immediate' | 'within_24h' | 'low';
    reasoning: string;
  };
  affectedBatches: string[];
}

interface WebSocketEvent {
  channel: string;
  event: string;
  data: unknown;
  timestamp: string;
}
```

---

## 8. AI Specification

### 8.1 Architecture

```
Telemetry Event
      │
      v
┌─────────────┐     threshold exceeded?     ┌──────────────────┐
│ Rule Engine  │ ────────── yes ──────────>  │ Anomaly Creator  │
│ (sync, <1ms)│                              │ + Risk Scorer    │
└─────────────┘                              └──────────────────┘
                                                      │
                                              risk > 75?
                                                      │ yes
                                                      v
                                             ┌─────────────────┐
                                             │ OpenAI GPT-4o   │
                                             │ Risk Analysis   │
                                             │ (async, ~2-5s)  │
                                             └─────────────────┘
                                                      │
                                                      v
                                             ┌─────────────────┐
                                             │ Dashboard Alert  │
                                             │ + Recommendation │
                                             └─────────────────┘
```

### 8.2 Cost Estimation (Demo Day)

| Component | Model | Est. Calls | Cost |
|-----------|-------|-----------|------|
| Consumer chat | GPT-4o-mini | ~50 | ~$0.02 |
| Dashboard chat | GPT-4o | ~30 | ~$0.30 |
| Risk analysis | GPT-4o | ~5 | ~$0.05 |
| **Total** | | | **~$0.37** |

### 8.3 Prompt Engineering Guidelines

- Always inject structured data (JSON) into system prompts, not user messages
- Set max_tokens appropriately: 200 for consumer chat, 500 for dashboard chat, 800 for risk analysis
- Use temperature 0.3 for factual responses, 0.7 for conversational tone
- Include a "refuse gracefully" instruction for out-of-scope questions
- For dashboard function calling, use `tool_choice: "auto"`

---

## 9. Demo Script

**Duration:** 4-5 minutes

### Act 1: The Happy Path (60 seconds)

1. **Narrator:** "Imagine you're in a supermarket. You pick up a chocolate bar."
2. Scan barcode with phone camera → PWA opens
3. Map animates the journey: Ghana → Belgium → Germany
4. Tap each pin: show harvest data, processing details, transport info
5. "Every stage is verified. You know exactly where your food comes from."

### Act 2: The Crisis (90 seconds)

6. Switch to Dashboard on laptop screen
7. Show the god-view map with active batches (green dots)
8. **Trigger simulator:** inject temperature spike on chocolate batch
9. Watch: green dot turns yellow → AI analyzes → turns red
10. Alert flashes on Dashboard: "Cold chain break detected on Batch L6029479302"
11. Open the incident — show AI recommendation:
    > "78% spoilage risk. Recommend immediate recall for 2,400 units in Region South."
12. "Our AI caught this in real-time. No human needed to spot the problem."

### Act 3: The Recall (60 seconds)

13. Click "Accept & Recall"
14. Switch to phone — consumer PWA **instantly** flips to red recall overlay
15. "Within seconds, every consumer who scanned this product knows it's recalled."
16. "No press release. No waiting. Instant."

### Act 4: Consumer Feedback Loop (45 seconds)

17. Open yogurt product on a second phone
18. Show the merge/split journey: two farms → one vat → individual cups
19. File a consumer report: "Yogurt tastes sour, packaging bulging"
20. Switch to Dashboard — report appears in live feed instantly
21. AI traces: "This report correlates with Batch VAT-001. 2 other reports filed in the last hour."

### Act 5: The Vision (30 seconds)

22. "This is food safety in real-time. From field to shelf. AI-powered. Instant."
23. Show the second demo product (dairy) to prove system is product-agnostic
24. "Project Trace — because knowing what's in your food shouldn't be a luxury."

---

## 10. Team Workstreams & Parallel Tracks

### Recommended Team Split

| Person | Role | Responsibility | Key Deliverables |
|--------|------|----------------|-----------------|
| **P1** | Consumer Frontend | PWA + Mapbox journey map | Scan flow, map with tappable pins, metadata popups, report form, recall overlay, consumer AI chat |
| **P2** | Dashboard Frontend | QA Dashboard + Mapbox aggregate view | God view map, batch detail, incident response UI, recall management, dashboard AI chat panel |
| **P3** | Backend & Data | API + DB + WebSocket + Seed | Schema, migrations, all API routes, WebSocket server, seed script, telemetry simulator |
| **P4** | AI & Integration | AI pipeline + glue | Rule engine, OpenAI integration, risk scoring, prompt engineering, consumer chat, dashboard function calling, end-to-end testing |

### Timeline (24 Hours)

```
Hour  0-1:  Setup — monorepo, DB, Mapbox account, OpenAI key, AWS deploy pipeline
Hour  1-4:  Foundation — DB schema + seed, API scaffolding, PWA + Dashboard shells, map rendering
Hour  4-8:  Core Features — journey map (P1), god view map (P2), all API routes (P3), rule engine (P4)
Hour  8-12: Integration — connect PWA to API (P1), connect Dashboard to API (P2), WebSocket events (P3), AI chat (P4)
Hour 12-16: Key Flows — report form + recall overlay (P1), incident response UI (P2), recall flow E2E (P3), AI risk analysis (P4)
Hour 16-20: Polish — animations + mobile UX (P1), dashboard layout + metrics (P2), telemetry simulator (P3), prompt tuning (P4)
Hour 20-22: Integration Testing — full demo walkthrough, fix bugs, timing
Hour 22-24: Demo Prep — script practice, fallback plans, presentation slides
```

### Integration Points (Sync Needed)

| Hour | Who | What |
|------|-----|------|
| 1 | All | Agree on shared types (packages/shared) |
| 4 | P1+P3 | API contract for product/batch endpoints |
| 4 | P2+P3 | API contract for dashboard endpoints |
| 8 | P3+P4 | Telemetry → anomaly → WebSocket pipeline |
| 12 | All | First end-to-end test: scan → view → report |
| 16 | All | Full demo dry run |

---

## 11. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Monorepo** | Turborepo | latest | Build orchestration |
| **Package Manager** | pnpm | 9.x | Workspace management |
| **Frontend** | Next.js | 15.x | Both PWA and Dashboard |
| **UI** | Tailwind CSS + shadcn/ui | latest | Rapid component development |
| **Map** | Mapbox GL JS + react-map-gl | 7.x | Geographic visualization |
| **State** | Zustand | latest | Lightweight client state |
| **Database** | PostgreSQL | 16 | Relational data storage |
| **ORM** | Drizzle | latest | Type-safe database access |
| **Validation** | Zod | latest | Schema validation |
| **WebSocket** | ws (Node.js) | latest | Real-time events |
| **AI** | OpenAI SDK | latest | GPT-4o / GPT-4o-mini |
| **Language** | TypeScript | 5.x | End-to-end type safety |
| **Runtime** | Node.js | 22.x LTS | Server runtime |
| **Deploy** | Docker + AWS EC2 | — | Custom infra |

---

## 12. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| PWA load time | < 3s on 4G | Mobile-first consumer experience |
| API response time | < 200ms (p95) | Snappy map interactions |
| WebSocket latency | < 500ms end-to-end | Recall flip must feel instant in demo |
| Map render | < 2s first paint | Judges won't wait |
| Concurrent users | 50 | Demo day traffic only |
| Uptime | 99% during demo | Must not crash on stage |
| Mobile support | iOS Safari, Android Chrome | Primary consumer platforms |
| Desktop support | Chrome, Firefox | Dashboard primary browser |

---

## 13. Out of Scope

| Item | Why | Future Consideration |
|------|-----|---------------------|
| Native mobile apps | Web-only constraint | Post-hackathon if traction |
| User accounts (consumer) | Zero-friction principle | Could add for loyalty/gamification |
| Real ML model training | 24h constraint | Rule-based is honest and effective |
| GS1 Digital Link QR codes | Requires label printing infrastructure | Production roadmap |
| Factory-side ingestion UI | No manual data entry principle | IoT/RFID integration in production |
| Multi-tenant SaaS | Single demo manufacturer | Production architecture |
| Internationalization (i18n) | Demo is in English | Production requirement |
| Offline PWA mode | Requires service worker complexity | Nice-to-have |
| Payment / billing | No monetization in demo | Production SaaS feature |
| Real IoT sensor integration | No physical hardware | Simulated via telemetry API |
| Nutri-Score / CO2 analysis | Bonus features, time-permitting | Could add as static data |
| Gamification | Bonus feature, low priority | Post-MVP |

---

## 14. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mapbox integration takes longer than expected | Medium | High | P1/P2 start with static map, add interactions incrementally. Fallback: Leaflet with OpenStreetMap |
| WebSocket flakiness during demo | Low | Critical | Test extensively. Fallback: polling with 2s interval. Pre-record backup video |
| OpenAI API rate limits or latency | Low | Medium | Cache AI responses for demo scenarios. Pre-generate recommendations |
| Database schema needs late changes | Medium | Medium | Use Drizzle migrations. Keep schema minimal, extend via JSONB metadata fields |
| AWS deployment issues | Medium | High | Have local fallback ready (ngrok + local machine). Deploy early (Hour 1) |
| Team member blocked/stuck | Medium | High | Clearly defined interfaces. Any person can work independently after Hour 1 sync |
| Demo crashes on stage | Low | Critical | Full dry run at Hour 16 and 22. Pre-seeded DB backup ready to restore in 30s |
| Scope creep ("let's also add...") | High | Medium | This PRD is the contract. Anything not listed is post-demo. Enforce ruthlessly |

---

## Appendix A: Mapbox Account Setup

1. Create account at mapbox.com (free tier: 50,000 map loads/month)
2. Generate access token from dashboard
3. Add to environment variables: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx`
4. Both apps share the same token
5. Use `mapbox://styles/mapbox/light-v11` for Consumer PWA
6. Use `mapbox://styles/mapbox/dark-v11` for Dashboard

## Appendix B: OpenAI Setup

1. Create API key at platform.openai.com
2. Add to environment variables: `OPENAI_API_KEY=sk-xxx`
3. Set organization ID if applicable
4. Budget alert: set $5 spending limit (demo should cost < $1)
5. Models: `gpt-4o-mini` for consumer chat, `gpt-4o` for dashboard + risk analysis

## Appendix C: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/trace

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# WebSocket
WS_PORT=3001
NEXT_PUBLIC_WS_URL=wss://your-domain.com:3001

# App
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NODE_ENV=production
```
