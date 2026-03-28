# API Reference

This document provides a comprehensive reference for the Food Flight Tracker API. The API powers both the consumer scanning application and the quality assurance dashboard.

## Base URL

- **Production:** `https://foodflighttracker.com/api`
- **Development:** `http://localhost:3000/api`

## General Information

### Content-Type
All requests and responses use `application/json` except for the streaming chat endpoint, which uses `text/event-stream`.

### Error Format
Errors return an appropriate HTTP status code and a JSON body with an error message.

```typescript
interface ErrorResponse {
  error: string;
}
```

### Response Envelope
Success responses return the requested data directly as a JSON object or array.

---

## Endpoints

### Health Check
Check the status of the API container.

**GET /health**

- **Response Schema:**
```typescript
interface HealthResponse {
  status: "ok";
  timestamp: string; // ISO 8601 format
}
```

- **Example Request:**
```bash
curl https://foodflighttracker.com/api/health
```

- **Example Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-28T14:30:00.000Z"
}
```

---

### Product Resolution
Resolve a product by its barcode using a three-tier resolution strategy. The API checks the internal database first, then falls back to OpenFoodFacts.

**GET /product/:barcode**

- **Parameters:**
  - `barcode` (path): The EAN-13 barcode of the product.

- **Response Schema:**
```typescript
interface ProductResponse {
  product: {
    barcode: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string;
    source: "internal" | "open_food_facts" | "merged";
    nutriScore: string;
    ecoScore: string;
    ingredients: string[];
    allergens: string[];
    offData?: any; // Raw OpenFoodFacts data if applicable
  };
  batch?: {
    lotCode: string;
    status: string;
    riskScore: number;
    stages: any[];
  };
  origins: string[]; // Inferred from Origin Intelligence Layer
}
```

- **Error Responses:**
  - `404 Not Found`: Returned if the product is not found in any source. Code: `PRODUCT_NOT_FOUND`.

- **Example Request:**
```bash
curl https://foodflighttracker.com/api/product/4012345678901
```

---

### AI Chat (Streaming)
Interact with the AI assistant for product safety analysis and supply chain inquiries. This endpoint uses the Cerebras zai-glm-4.7 model.

**POST /chat**

- **Request Body:**
```typescript
interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  barcode: string;
  systemContext?: string;
}
```

- **Response:**
A `ReadableStream` using the Server-Sent Events (SSE) protocol. Each line is prefixed with `data: ` and contains a JSON object.

- **Model Configuration:**
  - Temperature: 0.2
  - Max Tokens: 1024
  - Response Style: Maximum 80 words, 3 sentences, confident, and data-backed.

- **Example Request:**
```bash
curl -X POST https://foodflighttracker.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "4012345678901",
    "messages": [{"role": "user", "content": "Is this chocolate safe?"}]
  }'
```

---

### Batch Details
Retrieve detailed information about a specific production batch, including its journey and lineage.

**GET /batch/:lotCode**

- **Parameters:**
  - `lotCode` (path): The unique lot code for the batch.
  - `include` (query): Set to `lineage-stages` to include the full lineage tree.

- **Response Schema:**
```typescript
interface BatchResponse {
  batch: any;
  product: any;
  journey: {
    stages: {
      name: string;
      location: string;
      timestamp: string;
      telemetry: {
        avgTemp: number;
        minTemp: number;
        maxTemp: number;
        avgHumidity: number;
      };
      anomalies: any[];
    }[];
  };
  lineage: {
    parents: { lotCode: string; relationship: string; ratio: number }[];
    children: { lotCode: string; relationship: string; ratio: number }[];
  };
  lineageTree?: any; // Included if requested
  recall?: {
    active: boolean;
    reason?: string;
    severity?: string;
  };
}
```

- **Example Request:**
```bash
curl https://foodflighttracker.com/api/batch/L6029479302?include=lineage-stages
```

---

### Dashboard Overview
Fetch high-level metrics and activity for the QA dashboard. This endpoint is designed for 30-second polling.

**GET /dashboard/overview**

- **Response Schema:**
```typescript
interface OverviewResponse {
  metrics: {
    activeBatches: number;
    openIncidents: number;
    avgRiskScore: number;
    recalledBatches: number;
  };
  batches: any[]; // Top 30-50 batches by risk
  lineageEdges: any[];
  alerts: any[]; // Top 50 alerts sorted by severity
  reports: any[]; // Recent 10 consumer reports
}
```

- **Example Request:**
```bash
curl https://foodflighttracker.com/api/dashboard/overview
```

---

### Supply Chain Batches
Retrieve batches grouped by supply chain using union-find clustering.

**GET /dashboard/batches**

- **Response Schema:**
```typescript
interface SupplyChainResponse {
  chains: {
    productName: string;
    lotCount: number;
    maxRisk: number;
    totalUnits: number;
    latestUpdate: string;
    status: string;
    lots: any[];
  }[];
}
```

- **Example Request:**
```bash
curl https://foodflighttracker.com/api/dashboard/batches
```

---

### Recall Management
Manage product recalls across the supply chain.

**GET /recalls**
Returns all active recalls and aggregated consumer reports.

**POST /recalls**
Create a new recall. This updates the status of affected batches to `recalled`.

- **Request Body:**
```typescript
interface CreateRecallRequest {
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  triggeredBy: string;
  affectedRegions: string[];
  lotCodes: string[];
}
```

- **Response Schema:**
```typescript
interface CreateRecallResponse {
  recallId: string;
  estimatedUnits: number;
}
```

**PATCH /recalls**
End an active recall. This reverts batch statuses to `active`.

- **Request Body:**
```typescript
interface EndRecallRequest {
  recallId: string;
  action: "end";
}
```

---

### Consumer Reports
Submit a report regarding a specific product batch.

**POST /reports**

- **Request Body:**
```typescript
interface ReportRequest {
  lotCode: string;
  deviceId: string;
  category: "taste_quality" | "appearance" | "packaging" | "foreign_object" | "allergic_reaction" | "other";
  description?: string;
  photoUrl?: string;
}
```

- **Rate Limiting:**
Limited to 5 reports per device per hour. Exceeding this limit returns a `429 Too Many Requests` status.

- **Response Schema:**
```typescript
interface ReportResponse {
  reportId: string;
  status: string;
  message: string;
}
```

---

### Journey Generation
Generate or retrieve a product journey based on its barcode.

**POST /journey/generate**

- **Request Body:**
```typescript
interface JourneyRequest {
  barcode: string;
}
```

- **Response Schema:**
```typescript
interface JourneyResponse {
  generated: boolean;
  batch?: any;
  journey: {
    name: string;
    location: string;
    timestamp: string;
  }[];
}
```
