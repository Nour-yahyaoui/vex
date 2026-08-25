"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import BootScreen from "@/components/BootScreen";
import Desktop from "@/components/Desktop";
import SignInGate from "@/components/SignInGate";
import { useUiStore } from "@/lib/store";
import { useFsStore } from "@/lib/fsStore";

const ACCENT_HEX: Record<string, { accent: string; dim: string; soft: string }> = {
  green: { accent: "#39ff88", dim: "#1f8a4c", soft: "rgba(57,255,136,0.12)" },
  amber: { accent: "#ffb454", dim: "#a3702c", soft: "rgba(255,180,84,0.12)" },
  cyan: { accent: "#5ad4ff", dim: "#2c7ea3", soft: "rgba(90,212,255,0.12)" },
  violet: { accent: "#b98cff", dim: "#6d4ba3", soft: "rgba(185,140,255,0.12)" },
};

export default function Home() {
  const booted = useUiStore((s) => s.booted);
  const accent = useUiStore((s) => s.accent);
  const hydrate = useFsStore((s) => s.hydrate);
  const hydrated = useFsStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);
  const { status } = useSession();

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const c = ACCENT_HEX[accent] ?? ACCENT_HEX.green;
    document.documentElement.style.setProperty("--accent", c.accent);
    document.documentElement.style.setProperty("--accent-dim", c.dim);
    document.documentElement.style.setProperty("--accent-soft", c.soft);
  }, [accent]);

  if (!mounted || !hydrated) {
    return <div className="fixed inset-0 bg-black" />;
  }

  return (
    <main className="fixed inset-0">
      {!booted && <BootScreen />}
      {booted && status === "unauthenticated" && <SignInGate />}
      {booted && status === "authenticated" && <Desktop />}
      {booted && status === "loading" && <div className="fixed inset-0 bg-black" />}
    </main>
  );
}
