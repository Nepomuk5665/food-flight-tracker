# Project Trace — Food Flight Tracker
## System Specification v1.0

**Date:** 2026-03-27  
**Status:** Shipped  
**Team Size:** 4  
**Timeline:** 24h (Baden Hackt 2026)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [Consumer App Specification](#4-consumer-app-specification)
5. [QA Dashboard Specification](#5-qa-dashboard-specification)
6. [Backend Specification](#6-backend-specification)
7. [Database Schema](#7-database-schema)
8. [AI Pipeline](#8-ai-pipeline)
9. [Data Model](#9-model)
10. [API Contracts](#10-api-contracts)
11. [Infrastructure](#11-infrastructure)
12. [Testing Strategy](#12-testing-strategy)
13. [Demo Data](#13-demo-data)

---

## 1. Executive Summary
Project Trace is a high-performance food supply chain tracking system that integrates real-time telemetry, consumer feedback, and AI-driven safety analysis. The system provides end-to-end visibility from raw material harvest to retail shelf, enabling rapid root-cause analysis and instant recall execution. It consists of a WASM-accelerated mobile consumer application, a desktop-optimized QA command center, and a robust backend powered by SQLite and Cerebras inference.

---

## 2. Problem Statement
Food supply chains are opaque, fragmented, and slow to respond to safety incidents. Recalls often take days to reach consumers, and quality data is siloed within individual actors. Consumers lack a reliable way to verify the journey and safety of their food, while QA teams struggle with manual data aggregation and delayed anomaly detection.

---

## 3. Solution Architecture
The system uses a modern TypeScript stack designed for low latency and high reliability.

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, Framer Motion, Zustand.
- **Maps:** Mapbox GL JS for high-fidelity geographic visualization.
- **Scanner:** WebAssembly-accelerated barcode detection (ZXing C++).
- **AI:** Cerebras zai-glm-4.7 for ultra-fast (~2,000 tok/s) streaming analysis.
- **Backend:** Node.js 22, Drizzle ORM, SQLite (WAL mode).
- **Infrastructure:** Docker, Caddy (auto-HTTPS), AWS EC2.

---

## 4. Consumer App Specification
The consumer application is a mobile-first web app focused on zero-friction scanning and immediate transparency.

### 4.1 Barcode Scanning Engine
- **Technology:** WASM-accelerated `barcode-detector` ponyfill using ZXing C++.
- **Performance:** <10ms per frame processing on modern mobile devices.
- **Supported Formats:** EAN-13, EAN-8, UPC-A, UPC-E, QR, DataMatrix, Code 128.
- **GS1 Support:** Full parsing of GS1 Digital Link URLs and GS1 Application Identifiers (AI) in both parenthesized and raw formats.
- **Fallback:** Manual entry via swipe-up drawer and image upload for desktop environments.

### 4.2 User Interface & Experience
- **Camera Gate:** Permission management with `localStorage` persistence.
- **Feedback:** Haptic vibration on successful scan.
- **Navigation:** Glassmorphism bottom nav with animated indicator dot and backdrop-blur.
- **Transitions:** Framer Motion fade-in transitions between views.
- **Mobile Gate:** QR code overlay for desktop users to redirect to mobile.

### 4.3 Product & Journey Views
- **Product Metadata:** Name, brand, image, and source badges (Internal, OpenFoodFacts, or Merged).
- **Safety Scoring:** Visual Nutri-Score and Eco-Score badges (A-E) with color gradients.
- **Ingredients:** Automated allergen highlighting in red.
- **Supply Chain Summary:** Interactive timeline with stages, locations, and risk scores.
- **Map View:** Full-screen Mapbox GL JS map with dark theme and animated route lines.
- **Timeline Drawer:** Draggable bottom sheet (0-80% height) with momentum physics and velocity-based flick.

### 4.4 AI Safety Assistant
- **Inference:** Streaming from Cerebras zai-glm-4.7.
- **Context Injection:** Product data, supply chain history, telemetry anomalies, and scan history.
- **Interaction:** Auto-prompt on first load with 4 suggestion chips.
- **Persistence:** Conversation history stored per barcode in `localStorage`.

### 4.5 Consumer Reporting
- **Workflow:** Multi-step form (Category → Description/Photo → AI Confirmation).
- **Image Processing:** `OffscreenCanvas` compression with progressive quality reduction to 200KB.
- **Rate Limiting:** 5 reports per device per hour, tracked via UUID in `localStorage`.

---

## 5. QA Dashboard Specification
The QA Dashboard is a desktop command center for monitoring global supply chain health.

### 5.1 God View (Global Map)
- **Visualization:** Mapbox globe with starfield atmosphere and idle rotation.
- **Batch Clustering:** Automated zoom on cluster click.
- **Risk Indicators:** Color-coded dots (Green/Yellow/Orange/Red) based on real-time risk scores.
- **Animations:** Staggered route drawing (4s per batch, 300ms stagger) and flow particles (3s cycle).
- **Interactivity:** Hover tooltips for batches, routes, and stages.

### 5.2 Batch Analytics
- **Metrics:** Active Batches, Open Incidents, Avg Risk Score, Recalled Batches.
- **Batch Table:** Searchable and sortable table with risk gradient bars.
- **Risk Gauge:** Circular SVG gauge with animated fill.
- **Telemetry Tab:** Pure CSS bar charts with min/max/avg markers and 8°C threshold lines.
- **Lineage Tab:** Visual flow diagram showing parent-child relationships (merge/split) with ratios.

### 5.3 Incident Management
- **Alerts Panel:** Severity-sorted alerts with "fly-to" location functionality.
- **Recall Trigger:** Form to initiate recalls across specific lots or entire lineages.
- **Report Triage:** Aggregated consumer reports grouped by lot code.

---

## 6. Backend Specification
The backend is a high-concurrency Node.js service optimized for data integrity and fast retrieval.

### 6.1 Core Services
- **Database:** SQLite with WAL mode and 5s busy timeout.
- **Product Resolution:** Parallel lookup strategy (Internal DB + OpenFoodFacts) with a merge strategy.
- **Origin Intelligence:** Ingredient-to-country mapping using FAO and USDA trade data.
- **Geospatial Logic:** Great-circle arc generation using haversine distance and 3D cartesian Bézier interpolation with perpendicular offsets.

### 6.2 Integrations
- **OpenFoodFacts:** 3M+ products, exponential backoff retries, and image resolution rewriting.
- **BVL:** Integration with Lebensmittelwarnung for official recall data.
- **Cerebras:** Vercel AI SDK integration for streaming LLM responses.

---

## 7. Database Schema
The system uses 9 tables to manage the complex relationships of food supply chains.

| Table | Purpose |
|-------|---------|
| `products` | Core product metadata and scores. |
| `batches` | Specific production lots and current risk status. |
| `batch_lineage` | Parent-child relationships for merge/split tracking. |
| `batch_stages` | Geographic and temporal stages of a batch journey. |
| `telemetry_readings` | Sensor data (temp, humidity) per stage. |
| `stage_anomalies` | Detected violations of safety thresholds. |
| `consumer_reports` | User-submitted quality incidents. |
| `recalls` | Active and historical recall events. |
| `recall_lots` | Mapping of recalls to affected batches. |

---

## 8. AI Pipeline
The AI pipeline handles real-time risk assessment and natural language interaction.

- **Inference Engine:** Cerebras zai-glm-4.7.
- **Throughput:** ~2,000 tokens per second.
- **Prompting:** Context-aware system prompts including product specs, journey telemetry, and anomaly logs.
- **Streaming:** Real-time response delivery via Vercel AI SDK.

---

## 9. Data Model
### 9.1 Lineage Clustering
The system implements a union-find lineage clustering algorithm with O(α(n)) complexity to resolve full supply chain trees. This allows the system to identify every affected batch in a merge/split scenario within milliseconds.

### 9.2 Telemetry Thresholds
Safety thresholds are enforced at the database level. For example, a cold chain stage triggers an anomaly if temperature readings exceed 8°C for more than 15 minutes.

---

## 10. API Contracts
The system exposes 9 primary API endpoints with strict Zod validation and rate limiting.

- `GET /api/products/:barcode`: Resolves product and active lot.
- `GET /api/batches/:lotCode`: Returns full journey and telemetry.
- `POST /api/reports`: Submits consumer incident reports.
- `POST /api/recalls`: Triggers a system-wide recall.

---

## 11. Infrastructure
- **Deployment:** GitHub Actions CI/CD pipeline.
- **Containerization:** Multi-stage Docker builds (Node 22 Alpine).
- **Proxy:** Caddy reverse proxy with automatic TLS.
- **Hosting:** AWS EC2.

---

## 12. Testing Strategy
- **Framework:** Vitest.
- **Coverage:** 90% threshold for core logic.
- **Scope:** 12 test files covering GS1 parsing, lineage resolution, and API endpoints.

---

## 13. Demo Data
The system includes two comprehensive demo supply chains:
1. **Chocolate Chain:** 8 stages, linear flow, featuring a critical cold chain temperature anomaly.
2. **Cheese Chain:** 5 batches, complex merge/split lineage, 28-day aging telemetry.
3. **Telemetry:** 40+ pre-populated readings with critical threshold violations.
4. **Reports:** Sample consumer reports with AI-generated triage responses.
