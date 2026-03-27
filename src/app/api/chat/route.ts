import { streamText } from "ai";
import { getChatModel } from "@/lib/ai/cerebras";
import { getBatchJourney, getProductByBarcode, getProductById, getActiveLotForProduct } from "@/lib/db/queries";

function buildSystemPrompt(barcode?: string, lotCode?: string): string {
  let productContext = "";
  let journeyContext = "";
  let anomalyContext = "";
  let telemetryContext = "";

  const resolvedLotCode = lotCode ?? (() => {
    if (!barcode) return null;
    const p = getProductByBarcode(barcode);
    if (!p) return null;
    return getActiveLotForProduct(p.id)?.lotCode ?? null;
  })();

  if (barcode) {
    const product = getProductByBarcode(barcode);
    if (product) {
      productContext = `
PRODUCT DATA:
- Name: ${product.name}
- Brand: ${product.brand}
- Barcode: ${product.barcode}
- Category: ${product.category}
- Nutri-Score: ${product.nutriScore ?? "N/A"}
- Eco-Score: ${product.ecoScore ?? "N/A"}
- Ingredients: ${product.ingredients ?? "N/A"}
- Allergens: ${product.allergens ?? "None listed"}
- Source: ${product.source}`;
    }
  }

  if (resolvedLotCode) {
    const journey = getBatchJourney(resolvedLotCode);
    if (journey) {
      const product = getProductById(journey.batch.productId);
      if (product && !productContext) {
        productContext = `
PRODUCT DATA:
- Name: ${product.name}
- Brand: ${product.brand}
- Barcode: ${product.barcode}
- Nutri-Score: ${product.nutriScore ?? "N/A"}
- Eco-Score: ${product.ecoScore ?? "N/A"}
- Ingredients: ${product.ingredients ?? "N/A"}
- Allergens: ${product.allergens ?? "None listed"}`;
      }

      journeyContext = `
BATCH DATA:
- Lot Code: ${journey.batch.lotCode}
- Status: ${journey.batch.status}
- Risk Score: ${journey.batch.riskScore}/100
- Unit Count: ${journey.batch.unitCount ?? "unknown"}

SUPPLY CHAIN (${journey.stages.length} stages):
${journey.stages.map((s) =>
  `${s.sequenceOrder}. [${s.stageType}] ${s.name} — ${s.locationName} (${s.startedAt}${s.completedAt ? ` → ${s.completedAt}` : ", ongoing"})${s.operator ? ` by ${s.operator}` : ""}`
).join("\n")}`;

      const allAnomalies = journey.stages.flatMap((s) => s.anomalies);
      if (allAnomalies.length > 0) {
        anomalyContext = `
ANOMALIES DETECTED (${allAnomalies.length}):
${allAnomalies.map((a) =>
  `- [${a.severity.toUpperCase()}] ${a.anomalyType}: ${a.description} (threshold: ${a.thresholdValue ?? "N/A"}, actual: ${a.actualValue ?? "N/A"}, duration: ${a.durationMinutes ?? "N/A"}min, risk impact: +${a.riskScoreImpact})`
).join("\n")}`;
      }

      const allTelemetry = journey.stages.flatMap((s) =>
        s.telemetry.map((t) => ({ stage: s.name, ...t }))
      );
      if (allTelemetry.length > 0) {
        const temps = allTelemetry.filter((t) => t.readingType === "temperature");
        const humids = allTelemetry.filter((t) => t.readingType === "humidity");
        telemetryContext = `
TELEMETRY SUMMARY:
- Temperature readings: ${temps.length} (avg: ${temps.length ? (temps.reduce((s, t) => s + t.value, 0) / temps.length).toFixed(1) : "N/A"}°C, max: ${temps.length ? Math.max(...temps.map((t) => t.value)).toFixed(1) : "N/A"}°C, min: ${temps.length ? Math.min(...temps.map((t) => t.value)).toFixed(1) : "N/A"}°C)
- Humidity readings: ${humids.length} (avg: ${humids.length ? (humids.reduce((s, t) => s + t.value, 0) / humids.length).toFixed(1) : "N/A"}%)`;
      }
    }
  }

  return `You are the AI food safety analyst for Project Trace — a supply chain transparency platform. You have FULL access to all data below. Use it to give specific, data-backed answers. Never say you don't have access to data that is provided here.

${productContext}
${journeyContext}
${anomalyContext}
${telemetryContext}

RULES:
- Reference specific data points (temperatures, dates, locations, scores) in your answers.
- If anomalies exist, always mention them with severity and impact.
- If the product is recalled, lead with a prominent warning.
- Be concise but thorough. Under 200 words.
- If asked about something not in the data above, say so honestly.`.trim();
}

const RULES = `
RULES:
- Reference specific data points (temperatures, dates, locations, scores) in your answers.
- If anomalies exist, always mention them with severity and impact.
- If the product is recalled, lead with a prominent warning.
- Be concise but thorough. Under 200 words.
- If asked about something not in the data above, say so honestly.`;

export async function POST(request: Request) {
  const { messages, lotCode, barcode, context } = await request.json();

  const system = context
    ? `You are the AI food safety analyst for Project Trace. You have FULL access to all data below.\n\n${context}\n${RULES}`
    : buildSystemPrompt(barcode, lotCode);

  const result = streamText({
    model: getChatModel(),
    system,
    messages,
  });

  return result.toTextStreamResponse();
}
