import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vex: {
          bg: "#05070a",
          panel: "#0b0f16",
          panel2: "#0f141d",
          border: "#1c2531",
          borderlight: "#2a3644",
          phosphor: "#39ff88",
          phosphordim: "#1f8a4c",
          amber: "#ffb454",
          cyan: "#5ad4ff",
          red: "#ff5c5c",
          violet: "#b98cff",
          text: "#d6e2df",
          muted: "#5c6b76",
        },
      },
      fontFamily: {
        mono: [
          "'JetBrains Mono'",
          "ui-monospace",
          "SFMono-Regular",
          "'Fira Code'",
          "monospace",
        ],
        display: [
          "'Space Grotesk'",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        crt: "0 0 0 1px rgba(57,255,136,0.08), 0 20px 60px rgba(0,0,0,0.65)",
        glow: "0 0 12px rgba(57,255,136,0.55)",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "1" },
          "93%": { opacity: "0.86" },
          "94%": { opacity: "1" },
        },
        bootIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        scan: "scan 6s linear infinite",
        flicker: "flicker 6s infinite",
        bootIn: "bootIn 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
