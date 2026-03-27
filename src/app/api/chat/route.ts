import { streamText } from "ai";
import { chatModel } from "@/lib/ai/cerebras";
import { getBatchJourney, getProductById } from "@/lib/db/queries";

export async function POST(request: Request) {
  const { messages, lotCode } = await request.json();

  let systemPrompt =
    "You are a food safety assistant for Project Trace. You help consumers understand the journey and safety of food products. Keep answers under 150 words. Be honest about detected issues without unnecessary alarm.";

  if (lotCode) {
    const journey = getBatchJourney(lotCode);
    if (journey) {
      const product = getProductById(journey.batch.productId);

      const anomalies = journey.stages
        .flatMap((s) => s.anomalies)
        .map((a) => `${a.anomalyType}: ${a.description} (severity: ${a.severity})`)
        .join("\n");

      const stagesSummary = journey.stages
        .map((s) => `${s.sequenceOrder}. ${s.name} — ${s.locationName} (${s.startedAt})`)
        .join("\n");

      systemPrompt = `You are a food safety assistant for Project Trace.

Product: ${product?.name ?? "Unknown"} by ${product?.brand ?? "Unknown"}
Lot Code: ${journey.batch.lotCode}
Status: ${journey.batch.status}
Risk Score: ${journey.batch.riskScore}/100

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
  }

  const result = streamText({
    model: chatModel,
    system: systemPrompt,
    messages,
  });

  return result.toTextStreamResponse();
}
