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
  Verfolge dein Essen vom Feld bis ins Regal.<br/>
  Gebaut am <strong>Baden Hackt 2026</strong>.
</p>

<p align="center">
  <a href="https://foodflighttracker.com"><img src="https://img.shields.io/badge/Live-foodflighttracker.com-9eca45?style=for-the-badge" alt="Live Demo"/></a>
  <a href="https://github.com/Nepomuk5665/food-flight-tracker/tree/main/docs"><img src="https://img.shields.io/badge/Docs-Architektur-003a5d?style=for-the-badge" alt="Docs"/></a>
  <a href="https://www.figma.com/design/4XAMeiD6nuGZ4HwsxqE1gT/Untitled?node-id=0-1&p=f"><img src="https://img.shields.io/badge/Figma-Mockup-F24E1E?style=for-the-badge&logo=figma&logoColor=white" alt="Figma"/></a>
</p>

---

## Hallo Jury!

Project Trace hat zwei Seiten: eine **Consumer App** fürs Handy und ein **QA Dashboard** für den Desktop. Hier zeigen wir euch in 6 kurzen Demos, was die App kann.

> Barcode zum Ausprobieren: **`7613031085385`** — oder scannt den QR-Code weiter unten.

---

### 1 — Das QA Dashboard

Öffnet [foodflighttracker.com/overview](https://foodflighttracker.com/overview) auf dem Desktop. Der Globus zeigt alle Lieferketten in Echtzeit — klickt auf einen Alert und die Karte fliegt hin.

<p align="center">
  <img src="docs/demos/1-dashboard.gif" alt="Dashboard Demo" width="700" />
</p>

---

### 2 — Produkt scannen & Reise verfolgen

Öffnet [foodflighttracker.com/scan](https://foodflighttracker.com/scan) auf dem Handy (oder QR-Code scannen). Barcode `7613031085385` eingeben — ihr seht die komplette Reise der Schokolade von der Elfenbeinküste bis München.

<p align="center">
  <img src="public/qr-scan.png" alt="QR-Code" width="140" />
</p>

<p align="center">
  <img src="docs/demos/2-scan.gif" alt="Scan Demo" width="350" />
</p>

---

### 3 — Problem melden

Schokolade schmeckt komisch? Über den roten Button unten rechts könnt ihr direkt ein Problem melden.

<p align="center">
  <img src="docs/demos/3-report.gif" alt="Report Demo" width="350" />
</p>

---

### 4 — Meldung im Dashboard

Die Meldung taucht sofort im QA Dashboard unter Incidents auf.

<p align="center">
  <img src="docs/demos/4-report-received.gif" alt="Report erhalten" width="700" />
</p>

---

### 5 — Rückruf auslösen

Das QA-Team kann direkt aus der Meldung heraus einen Rückruf triggern.

<p align="center">
  <img src="docs/demos/5-recall-triggered.gif" alt="Rückruf ausgelöst" width="700" />
</p>

---

### 6 — Rückruf beim Konsumenten

Der Konsument sieht den Rückruf sofort in der App unter Alerts.

<p align="center">
  <img src="docs/demos/6-product-recalled.gif" alt="Produkt zurückgerufen" width="350" />
</p>

---

## Demo-Daten

| Produkt | Barcode | Charge | Besonderheit |
|---------|---------|--------|-------------|
| Chocolat au lait (Nestlé) | `7613031085385` | `CH2603-AP7` | 8 Stationen, 3 Länder, Hitze-Anomalie |
| Allgäuer Bio-Bergkäse | `4099887766550` | `K-MAKE-001` | 2 Höfe -> 1 Charge -> 2 Produkte |

Jeder andere echte Barcode wird über [OpenFoodFacts](https://world.openfoodfacts.org/) geladen (3 Mio.+ Produkte).

---

## Tech Stack

| Was | Womit |
|-----|-------|
| Framework | Next.js 16, TypeScript, Tailwind v4 |
| Datenbank | SQLite + Drizzle ORM |
| KI | Cerebras (~2.000 Tokens/Sek.) via Vercel AI SDK |
| Scanner | ZXing C++ via WebAssembly |
| Karten | Mapbox GL JS |
| Produktdaten | OpenFoodFacts API |
| Deployment | AWS EC2, Docker, Caddy (Auto-HTTPS) |

## Architektur

<p align="center">
  <img src="docs/erd/architecture.png" alt="Architektur" width="500" />
</p>

Zwei Route Groups, eine App: `(consumer)/` fürs Handy und `(dashboard)/` für den Desktop. Herkunftsdaten werden über FAO/USDA-Handelsanteile aus den Zutaten abgeleitet.

## Lokal starten

```bash
git clone https://github.com/Nepomuk5665/food-flight-tracker.git
cd food-flight-tracker
pnpm install
cp .env.example .env.local   # CEREBRAS_API_KEY + NEXT_PUBLIC_MAPBOX_TOKEN eintragen
pnpm db:push && pnpm db:seed
pnpm dev
```

---

<p align="center">
  <strong>Baden Hackt 2026</strong> · Powered by Autexis
</p>
