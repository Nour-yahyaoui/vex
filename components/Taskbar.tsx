"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useWindowStore } from "@/lib/store";
import { resolveAppIcon, Github, Star, Power, LogOut, BookOpen } from "./icons";
import { AppId } from "@/lib/types";

const LAUNCHER: { app: AppId; label: string; shortcut: string }[] = [
  { app: "terminal", label: "Terminal", shortcut: "Ctrl+Alt+T" },
  { app: "vexbit", label: "VexBit", shortcut: "Ctrl+Alt+E" },
  { app: "files", label: "Files", shortcut: "Ctrl+Alt+F" },
  { app: "vexnet", label: "VexNet", shortcut: "Ctrl+Alt+N" },
  { app: "monitor", label: "Monitor", shortcut: "Ctrl+Alt+M" },
  { app: "settings", label: "Settings", shortcut: "Ctrl+Alt+S" },
  { app: "about", label: "About", shortcut: "" },
];

export default function Taskbar() {
  const { windows, openWindow, focusWindow, minimizeWindow } = useWindowStore();
  const { data: session } = useSession();
  const [time, setTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1000 * 15);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-13 shrink-0 flex items-center gap-2 px-3 border-t border-vex-border bg-vex-panel/95 backdrop-blur-sm z-[500]" style={{ height: 52 }}>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
        >
          <span className="w-5 h-5 rounded flex items-center justify-center vex-accent-bg text-black font-display font-bold text-[11px]">
            V
          </span>
          <span className="text-[12px] font-display text-vex-text/90 hidden sm:inline">Vex</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-12 left-0 w-56 bg-vex-panel border border-vex-border rounded-lg shadow-crt overflow-hidden z-20">
              <p className="px-3 pt-2.5 pb-1.5 text-[10px] uppercase tracking-widest text-vex-muted">Applications</p>
              {LAUNCHER.map(({ app, label, shortcut }) => {
                const Icon = resolveAppIcon(app);
                return (
                  <button
                    key={app}
                    onClick={() => {
                      openWindow(app);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-vex-text/85 hover:bg-white/5 transition-colors"
                  >
                    <Icon size={14} className="vex-accent" />
                    <span className="flex-1 text-left">{label}</span>
                    {shortcut && <span className="text-[9.5px] text-vex-muted tracking-wide">{shortcut}</span>}
                  </button>
                );
              })}
              <div className="border-t border-vex-border mt-1">
                <a
                  href="/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-vex-text/85 hover:bg-white/5 transition-colors"
                >
                  <BookOpen size={14} className="vex-accent" />
                  <span className="flex-1 text-left">Documentation</span>
                </a>
              </div>
              <div className="border-t border-vex-border mt-1 px-3 py-2 flex items-center gap-2 text-[11px] text-vex-muted">
                <Power size={12} /> Vex OS 1.0 · runs entirely offline
              </div>
            </div>
          </>
        )}
      </div>

      <div className="h-6 w-px bg-vex-border mx-1 hidden sm:block" />

      <div className="flex items-center gap-1 overflow-x-auto vex-scroll flex-1 min-w-0">
        {windows.map((w) => {
          const Icon = resolveAppIcon(w.app);
          return (
            <button
              key={w.id}
              onClick={() => (w.minimized ? focusWindow(w.id) : minimizeWindow(w.id))}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] whitespace-nowrap shrink-0 transition-colors ${
                w.minimized ? "text-vex-muted hover:bg-white/5" : "bg-white/[0.07] text-vex-text/90"
              }`}
            >
              <Icon size={12} className={w.minimized ? "" : "vex-accent"} />
              <span className="max-w-[110px] truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      <div className="hidden md:flex items-center gap-3 pr-2 shrink-0">
        <a
          href="https://github.com/Nour-yahyaoui"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11px] text-vex-muted hover:text-vex-text transition-colors"
        >
          <Github size={12} /> nour-yahyaoui
        </a>
        <a
          href="https://github.com/Nour-yahyaoui/vex"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-vex-border hover:border-[var(--accent)] hover:text-[var(--accent)] text-vex-muted transition-colors"
        >
          <Star size={11} /> Star /vex
        </a>
      </div>

      {session?.user && (
        <div className="relative shrink-0">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-white/5 transition-colors"
          >
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-6 h-6 rounded-full border border-vex-border" />
            ) : (
              <span className="w-6 h-6 rounded-full vex-accent-bg text-black flex items-center justify-center text-[10px] font-bold">
                {(session.user.name ?? "V")[0]}
              </span>
            )}
          </button>
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-12 right-0 w-52 bg-vex-panel border border-vex-border rounded-lg shadow-crt overflow-hidden z-20">
                <div className="px-3 py-2.5 border-b border-vex-border">
                  <p className="text-[12px] text-vex-text truncate">{session.user.name}</p>
                  <p className="text-[10.5px] text-vex-muted truncate">{session.user.email}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-vex-red hover:bg-white/5 transition-colors"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="text-[11.5px] text-vex-muted font-mono tabular-nums pl-2 border-l border-vex-border ml-1 shrink-0">
        {time}
      </div>
    </div>
  );
}
