"use client";

import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { Sparkles, Send } from "lucide-react";

const Markdown = lazy(() => import("react-markdown"));
import { getConversation, saveConversation, getScanHistory, type AiMessage } from "@/lib/scan-history";

type Props = {
  lotCode?: string;
  barcode?: string;
  context?: string;
  autoPrompt?: string;
  suggestions?: string[];
  variant?: "consumer" | "dashboard";
};

export default function AiInsights({ lotCode, barcode, context, autoPrompt, suggestions = [], variant = "consumer" }: Props) {
  const isDashboard = variant === "dashboard";
  const storageKey = barcode ?? lotCode ?? "";
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<AiMessage[]>([]);
  const streamedRef = useRef("");

  messagesRef.current = messages;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isDashboard) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isDashboard]);

  const persist = useCallback((msgs: AiMessage[]) => {
    if (storageKey) saveConversation(storageKey, msgs);
  }, [storageKey]);

  const sendMessage = useCallback(async (text: string, visible: boolean) => {
    if (streaming) return;
    setStreaming(true);
    streamedRef.current = "";

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

      setMessages([...withUser, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamedRef.current += decoder.decode(value, { stream: true });
        const t = streamedRef.current;
        setMessages([...withUser, { role: "assistant", content: t }]);
        await new Promise((r) => requestAnimationFrame(r));
      }

      const final = [...withUser, { role: "assistant" as const, content: streamedRef.current }];
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
      if (cached.length > 0) { setMessages(cached); return; }
    }
    if (autoPrompt) sendMessage(autoPrompt, false);
  }, [initialized, storageKey, autoPrompt, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text, true);
  };

  const lastMsg = messages[messages.length - 1];
  const isLastStreaming = streaming && lastMsg?.role === "assistant";
  const showLoader = streaming && messages.length === 0;

  const accentColor = isDashboard ? "#52c41a" : "#16A34A";

  return (
    <div className={isDashboard
      ? "relative flex h-full flex-col bg-transparent"
      : "fixed inset-x-0 top-[100px] bottom-[82px] z-[55] flex flex-col bg-[#FAFAF8]"
    }>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        <div className={`mx-auto space-y-2 ${isDashboard ? "max-w-2xl" : "max-w-lg"}`}>
          {showLoader && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="relative">
                <Sparkles className="h-7 w-7 animate-[ai-sparkle-float_2s_ease-in-out_infinite]" style={{ color: accentColor }} />
                <span className="absolute -inset-2 animate-ping rounded-full" style={{ backgroundColor: `${accentColor}10` }} />
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((j) => (
                  <span
                    key={j}
                    className="w-[3px] rounded-full"
                    style={{ backgroundColor: accentColor, animation: `ai-wave 0.8s ease-in-out ${j * 0.1}s infinite`, height: 10 + j * 2 }}
                  />
                ))}
              </div>
              <span className={`text-xs ${isDashboard ? "text-white/30" : "text-[#9CA3AF]"}`}>Analyzing...</span>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className={`max-w-[80%] px-3.5 py-2 ${isDashboard
                    ? "border border-white/[0.08] bg-white/[0.04]"
                    : "rounded-2xl rounded-br-sm bg-[#16A34A]"
                  }`}>
                    <p className={`text-[13px] leading-snug ${isDashboard ? "text-white/70" : "text-white"}`}>{msg.content}</p>
                  </div>
                </div>
              );
            }

            const isThisStreaming = isLastStreaming && i === messages.length - 1;

            return (
              <div key={i} className="flex justify-start">
                <div className={`relative max-w-[90%] px-3.5 py-2.5 ${isDashboard
                  ? isThisStreaming
                    ? "bg-white/[0.04] border border-white/10"
                    : "bg-white/[0.02] border border-white/[0.06]"
                  : `rounded-2xl rounded-bl-sm ${isThisStreaming ? "bg-white shadow-[0_0_12px_rgba(22,163,74,0.08)]" : "bg-[#F3F4F6]"}`
                }`}>
                  {isThisStreaming && (
                    <div className={`absolute bottom-0 left-0 h-[2px] w-full overflow-hidden ${isDashboard ? "" : "rounded-b-2xl"}`}>
                      <div className="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-transparent" style={{ ['--tw-gradient-via' as string]: accentColor }} />
                    </div>
                  )}
                  <div className={`ai-prose text-[13px] leading-relaxed ${isDashboard ? "text-white/60" : "text-[#374151]"}`}>
                    <Suspense fallback={<span>{msg.content}</span>}>
                      <Markdown>{msg.content}</Markdown>
                    </Suspense>
                    {isThisStreaming && (
                      <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-[blink_0.5s_infinite]" style={{ backgroundColor: accentColor }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {suggestions.length > 0 && messages.length <= 1 && !streaming && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s, true)}
                  className={isDashboard
                    ? "border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 transition-all hover:border-white/20 hover:text-white/60"
                    : "rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-[#6B7280] transition-all hover:border-[#16A34A] hover:text-[#16A34A] active:scale-95"
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`shrink-0 px-4 py-2.5 ${isDashboard
        ? "border-t border-white/[0.06] bg-white/[0.02]"
        : "border-t border-[#E5E7EB] bg-white"
      }`}>
        <form onSubmit={handleSubmit} className={`mx-auto ${isDashboard ? "max-w-2xl" : "max-w-lg"}`}>
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className={isDashboard
                ? `w-full border bg-white/[0.03] py-2.5 pl-4 pr-11 text-[13px] text-white placeholder:text-white/20 outline-none transition-all duration-300 ${
                    streaming ? "border-white/20" : "border-white/[0.08] focus:border-white/20"
                  }`
                : `w-full rounded-full border bg-[#FAFAF8] py-2.5 pl-4 pr-11 text-[13px] text-[#1A1A1A] outline-none transition-all duration-300 ${
                    streaming ? "border-[#16A34A]/40" : "border-[#E5E7EB] focus:border-[#16A34A]"
                  }`
              }
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className={isDashboard
                ? `absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-white transition-all ${
                    streaming
                      ? "animate-pulse bg-white/20"
                      : "bg-white/10 hover:bg-white/20 disabled:bg-white/[0.04] disabled:text-white/20"
                  }`
                : `absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all ${
                    streaming
                      ? "animate-pulse bg-[#16A34A]/60"
                      : "bg-[#16A34A] hover:bg-[#15803D] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]"
                  }`
              }
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
