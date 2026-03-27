<h1 align="center">
  <img 
    src="https://github.com/user-attachments/assets/c2074992-de16-4764-bae1-d95cfe6d4c8d" 
    alt="Food Flight Tracker Logo" 
    width="200"
  />
  <br/>
  Project Trace — Food Flight Tracker
</h1>

<p align="center">
  Track your food from field to shelf. Real-time supply chain visibility, AI-powered safety analysis, and barcode scanning — built for the <strong>Baden Hackt 2026</strong> hackathon.
</p>

<p align="center">
  <a href="https://foodflighttracker.com"><img src="https://img.shields.io/badge/Live-foodflighttracker.com-9eca45?style=for-the-badge" alt="Live Demo"/></a>
  <a href="https://github.com/Nepomuk5665/food-flight-tracker/tree/main/docs"><img src="https://img.shields.io/badge/Docs-Architecture-003a5d?style=for-the-badge" alt="Docs"/></a>
  <a href="https://www.figma.com/design/4XAMeiD6nuGZ4HwsxqE1gT/Untitled?node-id=0-1&p=f"><img src="https://img.shields.io/badge/Figma-Mockup-F24E1E?style=for-the-badge&logo=figma&logoColor=white" alt="Figma"/></a>
</p>

---

## Hi Reviewer!

Welcome to **Project Trace**. This guide walks you through every feature and how to test it. The app has two sides:

| Side | URL | Device | Purpose |
|------|-----|--------|---------|
| **Consumer App** | [foodflighttracker.com/scan](https://foodflighttracker.com/scan) | Mobile phone | Scan barcodes, view product info, AI analysis |
| **QA Dashboard** | [foodflighttracker.com/overview](https://foodflighttracker.com/overview) | Desktop browser | Monitor supply chains, manage recalls, batch analytics |

---

## How to Test — Step by Step

### 1. Consumer App (use your phone)

Scan this QR code with your phone to open the scanner directly:

<p align="center">
  <img src="public/qr-scan.png" alt="QR Code — foodflighttracker.com/scan" width="200" />
  <br/>
  <em>foodflighttracker.com/scan</em>
</p>

Or open **[foodflighttracker.com](https://foodflighttracker.com)** on your phone and tap **"Scan Product"**.

#### Scan a barcode
- Point your camera at **any food product barcode** (EAN-13)
- The scanner uses WebAssembly-accelerated barcode detection — it's instant
- No barcode handy? Use the **manual entry** field at the bottom

#### Try these barcodes
| Barcode | Product | What you'll see |
|---------|---------|-----------------|
| `4012345678901` | Swiss Dark Chocolate 100g | Full supply chain (Ghana → Belgium → Germany), cold chain anomaly, 8 stages, AI risk analysis |
| `4098765432100` | Alpine Fresh Yogurt 200g | Merge/split batch lineage (2 farms → 1 vat → 7000 cups), clean data |
| `3017624010701` | Nutella | Real OpenFoodFacts data, Nutri-Score E, allergen warnings |
| `7610235000329` | Henniez Water 1.5L | OpenFoodFacts data, Nutri-Score A, Swiss origin |
| Any other barcode | Real product | Falls back to OpenFoodFacts (3M+ products) |

#### Product page features
- **Product info**: name, brand, image, source badge (Internal / OpenFoodFacts / Merged)
- **Nutri-Score & Eco-Score**: visual A-E badge with correct colors
- **Ingredients**: with allergens highlighted in red
- **Supply chain stages**: timeline of the product journey (if available)
- **Map tab**: interactive Mapbox map with animated route lines and stage pins
- **AI Analysis**: auto-generates a safety summary, answer follow-up questions
- **Suggestion chips**: tap "Is this safe to eat?", "Any allergen concerns?", etc.

#### AI features
- Streams responses in real-time with animated cursor
- Full markdown rendering (bold, lists, headings)
- Context-aware: knows the product's ingredients, scores, supply chain, anomalies
- Remembers your scan history — ask "Is this better than what I scanned before?"
- Conversation persisted per product in localStorage

#### Scan history
- Tap **"Products"** in the bottom nav to see all previously scanned products
- Shows product image, nutri-score badge, AI summary preview
- Tap any product to revisit — cached AI conversation loads instantly

### 2. QA Dashboard (use your computer)

Open **[foodflighttracker.com/overview](https://foodflighttracker.com/overview)** on your desktop.

#### Overview (command center)
- **4 metric cards**: active batches, average risk score, critical anomalies, active recalls
- **God View map**: Mapbox dark-style map with all batches plotted as risk-colored dots (green/yellow/orange/red)
- **Activity feed**: live anomalies, consumer reports, active recalls
- Click any batch dot on the map → navigates to batch detail

#### Batches table
- Click **"Batches"** in the sidebar
- Sortable table of all batches with status badges and risk score bars
- Search by lot code or product name
- Click any row → batch detail page

#### Batch detail (try lot `L6029479302`)
- **Risk Score Gauge**: circular SVG indicator with color gradient
- **Journey Map tab**: full-screen dark Mapbox map with animated route, stage pins, bottom sheet timeline
- **Telemetry tab**: pure CSS bar charts showing temperature/humidity per stage, anomaly threshold lines
- **Lineage tab**: visual parent/child batch flow with merge/split relationships
- **AI Analysis tab**: auto-analyzes the batch, flags anomalies, recommends actions

#### Incidents
- Click **"Incidents"** in the sidebar
- **Trigger a recall**: click "Trigger Recall", enter a reason, severity, and lot codes
- **Resolve a recall**: click "Resolve Incident" on any active recall
- Active vs resolved recalls separated with collapsible sections

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Autexis design system |
| Database | SQLite + Drizzle ORM |
| AI | Cerebras (zai-glm-4.7) via Vercel AI SDK |
| Scanner | barcode-detector (ZXing C++ WebAssembly) |
| Maps | Mapbox GL JS + react-map-gl |
| Product Data | OpenFoodFacts API (3M+ products) |
| Deployment | AWS EC2 + Docker + Caddy (auto-HTTPS) |
| CI/CD | GitHub Actions → ECR → SSH deploy |

---

## Architecture

```
Consumer Phone                              Desktop Browser
     │                                           │
     ▼                                           ▼
┌─────────────┐                         ┌──────────────────┐
│ /scan       │                         │ /overview        │
│ /product/*  │  ◄── Next.js 16 ──►    │ /batches         │
│ /products   │     App Router          │ /batch/*         │
│ /alerts     │                         │ /incidents       │
└──────┬──────┘                         └────────┬─────────┘
       │                                         │
       ▼                                         ▼
┌──────────────────────────────────────────────────────────┐
│                     API Routes                           │
│  /api/product/[barcode]  /api/batch/[lotCode]           │
│  /api/chat (streaming)   /api/recalls                   │
│  /api/dashboard/overview /api/journey/generate          │
└──────────────────────────┬───────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ SQLite   │  │ OpenFood │  │ Cerebras │
      │ (Drizzle)│  │ Facts    │  │ AI       │
      └──────────┘  └──────────┘  └──────────┘
```

---

## Local Development

```bash
# Clone
git clone https://github.com/Nepomuk5665/food-flight-tracker.git
cd food-flight-tracker

# Install
pnpm install

# Environment
cp .env.example .env.local
# Add your keys to .env.local:
#   CEREBRAS_API_KEY=csk-...
#   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# Database
pnpm db:push    # Create tables
pnpm db:seed    # Seed demo data (chocolate + yogurt chains)

# Run
pnpm dev        # http://localhost:3000
```

---

## Infrastructure

```
GitHub (push to main)
    │ automatic
    ▼
GitHub Actions
    ├── Docker build (multi-stage, standalone output)
    ├── Push to AWS ECR
    └── SSH deploy to EC2
         │
         ▼
AWS EC2 (t3.small, Ubuntu 24.04)
    ├── Caddy (auto-HTTPS for foodflighttracker.com)
    └── Next.js container (port 3000)
         └── SQLite on Docker volume
```

---

## Feature Summary

### Consumer App (Mobile)
- Instant barcode scanning (WASM, <10ms/frame)
- Real product data from OpenFoodFacts (3M+ products)
- Interactive supply chain map with Mapbox
- AI-powered safety analysis (Cerebras zai-glm-4.7, streaming)
- Context-aware follow-up questions with full conversation memory
- Scan history with cached AI summaries
- Nutri-Score and Eco-Score visual badges
- Allergen highlighting
- Desktop image upload fallback for scanning

### QA Dashboard (Desktop)
- God View dark map with risk-colored batch dots
- Real-time metrics (batches, anomalies, recalls, risk scores)
- Sortable/searchable batch table
- Batch detail with circular risk gauge
- Journey map + timeline per batch
- Telemetry visualization (CSS bar charts, anomaly thresholds)
- Batch lineage flow (merge/split)
- AI batch analysis
- Recall management (trigger, resolve)

### AI Features
- Cerebras zai-glm-4.7 via Vercel AI SDK
- Streaming responses with animated cursor + shimmer
- Product-scoped system prompts with full supply chain context
- Scan history awareness (compare products across scans)
- Markdown rendering (bold, lists, headings)
- Short, confident, data-backed answers (no disclaimers)

### Infrastructure
- One-push deployment (GitHub → ECR → EC2)
- Auto-HTTPS via Caddy + Let's Encrypt
- SQLite with auto-table creation on first boot
- Zero-downtime deploys

---

## Project Links

| Resource | Link |
|----------|------|
| Live App | [foodflighttracker.com](https://foodflighttracker.com) |
| Documentation | [docs/](https://github.com/Nepomuk5665/food-flight-tracker/tree/main/docs) |
| Architecture Decisions | [docs/DECISIONS.md](https://github.com/Nepomuk5665/food-flight-tracker/blob/main/docs/DECISIONS.md) |
| Figma Mockup | [Figma](https://www.figma.com/design/4XAMeiD6nuGZ4HwsxqE1gT/Untitled?node-id=0-1&p=f) |

---

<p align="center">
  <strong>Built at Baden Hackt 2026</strong> · Powered by Autexis
</p>
