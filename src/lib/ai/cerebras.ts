import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

function getCerebras() {
  return createOpenAICompatible({
    name: "cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    headers: { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY ?? ""}` },
  });
}

export function getChatModel() {
  return getCerebras()("zai-glm-4.7");
}

export function getAnalysisModel() {
  return getCerebras()("zai-glm-4.7");
}
