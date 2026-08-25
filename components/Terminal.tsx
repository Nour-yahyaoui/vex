"use client";

import { useEffect, useRef, useState } from "react";
import { useFsStore } from "@/lib/fsStore";
import { useUiStore, useWindowStore, AccentColor } from "@/lib/store";
import { runCommand, ShellContext } from "@/lib/shell";
import { displayPath } from "@/lib/filesystem";
import { TerminalLine } from "@/lib/types";

let lineCounter = 0;
const nextId = () => `l-${++lineCounter}-${Date.now().toString(36)}`;

const WELCOME = `Vex OS 1.0 (phosphor) — vexsh
Type 'help' to see every command, or 'neofetch' for a system summary.
`;

export default function Terminal() {
  const snapshot = useFsStore((s) => s.snapshot);
  const setSnapshot = useFsStore((s) => s.setSnapshot);
  const reset = useFsStore((s) => s.reset);
  const openWindow = useWindowStore((s) => s.openWindow);
  const setAccent = useUiStore((s) => s.setAccent);

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [isRoot, setIsRoot] = useState(false);
  const [aliases, setAliases] = useState<Record<string, string>>({ ll: "ls -la", la: "ls -A", l: "ls" });
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [sudoPass, setSudoPass] = useState("");
  const [sudoErr, setSudoErr] = useState(false);
  const [pendingSudo, setPendingSudo] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLines([{ id: nextId(), kind: "raw", text: WELCOME }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const focusInput = () => inputRef.current?.focus();

  const pushLine = (l: Omit<TerminalLine, "id">) => setLines((prev) => [...prev, { ...l, id: nextId() }]);
  const pushInputEcho = (text: string) =>
    pushLine({ kind: "input", text, promptUser: isRoot ? "root" : snapshot.user, promptPath: displayPath(snapshot.cwd), isRoot });

  const run = (raw: string, echo = true) => {
    if (echo) pushInputEcho(raw);
    const ctx: ShellContext = { snapshot, isRoot, aliases, history, startedAt: startedAt.current };
    const result = runCommand(raw, ctx);
    setSnapshot(result.snapshot);
    setAliases(result.aliases);
    result.lines.forEach((l) => pushLine(l));

    if (result.effect) {
      switch (result.effect.type) {
        case "clear":
          setLines([]);
          break;
        case "sudo-request":
          setPendingSudo(result.effect.command);
          setSudoOpen(true);
          break;
        case "open-app":
          openWindow(
            result.effect.app,
            result.effect.path || result.effect.root
              ? { path: result.effect.path, root: result.effect.root }
              : undefined
          );
          break;
        case "reset-fs":
          reset();
          pushLine({ kind: "success", text: "Virtual disk reset to defaults." });
          break;
        case "theme": {
          const accent = result.effect.accent as AccentColor;
          if (["green", "amber", "cyan", "violet"].includes(accent)) {
            setAccent(accent);
            pushLine({ kind: "success", text: `Accent set to ${accent}.` });
          } else {
            pushLine({ kind: "error", text: `theme: unknown accent '${accent}'. try green|amber|cyan|violet` });
          }
          break;
        }
      }
    }
  };

  const submit = () => {
    const trimmed = input;
    setInput("");
    if (trimmed.trim() === "") {
      pushInputEcho("");
      return;
    }
    setHistory((h) => [...h, trimmed]);
    setHistIdx(-1);
    run(trimmed);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(newIdx);
      setInput(history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === -1) return;
      const newIdx = histIdx + 1;
      if (newIdx >= history.length) {
        setHistIdx(-1);
        setInput("");
      } else {
        setHistIdx(newIdx);
        setInput(history[newIdx]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const confirmSudo = () => {
    const rootPass = snapshot.rootPassword || "vex";
    if (sudoPass === rootPass) {
      setSudoOpen(false);
      setSudoErr(false);
      const cmd = pendingSudo;
      setSudoPass("");
      setPendingSudo(null);
      if (cmd) {
        setIsRoot(true);
        const ctx: ShellContext = { snapshot, isRoot: true, aliases, history, startedAt: startedAt.current };
        const result = runCommand(cmd, ctx);
        setSnapshot(result.snapshot);
        result.lines.forEach((l) => pushLine(l));
        setTimeout(() => setIsRoot(false), 1);
      }
    } else {
      setSudoErr(true);
      setSudoPass("");
    }
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col bg-black rounded-b-lg overflow-hidden relative"
      onMouseDown={focusInput}
    >
      <div className="flex-1 min-h-0 overflow-y-auto vex-scroll px-2.5 sm:px-3 py-2 text-[12.5px] sm:text-[13px] leading-[1.55]">
        {lines.map((l) => (
          <div key={l.id} className="whitespace-pre-wrap break-words">
            {l.kind === "input" ? (
              <div className="flex flex-wrap gap-1">
                <span>
                  <span className="vex-accent font-semibold">{l.promptUser}</span>
                  <span className="text-white/60">@</span>
                  <span className="vex-accent font-semibold">vex</span>
                  <span className="text-white/60">:</span>
                  <span className="text-vex-cyan">{l.promptPath}</span>
                  <span className="text-white/70">{l.isRoot ? "#" : "$"}</span>
                  <span> </span>
                </span>
                <span className="text-vex-text">{l.text}</span>
              </div>
            ) : l.kind === "error" ? (
              <span className="text-vex-red">{l.text}</span>
            ) : l.kind === "success" ? (
              <span className="vex-accent">{l.text}</span>
            ) : (
              <span className="text-vex-text/90">{l.text}</span>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          <span className="vex-accent font-semibold">{isRoot ? "root" : snapshot.user}</span>
          <span className="text-white/60">@</span>
          <span className="vex-accent font-semibold">vex</span>
          <span className="text-white/60">:</span>
          <span className="text-vex-cyan break-all">{displayPath(snapshot.cwd)}</span>
          <span className="text-white/70">{isRoot ? "#" : "$"}</span>
          <input
            ref={inputRef}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent outline-none border-none text-vex-text caret-[var(--accent)] min-w-[120px]"
          />
        </div>
        <div ref={bottomRef} />
      </div>

      {sudoOpen && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20 p-4">
          <div className="bg-vex-panel border border-vex-border rounded-lg p-5 w-full max-w-sm shadow-crt">
            <p className="font-display text-sm text-vex-text mb-1">Authenticate</p>
            <p className="text-xs text-vex-muted mb-3">
              [sudo] password for {snapshot.user} (hint: default is <span className="vex-accent">vex</span>)
            </p>
            {sudoErr && <p className="text-xs text-vex-red mb-2">Sorry, try again.</p>}
            <input
              autoFocus
              type="password"
              value={sudoPass}
              onChange={(e) => setSudoPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmSudo()}
              className="w-full bg-black border border-vex-border rounded px-3 py-2 text-sm text-vex-text outline-none focus:border-[var(--accent)] mb-3"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setSudoOpen(false);
                  setSudoErr(false);
                  setPendingSudo(null);
                }}
                className="px-3 py-1.5 rounded bg-vex-panel2 text-vex-muted hover:text-vex-text"
              >
                Cancel
              </button>
              <button onClick={confirmSudo} className="px-3 py-1.5 rounded vex-accent-bg text-black font-semibold">
                Authenticate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
