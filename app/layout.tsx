import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Vex OS — learn Linux without a VM",
  description:
    "Vex OS is a fully simulated Linux desktop that runs in your browser. Practice real shell commands, write Python in VexBit, and never touch a VM.",
};

// Without this, mobile browsers fall back to a ~980px "desktop" viewport and
// scale the whole OS down to fit — that's what made everything (especially
// terminal text) unreadably tiny on phones. maximumScale/userScalable are
// disabled because Vex behaves like a native app shell (windows, drag
// handles); accidental pinch-zoom mid-drag does more harm than good here.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-vex-bg text-vex-text font-mono antialiased overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
