"use client";

import { useMemo, useState } from "react";
import { useFsStore } from "@/lib/fsStore";
import { displayPath, getNode, listFilesByExtension, normalize, resolvePath } from "@/lib/filesystem";
import { VexDirNode } from "@/lib/types";
import { Globe, RefreshCw, ShieldAlert, ChevronDown } from "./icons";

function isExternal(href: string): boolean {
  return /^([a-z][a-z0-9+.-]*:)?\/\//i.test(href) || href.startsWith("data:");
}

function resolveAssetPath(htmlPath: string, href: string): string {
  const dir = htmlPath.split("/").slice(0, -1).join("/") || "/";
  return resolvePath(dir, href);
}

// Builds the document we hand to the sandboxed iframe. Local <link rel=
// "stylesheet"> and <script src="..."> tags that point at sibling files in
// the virtual filesystem get inlined (there's no real HTTP server behind
// this filesystem for the iframe to fetch from) — everything else is left
// alone so real external CDN links still work normally.
function buildPreviewDoc(root: VexDirNode, htmlPath: string): { html: string; warnings: string[] } {
  const node = getNode(root, htmlPath);
  const warnings: string[] = [];
  if (!node || node.type !== "file") {
    return { html: "<p style='font-family:sans-serif;padding:2rem;color:#888'>File not found.</p>", warnings };
  }

  let html = node.content;

  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1];
    if (isExternal(href)) return tag;
    const assetPath = resolveAssetPath(htmlPath, href);
    const assetNode = getNode(root, assetPath);
    if (!assetNode || assetNode.type !== "file") {
      warnings.push(`stylesheet not found: ${href}`);
      return `<!-- missing stylesheet: ${href} -->`;
    }
    return `<style>\n${assetNode.content}\n</style>`;
  });

  html = html.replace(/<script\b([^>]*)\ssrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (full, before, href, after) => {
    if (isExternal(href)) return full;
    const assetPath = resolveAssetPath(htmlPath, href);
    const assetNode = getNode(root, assetPath);
    if (!assetNode || assetNode.type !== "file") {
      warnings.push(`script not found: ${href}`);
      return `<!-- missing script: ${href} -->`;
    }
    const attrs = (before + " " + after).replace(/\s+/g, " ").trim();
    return `<script ${attrs}>\n${assetNode.content}\n</script>`;
  });

  return { html, warnings };
}

export default function VexNetBrowser({ initialPath }: { initialPath?: string }) {
  const snapshot = useFsStore((s) => s.snapshot);
  const [selectedPath, setSelectedPath] = useState<string | null>(
    initialPath && getNode(snapshot.root, initialPath)?.type === "file" ? normalize(initialPath) : null
  );
  const [reloadNonce, setReloadNonce] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const htmlFiles = useMemo(
    () => listFilesByExtension(snapshot.root, [".html", ".htm"]).sort(),
    [snapshot.root]
  );

  const doc = useMemo(
    () => (selectedPath ? buildPreviewDoc(snapshot.root, selectedPath) : null),
    [snapshot.root, selectedPath]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-vex-panel rounded-b-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-2 border-b border-vex-border bg-vex-panel2 shrink-0">
        <Globe size={14} className="vex-accent shrink-0" />
        <div className="relative flex-1 min-w-0">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="w-full flex items-center gap-1.5 bg-black/40 border border-vex-border rounded-md px-2.5 py-1.5 text-[12px] text-left text-vex-text/85 hover:border-[var(--accent)] transition-colors"
          >
            <span className="text-vex-muted shrink-0">vexnet://</span>
            <span className="truncate flex-1">{selectedPath ? displayPath(selectedPath) : "no page open"}</span>
            <ChevronDown size={12} className="text-vex-muted shrink-0" />
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className="absolute top-full left-0 mt-1 w-full max-h-56 overflow-y-auto vex-scroll bg-vex-panel border border-vex-border rounded-md shadow-crt z-20">
                {htmlFiles.length === 0 && (
                  <p className="px-3 py-3 text-[11.5px] text-vex-muted">No .html files yet — create one in VexBit.</p>
                )}
                {htmlFiles.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setSelectedPath(p);
                      setPickerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] truncate hover:bg-white/5 ${
                      selectedPath === p ? "vex-accent" : "text-vex-text/85"
                    }`}
                  >
                    {displayPath(p)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setReloadNonce((n) => n + 1)}
          disabled={!selectedPath}
          className="p-1.5 rounded-md hover:bg-white/10 text-vex-muted hover:text-vex-text disabled:opacity-30 shrink-0"
          title="Reload preview"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {doc && doc.warnings.length > 0 && (
        <div className="px-3 py-1 text-[10.5px] text-vex-amber bg-vex-amber/10 border-b border-vex-border shrink-0 truncate">
          {doc.warnings.join(" · ")}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white">
        {selectedPath && doc ? (
          <iframe
            key={`${selectedPath}-${reloadNonce}`}
            title="VexNet preview"
            srcDoc={doc.html}
            // No allow-same-origin: the preview runs in a unique opaque
            // origin, so its scripts can't reach Vex OS's cookies,
            // localStorage, session, or DOM — the standard way to render
            // untrusted/learner HTML safely. allow-scripts/allow-forms/
            // allow-modals cover normal page behavior without allow-
            // top-navigation or allow-popups, so the preview can't hijack
            // or spawn windows outside its frame either.
            sandbox="allow-scripts allow-forms allow-modals"
            referrerPolicy="no-referrer"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6 bg-vex-panel">
            <Globe size={40} className="text-vex-muted/50" />
            <p className="text-vex-muted text-sm">for html preview</p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-1 text-[11.5px] px-3 py-1.5 rounded-md border border-vex-border hover:border-[var(--accent)] hover:text-[var(--accent)] text-vex-muted transition-colors"
            >
              Choose an .html file
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-3 py-1 border-t border-vex-border text-[10px] text-vex-muted shrink-0">
        <ShieldAlert size={11} /> Sandboxed preview — scripts here can't access Vex OS or your account.
      </div>
    </div>
  );
}
