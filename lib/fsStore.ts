"use client";

import { create } from "zustand";
import { defaultSnapshot, loadSnapshot, saveSnapshot } from "./filesystem";
import { VexFsSnapshot } from "./types";

interface FsStore {
  snapshot: VexFsSnapshot;
  hydrated: boolean;
  hydrate: () => void;
  setSnapshot: (s: VexFsSnapshot) => void;
  reset: () => void;
}

export const useFsStore = create<FsStore>((set) => ({
  snapshot: defaultSnapshot(),
  hydrated: false,
  hydrate: () => set({ snapshot: loadSnapshot(), hydrated: true }),
  setSnapshot: (s) => {
    saveSnapshot(s);
    set({ snapshot: s });
  },
  reset: () => {
    const s = defaultSnapshot();
    saveSnapshot(s);
    set({ snapshot: s });
  },
}));
