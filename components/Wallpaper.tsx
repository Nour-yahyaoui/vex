export default function Wallpaper() {
  return (
    <div className="absolute inset-0 circuit-bg overflow-hidden">
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.35]"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 620 L180 620 L220 560 L420 560 L460 700 L720 700 L760 480 L980 480 L1020 640 L1260 640 L1310 520 L1600 520"
          fill="none"
          stroke="url(#fade)"
          strokeWidth="1.5"
        />
        <path
          d="M0 300 L140 300 L180 360 L360 360 L400 260 L640 260 L680 340 L900 340 L940 220 L1180 220 L1220 300 L1600 300"
          fill="none"
          stroke="url(#fade)"
          strokeWidth="1.5"
        />
        {[
          [220, 560],
          [460, 700],
          [760, 480],
          [1020, 640],
          [1310, 520],
          [180, 360],
          [400, 260],
          [680, 340],
          [940, 220],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4} fill="var(--accent)" opacity={0.6} />
        ))}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center select-none">
        <span
          className="font-display font-bold text-vex-text/[0.035] text-[38vw] leading-none tracking-tighter"
          aria-hidden
        >
          VEX
        </span>
      </div>

      <div className="absolute bottom-24 left-10 hidden md:block select-none opacity-70">
        <p className="font-mono text-[11px] text-vex-muted tracking-[0.3em]">VEX // STATIC LINUX KERNEL</p>
        <p className="font-mono text-[11px] text-vex-muted tracking-[0.3em]">BUILD 1.0 · PHOSPHOR EDITION</p>
      </div>

      <div className="crt-scanlines opacity-60" />
      <div className="crt-vignette" />
    </div>
  );
}
