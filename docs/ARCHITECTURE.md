# Technical Architecture

## System Overview

The application is a single Next.js 16 instance that uses route-group isolation to separate distinct user surfaces. The `(consumer)/` route group serves a mobile-first PWA. It handles barcode scanning, product information display, AI chat, scan history, and consumer reports. The `(dashboard)/` route group provides a desktop-optimized QA dashboard for batch management and incident response. A shared API layer under `/api/` serves both surfaces. Data persistence relies on an embedded SQLite database configured with Write-Ahead Logging (WAL) mode for concurrent read/write performance.

## Request Flow Diagrams

### Consumer Scan Flow
```text
Camera -> WASM Barcode Detection -> API Lookup -> Internal DB / OpenFoodFacts Fallback
                                        |
                                        v
Map Rendering <- Journey Assembly <- Product Resolution
```

### AI Chat Flow
```text
User Message + Context (Product, Journey, Anomalies, Telemetry, Scan History)
                                        |
                                        v
Client Rendering <- SSE <- ReadableStream <- Cerebras zai-glm-4.7
```

### Report Flow
```text
Category Selection -> Description/Photo -> Image Compression (OffscreenCanvas)
                                        |
                                        v
AI Confirmation Response <- Event Emission <- DB Insert <- Rate Limit Check
```

### Recall Flow
```text
QA Triggers Recall -> Batch Status Update -> Lot Code Linking -> Event Emission
```

## Data Architecture

The relational schema consists of 9 tables: `products`, `batches`, `batch_lineage`, `batch_stages`, `telemetry_readings`, `stage_anomalies`, `consumer_reports`, `recalls`, and `recall_lots`.

### Entity Relationships
```text
[Products] 1---N [Batches] 1---N [Batch Stages] 1---N [Telemetry Readings]
                    |               |
                    |               +---N [Stage Anomalies]
                    |
                    +---N [Batch Lineage] (Self-referential M:N)
                    |
                    +---N [Consumer Reports]
                    |
                    +---N [Recall Lots] 1---1 [Recalls]
```

The batch lineage model uses a many-to-many relationship via the `batch_lineage` table. This supports merging (N parents to 1 child) and splitting (1 parent to N children) with ratio tracking. A union-find clustering algorithm groups batches into supply chains using path compression for O(alpha(n)) efficiency. Recursive Common Table Expressions (CTE) handle upstream and downstream lineage traversal. The dashboard God View aggregates the top 30 to 50 batches by risk, including stages, anomalies, and lineage edges.

## AI Architecture

The system uses Cerebras zai-glm-4.7 via the Vercel AI SDK. This setup achieves inference speeds of approximately 2,000 tokens per second. We use a system prompt injection pattern that provides structured context including product metadata, journey stages, and anomalies with severity levels.

Streaming is implemented using the ReadableStream API and SSE protocol. The model runs with a temperature of 0.2 and a max_token limit of 1024. The consumer assistant is constrained to 80 words and 3 sentences with a confident tone. The dashboard assistant focuses on batch analysis and anomaly flagging.

## Origin Intelligence Layer

Since no public API provides per-ingredient geographic origins, we built a custom inference engine. It uses FAO and USDA trade data mapping to estimate origins. The pipeline parses ingredients and maps them to origin countries weighted by global trade share. It then geocodes manufacturing locations to build journey stages with realistic transit times.

The ingredient database includes specific trade shares:
- Cocoa: Ivory Coast (38%), Ghana (17%)
- Palm Oil: Indonesia (55%), Malaysia (27%)
- Sugar: Brazil (22%)
- Hazelnuts: Turkey (70%)
- Vanilla: Madagascar (75%)

## Map Rendering Architecture

Mapbox GL JS via react-map-gl handles all spatial visualization. The consumer view uses a light theme with animated route lines and a draggable bottom sheet. The dashboard God View uses a dark globe projection with starfield effects and flow particles on a 3-second cycle.

Great-circle arcs are generated using 3D cartesian interpolation on a unit sphere. We apply quadratic Bezier curves with perpendicular offsets and haversine distance scaling, using 40 points per arc. The layer system manages clusters, routes, and ripples independently. Performance is optimized through dynamic imports and ref-based animations to avoid React state updates during frame rendering.

## Client State Architecture

Zustand manages global UI state. LocalStorage persists scan history (up to 50 items), AI conversations per barcode, device IDs, and camera permissions. The application uses no server sessions or cookies to ensure zero-friction access. Event emitters on the `globalThis` object handle real-time updates for reports and recalls.

## Infrastructure

The project uses a multi-stage Docker build. The final image is based on Node 22 Alpine and is roughly 150MB. It runs as a non-root user and uses a volume at `/app/data` for the SQLite database.

Caddy acts as a reverse proxy, providing automatic HTTPS via Let's Encrypt. The deployment runs on an AWS EC2 t3.small instance. GitHub Actions handles the CI/CD pipeline, running Vitest suites before pushing images to ECR and deploying via SSH.

## Testing Strategy

Vitest provides test coverage with a target of 90% for statements and functions. The suite includes 12 files covering GS1 parsing, OpenFoodFacts integration, and origin mapping. We exclude the database layer, AI calls, and browser-specific map utilities from coverage metrics.

## Security Considerations

Rate limiting is enforced on consumer reports at 5 per hour per device. We use device fingerprinting via localStorage UUIDs without collecting personally identifiable information. All API endpoints use Zod for input validation. The CEREBRAS_API_KEY remains server-side to prevent exposure in the client bundle.
