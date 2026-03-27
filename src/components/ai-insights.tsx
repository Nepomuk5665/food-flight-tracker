"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

const shellTransition = {
    duration: 0.45,
    ease: [0.22, 1, 0.36, 1] as const,
};

const messageVariants = {
    hidden: (role: AiMessage["role"]) => ({
        opacity: 0,
        x: role === "user" ? 28 : -28,
        y: 18,
        scale: 0.98,
        filter: "blur(10px)",
    }),
    visible: {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            duration: 0.42,
            ease: [0.22, 1, 0.36, 1] as const,
        },
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.98,
        transition: { duration: 0.2 },
    },
};

export default function AiInsights({ lotCode, barcode, context, autoPrompt, suggestions = [], fullPage = false }: Props) {
    const storageKey = barcode ?? lotCode ?? "";
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<AiMessage[]>([]);
    const reduceMotion = useReducedMotion();

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
    const showIntro = messages.length === 0 && !streaming;

    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shellTransition}
            className={`ai-cinematic-shell relative isolate overflow-hidden border border-border/80 shadow-[0_22px_70px_rgba(0,58,93,0.12)] ${fullPage ? "flex flex-1 flex-col" : ""}`}
        >
            <div className="ai-cinematic-grid pointer-events-none absolute inset-0 opacity-60" />
            <div className="ai-scanlines pointer-events-none absolute inset-0 opacity-45" />
            <div className="ai-orb ai-orb-accent pointer-events-none absolute -left-12 top-12 h-36 w-36" />
            <div className="ai-orb ai-orb-primary pointer-events-none absolute right-[-4.5rem] top-[-2rem] h-44 w-44" />

            <div className="relative border-b border-white/10 bg-primary px-4 py-4 text-white">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)]" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(158,202,69,0.9),transparent)]" />
                <div className="relative flex items-center gap-3">
                    <motion.div
                        animate={reduceMotion || !streaming ? undefined : { rotate: 360 }}
                        transition={reduceMotion || !streaming ? undefined : { duration: 6, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                        className="relative flex h-11 w-11 shrink-0 items-center justify-center border border-white/15 bg-white/8 shadow-[0_0_30px_rgba(158,202,69,0.18)]"
                    >
                        <div className="ai-radar-ring absolute inset-[5px]" />
                        <div className="ai-radar-ring absolute inset-[11px] [animation-delay:-1.4s]" />
                        <Sparkles className={`relative h-5 w-5 text-accent ${streaming ? "animate-pulse" : ""}`} />
                    </motion.div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.32em] text-white/70">Trace AI Console</span>
                            <span className={`border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.3em] ${streaming ? "border-accent/40 bg-accent/10 text-accent" : "border-white/15 bg-white/8 text-white/70"}`}>
                {streaming ? "Live stream" : "Ready"}
              </span>
                        </div>
                        <p className="mt-1 text-xs text-white/70">
                            Animated batch copilot for safety signals, provenance, and follow-up questions.
                        </p>
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className={`relative overflow-y-auto ${fullPage ? "flex-1" : "max-h-[460px]"}`}>
                <AnimatePresence initial={false}>
                    {showIntro && (
                        <motion.div
                            key="intro"
                            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={shellTransition}
                            className="relative m-4 overflow-hidden border border-primary/10 bg-white/75 p-5 shadow-[0_18px_50px_rgba(0,58,93,0.08)] backdrop-blur-sm"
                        >
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(158,202,69,0.08),transparent_40%,rgba(0,58,93,0.07))]" />
                            <div className="pointer-events-none absolute right-[-2rem] top-1/2 h-28 w-28 -translate-y-1/2 border border-primary/10" />
                            <div className="pointer-events-none absolute right-5 top-5 h-16 w-16 border border-accent/20 ai-float-slow" />
                            <div className="relative flex items-start gap-4">
                                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center border border-primary/10 bg-primary text-white shadow-[0_0_35px_rgba(0,58,93,0.22)]">
                                    <div className="ai-radar-sweep absolute inset-0" />
                                    <Sparkles className="relative h-6 w-6" />
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-accent">Interactive analysis</p>
                                        <h3 className="mt-1 text-xl font-bold uppercase tracking-wide text-primary">Ask anything about this product or batch</h3>
                                    </div>
                                    <p className="max-w-[38rem] text-sm leading-relaxed text-body">
                                        I can turn traceability data into fast answers about safety, ingredients, anomalies, and supply chain movement.
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/60">
                                        <span className="border border-primary/10 bg-primary/5 px-2 py-1">Safety signals</span>
                                        <span className="border border-primary/10 bg-primary/5 px-2 py-1">Origin tracking</span>
                                        <span className="border border-primary/10 bg-primary/5 px-2 py-1">Recall context</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {isFirstLoad && !lastMsg?.content && (
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative mx-4 mb-2 overflow-hidden border border-primary/10 bg-white/70 px-4 py-4 shadow-[0_18px_48px_rgba(0,58,93,0.08)] backdrop-blur-sm"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,rgba(158,202,69,1),transparent)] ai-stream-beam" />
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Running analysis</p>
                                <p className="mt-1 text-sm text-body">Building the first answer from the product context and scan history.</p>
                            </div>
                            <div className="flex items-end gap-1">
                                {[0, 1, 2, 3].map((bar) => (
                                    <span
                                        key={bar}
                                        className="h-8 w-1.5 bg-accent/70 ai-eq-bar"
                                        style={{ animationDelay: `${bar * 140}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => {
                        const isUser = msg.role === "user";
                        const isThisStreaming = isLastStreaming && i === messages.length - 1;

                        return (
                            <motion.div
                                key={`${msg.role}-${i}`}
                                layout={!reduceMotion}
                                custom={msg.role}
                                variants={messageVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className={`relative flex px-4 py-3 ${isUser ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`max-w-[92%] ${fullPage ? "sm:max-w-[78%]" : ""}`}>
                                    <div className={`mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] ${isUser ? "justify-end text-primary/60" : "text-accent"}`}>
                                        <span>{isUser ? "Operator" : "AI Insight"}</span>
                                        <span className={`h-1.5 w-1.5 ${isUser ? "bg-primary/30" : "bg-accent"}`} />
                                    </div>

                                    <div
                                        className={`relative overflow-hidden border px-4 py-3 shadow-[0_16px_36px_rgba(0,58,93,0.08)] ${
                                            isUser
                                                ? "border-primary/15 bg-[linear-gradient(135deg,#003a5d,#0b5a85)] text-white"
                                                : `bg-white/82 text-body backdrop-blur-sm ${isThisStreaming ? "border-accent/35" : "border-primary/10"}`
                                        }`}
                                    >
                                        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${isUser ? "bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)]" : "bg-[linear-gradient(90deg,transparent,rgba(158,202,69,0.9),transparent)]"}`} />
                                        {isThisStreaming && (
                                            <>
                                                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(158,202,69,0.08),transparent_45%,rgba(0,58,93,0.08))]" />
                                                <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full overflow-hidden bg-border-light/80">
                                                    <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
                                                </div>
                                            </>
                                        )}

                                        {isUser ? (
                                            <p className="text-sm font-semibold leading-relaxed">{msg.content}</p>
                                        ) : (
                                            <div className="ai-prose relative text-sm leading-relaxed text-body">
                                                <Markdown>{msg.content}</Markdown>
                                                {isThisStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-[blink_1s_infinite] bg-accent align-[-2px]" />}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
                {suggestions.length > 0 && messages.length <= 1 && !streaming && (
                    <motion.div
                        key="suggestions"
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={shellTransition}
                        className="relative border-t border-primary/10 bg-white/70 px-4 py-4 backdrop-blur-sm"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,58,93,0.14),transparent)]" />
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary/55">
                            <ChevronDown className="h-3 w-3" />
                            Suggested prompts
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s, index) => (
                                <motion.button
                                    key={s}
                                    type="button"
                                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: reduceMotion ? 0 : index * 0.05, duration: 0.28 }}
                                    whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
                                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                    onClick={() => sendMessage(s, true)}
                                    className="ai-suggestion-chip relative overflow-hidden border border-primary/10 bg-white px-3 py-2 text-[11px] font-semibold text-body transition-colors hover:border-accent/50 hover:text-primary"
                                >
                                    <span className="relative z-10">{s}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.form
                onSubmit={handleSubmit}
                layout={!reduceMotion}
                className="relative border-t border-primary/10 bg-white/84 p-3 backdrop-blur-sm"
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(158,202,69,0.7),transparent)]" />
                <div className="flex items-center gap-2">
                    <div className={`relative flex-1 overflow-hidden border bg-white ${streaming ? "ai-input-glow border-accent/35" : "border-primary/15"}`}>
                        <div className={`pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-accent to-transparent transition-opacity ${streaming ? "opacity-100" : "opacity-0"}`} />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={streaming ? "Wait for the current answer to finish..." : "Ask a follow-up..."}
                            className="w-full bg-transparent px-4 py-3.5 text-sm text-body outline-none placeholder:text-muted/75"
                        />
                    </div>
                    <motion.button
                        type="submit"
                        disabled={streaming || !input.trim()}
                        whileHover={reduceMotion || streaming || !input.trim() ? undefined : { y: -2, scale: 1.02 }}
                        whileTap={reduceMotion || streaming || !input.trim() ? undefined : { scale: 0.97 }}
                        className="relative flex items-center justify-center overflow-hidden border border-accent/40 bg-accent px-4 py-3.5 text-xs font-black uppercase tracking-[0.24em] text-white shadow-[0_14px_30px_rgba(158,202,69,0.24)] transition-colors hover:bg-accent-hover disabled:border-transparent disabled:bg-[#b8c59a] disabled:shadow-none"
                    >
                        <span className="pointer-events-none absolute inset-0 ai-button-sheen opacity-60" />
                        <Send className="relative h-4 w-4" />
                    </motion.button>
                </div>
            </motion.form>
        </motion.div>
    );
}