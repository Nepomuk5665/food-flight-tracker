import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function getCerebras() {
  return createOpenAICompatible({
    name: "cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    headers: { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY ?? ""}` },
  });
}

export function getChatModel() {
  return getCerebras()("llama-4-scout-17b-16e-instruct");
}

export function getAnalysisModel() {
  return getCerebras()("llama3.3-70b");
}
