"use client";

import { useState } from "react";
import { useUiStore, AccentColor } from "@/lib/store";
import { useFsStore } from "@/lib/fsStore";

const ACCENTS: { id: AccentColor; label: string; hex: string }[] = [
  { id: "green", label: "Phosphor Green", hex: "#39ff88" },
  { id: "amber", label: "Amber CRT", hex: "#ffb454" },
  { id: "cyan", label: "Cyan Terminal", hex: "#5ad4ff" },
  { id: "violet", label: "Violet Signal", hex: "#b98cff" },
];

export default function SettingsApp() {
  const accent = useUiStore((s) => s.accent);
  const setAccent = useUiStore((s) => s.setAccent);
  const crtEffects = useUiStore((s) => s.crtEffects);
  const setCrtEffects = useUiStore((s) => s.setCrtEffects);
  const snapshot = useFsStore((s) => s.snapshot);
  const setSnapshot = useFsStore((s) => s.setSnapshot);
  const resetFs = useFsStore((s) => s.reset);

  const [newPass, setNewPass] = useState("");
  const [savedMsg, setSavedMsg] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const savePassword = () => {
    if (!newPass) return;
    setSnapshot({ ...snapshot, rootPassword: newPass });
    setSavedMsg(true);
    setNewPass("");
    setTimeout(() => setSavedMsg(false), 2000);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto vex-scroll bg-vex-panel rounded-b-lg p-5 space-y-6">
      <section>
        <h3 className="text-xs uppercase tracking-widest text-vex-muted mb-3">Appearance</h3>
        <div className="grid grid-cols-2 gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                accent === a.id ? "border-[var(--accent)] bg-white/5" : "border-vex-border hover:bg-white/5"
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full" style={{ background: a.hex, boxShadow: `0 0 8px ${a.hex}` }} />
              <span className="text-[12.5px] text-vex-text/90">{a.label}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between mt-4 px-1 cursor-pointer">
          <span className="text-[12.5px] text-vex-text/85">CRT scanlines &amp; vignette</span>
          <input
            type="checkbox"
            checked={crtEffects}
            onChange={(e) => setCrtEffects(e.target.checked)}
            className="accent-[var(--accent)] w-4 h-4"
          />
        </label>
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-widest text-vex-muted mb-3">Account</h3>
        <div className="space-y-2 text-[12.5px]">
          <div className="flex justify-between px-1">
            <span className="text-vex-muted">User</span>
            <span className="text-vex-text/90">{snapshot.user}</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-vex-muted">Hostname</span>
            <span className="text-vex-text/90">{snapshot.hostname}</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            placeholder="new sudo password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="flex-1 bg-black border border-vex-border rounded px-3 py-1.5 text-[12.5px] text-vex-text outline-none focus:border-[var(--accent)]"
          />
          <button onClick={savePassword} className="px-3 py-1.5 rounded vex-accent-bg text-black text-[12.5px] font-semibold">
            Update
          </button>
        </div>
        {savedMsg && <p className="text-[11px] vex-accent mt-1.5">Password updated.</p>}
      </section>

      <section>
        <h3 className="text-xs uppercase tracking-widest text-vex-muted mb-3">Danger zone</h3>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full text-left px-3 py-2.5 rounded-lg border border-vex-red/40 text-vex-red text-[12.5px] hover:bg-vex-red/10 transition-colors"
          >
            Reset virtual disk to defaults
          </button>
        ) : (
          <div className="px-3 py-2.5 rounded-lg border border-vex-red/40 bg-vex-red/10 space-y-2">
            <p className="text-[12px] text-vex-text/85">
              This deletes every file and folder you've created and restores the default Vex OS filesystem. This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  resetFs();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded bg-vex-red text-white text-[12px] font-semibold"
              >
                Yes, reset everything
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 rounded bg-vex-panel2 text-vex-muted text-[12px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
