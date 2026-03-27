"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronLeft } from "lucide-react";
import Markdown from "react-markdown";
import { getConversation, saveConversation, getScanHistory, type AiMessage } from "@/lib/scan-history";
import { TabToggle, type TabId } from "@/components/product/TabToggle";

type Props = {
  lotCode?: string;
  barcode?: string;
  context?: string;
  autoPrompt?: string;
  suggestions?: string[];
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  hiddenTabs?: TabId[];
};

export default function AiInsights({ lotCode, barcode, context, autoPrompt, suggestions = [], activeTab, onTabChange, hiddenTabs = [] }: Props) {
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
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

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

  return (
    <div className="fixed inset-x-0 top-0 bottom-[72px] z-[55] flex flex-col bg-[#FAFAF8]">
      <div className="shrink-0 bg-[#FAFAF8] px-4 pt-3">
        <div className="mx-auto max-w-lg">
          <div className="mb-2">
            <button
              onClick={() => onTabChange?.("info")}
              className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] transition-colors hover:text-[#16A34A]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          {activeTab && onTabChange && (
            <TabToggle activeTab={activeTab} onTabChange={onTabChange} hiddenTabs={hiddenTabs} />
          )}
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        <div className="mx-auto max-w-lg space-y-2">
          {showLoader && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="relative">
                <Sparkles className="h-7 w-7 text-[#16A34A] animate-[ai-sparkle-float_2s_ease-in-out_infinite]" />
                <span className="absolute -inset-2 animate-ping rounded-full bg-[#16A34A]/10" />
              </div>
              <div className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((j) => (
                  <span
                    key={j}
                    className="w-[3px] rounded-full bg-[#16A34A]"
                    style={{ animation: `ai-wave 0.8s ease-in-out ${j * 0.1}s infinite`, height: 10 + j * 2 }}
                  />
                ))}
              </div>
              <span className="text-xs text-[#9CA3AF]">Analyzing...</span>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#16A34A] px-3.5 py-2">
                    <p className="text-[13px] leading-snug text-white">{msg.content}</p>
                  </div>
                </div>
              );
            }

            const isThisStreaming = isLastStreaming && i === messages.length - 1;

            return (
              <div key={i} className="flex justify-start">
                <div className={`relative max-w-[90%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 ${
                  isThisStreaming ? "bg-white shadow-[0_0_12px_rgba(22,163,74,0.08)]" : "bg-[#F3F4F6]"
                }`}>
                  {isThisStreaming && (
                    <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden rounded-b-2xl">
                      <div className="h-full w-1/3 animate-[shimmer_1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#16A34A] to-transparent" />
                    </div>
                  )}
                  <div className="ai-prose text-[13px] leading-relaxed text-[#374151]">
                    <Markdown>{msg.content}</Markdown>
                    {isThisStreaming && (
                      <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-[blink_0.5s_infinite] bg-[#16A34A]" />
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
                  className="rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] text-[#6B7280] transition-all hover:border-[#16A34A] hover:text-[#16A34A] active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[#E5E7EB] bg-white px-4 py-2.5">
        <form onSubmit={handleSubmit} className="mx-auto max-w-lg">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className={`w-full rounded-full border bg-[#FAFAF8] py-2.5 pl-4 pr-11 text-[13px] text-[#1A1A1A] outline-none transition-all duration-300 ${
                streaming ? "border-[#16A34A]/40" : "border-[#E5E7EB] focus:border-[#16A34A]"
              }`}
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all ${
                streaming
                  ? "animate-pulse bg-[#16A34A]/60"
                  : "bg-[#16A34A] hover:bg-[#15803D] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]"
              }`}
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
