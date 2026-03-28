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
  <em>Verfolge dein Essen vom Feld bis ins Regal.</em><br/>
  Echtzeit-Lieferketten-Transparenz, KI-gestuetzte Sicherheitsanalyse und Barcode-Scanning.<br/>
  Gebaut fuer den <strong>Baden Hackt 2026</strong> Hackathon.
</p>

<p align="center">
  <a href="https://foodflighttracker.com"><img src="https://img.shields.io/badge/Live-foodflighttracker.com-9eca45?style=for-the-badge" alt="Live Demo"/></a>
  <a href="https://github.com/Nepomuk5665/food-flight-tracker/tree/main/docs"><img src="https://img.shields.io/badge/Docs-Architektur-003a5d?style=for-the-badge" alt="Docs"/></a>
  <a href="https://www.figma.com/design/4XAMeiD6nuGZ4HwsxqE1gT/Untitled?node-id=0-1&p=f"><img src="https://img.shields.io/badge/Figma-Mockup-F24E1E?style=for-the-badge&logo=figma&logoColor=white" alt="Figma"/></a>
</p>

---

## Hallo, liebe Jury!

Schoen, dass ihr euch **Project Trace** anschaut! Wir haben das in 24 Stunden gebaut und sind ziemlich stolz drauf. Dieses README ist eure persoenliche Tour — Schritt fuer Schritt, von einfach bis beeindruckend.

**Gesamtdauer: ca. 12 Minuten** (oder ca. 9 Min., wenn's schnell gehen muss).

Die App hat zwei Seiten:

| Seite | Fuer wen? | Oeffnen auf | URL |
|-------|-----------|-------------|-----|
| **Consumer App** | Endverbraucher, die wissen wollen, woher ihr Essen kommt | Handy (oder Mobile-Emulation) | [foodflighttracker.com](https://foodflighttracker.com) |
| **QA Dashboard** | Lebensmittelsicherheits-Teams, die Lieferketten ueberwachen | Desktop-Browser | [foodflighttracker.com/overview](https://foodflighttracker.com/overview) |

<p align="center">
  <img src="docs/screenshots/consumer-product.jpeg" alt="Consumer App — Produktseite" width="280" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="docs/screenshots/dashboard-live.png" alt="QA Dashboard — God View" width="480" />
</p>

Bereit? Los geht's!

---

## Die gefuehrte Tour

Die Tour baut sich schrittweise auf — zuerst der beeindruckende Ueberblick, dann die Consumer-Story, danach die QA-Tiefenanalyse, und zum Schluss der komplette Rueckruf-Workflow. Jedes Szenario baut auf dem vorherigen auf.

> **Wenig Zeit?** Macht Szenario 1, 2 und 4 (ohne 3) fuer eine 9-Minuten-Version.

---

### Szenario 1: God View — Die Kommandozentrale
**ca. 3 Min. | Desktop | Geringes Risiko (keine externen Abhaengigkeiten)**

*Ihr seid QA-Direktor. Ihr oeffnet euer Morgen-Dashboard. Was passiert gerade in euren Lieferketten?*

<table>
<tr><th>Schritt</th><th>Was tun</th><th>Was ihr seht</th></tr>
<tr>
  <td><strong>1</strong></td>
  <td>Oeffnet <a href="https://foodflighttracker.com/overview">foodflighttracker.com/overview</a> auf dem Desktop</td>
  <td>Ein dunkler Globus laedt mit Atmosphaeren-Effekt. Lieferketten-Boegen zeichnen sich ueber Kontinente, gruene Partikel fliessen entlang der Routen. Lasst es ein paar Sekunden wirken.</td>
</tr>
<tr>
  <td><strong>2</strong></td>
  <td>Schaut auf das Metriken-Panel und den Alert-Feed</td>
  <td>Batch-Anzahl, Anomalien, Risiko-Verteilung. Der Alert-Feed zeigt Badges nach Schweregrad — achtet auf den kritischen.</td>
</tr>
<tr>
  <td><strong>3</strong></td>
  <td>Klickt auf den <strong>kritischen Alert</strong> fuer Batch <code>CH2603-AP7</code></td>
  <td>Kinematische FlyTo-Animation zoomt zur Schweiz/Muenchen (72-Grad-Neigung, 2 Sek.). Ein roter Ping pulsiert an der Anomalie. Das Batch-Detail-Panel faehrt rein: Chargennummer <code>CH2603-AP7</code>, Risiko-Gauge bei 62.</td>
</tr>
<tr>
  <td><strong>4</strong></td>
  <td>Klickt auf den Kaese-Cluster bei Kempten</td>
  <td>Der Cluster klappt auf und zeigt Kaese-Batches. Lineage-Kanten zeichnen sich zwischen ihnen (Zusammenfuehrung/Aufteilung).</td>
</tr>
</table>

> *"Jede Charge, jede Route, jede Anomalie — in Echtzeit."*

---

### Szenario 2: Consumer-Scan — Die Schokoladen-Reise
**ca. 4 Min. | Handy (oder Mobile-Emulation) | Mittleres Risiko (braucht Mapbox + Cerebras)**

*Ein Konsument kauft eine Tafel Schokolade bei REWE in Muenchen. Sie schmeckt komisch — bitter und kreidig. Er will wissen, warum. Verfolgen wir die Reise.*

**Setup:** Nutzt euer Handy, oder oeffnet Chrome DevTools und wechselt auf Mobile-Emulation (iPhone 14 Pro). Die App erkennt mobile User Agents.

#### Schritt 1: Zum Scanner

Scannt diesen QR-Code mit eurem Handy, um direkt zum Scanner zu kommen:

<p align="center">
  <img src="public/qr-scan.png" alt="QR-Code zu foodflighttracker.com/scan" width="180" />
  <br/>
  <em>Oeffnet foodflighttracker.com/scan</em>
</p>

Oder oeffnet einfach [foodflighttracker.com/scan](https://foodflighttracker.com/scan) direkt.

<p align="center">
  <img src="docs/screenshots/mobile-scan.png" alt="Scanner-Bildschirm" width="220" />
</p>

#### Schritt 2: Schokoladen-Barcode eingeben

Tippt unten auf **"Enter manually"**. Ein Drawer faehrt hoch mit einem Eingabefeld.

Gebt diesen Barcode ein und tippt auf Go:

```
7613031085385
```

> Das ist unsere Demo-Schokolade: **Chocolat au lait** von Nestle, mit einer kompletten 8-stufigen Lieferkette in der Datenbank. Der Star der Show.

#### Schritt 3: Produktseite erkunden

Ihr landet auf dem Info-Tab. Schaut euch um:

- **Produkt**: "Chocolat au lait" von Nestle
- **Scores**: Nutri-Score D, Eco-Score C
- **Allergene**: Milch, Soja (rot hervorgehoben)
- **Chargennummer**: `CH2603-AP7` — Risiko-Score 62 (orange)
- Ein **roter Melde-Button** pulsiert unten rechts

#### Schritt 4: Der Karten-Tab (das Highlight)

Tippt auf den **Map**-Tab. Genau hinschauen:

1. Eine gestrichelte Geisterlinie erscheint und zeigt die geplante Route
2. Dann zeichnet sich ueber ca. 4 Sekunden eine animierte, gruen leuchtende Linie von der **Elfenbeinkueste** ueber den Atlantik nach **Hamburg**, weiter in die **Schweiz**, dann nach **Muenchen**
3. Acht Stationsmarker erscheinen entlang der Route (Ernte, Schiff, Zug, Fabrik, Lager, LKW, Laden)
4. Grosskreis-Boegen kruemmen sich elegant ueber den Ozean

> *Von einer Kakao-Kooperative in der Elfenbeinkueste bis ins Regal in Muenchen — visualisiert.*

#### Schritt 5: Die Anomalie finden

Tippt auf den **Lager-Marker** (Station 6, in der Schweiz). Ein Popup erscheint:

> "Distribution Warehouse — Nestle DC Suhr"
> **CRITICAL** — 32.6 C Spitzenwert, Schwellenwert 20 C, 285 Min.

Das ist ein Temperaturausreisser. Die Schokolade lag fast 5 Stunden in einem zu warmen Lager. Darum schmeckt sie komisch.

#### Schritt 6: Timeline-Ansicht

Tippt auf den **Timeline-Toggle** (Listen-Icon). Ein Drawer zeigt alle 8 Stationen chronologisch. Station 6 hat einen roten Anomalie-Indikator.

#### Schritt 7: Die KI fragen

Tippt auf den **Chat**-Tab. Die KI laedt automatisch mit Kontext zu dieser spezifischen Charge. Sie streamt eine Antwort ueber den Temperaturausreisser, das Fettreif-Risiko und den Risiko-Score von 62.

Tippt auf den Vorschlag-Chip: **"Is this safe to eat?"**

Die KI erklaert: Fettreif (der weissliche, kreidige Belag) ist ein Qualitaetsdefekt durch geschmolzene und wieder erstarrte Kakaobutter — kein Sicherheitsrisiko. Die Schokolade sieht unschoen aus, ist aber unbedenklich.

#### Schritt 8: Bericht einreichen

Tippt auf den **roten Melde-Button** unten rechts. Ein Melde-Sheet faehrt hoch. Waehlt **"Bad Taste"**, gebt eine kurze Beschwerde ein und sendet ab. Der Bericht wird mit KI-Kontext gespeichert.

> *"Ein Scan — von einer Kooperative in der Elfenbeinkueste bis ins Regal in Muenchen. Die KI verbindet 'die schmeckt komisch' mit einem Kuehlungsausfall im Lager vor 6 Wochen."*

> **Falls Cerebras nicht erreichbar ist:** Ueberspring Schritte 7-8. Karte, Telemetrie und Scanner funktionieren auch ohne KI.

---

### Szenario 3: Batch-Forensik — QA-Tiefenanalyse
**ca. 3 Min. | Desktop | Mittleres Risiko (braucht Mapbox + Cerebras)**

*Gleiche Charge, andere Perspektive. Jetzt seid ihr der QA-Analyst. Zeit fuer Telemetrie, Lineage und eine KI-Empfehlung.*

<table>
<tr><th>Schritt</th><th>Was tun</th><th>Was ihr seht</th></tr>
<tr>
  <td><strong>1</strong></td>
  <td>Oeffnet <a href="https://foodflighttracker.com/batch/CH2603-AP7">foodflighttracker.com/batch/CH2603-AP7</a></td>
  <td>Batch-Header: "Chocolat au lait", ACTIVE-Badge, Risiko-Gauge animiert auf 62 (orange).</td>
</tr>
<tr>
  <td><strong>2</strong></td>
  <td>Schaut auf den <strong>Journey Map</strong>-Tab (Standard)</td>
  <td>Gleiche Mapbox-Reise, aber im dunklen Dashboard-Theme. Stationsmarker + animierte Route.</td>
</tr>
<tr>
  <td><strong>3</strong></td>
  <td>Klickt auf den <strong>Telemetry</strong>-Tab</td>
  <td>Temperatur-Balken pro Station. Die Lager-Station hat ein rotes ANOMALY-Badge — der Balken reicht von 16 C bis 32.6 C und durchbricht klar die rote Schwellenlinie bei 20 C.</td>
</tr>
<tr>
  <td><strong>4</strong></td>
  <td>Navigiert zu <a href="https://foodflighttracker.com/batch/K-MAKE-001">foodflighttracker.com/batch/K-MAKE-001</a></td>
  <td>Anderes Produkt: "Allgaeuer Bio-Bergkaese", Risiko 12 (gruen). Saubere Charge.</td>
</tr>
<tr>
  <td><strong>5</strong></td>
  <td>Klickt auf den <strong>Lineage</strong>-Tab</td>
  <td>Flussdiagramm: Zwei Hoefe (K-FARM-H 57% + K-FARM-S 43%) fliessen in K-MAKE-001 zusammen, das sich in K-SLICE-001 (80%) und K-WHEEL-001 (20%) aufteilt. Klickbare Boxen.</td>
</tr>
<tr>
  <td><strong>6</strong></td>
  <td>Zurueck zu <code>CH2603-AP7</code>, klickt auf <strong>AI Analysis</strong>-Tab</td>
  <td>Auto-Prompt: "Analyze this batch." Die KI streamt eine Risikobewertung mit Details zum Temperaturausreisser, Korrelation zum Consumer-Report und einer Rueckruf-Empfehlung.</td>
</tr>
<tr>
  <td><strong>7</strong></td>
  <td>Tippt: <em>"Should we issue a recall?"</em></td>
  <td>Differenzierte Antwort: Quality Hold vs. voller Rueckruf, Fettreif ist kein Sicherheitsrisiko — aber der Imageschaden koennte ein Handeln rechtfertigen.</td>
</tr>
</table>

> *"Von Telemetrie ueber Lineage bis zur KI-gestuetzten Entscheidungsfindung — das QA-Team hat alles in einer Ansicht."*

---

### Szenario 4: Rueckruf-Workflow — Den Kreis schliessen
**ca. 2 Min. | Desktop + Handy | Geringes Risiko (alles lokal, keine externen APIs)**

*Der QA-Direktor entscheidet sich fuer einen Rueckruf. Wie schnell wird der Konsument benachrichtigt?*

<table>
<tr><th>Schritt</th><th>Was tun</th><th>Was ihr seht</th></tr>
<tr>
  <td><strong>1</strong></td>
  <td>Oeffnet <a href="https://foodflighttracker.com/incidents">foodflighttracker.com/incidents</a> auf dem Desktop</td>
  <td>Consumer-Reports-Bereich zeigt den CH2603-AP7-Bericht (taste_quality). Es gibt einen "Trigger Recall"-Button.</td>
</tr>
<tr>
  <td><strong>2</strong></td>
  <td>Klickt auf <strong>"Trigger Recall"</strong> in der CH2603-AP7-Zeile</td>
  <td>Ein Formular oeffnet sich. Chargennummer ist vorausgefuellt.</td>
</tr>
<tr>
  <td><strong>3</strong></td>
  <td>Grund eingeben: <em>"Temperature excursion caused fat bloom"</em>, Schweregrad auf High setzen, absenden</td>
  <td>Der Rueckruf erscheint unter Active Recalls: roter Rand, HIGH-Badge, Begruendung, betroffene Charge.</td>
</tr>
<tr>
  <td><strong>4</strong></td>
  <td>Wechselt aufs Handy: <a href="https://foodflighttracker.com/alerts">foodflighttracker.com/alerts</a></td>
  <td>Eine Alert-Karte erscheint mit Rueckruf-Grund, Chargennummer und Schweregrad-Badge. Der Konsument wird sofort benachrichtigt.</td>
</tr>
</table>

<p align="center">
  <img src="docs/screenshots/mobile-alerts.png" alt="Consumer-Alert-Bildschirm" width="220" />
</p>

> *"Vom Consumer-Report ueber den Rueckruf bis zur Benachrichtigung — der Kreis ist geschlossen."*

---

## Seed-Daten Spickzettel

Unsere Datenbank ist mit zwei kompletten Lieferketten vorbefuellt:

| Produkt | Barcode | Chargennummer | Stationen | Was ist besonders? |
|---------|---------|---------------|-----------|-------------------|
| **Chocolat au lait** (Nestle) | `7613031085385` | `CH2603-AP7` | 8 Stationen in 3 Laendern | Lager-Hitze-Anomalie, Risiko 62, Consumer-Report |
| **Allgaeuer Bio-Bergkaese** (AlpenMilch) | `4099887766550` | `K-MAKE-001` | 3 Stationen + Lineage | 2 Hoefe vereinen sich zu 1 Charge, dann Aufteilung in 2 Produkte |

Ihr koennt auch **jeden echten Barcode** scannen — die App greift auf [OpenFoodFacts](https://world.openfoodfacts.org/) (3 Mio.+ Produkte) zurueck, allerdings ohne Lieferketten-Daten.

---

## Tech Stack

| Schicht | Technologie |
|---------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Sprache | TypeScript |
| Styling | Tailwind CSS v4 + Autexis Corporate Design |
| Datenbank | SQLite + Drizzle ORM (WAL-Modus) |
| KI | Cerebras (~2.000 Tokens/Sek.) via Vercel AI SDK |
| Scanner | barcode-detector (ZXing C++ via WebAssembly) |
| Karten | Mapbox GL JS + react-map-gl |
| Produktdaten | OpenFoodFacts API |
| Deployment | AWS EC2 + Docker + Caddy (Auto-HTTPS) |
| CI/CD | GitHub Actions -> ECR -> SSH Deploy |

---

## Architektur

<p align="center">
  <img src="docs/erd/architecture.png" alt="Architektur-Diagramm" width="500" />
</p>

Zwei Route Groups bedienen zwei Zielgruppen aus einer einzigen Next.js-App:

- **`(consumer)/`** — Mobile-first PWA. Bottom-Tab-Navigation: Scan, Products, Alerts. Max-Breite 480px.
- **`(dashboard)/`** — Desktop-QA-Dashboard. Sidebar-Navigation: Overview, Batches, Incidents.

Der Datenfluss: Barcode-Scan -> OpenFoodFacts API -> lokale SQLite-DB -> Journey-Map mit vordefinierten Lieferketten-Telemetriedaten.

### Origin Intelligence

Keine oeffentliche API liefert geografische Herkunftsdaten pro Zutat. Unsere **Origin Intelligence Schicht** (`src/lib/origin/`) leitet wahrscheinliche Herkunftslaender aus Zutatenlisten ab, basierend auf FAO/USDA-Welthandelsanteilen (z.B. Kakao -> 38% Elfenbeinkueste, 17% Ghana). Daraus konstruiert sie synthetische Reiserouten mit geocodierten Wegpunkten: Ernte -> Transport -> Verarbeitung -> Lagerung -> Einzelhandel.

### KI-Integration

Wir nutzen **Cerebras**, weil niemand auf KI warten will. Mit ca. 2.000 Tokens pro Sekunde streamen die Antworten sofort — keine Spinner, keine "Wird generiert..."-Bildschirme. Die KI ist kontextbewusst: Sie kennt die Zutaten, Scores, Lieferketten-Stationen und Anomalien jeder spezifischen Charge.

---

## Lokale Entwicklung

```bash
# Klonen
git clone https://github.com/Nepomuk5665/food-flight-tracker.git
cd food-flight-tracker

# Installieren
pnpm install

# Umgebungsvariablen
cp .env.example .env.local
# Keys in .env.local eintragen:
#   CEREBRAS_API_KEY=csk-...
#   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# Datenbank
pnpm db:push    # Tabellen erstellen
pnpm db:seed    # Demo-Daten laden (Schokolade + Kaese Lieferketten)

# Starten
pnpm dev        # http://localhost:3000
```

---

## Infrastruktur

<p align="center">
  <img src="https://github.com/user-attachments/assets/9976e15c-b03a-4125-a99f-d9ad9e802a6c" alt="Infrastruktur-Diagramm" width="700" />
</p>

One-Push-Deployment: GitHub Actions -> ECR -> EC2 mit Auto-HTTPS ueber Caddy + Let's Encrypt. SQLite persistiert auf einem Docker Volume.

---

<p align="center">
  <strong>Mit Herzblut gebaut am Baden Hackt 2026</strong><br/>
  Powered by Autexis
</p>
