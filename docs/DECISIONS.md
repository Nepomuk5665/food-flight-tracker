# Architecture Decisions Record

**Date:** 2026-03-27
**Status:** Approved
**Supersedes:** Parts of `docs/PRD.md` where noted

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [External APIs & Data Strategy](#2-external-apis--data-strategy)
3. [Barcode & Chargennummer Scanning](#3-barcode--chargennummer-scanning)
4. [AI Provider](#4-ai-provider)
5. [Database](#5-database)
6. [Infrastructure & Deployment](#6-infrastructure--deployment)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Application Architecture](#8-application-architecture)
9. [Origin Intelligence Layer](#9-origin-intelligence-layer)
10. [Map Visualization](#10-map-visualization)

---

## 1. Tech Stack

> **Overrides PRD Section 11.** Single Next.js app replaces the Turborepo monorepo.

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router) | Full-stack, SSR, PWA-capable. Single deployable unit. |
| Package Manager | pnpm | Workspace support if needed later, disk efficient. |
| Styling | Tailwind CSS + shadcn/ui | Rapid development. Customized with Autexis theme. |
| Scanner | react-zxing | EAN-13, DataMatrix, QR support. React hooks API. Actively maintained. |
| Maps | Mapbox GL JS (via react-map-gl) | Animated routes, 3D globe option, free tier (50k loads/mo). |
| AI SDK | Vercel AI SDK (`@ai-sdk/openai-compatible`) | Provider-agnostic streaming, works with Cerebras. |
| AI Provider | Cerebras | ~3000 tok/s inference, OpenAI-compatible API. |
| Product Data | OpenFoodFacts API | Free, 3M+ products, strong EU coverage. |
| Recall Data | BVL Lebensmittelwarnung API | Free, real German food recall/warning data. |
| Database | SQLite + Drizzle ORM | Zero infra, embedded, ships as single file on EC2. |
| Validation | Zod | Runtime + TypeScript type inference. Unchanged from PRD. |
| State Management | Zustand | Lightweight client state. Unchanged from PRD. |
| Real-time | Native WebSocket (ws) | Lightweight, full control. Unchanged from PRD. |
| Runtime | Node.js 22.x LTS | Server runtime. |
| Language | TypeScript 5.x | End-to-end type safety. |

### Why Not Monorepo (Turborepo)?

The PRD specifies a Turborepo monorepo with `apps/consumer/` and `apps/dashboard/`. For the hackathon, we simplify to a single Next.js app with route-based separation:

```
app/
├── (consumer)/        # Consumer PWA routes
│   ├── scan/          # Camera scanner
│   ├── product/[id]/  # Product details + journey map
│   └── chat/          # AI food assistant
├── (dashboard)/       # B2B QA Dashboard routes (stretch goal)
│   ├── overview/      # God view
│   └── batch/[id]/    # Batch detail
└── api/               # API routes (shared)
```

**Rationale:** One build, one deploy, one Docker container. Monorepo can be introduced post-hackathon if the project grows.

---

## 2. External APIs & Data Strategy

### 2.1 OpenFoodFacts API

**Base URL:** `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`

**What it provides (verified by testing):**
- Product name, brand, image
- Ingredients list (text, parsed array)
- Nutri-Score (A-E grade)
- Eco-Score (A-E grade)
- CO2 data from Agribalyse lifecycle assessment (`co2_total`, `co2_agriculture`, `co2_transportation`, `co2_packaging`)
- Allergens
- Labels (Fairtrade, Rainforest Alliance, Bio, etc.)
- Categories and packaging info

**What it does NOT provide (verified by testing):**
- Per-ingredient geographic origins — `origins` and `origins_tags` fields exist but are empty on ~95% of products
- Supply chain journey data — does not exist
- Batch/lot-level data — does not exist
- IoT sensor data — does not exist
- `manufacturing_places` — occasionally filled (e.g., "Aachen" for Lindt), but rare

**Tested products:**
- Nutella (3017624010701): `origins: ""`, `manufacturing_places: ""`
- Lindt Excellence 90% (3046920029759): `origins: ""`, `manufacturing_places: "Aachen"`
- Both had `ecoscore_data.adjustments.origins_of_ingredients` → `"origins_are_100_percent_unknown"`

**Rate limits:** 100 req/min for personal projects. User-Agent header required.

### 2.2 BVL Lebensmittelwarnung API

**What it provides:**
- Active food recall warnings for Germany
- Product name, reason for recall, affected batches, date, severity
- Manufacturer information

**Usage:** Pull active recalls, match against scanned product/batch for real-time warnings.

### 2.3 Why No Other API Exists for Supply Chain Data

We exhaustively searched every available food API. The reality:

| API | Has Barcode Lookup | Has Ingredient Origins | Has Supply Chain Journey |
|-----|-------------------|----------------------|------------------------|
| OpenFoodFacts | Yes | No (fields empty) | No |
| Spoonacular | Yes (UPC) | No | No |
| Chomp | Yes (1.2M products) | No | No |
| Edamam | Yes | No | No |
| Eaternity | No (recipe-based) | Input field, not output | No |
| USDA FoodData Central | No (no barcode) | No | No |
| osapiens/fTRACE | Enterprise only | Enterprise only | Enterprise only |
| IBM Food Trust | **Shut down** | — | — |
| HowGood/Latis | Enterprise only | Enterprise only | No |

**Per-ingredient geographic origin data does not exist in any publicly accessible API at any price.** This is literally the problem the hackathon challenge describes ("Keine Transparenz", "Fragmentierte Daten"). Supply chain sourcing data is proprietary competitive intelligence locked inside enterprise systems (GS1 EPCIS).

**Our solution:** Build an Origin Intelligence Layer (see Section 9).

---

## 3. Barcode & Chargennummer Scanning

### 3.1 Scanning Context

**Primary user:** Consumer in a supermarket scanning products on the shelf.

**Challenge:** Most consumer food products only carry an EAN-13 barcode, which encodes the GTIN (product identifier) but NOT the batch/lot number (Chargennummer). The batch number is typically:
- Printed as plain text on packaging (e.g., "LOT: ABC123", "CH: 2026-03-15/B42")
- Occasionally encoded in a GS1 DataMatrix barcode (2D matrix code)
- Encoded in GS1-128 barcodes on logistics/case-level packaging (not consumer-facing)

### 3.2 GS1 Application Identifiers

When a GS1 DataMatrix is present, it encodes structured data:

| AI Code | Name | Example |
|---------|------|---------|
| (01) | GTIN | 04012345123456 |
| (10) | Batch/Lot Number | ABC123 |
| (17) | Expiry Date | 261231 (= 2026-12-31) |
| (21) | Serial Number | SN98765 |

**Full example:** `(01)04012345123456(10)ABC123(17)261231`

### 3.3 Scanning Flow

```
User opens PWA → taps "Scan"
         ↓
Camera activates (react-zxing)
         ↓
┌─ EAN-13 detected ──→ Product lookup via OpenFoodFacts API
│                       ↓
│                 Show product card:
│                   - Name, brand, image
│                   - Nutri-Score, Eco-Score
│                   - Ingredients + allergens
│                   ↓
│                 "Enter Chargennummer" prompt
│                   (text field — user reads from packaging)
│                   ↓
│                 Batch-specific journey + risk data
│
├─ GS1 DataMatrix ──→ Parse Application Identifiers
│                     → Extract GTIN + Batch + Expiry automatically
│                     → Full flow without manual input
│
└─ QR Code ─────────→ Could contain traceability URL → navigate
```

### 3.4 Why Chargennummer Matters

| Identifier | Scope | Example |
|-----------|-------|---------|
| EAN-13 / GTIN | Identifies the **product** (all Nutella jars) | 3017624010701 |
| Chargennummer | Identifies a **specific production batch** | LOT-2026-03-A42 |

Consequences:
- Different batches of the same product may have **different ingredient origins** (batch A: cocoa from Ghana, batch B: cocoa from Ecuador)
- **Recalls always target specific batches**, not entire products
- Supply chain events (temperature, transport route) are **per batch**
- The batch number is the JOIN KEY between a physical product and its supply chain data

### 3.5 Scanner Library: react-zxing

| Feature | Support |
|---------|---------|
| EAN-13 | Yes |
| EAN-8 | Yes |
| UPC-A | Yes |
| QR Code | Yes |
| DataMatrix | Yes |
| Code 128 (GS1-128) | Yes |
| React hooks API | Yes |
| Next.js compatible | Yes (client component) |
| npm package | `react-zxing` |

We also need a GS1 parser to decode Application Identifiers from raw DataMatrix/GS1-128 content. Options:
- `gs1-barcode-parser` npm package
- Custom parser (AIs are well-documented, simple regex)

---

## 4. AI Provider

> **Overrides PRD Section 8 and Appendix B.** Cerebras replaces OpenAI.

### 4.1 Cerebras Cloud API

| Property | Value |
|----------|-------|
| Base URL | `https://api.cerebras.ai/v1` |
| Auth | Bearer token (`CEREBRAS_API_KEY`) |
| OpenAI-compatible | Yes — works with OpenAI SDK and Vercel AI SDK |
| Models | `llama-4-scout-17b-16e-instruct`, `llama3.3-70b` |
| Inference speed | ~2000-3000 tokens/sec |
| Function calling | Yes (tool use supported) |
| Streaming | Yes |
| Free tier | Available with rate limits |

### 4.2 Integration via Vercel AI SDK

```typescript
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const cerebras = createOpenAICompatible({
  name: "cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  headers: {
    Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
  },
});

// Use like any other provider
const result = await generateText({
  model: cerebras("llama-4-scout-17b-16e-instruct"),
  prompt: "...",
});
```

### 4.3 AI Use Cases

| Use Case | Model | Purpose |
|----------|-------|---------|
| Conversational Food Assistant | llama-4-scout-17b-16e-instruct | Answer consumer questions about scanned products |
| Risk Prediction | llama-4-scout-17b-16e-instruct | Analyze telemetry data for spoilage risk |
| Anomaly Detection | llama-4-scout-17b-16e-instruct | Detect cold chain breaks, unusual patterns |
| Origin Inference | llama-4-scout-17b-16e-instruct | Infer ingredient origins from product metadata |
| Dashboard Assistant | llama3.3-70b | Complex queries across all batches (function calling) |

### 4.4 Environment Variable

```bash
CEREBRAS_API_KEY=csk-xxx
```

---

## 5. Database

> **Overrides PRD Section 5.4.** SQLite replaces PostgreSQL.

### 5.1 Why SQLite

| Factor | SQLite | PostgreSQL |
|--------|--------|------------|
| Setup | Zero — ships as a file | Requires server process |
| Docker | No extra container | Separate container or RDS |
| Cost | Free | RDS = $15+/mo |
| Backups | Copy the file | pg_dump or snapshots |
| Hackathon speed | Instant | 15-30 min setup |
| Drizzle support | Full | Full |
| Concurrent writes | Limited (WAL mode helps) | Full ACID |

For a hackathon demo with <50 concurrent users, SQLite is sufficient. The schema from PRD Section 5.4 is fully compatible — just replace PostgreSQL-specific syntax:
- `gen_random_uuid()` → `lower(hex(randomblob(4)) || '-' || ...)` or use `ulid` / `nanoid`
- `TIMESTAMPTZ` → `TEXT` (ISO 8601 strings)
- `JSONB` → `TEXT` (JSON as string, parsed in app layer)
- Recursive CTEs for lineage queries work identically in SQLite

### 5.2 Persistence on AWS

SQLite file stored on EBS volume mounted into Docker container:

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data  # SQLite lives here
```

---

## 6. Infrastructure & Deployment

> **Overrides PRD Section 4.2.** Caddy replaces Nginx.

### 6.1 Architecture

```
GitHub (push to main)
    │
    ▼
GitHub Actions
    - docker build → push to ECR
    - SSH to EC2 → docker compose pull + up
    │
    ▼
AWS EC2 (t3.small)
    ┌──────────────────────────────┐
    │  Docker Compose              │
    │  ┌────────────────────────┐  │
    │  │ Caddy (auto HTTPS/SSL) │  │ :80 / :443
    │  └──────────┬─────────────┘  │
    │             ↓                │
    │  ┌────────────────────────┐  │
    │  │ Next.js (standalone)   │  │ :3000
    │  │ + WebSocket server     │  │ :3001
    │  └──────────┬─────────────┘  │
    │             ↓                │
    │  ┌────────────────────────┐  │
    │  │ SQLite on EBS volume   │  │
    │  └────────────────────────┘  │
    └──────────────────────────────┘
```

### 6.2 Why Caddy over Nginx

| Factor | Caddy | Nginx |
|--------|-------|-------|
| HTTPS/SSL | Automatic (Let's Encrypt, zero config) | Manual certbot setup |
| Config | 5 lines Caddyfile | 30+ lines nginx.conf |
| WebSocket proxy | Native support | Requires explicit headers |
| Docker image | 40MB | 25MB |
| Reload | Automatic on config change | `nginx -s reload` |

### 6.3 Caddyfile

```
foodflighttracker.com {
    reverse_proxy nextjs:3000
}

foodflighttracker.com:3001 {
    reverse_proxy nextjs:3001
}
```

### 6.4 Estimated Cost

| Resource | Cost |
|----------|------|
| EC2 t3.small (2 vCPU, 2GB RAM) | ~$15/mo (free tier: $0) |
| EBS 20GB gp3 | ~$1.60/mo |
| ECR storage | ~$0.10/mo |
| Data transfer | ~$1/mo |
| **Total** | **~$18/mo** (free tier: ~$2/mo) |

---

## 7. CI/CD Pipeline

### 7.1 GitHub Actions Workflow

```
push to main
    ↓
GitHub Actions:
    1. Checkout code
    2. Setup Node.js 22
    3. Install dependencies (pnpm install)
    4. Lint + type check
    5. Build Next.js (standalone output)
    6. Build Docker image
    7. Push to AWS ECR
    8. SSH to EC2 → docker compose pull && docker compose up -d
```

### 7.2 Docker Build

Uses Next.js standalone output mode for minimal image size (~150MB):

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 7.3 Docker Compose (Production)

```yaml
version: "3.8"
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - nextjs

  nextjs:
    image: ${ECR_REGISTRY}/food-flight-tracker:latest
    ports:
      - "3000:3000"
      - "3001:3001"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:./data/trace.db
      - CEREBRAS_API_KEY=${CEREBRAS_API_KEY}
      - NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
      - NEXT_PUBLIC_WS_URL=wss://foodflighttracker.com:3001
    restart: unless-stopped

volumes:
  caddy_data:
```

---

## 8. Application Architecture

### 8.1 Route Structure

```
app/
├── layout.tsx                    # Root layout (Titillium Web font, theme)
├── page.tsx                      # Landing / home
├── (consumer)/                   # Consumer PWA route group
│   ├── scan/page.tsx             # Camera barcode scanner
│   ├── product/[barcode]/        # Product detail
│   │   └── page.tsx              #   → product info + batch input
│   ├── journey/[lotCode]/        # Batch journey map
│   │   └── page.tsx              #   → Mapbox animated route
│   ├── chat/page.tsx             # AI food assistant
│   └── alerts/page.tsx           # Recall alerts feed
├── (dashboard)/                  # B2B QA Dashboard (stretch)
│   ├── layout.tsx                # Dashboard layout (sidebar)
│   ├── overview/page.tsx         # God view map
│   ├── batch/[lotCode]/page.tsx  # Batch detail
│   └── incidents/page.tsx        # Incident response
├── api/                          # API routes
│   ├── product/[barcode]/route.ts
│   ├── batch/[lotCode]/route.ts
│   ├── chat/route.ts             # Cerebras streaming
│   ├── recalls/route.ts          # BVL integration
│   ├── journey/generate/route.ts # Origin Intelligence Layer
│   └── health/route.ts
└── lib/
    ├── db/                       # Drizzle schema + queries
    ├── api/                      # OpenFoodFacts, BVL clients
    ├── ai/                       # Cerebras integration
    ├── origin/                   # Origin Intelligence Layer
    └── scanner/                  # GS1 parser utilities
```

### 8.2 Key Pages (Consumer Flow)

1. **`/scan`** — Camera opens, scan EAN-13 or DataMatrix
2. **`/product/[barcode]`** — Product card from OpenFoodFacts + "Enter Chargennummer" field
3. **`/journey/[lotCode]`** — Full-screen Mapbox map with animated supply chain route
4. **`/chat`** — Conversational food assistant (scoped to current product)
5. **`/alerts`** — Live recall warnings from BVL

---

## 9. Origin Intelligence Layer

Since no public API provides per-ingredient geographic origins, we build our own inference engine.

### 9.1 Architecture

```
Scan barcode
    ↓
OpenFoodFacts API → product name, ingredients list, labels, manufacturing_places
    ↓
Origin Intelligence Layer
    ├── Static Mapping Database
    │   (ingredient → typical source countries with percentages)
    ├── Label Enrichment
    │   (Fairtrade → specific sourcing regions)
    ├── Manufacturing Place Geocoding
    │   (if available from OpenFoodFacts)
    └── AI Enrichment (Cerebras)
        (brand + ingredient + label context → refined origin inference)
    ↓
Journey Constructor
    Farm/Plantation (origin country) → Aggregation/Port → Ship/Transport → Factory (manufacturing) → Warehouse → Retail
    ↓
Mapbox Animated Route
```

### 9.2 Static Ingredient Origin Mapping

Built from FAO/USDA global trade data:

```typescript
const INGREDIENT_ORIGINS: Record<string, OriginData[]> = {
  "cocoa": [
    { country: "Ivory Coast", lat: 6.8276, lng: -5.2893, share: 0.38 },
    { country: "Ghana", lat: 7.9465, lng: -1.0232, share: 0.17 },
    { country: "Ecuador", lat: -1.8312, lng: -78.1834, share: 0.07 },
    { country: "Cameroon", lat: 7.3697, lng: 12.3547, share: 0.06 },
  ],
  "palm oil": [
    { country: "Indonesia", lat: -0.7893, lng: 113.9213, share: 0.55 },
    { country: "Malaysia", lat: 4.2105, lng: 101.9758, share: 0.27 },
  ],
  "sugar": [
    { country: "Brazil", lat: -14.2350, lng: -51.9253, share: 0.22 },
    { country: "India", lat: 20.5937, lng: 78.9629, share: 0.18 },
    { country: "Thailand", lat: 15.8700, lng: 100.9925, share: 0.10 },
  ],
  "hazelnuts": [
    { country: "Turkey", lat: 41.0082, lng: 28.9784, share: 0.70 },
    { country: "Italy", lat: 41.8719, lng: 12.5674, share: 0.13 },
  ],
  "vanilla": [
    { country: "Madagascar", lat: -18.7669, lng: 46.8691, share: 0.75 },
  ],
  "coffee": [
    { country: "Brazil", lat: -14.2350, lng: -51.9253, share: 0.35 },
    { country: "Vietnam", lat: 14.0583, lng: 108.2772, share: 0.17 },
    { country: "Colombia", lat: 4.5709, lng: -74.2973, share: 0.08 },
  ],
  "milk": [
    { country: "local", lat: null, lng: null, share: 1.0 },
  ],
  // ... extend as needed
};
```

### 9.3 Journey Construction Logic

```
1. Parse ingredients from OpenFoodFacts
2. For each key ingredient → look up origin countries
3. Pick most likely origin (highest share, or AI-refined based on brand/labels)
4. Geocode manufacturing_places if available
5. Build journey stages:
   - Stage 1: Farm/Plantation at origin country
   - Stage 2: Port/aggregation in origin country
   - Stage 3: Sea/air/land transport to manufacturing country
   - Stage 4: Factory/processing at manufacturing_places (or country of brand)
   - Stage 5: Distribution warehouse in target market
   - Stage 6: Retail location
6. Generate realistic dates based on typical transit times
7. Overlay simulated telemetry (temperature, humidity)
```

### 9.4 Transparency Disclaimer

The app should clearly indicate:
- "Journey based on ingredient analysis and trade data" (inferred journeys)
- "Verified origin data" (when manufacturing_places is from OpenFoodFacts)
- "Real-time recall data from BVL" (government source)

---

## 10. Map Visualization

### 10.1 Consumer Map

| Property | Value |
|----------|-------|
| Library | react-map-gl + mapbox-gl |
| Style | `mapbox://styles/mapbox/light-v11` |
| Initial view | Auto-fit to journey bounds with padding |
| Pins | Custom SVG markers per stage type (farm, factory, ship, truck, store) |
| Route lines | Animated dashed line connecting pins chronologically |
| Animation | Dot traveling along route on first load |
| Popups | React components with stage metadata |
| Mobile | Touch-optimized, pinch-zoom, full viewport height |
| Anomaly pins | Red pulsing ring on stages with detected anomalies |

### 10.2 Environment Variables (Complete)

```bash
# Database
DATABASE_URL=file:./data/trace.db

# AI
CEREBRAS_API_KEY=csk-xxx

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx

# Product Data
# No key needed — OpenFoodFacts is open

# Recalls (if BVL requires key)
BVL_API_KEY=xxx

# WebSocket
WS_PORT=3001
NEXT_PUBLIC_WS_URL=wss://foodflighttracker.com:3001

# App
NEXT_PUBLIC_APP_URL=https://foodflighttracker.com
NODE_ENV=production
```

---

## Decision Log

| # | Decision | Chosen | Rejected | Reason |
|---|----------|--------|----------|--------|
| D1 | App structure | Single Next.js app | Turborepo monorepo | Hackathon speed. One build, one deploy. |
| D2 | Database | SQLite + Drizzle | PostgreSQL | Zero infra, ships as file, sufficient for demo. |
| D3 | AI provider | Cerebras | OpenAI | ~3000 tok/s inference speed, free tier, OpenAI-compatible. |
| D4 | Product API | OpenFoodFacts | Spoonacular, Chomp | Free, best EU coverage, eco-score + CO2 data. |
| D5 | Supply chain data | Origin Intelligence Layer | No API exists | Built from ingredient mapping + AI inference. |
| D6 | Recall API | BVL Lebensmittelwarnung | FDA, RASFF | German market focus for hackathon. |
| D7 | Reverse proxy | Caddy | Nginx | Auto HTTPS, 5-line config, WebSocket native. |
| D8 | Scanner | react-zxing | html5-qrcode, QuaggaJS | Best React integration, DataMatrix support. |
| D9 | Deployment | AWS EC2 + Docker | Vercel, AWS App Runner | Self-hosted requirement from team. |
| D10 | CI/CD | GitHub Actions → ECR → SSH | CodePipeline, manual | Simple, fast, free for public repos. |
| D11 | Scan target | EAN-13 + manual Chargennummer | DataMatrix only | Consumer products mostly have EAN-13 only. |
| D12 | Design system | Exact Autexis colors + typography | Custom palette | Brand consistency with team's company. |
| D13 | AI SDK | Vercel AI SDK | Direct Cerebras HTTP | Provider-agnostic, streaming built-in, tool calling. |
