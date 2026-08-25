"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Loader2, X, Sparkles, Copy, Check } from "./icons";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type ContentPart = { type: "text"; text: string } | { type: "code"; lang: string; code: string };

let msgCounter = 0;
const nextId = () => `m-${++msgCounter}-${Date.now().toString(36)}`;

const STARTER_PROMPTS = [
  "Want me to help you build something?",
  "Describe what you want to create, and I'll write it for you.",
];

const TEXTAREA_MIN_H = 38;
const TEXTAREA_MAX_H = 140;

// Splits a message on ``` fences so code blocks can be rendered in their own
// monospace panel with a copy button, separately from prose paragraphs.
function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const fence = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(content))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", lang: match[1] || "text", code: match[2].replace(/\n$/, "") });
    lastIndex = fence.lastIndex;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", text: content.slice(lastIndex) });
  }
  return parts;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — nothing to fall back to safely here
    }
  };
  return (
    <div className="rounded-md overflow-hidden border border-vex-border bg-black/60 my-1.5 max-w-full">
      <div className="flex items-center justify-between px-2.5 py-1 bg-white/5 border-b border-vex-border">
        <span className="text-[10px] uppercase tracking-wider text-vex-muted">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10.5px] text-vex-muted hover:text-vex-text transition-colors"
        >
          {copied ? <Check size={11} className="vex-accent" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-2.5 overflow-x-auto vex-scroll text-[11.5px] leading-[1.5] font-mono text-vex-text/90 whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MessageBody({ content }: { content: string }) {
  const parts = parseContent(content);
  return (
    <>
      {parts.map((p, i) =>
        p.type === "code" ? (
          <CodeBlock key={i} lang={p.lang} code={p.code} />
        ) : (
          p.text && (
            <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
              {p.text.trim()}
            </p>
          )
        )
      )}
    </>
  );
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, open]);

  // Auto-grow the composer as the person types, instead of a fixed
  // single-line box with an internal scrollbar that made longer prompts
  // hard to review before sending.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(TEXTAREA_MAX_H, Math.max(TEXTAREA_MIN_H, el.scrollHeight)) + "px";
  }, [input, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(null);
    setInput("");

    const userMsg: Msg = { id: nextId(), role: "user", content: trimmed };
    const assistantId = nextId();
    const history = [...messages, userMsg];
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "Something went wrong reaching the assistant.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 flex flex-col items-end gap-2 max-w-[calc(100%-1.5rem)]">
      {open && (
        <div className="w-[min(92vw,340px)] h-[min(65vh,440px)] bg-vex-panel border border-vex-border rounded-xl shadow-crt flex flex-col overflow-hidden animate-bootIn">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-vex-border bg-vex-panel2 shrink-0">
            <Sparkles size={14} className="vex-accent" />
            <span className="text-[12.5px] font-display text-vex-text">Vex Assistant</span>
            <span className="ml-auto text-[9px] text-vex-muted uppercase tracking-wider">groq</span>
            <button onClick={() => setOpen(false)} className="text-vex-muted hover:text-vex-text p-0.5">
              <X size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto vex-scroll px-3 py-3 space-y-3 text-[12.5px] min-h-0">
            {messages.length === 0 && (
              <div className="rounded-lg bg-vex-panel2 border border-vex-border p-3 space-y-1.5">
                {STARTER_PROMPTS.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-vex-text/90" : "text-vex-muted"}>
                    {p}
                  </p>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] min-w-0 rounded-lg px-3 py-2 leading-relaxed ${
                    m.role === "user"
                      ? "bg-[var(--accent)] text-black whitespace-pre-wrap break-words"
                      : "bg-vex-panel2 border border-vex-border text-vex-text/90"
                  }`}
                >
                  {m.content ? (
                    m.role === "assistant" ? (
                      <MessageBody content={m.content} />
                    ) : (
                      m.content
                    )
                  ) : streaming && m.role === "assistant" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    ""
                  )}
                </div>
              </div>
            ))}
            {error && <p className="text-vex-red text-[11.5px]">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 border-t border-vex-border shrink-0">
            <div className="flex items-end gap-1.5 bg-black/40 border border-vex-border rounded-lg px-2 py-1.5 focus-within:border-[var(--accent)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Describe what you want to create..."
                rows={1}
                style={{ height: TEXTAREA_MIN_H }}
                className="flex-1 bg-transparent resize-none outline-none text-[12.5px] text-vex-text placeholder:text-vex-muted py-1.5 vex-scroll leading-[1.4]"
              />
              <button
                onClick={() => send(input)}
                disabled={streaming || !input.trim()}
                className="p-1.5 rounded-md vex-accent-bg text-black disabled:opacity-30 shrink-0"
              >
                {streaming ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 rounded-full vex-accent-bg text-black flex items-center justify-center shadow-glow hover:scale-105 transition-transform shrink-0"
        title="Vex Assistant"
      >
        <Bot size={20} />
      </button>
    </div>
  );
}
