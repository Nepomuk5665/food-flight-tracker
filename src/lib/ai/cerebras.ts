import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const cerebras = createOpenAICompatible({
  name: "cerebras",
  baseURL: "https://api.cerebras.ai/v1",
  headers: { Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}` },
});

export const chatModel = cerebras("llama-4-scout-17b-16e-instruct");
export const analysisModel = cerebras("llama3.3-70b");
