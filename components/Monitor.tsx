"use client";

import { useEffect, useState } from "react";
import { useFsStore } from "@/lib/fsStore";
import { countAll } from "@/lib/filesystem";
import { Cpu, HardDrive, Activity } from "./icons";

function useNow(intervalMs: number) {
  const [t, setT] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return t;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  );
}

export default function Monitor() {
  const snapshot = useFsStore((s) => s.snapshot);
  const info = countAll(snapshot.root);
  const now = useNow(2000);
  const [bootAt] = useState(() => Date.now());
  const uptime = Math.floor((now - bootAt) / 1000);
  const [cpu, setCpu] = useState(6);
  const [mem, setMem] = useState(18);

  useEffect(() => {
    const id = setInterval(() => {
      setCpu(Math.max(3, Math.min(34, cpu + (Math.random() * 10 - 5))));
      setMem(Math.max(12, Math.min(40, mem + (Math.random() * 4 - 2))));
    }, 1800);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpu, mem]);

  const diskTotal = 5 * 1024 * 1024;
  const diskPct = (info.bytes / diskTotal) * 100;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto vex-scroll bg-vex-panel rounded-b-lg p-5 space-y-5 font-mono">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Cpu size={13} className="vex-accent" />
          <span className="text-[12.5px] text-vex-text/90">vexsh process (this shell)</span>
          <span className="ml-auto text-[12px] text-vex-muted">{cpu.toFixed(1)}%</span>
        </div>
        <Bar pct={cpu} color="var(--accent)" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Activity size={13} className="text-vex-cyan" />
          <span className="text-[12.5px] text-vex-text/90">Simulated memory</span>
          <span className="ml-auto text-[12px] text-vex-muted">{mem.toFixed(1)}%</span>
        </div>
        <Bar pct={mem} color="#5ad4ff" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <HardDrive size={13} className="text-vex-amber" />
          <span className="text-[12.5px] text-vex-text/90">/dev/vex0 (localStorage)</span>
          <span className="ml-auto text-[12px] text-vex-muted">{diskPct.toFixed(2)}%</span>
        </div>
        <Bar pct={diskPct} color="#ffb454" />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {[
          ["Uptime", `${uptime}s`],
          ["Files", `${info.files}`],
          ["Directories", `${info.dirs}`],
          ["Disk used", `${info.bytes} B`],
        ].map(([label, val]) => (
          <div key={label} className="rounded-lg border border-vex-border bg-black/30 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-vex-muted">{label}</p>
            <p className="text-[15px] text-vex-text mt-0.5">{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-vex-border bg-black/30 px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-wider text-vex-muted mb-1.5">Processes</p>
        <div className="text-[12px] space-y-1 text-vex-text/85">
          <div className="flex justify-between"><span>vexwm</span><span className="text-vex-muted">window manager</span></div>
          <div className="flex justify-between"><span>vexsh</span><span className="text-vex-muted">shell</span></div>
          <div className="flex justify-between"><span>vexbit-d</span><span className="text-vex-muted">editor daemon</span></div>
        </div>
      </div>
    </div>
  );
}
