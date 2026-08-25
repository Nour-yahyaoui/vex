"use client";

import { useEffect } from "react";
import { useUiStore, useWindowStore } from "@/lib/store";
import Wallpaper from "./Wallpaper";
import Taskbar from "./Taskbar";
import Window from "./Window";
import Terminal from "./Terminal";
import VexBit from "./VexBit";
import FileManager from "./FileManager";
import SettingsApp from "./SettingsApp";
import Monitor from "./Monitor";
import AboutApp from "./AboutApp";
import VexNetBrowser from "./VexNetBrowser";
import { resolveAppIcon } from "./icons";
import { AppId, WindowState } from "@/lib/types";

const DESKTOP_ICONS: { app: AppId; label: string }[] = [
  { app: "terminal", label: "Terminal" },
  { app: "vexbit", label: "VexBit" },
  { app: "files", label: "Files" },
  { app: "vexnet", label: "VexNet" },
  { app: "monitor", label: "Monitor" },
  { app: "settings", label: "Settings" },
];

function renderApp(app: AppId, openedWith?: WindowState["openedWith"]) {
  switch (app) {
    case "terminal":
      return <Terminal />;
    case "vexbit":
      return <VexBit initialPath={openedWith?.path} initialRoot={openedWith?.root} />;
    case "files":
      return <FileManager initialPath={openedWith?.path} />;
    case "settings":
      return <SettingsApp />;
    case "monitor":
      return <Monitor />;
    case "about":
      return <AboutApp />;
    case "vexnet":
      return <VexNetBrowser initialPath={openedWith?.path} />;
  }
}

export default function Desktop() {
  const windows = useWindowStore((s) => s.windows);
  const openWindow = useWindowStore((s) => s.openWindow);
  const crtEffects = useUiStore((s) => s.crtEffects);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.altKey) return;
      const key = e.key.toLowerCase();
      const shortcut: Record<string, AppId> = {
        t: "terminal",
        e: "vexbit",
        f: "files",
        n: "vexnet",
        s: "settings",
        m: "monitor",
      };
      if (shortcut[key]) {
        e.preventDefault();
        openWindow(shortcut[key]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openWindow]);

  return (
    <div className="fixed inset-0 flex flex-col select-none">
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <Wallpaper />

        <div className="absolute top-5 left-4 flex flex-col gap-1 z-10">
          {DESKTOP_ICONS.map(({ app, label }) => {
            const Icon = resolveAppIcon(app);
            return (
              <button
                key={app}
                onClick={() => openWindow(app)}
                className="w-20 flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-white/10 focus:bg-white/10 outline-none transition-colors group"
              >
                <span className="w-11 h-11 rounded-xl border border-vex-border bg-vex-panel/70 flex items-center justify-center group-hover:border-[var(--accent)] transition-colors">
                  <Icon size={20} className="vex-accent" />
                </span>
                <span className="text-[11px] text-vex-text/85 font-display text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        {windows.map((w) => (
          <Window key={w.id} win={w}>
            {renderApp(w.app, w.openedWith)}
          </Window>
        ))}

        {crtEffects && (
          <>
            <div className="crt-scanlines" />
            <div className="pointer-events-none absolute inset-x-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent animate-scan opacity-40" />
          </>
        )}
      </div>
      <Taskbar />
    </div>
  );
}
