import type { Metadata } from "next";
import Link from "next/link";
import { Github, Code2, Globe, Bot, ShieldAlert } from "@/components/icons";

export const metadata: Metadata = {
  title: "Documentation — Vex OS",
  description: "What Vex OS is, how it works, and how to use it — the terminal, VexBit, VexNet, and the AI assistant.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-8 border-b border-vex-border last:border-b-0">
      <h2 className="font-display text-xl text-vex-text mb-3">{title}</h2>
      <div className="text-[14px] text-vex-text/80 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-black/50 border border-vex-border text-[12.5px] font-mono vex-accent">
      {children}
    </code>
  );
}

function CmdRow({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b border-vex-border/50 last:border-b-0">
      <code className="shrink-0 sm:w-56 text-[12.5px] font-mono vex-accent">{cmd}</code>
      <span className="text-[13px] text-vex-text/75">{desc}</span>
    </div>
  );
}

const NAV = [
  { id: "what-is-vex", label: "What is Vex OS" },
  { id: "how-it-works", label: "How it works" },
  { id: "terminal", label: "Terminal (vexsh)" },
  { id: "vexbit", label: "VexBit editor" },
  { id: "vexnet", label: "VexNet preview" },
  { id: "ai-assistant", label: "AI assistant" },
  { id: "commands", label: "Command reference" },
  { id: "faq", label: "FAQ" },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen circuit-bg text-vex-text font-mono">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-vex-panel/90 border-b border-vex-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <span className="w-6 h-6 rounded flex items-center justify-center vex-accent-bg text-black font-display font-bold text-[12px] shrink-0">
            V
          </span>
          <span className="font-display text-[14px] text-vex-text/90">Vex OS Docs</span>
          <div className="ml-auto flex items-center gap-3">
            <a
              href="https://github.com/Nour-yahyaoui/vex"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[12px] text-vex-muted hover:text-vex-text transition-colors"
            >
              <Github size={13} /> Source
            </a>
            <Link
              href="/"
              className="text-[12px] px-3 py-1.5 rounded-md vex-accent-bg text-black font-semibold hover:opacity-90 transition-opacity"
            >
              Open Vex OS
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="py-10 sm:py-14 border-b border-vex-border">
          <pre className="vex-accent text-[11px] leading-tight mb-5 opacity-90">
{`__     __
\\ \\   / /____  __
 \\ \\ / / _ \\ \\/ /
  \\ V /  __/>  <
   \\_/ \\___/_/\\_\\`}
          </pre>
          <h1 className="font-display text-2xl sm:text-3xl text-vex-text mb-3">Learn Linux without a VM, an ISO, or any risk</h1>
          <p className="text-[14.5px] text-vex-text/75 leading-relaxed max-w-2xl">
            Vex OS is a fully simulated Linux desktop that runs entirely in your browser. There&apos;s nothing to
            install, nothing to download, and nothing that can break your real machine — open a tab and you have a
            terminal, a code editor, and a file manager, all backed by a virtual filesystem saved to your browser&apos;s
            local storage.
          </p>
        </div>

        <nav className="py-6 border-b border-vex-border">
          <p className="text-[10px] uppercase tracking-widest text-vex-muted mb-2.5">On this page</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="text-[12.5px] text-vex-text/70 hover:text-[var(--accent)] transition-colors">
                {n.label}
              </a>
            ))}
          </div>
        </nav>

        <Section id="what-is-vex" title="What is Vex OS">
          <p>
            Vex OS simulates a Linux desktop — windows, a taskbar, a terminal, a code editor — inside a web page.
            Every command you run and every file you touch is handled by JavaScript running in your browser, not a
            real Linux kernel or a remote server. That trade-off is the whole point: you get the muscle memory of
            using a real shell without the setup cost of VirtualBox, a Linux ISO, disk space, or the risk of breaking
            anything on your actual computer.
          </p>
          <p>
            It&apos;s aimed at people who are new to the command line and want a low-stakes place to practice —
            students, self-taught developers, or anyone who&apos;s been putting off &quot;actually learning Linux&quot;
            because setting up a VM felt like a project in itself.
          </p>
        </Section>

        <Section id="how-it-works" title="How it works">
          <p>Vex is built from a handful of pieces that all run client-side:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-vex-text">A virtual filesystem</strong> — directories, files, and permissions
              modeled as a plain JavaScript object tree, persisted to your browser&apos;s <Code>localStorage</Code>.
              Nothing is uploaded anywhere; it stays on your device.
            </li>
            <li>
              <strong className="text-vex-text">vexsh</strong> — a shell parser that understands real syntax: pipes
              (<Code>a | b</Code>), redirects (<Code>{`>`}</Code> and <Code>{`>>`}</Code>), variables, aliases, and
              around 30 common commands.
            </li>
            <li>
              <strong className="text-vex-text">vexpy</strong> — a small, sandboxed interpreter for a practical
              subset of Python (print, variables, f-strings, if/elif/else, for/while loops). It runs instantly with
              no network call, which is what makes VexBit&apos;s default run mode free and immediate.
            </li>
          </ul>
          <p>
            Because none of this touches a real OS, the worst thing that can happen from a typo is a red error
            message — there&apos;s no machine underneath to damage.
          </p>
        </Section>

        <Section id="terminal" title="Terminal (vexsh)">
          <p>
            The Terminal app is Vex&apos;s shell. It behaves like bash for the basics — navigate with{" "}
            <Code>cd</Code> and <Code>ls</Code>, read and write files, chain commands with pipes, and use{" "}
            <Code>sudo</Code> to try root-only actions safely. A couple of deliberate differences from a real shell,
            worth knowing about so nothing surprises you on a real machine later:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Commands and paths are matched case-insensitively (<Code>CD Projects</Code> works) — real bash is case-sensitive.</li>
            <li>
              <Code>python3</Code> runs through vexpy, a Python <em>subset</em> — not the real interpreter. Switch
              VexBit to Sandbox mode for real Python/JS execution.
            </li>
          </ul>
          <p>Run <Code>help</Code> anytime for the full command list, or <Code>neofetch</Code> for a system summary.</p>
        </Section>

        <Section id="vexbit" title="VexBit — the code editor">
          <div className="flex items-center gap-2 text-vex-muted mb-1">
            <Code2 size={15} className="vex-accent" />
            <span className="text-[12px]">Open with <Code>vexbit</Code>, or Ctrl+Alt+E</span>
          </div>
          <p>
            VexBit is a file-tree-and-tabs code editor. Open it scoped to your whole home directory, or to a single
            project folder (<Code>vexbit Projects/site</Code> in the terminal, or &quot;Open in VexBit&quot; on a
            folder in Files) so you&apos;re not staring at every file on the system.
          </p>
          <p>Two run modes, switchable per file:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong className="text-vex-text">vexpy</strong> — instant, free, runs the Python subset locally. Good default while learning.</li>
            <li><strong className="text-vex-text">Sandbox</strong> — real Python or JavaScript execution in an isolated Vercel microVM, rate-limited per user.</li>
          </ul>
          <p>The sidebar and output panel are both resizable (drag the divider) and collapsible, like a typical code editor.</p>
        </Section>

        <Section id="vexnet" title="VexNet — HTML/CSS/JS preview">
          <div className="flex items-center gap-2 text-vex-muted mb-1">
            <Globe size={15} className="vex-accent" />
            <span className="text-[12px]">Open with <Code>vexnet</Code>, or the Preview button on an .html file</span>
          </div>
          <p>
            VexNet is a small built-in browser for previewing pages you write in VexBit. Local stylesheets and
            scripts linked from your HTML are inlined automatically, so a normal multi-file <Code>index.html</Code> +{" "}
            <Code>style.css</Code> + <Code>script.js</Code> setup just works.
          </p>
          <div className="flex items-start gap-2 rounded-lg border border-vex-border bg-black/30 p-3 mt-2">
            <ShieldAlert size={15} className="vex-accent shrink-0 mt-0.5" />
            <p className="text-[13px] text-vex-text/75">
              Previews render in a sandboxed iframe with no access to Vex&apos;s cookies, storage, or session — even
              if a script inside the preview tries, it can&apos;t reach anything outside its own frame.
            </p>
          </div>
        </Section>

        <Section id="ai-assistant" title="AI assistant">
          <div className="flex items-center gap-2 text-vex-muted mb-1">
            <Bot size={15} className="vex-accent" />
            <span className="text-[12px]">The chat button inside VexBit</span>
          </div>
          <p>
            A small chat panel that can explain a command, write a starter script, or help debug something you
            pasted in. Code it returns renders in its own block with a one-click copy button. It&apos;s rate-limited
            per person to keep things sustainable.
          </p>
        </Section>

        <Section id="commands" title="Command reference">
          <p className="mb-1">The most-used commands — run <Code>help</Code> in the terminal for the complete list.</p>
          <div>
            <CmdRow cmd="ls [-la] [path]" desc="list files in the current or given directory" />
            <CmdRow cmd="cd [path]" desc="change directory (~ for home)" />
            <CmdRow cmd="mkdir [-p] <dir>" desc="create a directory" />
            <CmdRow cmd="cat <file>" desc="print a file's contents" />
            <CmdRow cmd="grep <pattern> <file>" desc="search lines matching a pattern" />
            <CmdRow cmd="vexbit [file|folder]" desc="open the code editor, optionally scoped to a folder" />
            <CmdRow cmd="vexnet [file.html]" desc="open the HTML/CSS/JS preview" />
            <CmdRow cmd="python3 <file.py>" desc="run a script through the vexpy interpreter" />
            <CmdRow cmd="sudo <command>" desc="run a command as root (password: vex, by default)" />
            <CmdRow cmd="resetfs" desc="wipe the virtual disk back to its defaults" />
          </div>
        </Section>

        <Section id="faq" title="FAQ">
          <p><strong className="text-vex-text">Is this a real Linux kernel?</strong><br />No — everything is simulated in JavaScript. It's designed to feel like real Linux for common tasks, not to be a drop-in replacement for one.</p>
          <p><strong className="text-vex-text">Where is my data stored?</strong><br />In your browser's local storage, on your device. Signing in (Google or GitHub) only lets Vex recognize you — it doesn't upload your virtual filesystem anywhere.</p>
          <p><strong className="text-vex-text">Will clearing my browser data delete my files?</strong><br />Yes — since everything lives in local storage, clearing site data resets Vex to its defaults. Run <Code>resetfs</Code> any time you want a clean slate on purpose.</p>
          <p><strong className="text-vex-text">Can what I learn here transfer to a real terminal?</strong><br />Mostly yes — the core commands and concepts (paths, pipes, permissions, redirects) match real bash. The differences (case-insensitive commands, the vexpy Python subset) are called out above so they don't catch you off guard later.</p>
        </Section>

        <footer className="py-10 text-center">
          <p className="text-[12px] text-vex-muted mb-3">Built by nour-yahyaoui.</p>
          <a
            href="https://github.com/Nour-yahyaoui/vex"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-vex-border hover:border-[var(--accent)] hover:text-[var(--accent)] text-vex-text/80 transition-colors"
          >
            <Github size={13} /> View source on GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
