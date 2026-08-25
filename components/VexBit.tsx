"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFsStore } from "@/lib/fsStore";
import { useWindowStore } from "@/lib/store";
import {
  displayPath,
  getNode,
  mkdir,
  normalize,
  removeNode,
  resolvePath,
  writeFile,
} from "@/lib/filesystem";
import { VexDirNode, VexNode } from "@/lib/types";
import { runVexPy } from "@/lib/vexpy";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FilePlus,
  FolderPlus,
  Folder,
  Play,
  Save,
  Trash2,
  Cloud,
  Zap,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  GripHorizontal,
  X,
  Globe,
} from "./icons";
import AiAssistant from "./AiAssistant";

const DEFAULT_ROOT = "/home/user";
const SIDEBAR_MIN = 150;
const SIDEBAR_MAX = 440;
const CONSOLE_MIN = 90;
const CONSOLE_MAX = 420;

interface Tab {
  path: string;
  buffer: string;
  dirty: boolean;
}

function langOf(path: string): string {
  if (path.endsWith(".py")) return "python";
  if (path.endsWith(".sh")) return "bash";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".html") || path.endsWith(".htm")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "javascript";
  return "text";
}

function highlight(line: string, lang: string): React.ReactNode {
  if (lang !== "python") return line;
  const tokens = line.split(/(#.*$|"[^"]*"|'[^']*'|\b(?:def|class|for|while|if|elif|else|return|import|from|in|and|or|not|True|False|None|print|range)\b)/g);
  return tokens.map((tok, i) => {
    if (!tok) return null;
    if (tok.startsWith("#")) return <span key={i} className="text-vex-muted">{tok}</span>;
    if (/^["'].*["']$/.test(tok)) return <span key={i} className="text-vex-amber">{tok}</span>;
    if (/^(def|class|for|while|if|elif|else|return|import|from|in|and|or|not)$/.test(tok))
      return <span key={i} className="text-vex-violet">{tok}</span>;
    if (/^(True|False|None)$/.test(tok)) return <span key={i} className="text-vex-cyan">{tok}</span>;
    if (/^(print|range)$/.test(tok)) return <span key={i} className="vex-accent">{tok}</span>;
    return <span key={i}>{tok}</span>;
  });
}

function FileTree({
  root,
  path,
  depth,
  selected,
  onSelect,
  expanded,
  toggle,
}: {
  root: VexDirNode;
  path: string;
  depth: number;
  selected: string | null;
  onSelect: (p: string) => void;
  expanded: Set<string>;
  toggle: (p: string) => void;
}) {
  const node = getNode(root, path);
  if (!node || node.type !== "dir") return null;
  const entries = Object.entries(node.children).sort((a, b) => {
    const ad = a[1].type === "dir" ? 0 : 1;
    const bd = b[1].type === "dir" ? 0 : 1;
    return ad !== bd ? ad - bd : a[0].localeCompare(b[0]);
  });
  return (
    <div>
      {entries.map(([name, child]) => {
        const childPath = normalize(path + "/" + name);
        const isDir = child.type === "dir";
        const isOpen = expanded.has(childPath);
        return (
          <div key={childPath}>
            <button
              onClick={() => (isDir ? toggle(childPath) : onSelect(childPath))}
              style={{ paddingLeft: 10 + depth * 14 }}
              className={`w-full flex items-center gap-1.5 py-1.5 sm:py-1 pr-2 text-[12.5px] rounded hover:bg-white/5 transition-colors ${
                selected === childPath ? "bg-white/[0.07] vex-accent" : "text-vex-text/85"
              }`}
            >
              {isDir ? (
                isOpen ? <ChevronDown size={12} className="shrink-0 text-vex-muted" /> : <ChevronRight size={12} className="shrink-0 text-vex-muted" />
              ) : (
                <span className="w-3 shrink-0" />
              )}
              {isDir ? <Folder size={13} className="shrink-0 text-vex-cyan" /> : <FileText size={13} className="shrink-0 text-vex-muted" />}
              <span className="truncate">{name}</span>
            </button>
            {isDir && isOpen && (
              <FileTree
                root={root}
                path={childPath}
                depth={depth + 1}
                selected={selected}
                onSelect={onSelect}
                expanded={expanded}
                toggle={toggle}
              />
            )}
          </div>
        );
      })}
      {entries.length === 0 && depth > 0 && (
        <p style={{ paddingLeft: 10 + depth * 14 }} className="text-[11px] text-vex-muted py-1">
          empty
        </p>
      )}
    </div>
  );
}

export default function VexBit({ initialPath, initialRoot }: { initialPath?: string; initialRoot?: string }) {
  const snapshot = useFsStore((s) => s.snapshot);
  const setSnapshot = useFsStore((s) => s.setSnapshot);
  const openWindow = useWindowStore((s) => s.openWindow);

  // A directory passed in (e.g. `vexbit Projects/site` in the terminal, or
  // "Open in VexBit" on a folder in Files) scopes the whole file tree to
  // that folder instead of showing the entire simulated OS — "open this
  // project" rather than "open every file on the machine".
  const scopeRoot = initialRoot ?? DEFAULT_ROOT;
  const scopeLabel = scopeRoot === DEFAULT_ROOT ? "home" : scopeRoot.split("/").pop() || scopeRoot;

  const [expanded, setExpanded] = useState<Set<string>>(new Set([scopeRoot]));
  const [selected, setSelected] = useState<string | null>(initialPath ?? null);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [console_, setConsole] = useState<{ ok: boolean; text: string } | null>(null);
  const [newModal, setNewModal] = useState<{ kind: "file" | "folder"; base: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [runMode, setRunMode] = useState<"vexpy" | "sandbox">("vexpy");
  const [running, setRunning] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Sidebar + console panel are resizable (drag the divider) and
  // collapsible, the same interaction model as VS Code's explorer and
  // integrated terminal/output panel. Defaults to collapsed on narrow
  // screens since a fixed 208px sidebar eats most of a phone-width window.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );
  const [sidebarWidth, setSidebarWidth] = useState(208);
  const [consoleHeight, setConsoleHeight] = useState(160);
  const sidebarDrag = useRef<{ startX: number; startW: number; pointerId: number } | null>(null);
  const consoleDrag = useRef<{ startY: number; startH: number; pointerId: number } | null>(null);

  const openFile = (path: string) => {
    const node = getNode(snapshot.root, path);
    if (!node || node.type !== "file") return;
    setSelected(path);
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) return prev;
      return [...prev, { path, buffer: node.content, dirty: false }];
    });
    setActivePath(path);
    setConsole(null);
  };

  useEffect(() => {
    if (initialPath) openFile(initialPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  const toggle = (p: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  const activeTab = tabs.find((t) => t.path === activePath) ?? null;
  const activeLang = activeTab ? langOf(activeTab.path) : null;

  const updateBuffer = (val: string) => {
    if (!activePath) return;
    setTabs((prev) => prev.map((t) => (t.path === activePath ? { ...t, buffer: val, dirty: true } : t)));
  };

  const save = (path?: string) => {
    const target = path ?? activePath;
    const tab = tabs.find((t) => t.path === target);
    if (!tab) return;
    const res = writeFile(snapshot.root, tab.path, tab.buffer);
    if (res.ok && res.root) {
      setSnapshot({ ...snapshot, root: res.root });
      setTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, dirty: false } : t)));
    }
  };

  const closeTab = (path: string) => {
    setTabs((prev) => prev.filter((t) => t.path !== path));
    if (activePath === path) {
      const remaining = tabs.filter((t) => t.path !== path);
      setActivePath(remaining.length ? remaining[remaining.length - 1].path : null);
    }
  };

  const runActive = async () => {
    if (!activeTab) return;
    if (activeTab.dirty) save();
    const lang = langOf(activeTab.path);

    // HTML has nowhere meaningful to "run" inside VexBit itself — hand off
    // to VexNet, which renders it in a sandboxed preview iframe.
    if (lang === "html") {
      openWindow("vexnet", { path: activeTab.path });
      setConsole({ ok: true, text: "Opened in VexNet for preview." });
      return;
    }
    if (lang === "css") {
      setConsole({ ok: false, text: "A .css file has nothing to run on its own — open the .html file that links it and preview that." });
      return;
    }

    if (runMode === "sandbox") {
      if (lang !== "python" && lang !== "javascript") {
        setConsole({ ok: false, text: "Sandbox mode can run .py and .js files. Rename or pick another file." });
        return;
      }
      setRunning(true);
      setConsole({ ok: true, text: "Booting a Vercel Sandbox and running your script..." });
      try {
        const res = await fetch("/api/sandbox/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: activeTab.buffer, language: lang === "python" ? "python" : "javascript" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setConsole({ ok: false, text: data.error ?? `Sandbox run failed (${res.status}).` });
        } else {
          const parts = [data.stdout, data.stderr && `--- stderr ---\n${data.stderr}`].filter(Boolean);
          setConsole({
            ok: data.exitCode === 0,
            text: parts.join("\n").trim() || "(script ran with no output)",
          });
        }
      } catch (e: any) {
        setConsole({ ok: false, text: e?.message ?? "Could not reach the sandbox API." });
      } finally {
        setRunning(false);
      }
      return;
    }

    if (lang !== "python") {
      setConsole({ ok: false, text: "vexpy (instant mode) can only run .py files. Switch to Sandbox mode for .js, or Preview for .html." });
      return;
    }
    const result = runVexPy(activeTab.buffer);
    if (result.error) {
      setConsole({ ok: false, text: [...result.output, `Traceback: ${result.error}`].join("\n") });
    } else {
      setConsole({ ok: true, text: result.output.length ? result.output.join("\n") : "(script ran with no output)" });
    }
  };

  const deleteSelected = () => {
    if (!selected) return;
    const res = removeNode(snapshot.root, selected, true);
    if (res.ok && res.root) {
      setSnapshot({ ...snapshot, root: res.root });
      closeTab(selected);
      setSelected(null);
    }
  };

  const openNewModal = (kind: "file" | "folder") => {
    let base = scopeRoot;
    if (selected) {
      const node = getNode(snapshot.root, selected);
      base = node?.type === "dir" ? selected : selected.split("/").slice(0, -1).join("/") || scopeRoot;
    }
    setNewModal({ kind, base });
    setNewName(kind === "file" ? "untitled.py" : "new-folder");
    setTimeout(() => nameRef.current?.select(), 50);
  };

  const confirmNew = () => {
    if (!newModal || !newName.trim()) return;
    const path = resolvePath(newModal.base, newName.trim());
    if (newModal.kind === "folder") {
      const res = mkdir(snapshot.root, path, true);
      if (res.ok && res.root) {
        setSnapshot({ ...snapshot, root: res.root });
        setExpanded((prev) => new Set(prev).add(newModal.base).add(path));
      }
    } else {
      const scaffold = newName.trim().endsWith(".py") ? "# new vex script\nprint(\"hello from VexBit\")\n" : "";
      const res = writeFile(snapshot.root, path, scaffold);
      if (res.ok && res.root) {
        setSnapshot({ ...snapshot, root: res.root });
        setExpanded((prev) => new Set(prev).add(newModal.base));
        openFile(path);
      }
    }
    setNewModal(null);
  };

  const lineNumbers = useMemo(() => {
    const n = (activeTab?.buffer ?? "").split("\n").length;
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [activeTab?.buffer]);

  // --- Resizable panels (pointer events cover mouse + touch/pen alike) ---
  const onSidebarHandleDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    sidebarDrag.current = { startX: e.clientX, startW: sidebarWidth, pointerId: e.pointerId };
  };
  const onSidebarHandleMove = (e: React.PointerEvent) => {
    if (!sidebarDrag.current || sidebarDrag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - sidebarDrag.current.startX;
    setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, sidebarDrag.current.startW + dx)));
  };
  const onSidebarHandleUp = () => {
    sidebarDrag.current = null;
  };

  const onConsoleHandleDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    consoleDrag.current = { startY: e.clientY, startH: consoleHeight, pointerId: e.pointerId };
  };
  const onConsoleHandleMove = (e: React.PointerEvent) => {
    if (!consoleDrag.current || consoleDrag.current.pointerId !== e.pointerId) return;
    const dy = e.clientY - consoleDrag.current.startY;
    // dragging up (negative dy) should grow the panel since it's anchored to the bottom
    setConsoleHeight(Math.min(CONSOLE_MAX, Math.max(CONSOLE_MIN, consoleDrag.current.startH - dy)));
  };
  const onConsoleHandleUp = () => {
    consoleDrag.current = null;
  };

  return (
    <div className="flex-1 min-h-0 flex bg-vex-panel rounded-b-lg overflow-hidden relative">
      {sidebarCollapsed ? (
        <div className="shrink-0 w-9 border-r border-vex-border bg-vex-panel2 flex flex-col items-center py-2">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-1.5 rounded hover:bg-white/10 text-vex-muted hover:text-vex-text"
            title="Show file explorer"
          >
            <PanelLeft size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="shrink-0 border-r border-vex-border flex flex-col bg-vex-panel2 min-h-0" style={{ width: sidebarWidth }}>
            <div className="flex items-center gap-1 p-2 border-b border-vex-border">
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded bg-vex-panel hover:bg-white/10 text-vex-muted hover:text-vex-text shrink-0"
                title="Collapse file explorer"
              >
                <PanelLeftClose size={13} />
              </button>
              <button
                onClick={() => openNewModal("file")}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded bg-vex-panel hover:bg-white/10 text-vex-text/80"
                title="New file"
              >
                <FilePlus size={12} /> File
              </button>
              <button
                onClick={() => openNewModal("folder")}
                className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded bg-vex-panel hover:bg-white/10 text-vex-text/80"
                title="New folder"
              >
                <FolderPlus size={12} /> Folder
              </button>
              <button
                onClick={deleteSelected}
                disabled={!selected}
                className="p-1.5 rounded bg-vex-panel hover:bg-vex-red/80 text-vex-muted hover:text-white disabled:opacity-30"
                title="Delete selected"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="px-2.5 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wider text-vex-muted truncate shrink-0" title={displayPath(scopeRoot)}>
              {scopeLabel}
            </div>
            <div className="flex-1 overflow-y-auto vex-scroll py-1">
              <FileTree
                root={snapshot.root}
                path={scopeRoot}
                depth={0}
                selected={selected}
                onSelect={(p) => {
                  setSelected(p);
                  openFile(p);
                }}
                expanded={expanded}
                toggle={toggle}
              />
            </div>
            <div className="p-2 border-t border-vex-border text-[10px] text-vex-muted truncate">
              {selected ? displayPath(selected) : "no file selected"}
            </div>
          </div>

          {/* Sidebar resize handle */}
          <div
            onPointerDown={onSidebarHandleDown}
            onPointerMove={onSidebarHandleMove}
            onPointerUp={onSidebarHandleUp}
            onPointerCancel={onSidebarHandleUp}
            className="w-1.5 shrink-0 cursor-col-resize hover:bg-[var(--accent)]/40 active:bg-[var(--accent)]/60 transition-colors touch-none"
            title="Drag to resize"
          />
        </>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center border-b border-vex-border bg-vex-panel2 overflow-x-auto vex-scroll shrink-0">
          {tabs.map((t) => (
            <button
              key={t.path}
              onClick={() => setActivePath(t.path)}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] border-r border-vex-border whitespace-nowrap ${
                activePath === t.path ? "bg-vex-panel text-vex-text" : "text-vex-muted hover:text-vex-text/80"
              }`}
            >
              <FileText size={11} />
              {t.path.split("/").pop()}
              {t.dirty && <span className="w-1.5 h-1.5 rounded-full vex-accent-bg" />}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.path);
                }}
                className="ml-1 text-vex-muted hover:text-vex-red"
              >
                ×
              </span>
            </button>
          ))}
          {tabs.length === 0 && <span className="px-3 py-2 text-[12px] text-vex-muted">No file open — create or select one</span>}
          <div className="ml-auto flex items-center gap-1 pr-2">
            {activeLang !== "html" && (
              <div className="hidden sm:flex items-center rounded-md border border-vex-border overflow-hidden mr-1">
                <button
                  onClick={() => setRunMode("vexpy")}
                  title="Instant local Python subset — free, no network"
                  className={`flex items-center gap-1 px-2 py-1 text-[10.5px] transition-colors ${
                    runMode === "vexpy" ? "bg-white/10 text-vex-text" : "text-vex-muted hover:text-vex-text/80"
                  }`}
                >
                  <Zap size={10} /> vexpy
                </button>
                <button
                  onClick={() => setRunMode("sandbox")}
                  title="Real Python/JS execution via Vercel Sandbox"
                  className={`flex items-center gap-1 px-2 py-1 text-[10.5px] transition-colors ${
                    runMode === "sandbox" ? "bg-white/10 text-vex-text" : "text-vex-muted hover:text-vex-text/80"
                  }`}
                >
                  <Cloud size={10} /> sandbox
                </button>
              </div>
            )}
            <button
              onClick={() => save()}
              disabled={!activeTab}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded hover:bg-white/10 text-vex-text/80 disabled:opacity-30"
            >
              <Save size={12} /> Save
            </button>
            <button
              onClick={runActive}
              disabled={!activeTab || running || activeLang === "css"}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded vex-accent-bg text-black font-semibold disabled:opacity-30"
            >
              {running ? (
                <Loader2 size={12} className="animate-spin" />
              ) : activeLang === "html" ? (
                <Globe size={12} />
              ) : (
                <Play size={12} />
              )}
              {activeLang === "html" ? "Preview" : "Run"}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          {activeTab ? (
            <>
              <div className="select-none text-right text-[12px] leading-[1.6] text-vex-muted/50 py-3 px-2 bg-vex-panel/60 font-mono">
                {lineNumbers.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>
              <div className="relative flex-1 min-w-0">
                <pre
                  aria-hidden
                  className="absolute inset-0 m-0 py-3 px-3 text-[12px] leading-[1.6] font-mono whitespace-pre-wrap break-words pointer-events-none overflow-hidden"
                >
                  {activeTab.buffer.split("\n").map((line, i) => (
                    <div key={i}>{highlight(line, langOf(activeTab.path)) ?? "\u00A0"}</div>
                  ))}
                </pre>
                <textarea
                  spellCheck={false}
                  value={activeTab.buffer}
                  onChange={(e) => updateBuffer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const target = e.target as HTMLTextAreaElement;
                      const s = target.selectionStart;
                      const val = activeTab.buffer;
                      updateBuffer(val.slice(0, s) + "    " + val.slice(target.selectionEnd));
                      requestAnimationFrame(() => target.setSelectionRange(s + 4, s + 4));
                    } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                      e.preventDefault();
                      save();
                    }
                  }}
                  className="relative z-10 w-full h-full resize-none bg-transparent text-transparent caret-[var(--accent)] outline-none border-none py-3 px-3 text-[12px] leading-[1.6] font-mono vex-scroll"
                  style={{ WebkitTextFillColor: "transparent" }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-vex-muted text-sm text-center px-4">
              Select a file on the left, or create a new one to start writing.
            </div>
          )}
        </div>

        {console_ && (
          <div className="shrink-0 flex flex-col border-t border-vex-border">
            <div
              onPointerDown={onConsoleHandleDown}
              onPointerMove={onConsoleHandleMove}
              onPointerUp={onConsoleHandleUp}
              onPointerCancel={onConsoleHandleUp}
              className="h-2 shrink-0 flex items-center justify-center cursor-row-resize hover:bg-[var(--accent)]/40 active:bg-[var(--accent)]/60 transition-colors touch-none bg-black/30"
              title="Drag to resize"
            >
              <GripHorizontal size={11} className="text-vex-muted/60" />
            </div>
            <div
              style={{ height: consoleHeight }}
              className={`overflow-y-auto vex-scroll px-3 py-2 text-[12px] font-mono whitespace-pre-wrap ${
                console_.ok ? "bg-black/60" : "bg-vex-red/10"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-wider text-vex-muted">output</p>
                <button
                  onClick={() => setConsole(null)}
                  className="p-0.5 rounded text-vex-muted hover:text-vex-text hover:bg-white/10"
                  title="Close output panel"
                >
                  <X size={12} />
                </button>
              </div>
              <span className={console_.ok ? "text-vex-text/90" : "text-vex-red"}>{console_.text}</span>
            </div>
          </div>
        )}
      </div>

      {newModal && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-vex-panel border border-vex-border rounded-lg p-5 w-full max-w-sm shadow-crt">
            <p className="font-display text-sm text-vex-text mb-1">
              New {newModal.kind === "file" ? "file" : "folder"}
            </p>
            <p className="text-[11px] text-vex-muted mb-3 truncate">in {displayPath(newModal.base)}</p>
            <input
              ref={nameRef}
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmNew()}
              className="w-full bg-black border border-vex-border rounded px-3 py-2 text-sm text-vex-text outline-none focus:border-[var(--accent)] mb-3"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setNewModal(null)} className="px-3 py-1.5 rounded bg-vex-panel2 text-vex-muted hover:text-vex-text">
                Cancel
              </button>
              <button onClick={confirmNew} className="px-3 py-1.5 rounded vex-accent-bg text-black font-semibold">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <AiAssistant />
    </div>
  );
}
