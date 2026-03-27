"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronDown } from "lucide-react";
import Markdown from "react-markdown";
import { getConversation, saveConversation, getScanHistory, type AiMessage } from "@/lib/scan-history";

type Props = {
  lotCode?: string;
  barcode?: string;
  context?: string;
  autoPrompt?: string;
  suggestions?: string[];
  fullPage?: boolean;
};

export default function AiInsights({ lotCode, barcode, context, autoPrompt, suggestions = [], fullPage = false }: Props) {
  const storageKey = barcode ?? lotCode ?? "";
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<AiMessage[]>([]);

  messagesRef.current = messages;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const persist = useCallback((msgs: AiMessage[]) => {
    if (storageKey) saveConversation(storageKey, msgs);
  }, [storageKey]);

  const sendMessage = useCallback(async (text: string, visible: boolean) => {
    if (streaming) return;
    setStreaming(true);

    const current = messagesRef.current;
    const withUser = visible ? [...current, { role: "user" as const, content: text }] : current;
    if (visible) setMessages(withUser);

    const apiMessages = [
      ...withUser.map((m) => ({ role: m.role, content: m.content })),
      ...(visible ? [] : [{ role: "user" as const, content: text }]),
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          lotCode,
          barcode,
          context,
          scanHistory: getScanHistory()
            .filter((e) => e.barcode !== barcode)
            .slice(0, 10)
            .map((e) => ({ name: e.name, brand: e.brand, barcode: e.barcode, nutriScore: e.nutriScore, source: e.source })),
        }),
      });

      if (!res.ok || !res.body) {
        const final = [...withUser, { role: "assistant" as const, content: "Unable to analyze right now." }];
        setMessages(final);
        persist(final);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamed = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamed += decoder.decode(value, { stream: true });
        setMessages([...withUser, { role: "assistant", content: streamed }]);
      }

      const final = [...withUser, { role: "assistant" as const, content: streamed }];
      setMessages(final);
      persist(final);
    } catch {
      const final = [...messagesRef.current, { role: "assistant" as const, content: "Connection error." }];
      setMessages(final);
      persist(final);
    } finally {
      setStreaming(false);
    }
  }, [streaming, lotCode, barcode, context, persist]);

  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    if (storageKey) {
      const cached = getConversation(storageKey);
      if (cached.length > 0) {
        setMessages(cached);
        return;
      }
    }

    if (autoPrompt) {
      sendMessage(autoPrompt, false);
    }
  }, [initialized, storageKey, autoPrompt, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text, true);
  };

  const isFirstLoad = messages.length <= 1 && streaming;
  const lastMsg = messages[messages.length - 1];
  const isLastStreaming = streaming && lastMsg?.role === "assistant";

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-white shadow-sm ${fullPage ? "flex flex-1 flex-col" : ""}`}>
      <div className="flex items-center gap-2 rounded-t-xl bg-gradient-to-r from-[#16A34A] to-[#059669] px-4 py-3 text-white">
        <div className="relative flex h-5 w-5 items-center justify-center">
          <Sparkles className={`h-4 w-4 text-white ${streaming ? "animate-pulse" : ""}`} />
          {streaming && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
              <span className="absolute -inset-1 animate-[spin_3s_linear_infinite] rounded-full border border-dashed border-white/50" />
            </>
          )}
        </div>
        <span className="text-xs font-semibold tracking-wide text-white">
          {streaming ? "Analyzing" : "AI Analysis"}
        </span>
        {streaming && <span className="ml-1 animate-pulse text-xs text-white">●</span>}
      </div>

      <div ref={scrollRef} className={`space-y-2 overflow-y-auto bg-[#FCFDFC] p-3 ${fullPage ? "flex-1" : "max-h-[400px]"}`}>
        {isFirstLoad && !lastMsg?.content && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#F3F4F6] px-4 py-4">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-[bounce_1s_infinite_0ms] rounded-full bg-[#16A34A]" />
              <span className="h-2 w-2 animate-[bounce_1s_infinite_200ms] rounded-full bg-[#16A34A]" />
              <span className="h-2 w-2 animate-[bounce_1s_infinite_400ms] rounded-full bg-[#16A34A]" />
            </div>
            <span className="text-sm text-muted">Running analysis...</span>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="rounded-2xl bg-[#16A34A]/10 px-4 py-2.5">
                <p className="text-xs font-semibold text-[#166534]">{msg.content}</p>
              </div>
            );
          }

          const isThisStreaming = isLastStreaming && i === messages.length - 1;

          return (
            <div key={i} className="relative rounded-2xl bg-[#F3F4F6] px-4 py-3">
              {isThisStreaming && (
                <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden rounded-b-2xl bg-border">
                  <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#16A34A] to-transparent" />
                </div>
              )}
              <div className="ai-prose text-sm leading-relaxed text-body">
                <Markdown>{msg.content}</Markdown>
                {isThisStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-[blink_1s_infinite] bg-[#16A34A]" />}
              </div>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && messages.length <= 1 && !streaming && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold text-muted">
            <ChevronDown className="h-3 w-3" />
            Ask a question
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s, true)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] text-body transition-all hover:bg-green-50 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border bg-white p-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up..."
          className="flex-1 rounded-full border border-border bg-white px-4 py-3 text-sm text-body outline-none transition-colors focus:border-[#16A34A]"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16A34A] text-white transition-colors hover:bg-[#15803D] disabled:bg-[#86efac]"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
