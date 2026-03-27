import type { UIMessage } from "ai";

type ChatRequestBody = {
  messages?: UIMessage[];
};

function getLatestUserMessage(messages: UIMessage[]): string {
  const latest = [...messages].reverse().find((message) => message.role === "user");

  if (!latest) {
    return "";
  }

  const textPart = latest.parts.find((part) => part.type === "text");
  return textPart?.type === "text" ? textPart.text : "";
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const incoming = getLatestUserMessage(body.messages ?? []);
  const reply = incoming ? `Echo: ${incoming}` : "Echo: Ready to help with this product.";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`${reply}\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
