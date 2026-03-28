# God View Dashboard — Handoff

## What Was Built

### God View Overview Page (`/overview`)

A full-screen dark-themed command center showing all active supply chains on a global Mapbox globe. Replaces the previous placeholder page.

**Features implemented:**
- Dark globe map with `dark-v11` style, globe projection, starfield fog
- All 10 seeded batches rendered with animated route lines (staggered 300ms per batch, 4s duration each)
- Native Mapbox GL clustering — dots color-coded green/yellow/red by risk level
- Click cluster to zoom in, click individual dot to open slide-in detail panel
- Floating overlay panels (left side): metrics cards (2x2), alerts list (sorted by severity), consumer reports feed
- Slide-in batch detail panel (right side, framer-motion): product info, risk badge, stats grid, mini stage timeline, "View Full Detail" link
- Layer toggle controls (bottom-right): Routes on/off, Clusters on/off
- Fly-to animation when clicking an alert
- 30-second polling for live data updates

### Dark Theme Dashboard Layout

Full dark overhaul of the dashboard shell — header, sidebar, nav links all dark with green `#9eca45` accents. `DesktopGate` wrapper preserved from remote.

### Data Layer

- **Types**: `GodViewBatch`, `GodViewBatchStage`, `GodViewAlert`, `GodViewMetrics`, `GodViewReport`, `GodViewData` in `src/lib/types.ts`
- **Query**: `getGodViewData()` in `src/lib/db/queries.ts` — fetches all batches with stages, anomalies, consumer reports, and aggregated metrics
- **API**: `GET /api/dashboard/overview` returning full `GodViewData` envelope
- **Hook**: `useGodViewData()` in `src/hooks/use-god-view-data.ts` with polling

### Bug Fix

- Fixed `Map` constructor shadowing in `JourneyMap.tsx` (react-map-gl `Map` import shadows `globalThis.Map`)

## Files Created (8)

| File | Purpose |
|------|---------|
| `src/app/api/dashboard/overview/route.ts` | API endpoint |
| `src/hooks/use-god-view-data.ts` | Client hook with 30s polling |
| `src/components/god-view/GodViewMap.tsx` | Main map — clustering + animated routes |
| `src/components/god-view/god-view-map-layers.ts` | Mapbox layer style definitions |
| `src/components/god-view/GodViewOverlay.tsx` | Metrics + alerts + reports panels |
| `src/components/god-view/BatchDetailPanel.tsx` | Slide-in detail panel |
| `src/components/god-view/LayerToggles.tsx` | Route/cluster toggle controls |
| `src/components/dashboard/DashboardNav.tsx` | Dark nav with active link state |

## Files Modified (4)

| File | Changes |
|------|---------|
| `src/lib/types.ts` | Added GodView* interfaces + `RiskLevel` type |
| `src/lib/db/queries.ts` | Added `getGodViewData()` (~125 lines) |
| `src/app/(dashboard)/layout.tsx` | Dark theme + DashboardNav + DesktopGate |
| `src/app/(dashboard)/overview/page.tsx` | Complete rewrite as God View orchestrator |

## Commits

- `74bd86f` — feat: God View admin dashboard with global supply chain map
- `6d31563` — fix: resolve merge conflicts, keep God View implementation
- `5cd7b60` — fix: merge remote DesktopGate into dark-themed dashboard layout

## What's Left (from PRD Section 5.2)

### Dashboard Screens Not Yet Built

| Screen | PRD Section | Status |
|--------|-------------|--------|
| **Batch Detail** (`/batch/[lotCode]`) | 5.2.1 Screen 2 | Placeholder — needs journey map with telemetry overlay, timeline, lineage graph, consumer reports tab, AI analysis tab |
| **Incident Response** (`/incidents`) | 5.2.1 Screen 3 | Placeholder — needs red banner, AI recommendation panel, action buttons (Accept & Recall, Targeted Recall, Monitor, Dismiss) |
| **Recall Management** | 5.2.1 Screen 4 | Not started — needs recall list, per-recall details, end-recall functionality |
| **AI Assistant Side Panel** | 5.2.1 Screen 5 | Not started — persistent right-side chat panel with full DB context via function calling |

### God View Enhancements

- **Anomaly heatmap layer** — PRD mentions toggle-able temperature heatmap + anomaly zones (layer toggle UI exists, just needs the heatmap data/layer)
- **Pulse animation on critical dots** — layer definition exists (`unclusteredPulseLayer`) but CSS pulse animation not wired
- **Real-time WebSocket** — PRD calls for new anomaly dots to pulse/animate when they appear via WebSocket (currently uses 30s polling)
- **Search bar** — PRD layout shows "Search [lot code]" in the header
- **Batch count in header alerts badge** — PRD shows `Alerts(3)` in top bar

### Consumer PWA Gaps (from PRD Section 5.1)

- Consumer report submission UI
- Recall alert overlay (WebSocket-driven)
- Device fingerprinting
- `/api/journey/generate` endpoint (referenced but missing)

### Backend Gaps

- Auth/session management (hardcoded for hackathon is fine per PRD)
- WebSocket infrastructure for real-time updates
- AI risk scoring endpoint (`/api/ai/risk/:lotCode`)
- Telemetry simulator for demo data
