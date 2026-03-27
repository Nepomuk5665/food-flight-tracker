import { streamText } from "ai";
import { getChatModel } from "@/lib/ai/cerebras";
import { getBatchJourney, getProductByBarcode, getProductById, getActiveLotForProduct } from "@/lib/db/queries";

const BASE_PROMPT =
  "You are a food safety assistant for Project Trace. You help consumers understand the journey and safety of food products. Keep answers under 150 words. Be honest about detected issues without unnecessary alarm.";

function buildProductContext(productName: string, brand: string, lotCode: string, status: string, riskScore: number, stagesSummary: string, anomalies: string) {
  return `You are a food safety assistant for Project Trace.

Product: ${productName} by ${brand}
Lot Code: ${lotCode}
Status: ${status}
Risk Score: ${riskScore}/100

Supply Chain Journey:
${stagesSummary}

${anomalies ? `Anomalies Detected:\n${anomalies}` : "No anomalies detected."}

Rules:
- Only discuss THIS specific product and lot.
- If status is "recalled", prominently warn the user.
- Be honest about detected anomalies but avoid unnecessary alarm.
- Keep answers under 150 words.
- If asked something outside your data, say "I don't have that information for this product."`;
}

export async function POST(request: Request) {
  const { messages, lotCode, barcode } = await request.json();

  let systemPrompt = BASE_PROMPT;

  const resolvedLotCode = lotCode ?? (() => {
    if (!barcode) return null;
    const product = getProductByBarcode(barcode);
    if (!product) return null;
    const lot = getActiveLotForProduct(product.id);
    return lot?.lotCode ?? null;
  })();

  if (resolvedLotCode) {
    const journey = getBatchJourney(resolvedLotCode);
    if (journey) {
      const product = getProductById(journey.batch.productId);

      const anomalies = journey.stages
        .flatMap((s) => s.anomalies)
        .map((a) => `${a.anomalyType}: ${a.description} (severity: ${a.severity})`)
        .join("\n");

      const stagesSummary = journey.stages
        .map((s) => `${s.sequenceOrder}. ${s.name} — ${s.locationName} (${s.startedAt})`)
        .join("\n");

      systemPrompt = buildProductContext(
        product?.name ?? "Unknown",
        product?.brand ?? "Unknown",
        journey.batch.lotCode,
        journey.batch.status,
        journey.batch.riskScore,
        stagesSummary,
        anomalies,
      );
    }
  }

  const result = streamText({
    model: getChatModel(),
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
