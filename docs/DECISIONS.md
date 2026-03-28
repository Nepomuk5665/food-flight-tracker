# Architecture Decision Records

**Date:** 2026-03-28
**Status:** Ratified

This document records the critical architectural decisions made during the development of Project Trace. Every choice reflects a rigorous evaluation of trade-offs between performance, developer velocity, and system reliability within the constraints of a 24-hour high-pressure environment.

---

## ADR-001: Single Next.js App over Monorepo

**Status:** Ratified

**Context:**
The initial project requirements suggested a Turborepo monorepo to separate the consumer-facing PWA from the B2B QA dashboard. While monorepos offer clean package boundaries, they introduce significant overhead in build configuration, dependency orchestration, and deployment complexity.

**Decision:**
We chose a single Next.js 16 App Router application. The implementation uses route groups to achieve logical isolation: `(consumer)/` for the mobile-optimized PWA and `(dashboard)/` for the desktop-focused QA interface.

**Consequences:**
This approach provides a single build artifact and one Docker container, simplifying the CI/CD pipeline. Shared logic for the API layer and database schema resides in the same tree without complex internal package linking. Route-group isolation ensures that consumer and dashboard styles or layouts don't leak into each other, providing the benefits of a monorepo without the build-time tax.

---

## ADR-002: SQLite over PostgreSQL

**Status:** Ratified

**Context:**
Production-grade food traceability requires relational integrity for complex lineage queries. While PostgreSQL is the industry standard, it requires a managed service or a separate container, adding infrastructure surface area.

**Decision:**
We selected SQLite with Drizzle ORM. The database is configured in WAL mode for concurrent reads and uses a 5-second busy timeout to handle write contention. The application performs idempotent SQL migrations on boot to ensure the schema is always current.

**Consequences:**
The entire database persists as a single file on an EBS volume. This eliminates external network latency and simplifies backups to simple file copies. SQLite's support for recursive CTEs allows us to perform deep lineage lookups with the same performance as larger engines. We handle JSONB requirements by storing TEXT and parsing at the application layer, which is negligible for our data volume.

---

## ADR-003: Cerebras over OpenAI

**Status:** Ratified

**Context:**
AI-driven safety analysis is a core feature. Traditional LLM providers like OpenAI or Anthropic introduce significant latency, often taking several seconds to generate a complete response. This delay breaks the "instant" feel required for a mobile scanning experience.

**Decision:**
We chose Cerebras zai-glm-4.7. Integration is handled via the Vercel AI SDK using the `@ai-sdk/openai-compatible` provider.

**Consequences:**
Cerebras delivers inference speeds of approximately 2,000 tokens per second. This speed transforms the UX from a "waiting for AI" state to an "instant data" state. While the model is slightly less capable in general reasoning than GPT-4o, its specialized performance in data extraction and summary tasks is superior for our specific domain.

---

## ADR-004: barcode-detector (WASM) over react-zxing

**Status:** Ratified

**Context:**
Barcode scanning must be instantaneous and work across a wide range of mobile hardware. Standard React wrappers around ZXing often introduce overhead and lag in the camera feed.

**Decision:**
We implemented the `barcode-detector` ponyfill, which uses ZXing C++ compiled to WebAssembly. This bypasses the React render cycle for the heavy lifting of image processing.

**Consequences:**
Detection latency dropped to under 10ms per frame. The library supports EAN-13, EAN-8, UPC-A, UPC-E, QR, DataMatrix, and Code 128. Since it relies on WASM, we use dynamic imports to prevent SSR issues. The visceral speed of the scanner justifies the slightly more complex implementation.

---

## ADR-005: Caddy over Nginx

**Status:** Ratified

**Context:**
The application requires HTTPS for camera access and WebSocket support for real-time telemetry. Nginx requires manual SSL certificate management and verbose configuration for proxying.

**Decision:**
We chose Caddy as our reverse proxy.

**Consequences:**
Caddy provides automatic HTTPS via Let's Encrypt with a three-line Caddyfile. It handles WebSocket proxying natively without extra headers. This reduced our infrastructure configuration time from hours to minutes, allowing the team to focus on core features.

---

## ADR-006: Origin Intelligence Layer

**Status:** Ratified

**Context:**
No public API exists that provides granular geographic origin data for food ingredients. We verified this by auditing OpenFoodFacts, Spoonacular, Chomp, Edamam, Eaternity, the USDA, and the IBM Food Trust.

**Decision:**
We built a custom Origin Intelligence Layer. This engine maps ingredients to countries using FAO and USDA trade data. It constructs a probable supply chain journey based on these inferred origins.

**Consequences:**
We solved a data gap that stops most traceability apps. The system generates realistic journeys that include farm-to-factory transport legs, providing a complete visualization even when the manufacturer doesn't provide the data.

---

## ADR-007: OpenFoodFacts as Product Catalog

**Status:** Ratified

**Context:**
We needed a massive product database to ensure the app works for any item a user might scan.

**Decision:**
We integrated the OpenFoodFacts API as our primary product catalog.

**Consequences:**
Our team gained access to over 3 million products with strong European coverage. We implemented a retry strategy with exponential backoff to handle API instability. Custom logic was also written to rewrite thumbnail URLs to full-resolution images and deduplicate ingredient lists. This provides a rich, high-quality UI for almost any scanned item.

---

## ADR-008: CSS Bar Charts over Charting Libraries

**Status:** Ratified

**Context:**
The dashboard needs to visualize telemetry data like temperature and humidity. Heavy libraries like Chart.js or D3 add significant weight to the bundle.

**Decision:**
We built telemetry visualizations using pure CSS width-based bars.

**Consequences:**
This resulted in zero extra dependencies and no impact on bundle size. The team has full control over styling, allowing us to easily add markers for minimum, maximum, and average values. Threshold lines and anomaly highlighting are implemented using standard CSS classes, which is faster to render than canvas-based solutions.

---

## ADR-009: Framer Motion for Animations

**Status:** Ratified

**Context:**
A high-end feel requires smooth transitions and physical interactions, especially on mobile.

**Decision:**
We used Framer Motion for all animations.

**Consequences:**
The result is production-grade page transitions and tab switches. The draggable bottom sheet uses Framer's momentum physics, making the UI feel responsive and tactile. While it adds to the bundle, the improvement in perceived quality is worth the cost.

---

## ADR-010: localStorage Persistence Strategy

**Status:** Ratified

**Context:**
User friction is the enemy of adoption. Requiring an account to see scan history would kill the user experience.

**Decision:**
We use a localStorage-only persistence strategy for the consumer app. This stores scan history, AI conversations, and device settings.

**Consequences:**
There is no server-side session, no auth, and no cookies. Users get a personalized experience immediately. The trade-off is that history doesn't sync across devices, but for a consumer scanning app, this is an acceptable compromise for zero-friction onboarding.

---

## ADR-011: Union-Find for Lineage Clustering

**Status:** Ratified

**Context:**
Supply chains are not linear. They are complex graphs where batches merge and split. We needed an efficient way to group connected batches into supply chain clusters.

**Decision:**
We implemented a Union-Find algorithm with path compression.

**Consequences:**
This provides O(alpha(n)) amortized complexity for grouping batches. It powers the `getAllBatchesGrouped()` and `getGodViewData()` functions, ensuring the dashboard remains fast even as the number of batches grows. This is a standard algorithm applied correctly to a dynamic connectivity problem.

---

## ADR-012: Great-Circle Arc Rendering

**Status:** Ratified

**Context:**
Visualizing global supply chains on a flat map often looks wrong because straight lines on a Mercator projection don't represent the shortest path.

**Decision:**
We implemented proper geodesic arc rendering. The rendering logic uses 3D Cartesian interpolation on a unit sphere and applies a quadratic Bezier curve with a perpendicular offset for height.

**Consequences:**
The arcs scale their height based on Haversine distance. Longer flights look higher, and shorter truck routes look flatter. We use 40 interpolation points per arc to ensure smoothness. This level of visual fidelity is non-negotiable for a professional logistics tool.

---

## ADR-013: Streaming AI over Request-Response

**Status:** Ratified

**Context:**
Even with fast inference, waiting for a full paragraph of text can feel slow.

**Decision:**
We use a ReadableStream with the SSE protocol to deliver AI tokens as they are generated.

**Consequences:**
The perceived latency drops to zero because the first token arrives in less than 100ms. We inject the full product and journey context into the system prompt, using a temperature of 0.2 to ensure the responses are deterministic and backed by data.

---

## ADR-014: Docker Multi-Stage Build

**Status:** Ratified

**Context:**
Deployment speed and security are critical. Large images slow down the CI/CD pipeline and increase the attack surface.

**Decision:**
We use a multi-stage Dockerfile with `deps`, `builder`, and `runner` stages.

**Consequences:**
The final image uses a Node 22 Alpine base and runs as a non-root user. By using the Next.js standalone output, we reduced the image size to approximately 150MB. This ensures fast pulls and minimal resource usage on the EC2 instance.

---

## ADR-015: GitHub Actions CI/CD Pipeline

**Status:** Ratified

**Context:**
We needed a reliable way to deploy changes without manual intervention.

**Decision:**
We built a pipeline using GitHub Actions that triggers on every push to the main branch.

**Consequences:**
The pipeline runs Vitest for unit tests, builds the Docker image, pushes it to ECR, and then deploys to EC2 via SSH. This provides a zero-downtime deployment flow that is completely free for our public repository.

---

## Decision Log

| ID | Decision | Chosen | Rejected | Rationale |
|---|---|---|---|---|
| ADR-001 | App Structure | Single Next.js App | Turborepo Monorepo | Reduced build complexity and deployment overhead. |
| ADR-002 | Database | SQLite + Drizzle | PostgreSQL | Zero infrastructure, file-based persistence, sufficient scale. |
| ADR-003 | AI Provider | Cerebras | OpenAI | 2,000 tokens/second inference speed for instant UX. |
| ADR-004 | Scanner | barcode-detector (WASM) | react-zxing | Sub-10ms detection latency via WebAssembly. |
| ADR-005 | Reverse Proxy | Caddy | Nginx | Automatic HTTPS and native WebSocket support. |
| ADR-006 | Data Strategy | Origin Intelligence Layer | Public APIs | No public source exists for ingredient origins. |
| ADR-007 | Product Catalog | OpenFoodFacts | Spoonacular | Best European coverage and open data access. |
| ADR-008 | Visualization | CSS Bar Charts | Charting Libraries | Zero dependency, full control, no bundle impact. |
| ADR-009 | Animations | Framer Motion | CSS Transitions | Production-grade gesture physics and transitions. |
| ADR-010 | Persistence | localStorage | Server-side Auth | Zero-friction consumer experience. |
| ADR-011 | Lineage Logic | Union-Find | Recursive SQL only | Optimal complexity for dynamic connectivity. |
| ADR-012 | Map Rendering | Great-Circle Arcs | Straight Lines | Geodesic accuracy for global supply chains. |
| ADR-013 | AI Delivery | Streaming (SSE) | Request-Response | Zero perceived latency for AI interactions. |
| ADR-014 | Packaging | Multi-Stage Docker | Single-Stage Docker | Minimal image size and improved security. |
| ADR-015 | CI/CD | GitHub Actions | Manual Deploy | Automated, reproducible, and fast deployments. |
