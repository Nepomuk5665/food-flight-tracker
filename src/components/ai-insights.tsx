"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

type Props = {
  lotCode?: string;
  barcode?: string;
  autoPrompt?: string;
  suggestions?: string[];
};

type Message = { role: "user" | "assistant"; content: string };

export default function AiInsights({ lotCode, barcode, autoPrompt, suggestions = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoFired, setAutoFired] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string, showAsUser: boolean) => {
    if (loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = showAsUser ? [...messages, userMsg] : messages;
    if (showAsUser) setMessages(updated);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...updated.map((m) => ({ role: m.role, content: m.content })), ...(showAsUser ? [] : [{ role: "user", content: text }])],
          lotCode,
          barcode,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Unable to analyze right now." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      const base = showAsUser ? updated : messages;
      setMessages([...base, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setMessages([...base, { role: "assistant", content: result }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error." }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoPrompt && !autoFired) {
      setAutoFired(true);
      sendMessage(autoPrompt, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrompt, autoFired]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendMessage(text, true);
  };

  return (
    <div className="border border-[#dddddd] bg-white">
      <div className="flex items-center gap-2 border-b border-[#dddddd] bg-[#003a5d] px-4 py-2.5">
        <Sparkles className="h-4 w-4 text-[#9eca45]" />
        <span className="text-xs font-bold uppercase tracking-wide text-white">AI Analysis</span>
      </div>

      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto">
        {messages.length === 0 && loading && (
          <div className="flex items-center gap-2 px-4 py-6 text-sm text-[#777777]">
            <Loader2 className="h-4 w-4 animate-spin text-[#9eca45]" />
            Analyzing...
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`px-4 py-3 text-sm ${
              msg.role === "user"
                ? "border-b border-[#eeeeee] bg-[#f7f9fa] text-xs font-bold uppercase text-[#003a5d]"
                : "text-[#424242] leading-relaxed"
            }`}
          >
            {msg.content || <Loader2 className="h-4 w-4 animate-spin text-[#9eca45]" />}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[#eeeeee] px-4 py-2.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s, true)}
              disabled={loading}
              className="border border-[#dddddd] bg-[#f7f9fa] px-2.5 py-1.5 text-[11px] text-[#424242] transition-all hover:border-[#9eca45] hover:text-[#003a5d] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#dddddd] p-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up..."
          className="flex-1 border border-[#dddddd] bg-white px-3 py-2 text-sm text-[#424242] outline-none transition-all focus:border-[#9eca45]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center bg-[#9eca45] px-3.5 py-2 text-white transition-all hover:bg-[#333333] disabled:bg-[#b8c59a]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
