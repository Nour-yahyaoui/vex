"use client";

import { useState } from "react";
import { useFsStore } from "@/lib/fsStore";
import { useWindowStore } from "@/lib/store";
import { countAll, displayPath, getNode, listDir, normalize, removeNode, resolvePath } from "@/lib/filesystem";
import { Folder, FileText, Trash2, ChevronRight, Code2, Globe } from "./icons";

const ROOT_PATH = "/home/user";

export default function FileManager({ initialPath }: { initialPath?: string }) {
  const snapshot = useFsStore((s) => s.snapshot);
  const setSnapshot = useFsStore((s) => s.setSnapshot);
  const openWindow = useWindowStore((s) => s.openWindow);
  const [path, setPath] = useState(initialPath ?? ROOT_PATH);

  const res = listDir(snapshot.root, path);
  const entries = res.entries ?? [];
  const crumbs = path === "/" ? ["/"] : ["/", ...path.split("/").filter(Boolean)];

  const goTo = (idx: number) => {
    if (idx === 0) return setPath("/");
    const p = "/" + crumbs.slice(1, idx + 1).join("/");
    setPath(normalize(p));
  };

  const remove = (name: string) => {
    const target = resolvePath(path, name);
    const r = removeNode(snapshot.root, target, true);
    if (r.ok && r.root) setSnapshot({ ...snapshot, root: r.root });
  };

  const openEntry = (name: string, isDir: boolean) => {
    const full = resolvePath(path, name);
    if (isDir) {
      setPath(full);
      return;
    }
    if (name.toLowerCase().endsWith(".html") || name.toLowerCase().endsWith(".htm")) {
      openWindow("vexnet", { path: full });
    } else {
      openWindow("vexbit", { path: full });
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-vex-panel rounded-b-lg overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-vex-border text-[12px] text-vex-muted overflow-x-auto vex-scroll shrink-0">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <button onClick={() => goTo(i)} className="hover:vex-accent hover:text-[var(--accent)] transition-colors">
                {c === "/" ? "root" : c}
              </button>
              {i < crumbs.length - 1 && <ChevronRight size={11} />}
            </span>
          ))}
        </div>
        <button
          onClick={() => openWindow("vexbit", { root: path })}
          className="flex items-center gap-1 shrink-0 text-[11px] px-2 py-1 rounded-md border border-vex-border hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          title="Open this folder scoped in VexBit"
        >
          <Code2 size={11} /> Open in VexBit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto vex-scroll p-2">
        {entries.length === 0 && <p className="text-center text-vex-muted text-sm py-10">This folder is empty.</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
          {entries.map(([name, node]) => {
            const isDir = node.type === "dir";
            const isHtml = !isDir && (name.toLowerCase().endsWith(".html") || name.toLowerCase().endsWith(".htm"));
            const info = countAll(node);
            return (
              <div
                key={name}
                className="group relative flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-white/5 cursor-pointer text-center"
                onDoubleClick={() => openEntry(name, isDir)}
                title={isDir ? `${info.files} files` : `${info.bytes} bytes`}
              >
                {isDir ? (
                  <Folder size={30} className="text-vex-cyan" />
                ) : isHtml ? (
                  <Globe size={30} className="text-vex-cyan" />
                ) : (
                  <FileText size={30} className="text-vex-muted" />
                )}
                <span className="text-[11px] text-vex-text/85 break-all leading-tight">{name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(name);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-vex-panel2 text-vex-muted hover:text-vex-red transition-opacity"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-vex-border text-[10px] text-vex-muted shrink-0">
        {displayPath(path)} · {entries.length} item{entries.length === 1 ? "" : "s"} · double-click to open (.html → VexNet, everything else → VexBit)
      </div>
    </div>
  );
}

