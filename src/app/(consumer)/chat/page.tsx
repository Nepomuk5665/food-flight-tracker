"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Loader2, MessageCircle } from "lucide-react";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-[#777777]">Loading chat...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const lotCode = searchParams.get("lot");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user" as const, content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          lotCode: lotCode ?? undefined,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages([...updated, { role: "assistant", content: "Sorry, I couldn't process that request." }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages([...updated, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages([...updated, { role: "assistant", content: assistantText }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-[70vh] flex-col font-sans">
      <div className="mb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide text-[#003a5d]">AI Food Assistant</h1>
        {lotCode && <p className="text-xs text-[#9eca45]">Context: Lot {lotCode}</p>}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto border border-[#dddddd] bg-[#f7f9fa] p-4">
        {messages.length === 0 && (
          <div className="py-12 text-center">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-[#dddddd]" />
            <p className="text-sm text-[#777777]">
              {lotCode
                ? "Ask me anything about this product and its supply chain."
                : "Ask me about food safety, ingredients, or nutrition."}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[#003a5d] text-white"
                  : "border border-[#dddddd] bg-white text-[#424242]"
              }`}
            >
              {msg.content || <Loader2 className="h-4 w-4 animate-spin text-[#9eca45]" />}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={lotCode ? "Ask about this product..." : "Ask about food safety..."}
          className="flex-1 border border-[#dddddd] bg-white px-4 py-3 text-sm text-[#424242] outline-none transition-all focus:border-[#9eca45]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center justify-center bg-[#9eca45] px-5 py-3 text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#333333] disabled:bg-[#b8c59a]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </section>
  );
}
