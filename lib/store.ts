"use client";

import { create } from "zustand";
import { AppId, WindowState } from "./types";

let zCounter = 10;
let idCounter = 0;

function uid(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

interface OpenOptions {
  path?: string;
  root?: string;
  title?: string;
}

const APP_META: Record<AppId, { title: string; icon: string; w: number; h: number }> = {
  terminal: { title: "Terminal", icon: "terminal", w: 780, h: 480 },
  vexbit: { title: "VexBit", icon: "code", w: 900, h: 580 },
  files: { title: "Files", icon: "folder", w: 640, h: 460 },
  settings: { title: "Settings", icon: "settings", w: 560, h: 500 },
  monitor: { title: "System Monitor", icon: "activity", w: 560, h: 440 },
  about: { title: "About Vex OS", icon: "info", w: 480, h: 420 },
  vexnet: { title: "VexNet", icon: "globe", w: 760, h: 560 },
};

interface WindowStore {
  windows: WindowState[];
  openWindow: (app: AppId, opts?: OpenOptions) => string;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;
  updateTitle: (id: string, title: string) => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  openWindow: (app, opts) => {
    const meta = APP_META[app];
    const existing = get().windows.find(
      (w) => w.app === app && app !== "vexbit" && app !== "files" && app !== "vexnet"
    );
    if (existing) {
      set((s) => ({
        windows: s.windows.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z: ++zCounter } : w
        ),
      }));
      return existing.id;
    }
    const count = get().windows.length;
    const id = uid(app);
    const win: WindowState = {
      id,
      app,
      title: opts?.title ?? meta.title,
      icon: meta.icon,
      x: 60 + (count % 6) * 28,
      y: 40 + (count % 6) * 26,
      w: meta.w,
      h: meta.h,
      z: ++zCounter,
      minimized: false,
      maximized: false,
      openedWith: opts?.path || opts?.root ? { path: opts.path, root: opts.root } : undefined,
    };
    set((s) => ({ windows: [...s.windows, win] }));
    return id;
  },
  closeWindow: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
  focusWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, z: ++zCounter, minimized: false } : w)),
    })),
  minimizeWindow: (id) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) })),
  toggleMaximize: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          const prev = w.prev ?? { x: w.x, y: w.y, w: w.w, h: w.h };
          return { ...w, maximized: false, ...prev, z: ++zCounter };
        }
        return {
          ...w,
          maximized: true,
          prev: { x: w.x, y: w.y, w: w.w, h: w.h },
          z: ++zCounter,
        };
      }),
    })),
  moveWindow: (id, x, y) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) })),
  resizeWindow: (id, w, h) =>
    set((s) => ({ windows: s.windows.map((win) => (win.id === id ? { ...win, w, h } : win)) })),
  updateTitle: (id, title) =>
    set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, title } : w)) })),
}));

export type AccentColor = "green" | "amber" | "cyan" | "violet";

interface UiStore {
  booted: boolean;
  setBooted: (v: boolean) => void;
  accent: AccentColor;
  setAccent: (a: AccentColor) => void;
  crtEffects: boolean;
  setCrtEffects: (v: boolean) => void;
}

const SETTINGS_KEY = "vexos:settings:v1";

function loadSettings(): { accent: AccentColor; crtEffects: boolean } {
  if (typeof window === "undefined") return { accent: "green", crtEffects: true };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { accent: "green", crtEffects: true };
    return JSON.parse(raw);
  } catch {
    return { accent: "green", crtEffects: true };
  }
}

function persistSettings(accent: AccentColor, crtEffects: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ accent, crtEffects }));
}

const initialSettings = loadSettings();

export const useUiStore = create<UiStore>((set, get) => ({
  booted: false,
  setBooted: (v) => set({ booted: v }),
  accent: initialSettings.accent,
  setAccent: (a) => {
    set({ accent: a });
    persistSettings(a, get().crtEffects);
  },
  crtEffects: initialSettings.crtEffects,
  setCrtEffects: (v) => {
    set({ crtEffects: v });
    persistSettings(get().accent, v);
  },
}));
