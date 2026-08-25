"use client";

import { useEffect, useState } from "react";
import { useUiStore } from "@/lib/store";

const BOOT_LOG: { text: string; ok?: boolean; delay: number }[] = [
  { text: "vex-loader: initializing static kernel image...", delay: 220 },
  { text: "[  0.000000 ] Vex kernel 6.9.0-static booting on x86_64", delay: 180 },
  { text: "[  0.008112 ] Command line: quiet splash vex.fs=localStorage", delay: 160 },
  { text: "[  0.041233 ] Detected browser runtime, mapping virtual disk /dev/vex0", ok: true, delay: 260 },
  { text: "[  0.099021 ] Mounting root filesystem from localStorage", ok: true, delay: 280 },
  { text: "[  0.154902 ] Starting vexsh shell subsystem", ok: true, delay: 220 },
  { text: "[  0.201044 ] Starting VexBit editor daemon", ok: true, delay: 220 },
  { text: "[  0.238811 ] Starting vex-assistant (groq-backed)", ok: true, delay: 220 },
  { text: "[  0.244881 ] Bringing up window manager (vexwm)", ok: true, delay: 230 },
  { text: "[  0.301209 ] Loading user profile", ok: true, delay: 200 },
  { text: "[  0.340552 ] Reticulating phosphor glow...", ok: true, delay: 220 },
  { text: "vex-loader: boot complete", ok: true, delay: 320 },
];

const TAGLINES = [
  "Vex is a fully simulated Linux desktop — no VM, no ISO, no risk.",
  "Real shell commands. A real code editor. A disk that's just your browser.",
  "Built for people who want to learn Linux by actually touching it.",
];

export default function BootScreen() {
  const setBooted = useUiStore((s) => s.setBooted);
  const [visible, setVisible] = useState<number>(0);
  const [done, setDone] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i += 1;
      setVisible(i);
      if (i < BOOT_LOG.length) {
        setTimeout(tick, BOOT_LOG[i]?.delay ?? 200);
      } else {
        setTimeout(() => !cancelled && setShowIdentity(true), 350);
      }
    };
    setTimeout(tick, BOOT_LOG[0].delay);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showIdentity) return;
    // hold on the identity / credit screen a beat so it actually gets read,
    // then finish booting. `skip()` below lets people bypass all of this.
    const t = setTimeout(() => setDone(true), 3200);
    return () => clearTimeout(t);
  }, [showIdentity]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setBooted(true), 420);
    return () => clearTimeout(t);
  }, [done, setBooted]);

  const skip = () => {
    setDone(true);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col bg-black p-6 md:p-10 font-mono text-[13px] md:text-sm transition-opacity duration-500 ${
        done ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <button
        onClick={skip}
        className="absolute top-5 right-5 md:top-8 md:right-8 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-vex-border text-vex-muted hover:text-vex-text hover:border-[var(--accent)] transition-colors text-[11px]"
      >
        Skip <span className="opacity-60">↵</span>
      </button>

      {!showIdentity ? (
        <div className="flex-1 flex flex-col justify-end">
          <div className="mb-8 select-none">
            <pre className="text-vex-phosphor leading-tight text-[10px] md:text-xs opacity-90">
{`__     __
\\ \\   / /____  __
 \\ \\ / / _ \\ \\/ /
  \\ V /  __/>  <
   \\_/ \\___/_/\\_\\`}
            </pre>
            <p className="mt-2 text-vex-muted tracking-widest text-[10px] md:text-xs">STATIC LINUX KERNEL · BOOTLOADER v1.0</p>
          </div>
          <div className="space-y-1 max-w-3xl">
            {BOOT_LOG.slice(0, visible).map((l, i) => (
              <div key={i} className="boot-line flex items-start gap-2 text-vex-muted">
                {l.ok !== undefined && (
                  <span className={l.ok ? "text-vex-phosphor" : "text-vex-red"}>[{l.ok ? "  OK  " : " FAIL "}]</span>
                )}
                <span className={l.ok ? "text-vex-text" : "text-vex-muted"}>{l.text}</span>
              </div>
            ))}
            {visible < BOOT_LOG.length && <span className="inline-block w-2 h-3.5 bg-vex-phosphor terminal-caret" />}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <pre className="vex-accent vex-accent-glow leading-tight text-2xl md:text-4xl mb-6 select-none">
{`__     __
\\ \\   / /____  __
 \\ \\ / / _ \\ \\/ /
  \\ V /  __/>  <
   \\_/ \\___/_/\\_\\`}
          </pre>
          <p className="font-display text-vex-text text-base md:text-lg mb-1">Vex OS 1.0 · phosphor edition</p>
          <div className="max-w-md space-y-1 my-4">
            {TAGLINES.map((t, i) => (
              <p key={i} className="boot-line text-vex-muted text-[12px] md:text-[13px]" style={{ animationDelay: `${i * 180}ms` }}>
                {t}
              </p>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-vex-muted tracking-[0.2em]">
            BUILT BY <span className="vex-accent">NOUR-YAHYAOUI</span>
          </p>
          <p className="mt-1 text-[10px] text-vex-muted/70">github.com/Nour-yahyaoui/vex</p>
        </div>
      )}
    </div>
  );
}
