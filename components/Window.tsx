"use client";

import { useRef } from "react";
import { WindowState } from "@/lib/types";
import { useWindowStore } from "@/lib/store";
import { resolveAppIcon, X, Minus, Square, Copy } from "./icons";

interface Props {
  win: WindowState;
  children: React.ReactNode;
}

export default function Window({ win, children }: Props) {
  const { closeWindow, focusWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow } = useWindowStore();
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
  const Icon = resolveAppIcon(win.app);

  const onHeaderDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (win.maximized) return;
    focusWindow(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      moveWindow(win.id, Math.max(0, dragRef.current.origX + dx), Math.max(0, dragRef.current.origY + dy));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (win.maximized) return;
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: win.w, origH: win.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      resizeWindow(win.id, Math.max(360, resizeRef.current.origW + dx), Math.max(260, resizeRef.current.origH + dy));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  if (win.minimized) return null;

  const style = win.maximized
    ? { left: 0, top: 0, width: "100vw", height: "calc(100vh - 52px)", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <div
      className={`vex-window-mobile absolute flex flex-col bg-vex-panel/95 backdrop-blur-sm border border-vex-border shadow-crt ${
        win.maximized ? "rounded-none" : "rounded-lg"
      } animate-bootIn`}
      style={style}
      onMouseDown={() => focusWindow(win.id)}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b border-vex-border bg-vex-panel2 select-none cursor-move ${
          win.maximized ? "rounded-none" : "rounded-t-lg"
        }`}
        onMouseDown={onHeaderDown}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="vex-accent shrink-0" />
          <span className="text-xs text-vex-text/90 font-display truncate">{win.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => minimizeWindow(win.id)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-vex-muted hover:text-vex-amber transition-colors"
            aria-label="Minimize"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => toggleMaximize(win.id)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-vex-muted hover:text-vex-cyan transition-colors"
            aria-label="Maximize"
          >
            {win.maximized ? <Copy size={11} /> : <Square size={11} />}
          </button>
          <button
            onClick={() => closeWindow(win.id)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-vex-red text-vex-muted hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      {!win.maximized && (
        <div
          onMouseDown={onResizeDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          style={{
            background:
              "linear-gradient(135deg, transparent 0%, transparent 50%, var(--accent) 50%, var(--accent) 60%, transparent 60%)",
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
}
