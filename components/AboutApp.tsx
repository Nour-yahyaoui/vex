"use client";

import { Github, Star, BookOpen } from "./icons";

export default function AboutApp() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto vex-scroll bg-vex-panel rounded-b-lg p-6 flex flex-col items-center text-center">
      <pre className="vex-accent text-[10px] leading-tight mb-4 opacity-90">
{`__     __
\\ \\   / /____  __
 \\ \\ / / _ \\ \\/ /
  \\ V /  __/>  <
   \\_/ \\___/_/\\_\\`}
      </pre>
      <h2 className="font-display text-lg text-vex-text mb-1">Vex OS</h2>
      <p className="text-[12px] text-vex-muted mb-5">version 1.0 · phosphor edition</p>
      <p className="text-[12.5px] text-vex-text/80 leading-relaxed max-w-xs mb-6">
        A fully simulated Linux desktop for learning the shell without a VM, an ISO, or any risk to your machine.
        Every file lives in your browser&apos;s localStorage.
      </p>
      <div className="flex gap-2 mb-6">
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg vex-accent-bg text-black text-[12px] font-semibold"
        >
          <BookOpen size={13} /> Read the docs
        </a>
        <a
          href="https://github.com/Nour-yahyaoui"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-vex-border text-[12px] text-vex-text/85 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Github size={13} /> nour-yahyaoui
        </a>
        <a
          href="https://github.com/Nour-yahyaoui/vex"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-vex-border text-[12px] text-vex-text/85 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Star size={13} /> Star /vex
        </a>
      </div>
      <p className="text-[10.5px] text-vex-muted">Built with Next.js, Zustand, and a phosphor-tinted imagination.</p>
    </div>
  );
}
