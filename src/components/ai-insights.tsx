"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, Send, ChevronDown } from "lucide-react";
import Markdown from "react-markdown";
import { getConversation, saveConversation, type AiMessage } from "@/lib/scan-history";

type Props = {
  lotCode?: string;
  barcode?: string;
  context?: string;
  autoPrompt?: string;
  suggestions?: string[];
};

export default function AiInsights({ lotCode, barcode, context, autoPrompt, suggestions = [] }: Props) {
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
        body: JSON.stringify({ messages: apiMessages, lotCode, barcode, context }),
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
    <div className="overflow-hidden border border-[#dddddd] bg-[#fafbfc]">
      <div className="flex items-center gap-2 bg-[#003a5d] px-4 py-2.5">
        <div className="relative flex h-5 w-5 items-center justify-center">
          <Sparkles className={`h-4 w-4 text-[#9eca45] ${streaming ? "animate-pulse" : ""}`} />
          {streaming && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-[#9eca45]/30" />
              <span className="absolute -inset-1 animate-[spin_3s_linear_infinite] rounded-full border border-dashed border-[#9eca45]/40" />
            </>
          )}
        </div>
        <span className="text-xs font-bold uppercase tracking-wide text-white">
          {streaming ? "Analyzing" : "AI Analysis"}
        </span>
        {streaming && <span className="ml-1 text-xs text-[#9eca45] animate-pulse">●</span>}
      </div>

      <div ref={scrollRef} className="max-h-[400px] overflow-y-auto">
        {isFirstLoad && !lastMsg?.content && (
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="flex gap-1">
              <span className="h-2 w-2 animate-[bounce_1s_infinite_0ms] rounded-full bg-[#9eca45]" />
              <span className="h-2 w-2 animate-[bounce_1s_infinite_200ms] rounded-full bg-[#9eca45]" />
              <span className="h-2 w-2 animate-[bounce_1s_infinite_400ms] rounded-full bg-[#9eca45]" />
            </div>
            <span className="text-sm text-[#777777]">Running analysis...</span>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="border-b border-[#eeeeee] bg-[#f0f2f5] px-4 py-2.5">
                <p className="text-xs font-bold uppercase text-[#003a5d]">{msg.content}</p>
              </div>
            );
          }

          const isThisStreaming = isLastStreaming && i === messages.length - 1;

          return (
            <div key={i} className="relative px-4 py-3">
              {isThisStreaming && (
                <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden bg-[#eeeeee]">
                  <div className="h-full w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#9eca45] to-transparent" />
                </div>
              )}
              <div className="ai-prose text-sm leading-relaxed text-[#424242]">
                <Markdown>{msg.content}</Markdown>
                {isThisStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-[blink_1s_infinite] bg-[#9eca45]" />}
              </div>
            </div>
          );
        })}
      </div>

      {suggestions.length > 0 && messages.length <= 1 && !streaming && (
        <div className="border-t border-[#eeeeee] px-4 py-3">
          <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase text-[#999999]">
            <ChevronDown className="h-3 w-3" />
            Ask a question
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s, true)}
                className="border border-[#dddddd] bg-white px-2.5 py-1.5 text-[11px] text-[#424242] transition-all hover:border-[#9eca45] hover:bg-[#f3f9e7] hover:text-[#003a5d] active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#dddddd] bg-white p-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up..."
          className="flex-1 border border-[#dddddd] bg-white px-3 py-2 text-sm text-[#424242] outline-none transition-all focus:border-[#9eca45]"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="flex items-center justify-center bg-[#9eca45] px-3.5 py-2 text-white transition-all hover:bg-[#333333] disabled:bg-[#b8c59a] active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
