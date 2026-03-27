# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Warning: Next.js 16

This project runs **Next.js 16.2.1** with **React 19**. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.

## Build & Dev Commands

```bash
pnpm dev                  # Dev server with Turbopack
pnpm build                # Production build (standalone output)
pnpm start                # Start production server
pnpm lint                 # ESLint

# Database (SQLite via Drizzle ORM)
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations
pnpm db:push              # Push schema directly (no migration files)
pnpm db:studio            # Open Drizzle Studio GUI
pnpm db:seed              # Seed demo data (chocolate + dairy supply chains)
pnpm db:reset             # Drop DB, push schema, re-seed

# Docker
docker compose up -d      # Caddy (reverse proxy) + Next.js standalone
```

## Environment Variables

```
DATABASE_URL=file:./data/trace.db    # SQLite path (default works without setting)
CEREBRAS_API_KEY=csk-xxx             # Required for AI chat + analysis
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx      # Required for journey map visualization
```

## Architecture

**Project Trace** is a B2B food supply chain traceability app built for a hackathon. Single Next.js app with two route groups serving different audiences.

### Two Route Groups

- **`(consumer)/`** — Mobile-first PWA for shoppers. Bottom tab nav (Scan, Product, Chat, Alerts). Max-width 480px.
- **`(dashboard)/`** — Desktop QA dashboard for food safety teams. Sidebar nav (Overview, Batches, Incidents).

### Data Flow: Scan → Product → Journey

1. Consumer scans EAN-13 barcode at `/scan` (react-zxing)
2. `/api/product/[barcode]` fetches from OpenFoodFacts API, upserts into local DB
3. Consumer enters lot code (Chargennummer) — the key that links a physical product to its supply chain
4. `/api/batch/[lotCode]` returns batch stages, telemetry, anomalies
5. `/journey/[lotCode]` renders animated Mapbox route with stage markers

### Origin Intelligence Layer (`src/lib/origin/`)

No public API provides per-ingredient geographic origins. The mapper infers likely source countries from ingredient lists using FAO/USDA global trade share data (e.g., cocoa → 38% Ivory Coast, 17% Ghana). It then constructs a synthetic journey: harvest → transport → processing → storage → retail with geocoded waypoints.

### Database (SQLite + Drizzle)

Schema in `src/lib/db/schema.ts`. Key tables:
- `products` — barcode, name, brand, OpenFoodFacts data
- `batches` — lot codes linked to products, with risk scores
- `batch_stages` — ordered supply chain stages with geo coordinates and route coords
- `telemetry_readings` — temperature/humidity sensor readings per stage
- `stage_anomalies` — detected issues (cold chain breaks, humidity spikes)
- `batch_lineage` — merge/split relationships between batches (e.g., two farm milk batches → one processing vat)
- `recalls`, `recall_lots` — recall management linking to affected batches

DB connection is lazy-initialized via Proxy in `src/lib/db/index.ts` to avoid build-time directory errors. SQLite file lives at `data/trace.db` with WAL mode enabled.

### AI Integration (`src/lib/ai/cerebras.ts`)

Uses Cerebras via Vercel AI SDK's `@ai-sdk/openai-compatible` provider. Two models:
- `llama-4-scout-17b-16e-instruct` — consumer chat (streaming)
- `llama3.3-70b` — analysis tasks

Chat route (`/api/chat`) injects batch journey context into the system prompt so the AI answers scoped to the specific product/lot.

### GS1 Barcode Parser (`src/lib/scanner/gs1-parser.ts`)

Parses GS1 Application Identifiers from DataMatrix/GS1-128 barcodes. Extracts GTIN (01), batch/lot (10), expiry (17), serial (21). Handles both parenthesized `(01)xxx(10)yyy` and raw concatenated formats.

### Styling

Tailwind CSS v4 with Autexis corporate theme. Key colors: `#003a5d` (navy), `#9eca45` (green accent), `#424242` (body text), `#f7f9fa` (background). Font: Titillium Web. No border-radius (`rounded-none` throughout).

## Deployment

Standalone Next.js build in Docker, fronted by Caddy for auto-HTTPS. Deployed to AWS EC2 via GitHub Actions → ECR → SSH pull. SQLite persisted on Docker volume.
