"use client";

import { signIn } from "next-auth/react";
import { Github } from "./icons";
import Wallpaper from "./Wallpaper";

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.02l7.73 6c4.51-4.18 7.09-10.36 7.09-17.49z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1-.76-4.59c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.87.92 7.53 2.56 10.78z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.92-2.14 15.89-5.83l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function SignInGate() {
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      <Wallpaper />
      <div className="relative z-10 w-full max-w-sm bg-vex-panel/95 backdrop-blur-md border border-vex-border rounded-2xl shadow-crt p-7 animate-bootIn">
        <pre className="vex-accent text-[9px] leading-tight mb-4 opacity-90 select-none">
{`__     __
\\ \\   / /____  __
 \\ \\ / / _ \\ \\/ /
  \\ V /  __/>  <
   \\_/ \\___/_/\\_\\`}
        </pre>
        <h1 className="font-display text-lg text-vex-text mb-1">Sign in to Vex</h1>
        <p className="text-[12.5px] text-vex-muted mb-6 leading-relaxed">
          Your virtual disk stays in this browser — signing in just lets Vex remember it&apos;s you.
          No password, no form, just one tap.
        </p>

        <div className="space-y-2.5">
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg bg-white text-black text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <GoogleMark /> Continue with Google
          </button>
          <button
            onClick={() => signIn("github")}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg bg-[#161b22] border border-vex-border text-vex-text text-[13px] font-medium hover:border-[var(--accent)] transition-colors"
          >
            <Github size={16} /> Continue with GitHub
          </button>
        </div>

        <p className="mt-6 text-[10px] text-vex-muted/70 text-center leading-relaxed">
          We only ever see your name, email, and avatar — nothing else.
        </p>
      </div>
    </div>
  );
}
