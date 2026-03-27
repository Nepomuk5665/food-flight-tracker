"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef(pathname);

  const getContext = useCallback(() => {
    const barcodeMatch = pathname.match(/\/product\/([^/]+)/);
    const lotMatch = pathname.match(/\/journey\/([^/]+)/);
    return {
      barcode: barcodeMatch?.[1] ?? undefined,
      lotCode: lotMatch?.[1] ?? undefined,
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      setMessages([]);
    }
  }, [pathname]);

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
      const ctx = getContext();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          ...ctx,
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

  if (pathname === "/scan") return null;

  const ctx = getContext();
  const hasContext = Boolean(ctx.barcode || ctx.lotCode);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center bg-[#003a5d] text-white shadow-lg transition-all hover:bg-[#9eca45]"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-16 z-[60] mx-auto flex max-h-[70vh] w-full max-w-[480px] flex-col border border-[#dddddd] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#dddddd] bg-[#003a5d] px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase text-white">AI Food Assistant</p>
              {hasContext && (
                <p className="text-[10px] text-[#9eca45]">
                  {ctx.lotCode ? `Lot: ${ctx.lotCode}` : `Product: ${ctx.barcode}`}
                </p>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 transition-all hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="py-8 text-center">
                <MessageCircle className="mx-auto mb-3 h-8 w-8 text-[#dddddd]" />
                <p className="text-sm text-[#777777]">
                  {hasContext
                    ? "Ask me anything about this product."
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
                      : "border border-[#dddddd] bg-[#f7f9fa] text-[#424242]"
                  }`}
                >
                  {msg.content || (
                    <Loader2 className="h-4 w-4 animate-spin text-[#9eca45]" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-[#dddddd] p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={hasContext ? "Ask about this product..." : "Ask about food safety..."}
              className="flex-1 border border-[#dddddd] bg-white px-3 py-2.5 text-sm text-[#424242] outline-none transition-all focus:border-[#9eca45]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center justify-center bg-[#9eca45] px-4 py-2.5 text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#333333] disabled:bg-[#b8c59a]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
