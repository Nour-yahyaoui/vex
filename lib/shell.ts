import {
  countAll,
  displayPath,
  getNode,
  listDir,
  mkdir,
  moveNode,
  copyNode,
  normalize,
  removeNode,
  resolvePath,
  tree,
  writeFile,
} from "./filesystem";
import { VexDirNode, VexEnv, VexFsSnapshot } from "./types";
import { runVexPy } from "./vexpy";

export interface ShellContext {
  snapshot: VexFsSnapshot;
  isRoot: boolean;
  aliases: Record<string, string>;
  history: string[];
  startedAt: number;
}

export type ShellEffect =
  | { type: "clear" }
  | { type: "sudo-request"; command: string }
  | { type: "open-app"; app: "vexbit" | "files" | "settings" | "monitor" | "about" | "vexnet"; path?: string; root?: string }
  | { type: "reset-fs" }
  | { type: "theme"; accent: string };

export interface ShellResult {
  lines: { kind: "output" | "error" | "success"; text: string }[];
  snapshot: VexFsSnapshot;
  aliases: Record<string, string>;
  effect?: ShellEffect;
}

const HELP_TEXT = `
Vex OS shell — command reference

FILES
  ls [-la] [path]        list files
  cd [path]               change directory
  pwd                     print working directory
  mkdir [-p] <dir>        make directory
  touch <file>            create empty file
  cat <file>              print file contents
  rm [-r] <path>          remove file/dir
  mv <a> <b>              move / rename
  cp <a> <b>              copy
  tree [path]             show directory tree

TEXT
  grep <pat> <file>       search lines
  wc <file>               count lines/words/chars
  head/tail [-n N] <file> first/last N lines
  sort <file>             sort lines
  uniq <file>             drop duplicate lines

SYSTEM
  whoami   date   uptime   uname [-a]
  df       free   ps       env
  export VAR=value         set an env var
  history                  past commands
  alias name='cmd'         define a shortcut
  which <cmd>              locate a command
  sudo <cmd>                run as root

VEX
  vexbit [file|folder]    open the VexBit code editor
  vexnet [file.html]      open VexNet, the HTML/CSS/JS preview
  python3 <f.py>          run a python script (vexpy engine)
  neofetch                 system summary
  theme <accent>           green | amber | cyan | violet
  resetfs                  wipe the virtual disk back to defaults
  clear / help / exit

TIP  Pipes (a | b), redirects (> and >>), and $VARS all work.
     Commands aren't case-sensitive: "Clear", "CD", "ls" all work.
`;

function neofetch(ctx: ShellContext): string {
  const info = countAll(ctx.snapshot.root);
  const uptime = Math.floor((Date.now() - ctx.startedAt) / 1000);
  const art = [
    "   _  ____  __",
    "  | |/ /\\ \\/ /",
    "  |   /  \\  / ",
    "  |   \\  /  \\ ",
    "  |_|\\_\\/_/\\_\\",
  ];
  const lines = [
    `${ctx.snapshot.user}@${ctx.snapshot.hostname}`,
    "-".repeat(`${ctx.snapshot.user}@${ctx.snapshot.hostname}`.length),
    `OS:      Vex OS 1.0 (phosphor)`,
    `Kernel:  vex 6.9.0-static`,
    `Shell:   vexsh 1.0`,
    `Uptime:  ${uptime}s`,
    `Files:   ${info.files} files, ${info.dirs} dirs`,
    `Disk:    ${info.bytes} bytes used (localStorage)`,
    `Author:  github.com/nour-yahyaoui`,
  ];
  return art.map((l, i) => l + "   " + (lines[i] ?? "")).join("\n");
}

function expandVars(input: string, env: VexEnv): string {
  return input.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, name) => (env[name] !== undefined ? env[name] : m));
}

function tokenize(input: string): string[] {
  const matches = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  if (!matches) return [];
  return matches.map((t) => {
    if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
      return t.slice(1, -1);
    }
    return t;
  });
}

function fmtDate(): string {
  return new Date().toString();
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}K`;
  return `${(n / 1024 / 1024).toFixed(1)}M`;
}

export function runCommand(rawLine: string, ctx: ShellContext): ShellResult {
  const out: ShellResult["lines"] = [];
  let snapshot = ctx.snapshot;
  const aliases = { ...ctx.aliases };
  const push = (text: string, kind: "output" | "error" | "success" = "output") => out.push({ text, kind });

  const line = rawLine.trim();
  if (!line) return { lines: out, snapshot, aliases };

  // simple pipeline support: cmd1 | cmd2 (feeds cmd1's stdout as last arg to cmd2)
  const pipeParts = line.split("|").map((p) => p.trim());

  let pipedInput: string | null = null;
  let result: ShellResult | null = null;

  for (let idx = 0; idx < pipeParts.length; idx++) {
    let segment = pipeParts[idx];

    // redirection
    let redirect: { append: boolean; file: string } | null = null;
    const redirMatch = segment.match(/(.*?)(>>|>)\s*([^\s]+)\s*$/);
    if (redirMatch) {
      segment = redirMatch[1].trim();
      redirect = { append: redirMatch[2] === ">>", file: redirMatch[3] };
    }

    const expanded = expandVars(segment, snapshot.env);
    let tokens = tokenize(expanded);
    if (tokens.length === 0) continue;

    // alias expansion (only first token) — matched case-insensitively so
    // `LL` or `Ll` finds an alias defined as `ll`, same spirit as the
    // case-insensitive builtin dispatch below.
    const aliasKey = Object.keys(aliases).find((k) => k.toLowerCase() === tokens[0].toLowerCase());
    if (aliasKey) {
      const aliasTokens = tokenize(aliases[aliasKey]);
      tokens = [...aliasTokens, ...tokens.slice(1)];
    }

    // Builtin commands are matched case-insensitively (`Clear`, `CD`, `LS -la`
    // all work) since real bash's case-sensitivity is a common source of
    // beginner friction and Vex already treats path lookups the same way.
    const cmd = tokens[0].toLowerCase();
    let args = tokens.slice(1);
    if (pipedInput !== null) args = [...args, pipedInput];

    const r = execOne(cmd, args, { ...ctx, snapshot }, push);
    snapshot = r.snapshot;
    pipedInput = r.stdout;

    if (idx === pipeParts.length - 1) {
      if (redirect && r.stdout !== null) {
        const target = resolvePath(snapshot.cwd, redirect.file);
        let content = r.stdout;
        if (redirect.append) {
          const existing = getNode(snapshot.root, target);
          const prior = existing && existing.type === "file" ? existing.content : "";
          content = prior + (prior && !prior.endsWith("\n") ? "\n" : "") + content;
        }
        const w = writeFile(snapshot.root, target, content);
        if (w.ok && w.root) snapshot = { ...snapshot, root: w.root };
        out.length = 0; // redirected commands produce no terminal output
      } else if (r.stdout !== null && pipeParts.length > 1) {
        push(r.stdout);
      }
      if (r.effect) {
        result = { lines: out, snapshot, aliases, effect: r.effect };
      }
    }
  }

  return result ?? { lines: out, snapshot, aliases };
}

interface ExecResult {
  snapshot: VexFsSnapshot;
  stdout: string | null;
  effect?: ShellEffect;
}

function execOne(
  cmd: string,
  args: string[],
  ctx: ShellContext,
  push: (text: string, kind?: "output" | "error" | "success") => void
): ExecResult {
  let snapshot = ctx.snapshot;
  const root = snapshot.root;

  const fail = (msg: string): ExecResult => {
    push(msg, "error");
    return { snapshot, stdout: null };
  };
  const ok = (msg: string | null, kind: "output" | "success" = "output"): ExecResult => {
    if (msg !== null) push(msg, kind);
    return { snapshot, stdout: msg };
  };

  switch (cmd) {
    case "ls": {
      const showAll = args.includes("-a") || args.includes("-la") || args.includes("-al");
      const long = args.includes("-l") || args.includes("-la") || args.includes("-al");
      const target = args.find((a) => !a.startsWith("-")) ?? ".";
      const path = resolvePath(snapshot.cwd, target);
      const res = listDir(root, path);
      if (!res.ok || !res.entries) return fail(`ls: ${res.error}`);
      let entries = res.entries;
      if (!showAll) entries = entries.filter(([name]) => !name.startsWith("."));
      if (long) {
        const lines = entries.map(([name, node]) => {
          const isDir = node.type === "dir";
          const perms = isDir ? "drwxr-xr-x" : node.meta.executable ? "-rwxr-xr-x" : "-rw-r--r--";
          const size = isDir ? 4096 : node.content.length;
          const date = new Date(node.meta.modified).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
          return `${perms}  ${String(size).padStart(6)}  ${date}  ${name}${isDir ? "/" : ""}`;
        });
        return ok(lines.join("\n"));
      }
      const text = entries.map(([name, node]) => (node.type === "dir" ? name + "/" : name)).join("  ");
      return ok(text);
    }
    case "cd": {
      const target = args[0] ?? "~";
      const path = resolvePath(snapshot.cwd, target);
      const node = getNode(root, path);
      if (!node) return fail(`cd: ${target}: No such file or directory`);
      if (node.type !== "dir") return fail(`cd: ${target}: Not a directory`);
      snapshot = { ...snapshot, cwd: path, env: { ...snapshot.env, PWD: path } };
      return ok(null);
    }
    case "pwd":
      return ok(snapshot.cwd);
    case "mkdir": {
      const parents = args.includes("-p");
      const target = args.find((a) => !a.startsWith("-"));
      if (!target) return fail("mkdir: missing operand");
      const path = resolvePath(snapshot.cwd, target);
      const res = mkdir(root, path, parents);
      if (!res.ok || !res.root) return fail(res.error ?? "mkdir: failed");
      snapshot = { ...snapshot, root: res.root };
      return ok(null);
    }
    case "touch": {
      if (!args[0]) return fail("touch: missing operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const existing = getNode(root, path);
      const res = writeFile(root, path, existing?.type === "file" ? existing.content : "");
      if (!res.ok || !res.root) return fail(res.error ?? "touch: failed");
      snapshot = { ...snapshot, root: res.root };
      return ok(null);
    }
    case "cat": {
      if (!args[0]) return fail("cat: missing operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const node = getNode(root, path);
      if (!node) return fail(`cat: ${args[0]}: No such file or directory`);
      if (node.type === "dir") return fail(`cat: ${args[0]}: Is a directory`);
      return ok(node.content);
    }
    case "rm": {
      const recursive = args.includes("-r") || args.includes("-rf") || args.includes("-fr");
      const target = args.find((a) => !a.startsWith("-"));
      if (!target) return fail("rm: missing operand");
      const path = resolvePath(snapshot.cwd, target);
      const res = removeNode(root, path, recursive);
      if (!res.ok || !res.root) return fail(res.error ?? "rm: failed");
      snapshot = { ...snapshot, root: res.root };
      return ok(null);
    }
    case "rmdir": {
      if (!args[0]) return fail("rmdir: missing operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const res = removeNode(root, path, false);
      if (!res.ok || !res.root) return fail(res.error ?? "rmdir: failed");
      snapshot = { ...snapshot, root: res.root };
      return ok(null);
    }
    case "mv": {
      if (args.length < 2) return fail("mv: missing operand");
      const res = moveNode(root, resolvePath(snapshot.cwd, args[0]), resolvePath(snapshot.cwd, args[1]));
      if (!res.ok || !res.root) return fail(res.error ?? "mv: failed");
      snapshot = { ...snapshot, root: res.root };
      return ok(null);
    }
    case "cp": {
      if (args.length < 2) return fail("cp: missing operand");
      const res = copyNode(root, resolvePath(snapshot.cwd, args[0]), resolvePath(snapshot.cwd, args[1]));
      if (!res.ok || !res.root) return fail(res.error ?? "cp: failed");
      snapshot = { ...snapshot, root: res.root };
      return ok(null);
    }
    case "tree": {
      const path = resolvePath(snapshot.cwd, args[0] ?? ".");
      return ok(tree(root, path).trimEnd());
    }
    case "echo": {
      let text = args.join(" ");
      text = text.replace(/^['"]|['"]$/g, "");
      return ok(text);
    }
    case "clear":
      return { snapshot, stdout: null, effect: { type: "clear" } };
    case "help":
      return ok(HELP_TEXT.trim());
    case "whoami":
      return ok(ctx.isRoot ? "root" : snapshot.user);
    case "date":
      return ok(fmtDate());
    case "uptime": {
      const secs = Math.floor((Date.now() - ctx.startedAt) / 1000);
      return ok(`up ${secs}s, 1 user, load average: 0.12, 0.09, 0.05`);
    }
    case "uname":
      return ok(args.includes("-a") ? `Vex ${snapshot.hostname} 6.9.0-static #1 SMP vex-kernel x86_64` : "Vex");
    case "df": {
      const info = countAll(root);
      const total = 5 * 1024 * 1024;
      const used = info.bytes;
      const pct = Math.min(100, Math.round((used / total) * 100));
      return ok(
        `Filesystem     Size  Used  Avail  Use%  Mounted on\n/dev/vex0       ${fmtBytes(total)}  ${fmtBytes(used)}  ${fmtBytes(
          total - used
        )}   ${pct}%  /`
      );
    }
    case "free":
      return ok(`              total     used     free\nMem:          8192      1024     7168\nSwap:         2048         0     2048`);
    case "ps":
      return ok(`  PID TTY      CMD\n    1 pts/0    vexsh\n   42 pts/0    vexbit\n  108 pts/0    ${cmd}`);
    case "env":
      return ok(Object.entries(snapshot.env).map(([k, v]) => `${k}=${v}`).join("\n"));
    case "export": {
      if (!args[0] || !args[0].includes("=")) return fail("export: usage VAR=value");
      const [k, ...rest] = args[0].split("=");
      snapshot = { ...snapshot, env: { ...snapshot.env, [k]: rest.join("=") } };
      return ok(null);
    }
    case "history":
      return ok(ctx.history.map((h, i) => `  ${i + 1}  ${h}`).join("\n"));
    case "which": {
      if (!args[0]) return fail("which: missing operand");
      const known = [
        "ls","cd","pwd","mkdir","touch","cat","rm","rmdir","mv","cp","tree","echo","clear","help",
        "whoami","date","uptime","uname","df","free","ps","env","export","history","alias","which",
        "grep","wc","head","tail","sort","uniq","sudo","vexbit","vexnet","python3","python","neofetch","theme","resetfs","find","man","exit",
      ];
      return known.includes(args[0]) ? ok(`/usr/bin/${args[0]}`) : fail(`which: no ${args[0]} in $PATH`);
    }
    case "grep": {
      if (args.length < 2) return fail("grep: usage grep <pattern> <file>");
      const [pattern, file] = args;
      const path = resolvePath(snapshot.cwd, file);
      const node = getNode(root, path);
      if (!node || node.type !== "file") return fail(`grep: ${file}: No such file`);
      const lines = node.content.split("\n").filter((l) => l.includes(pattern));
      return ok(lines.join("\n"));
    }
    case "wc": {
      if (!args[0]) return fail("wc: missing operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const node = getNode(root, path);
      if (!node || node.type !== "file") return fail(`wc: ${args[0]}: No such file`);
      const lines = node.content.split("\n").length;
      const words = node.content.split(/\s+/).filter(Boolean).length;
      return ok(`${lines}  ${words}  ${node.content.length}  ${args[0]}`);
    }
    case "head":
    case "tail": {
      const nFlagIdx = args.indexOf("-n");
      const n = nFlagIdx !== -1 ? parseInt(args[nFlagIdx + 1], 10) : 10;
      const file = args.find((a, i) => !a.startsWith("-") && args[i - 1] !== "-n");
      if (!file) return fail(`${cmd}: missing operand`);
      const path = resolvePath(snapshot.cwd, file);
      const node = getNode(root, path);
      if (!node || node.type !== "file") return fail(`${cmd}: ${file}: No such file`);
      const lines = node.content.split("\n");
      return ok(cmd === "head" ? lines.slice(0, n).join("\n") : lines.slice(-n).join("\n"));
    }
    case "sort": {
      if (!args[0]) return fail("sort: missing operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const node = getNode(root, path);
      if (!node || node.type !== "file") return fail(`sort: ${args[0]}: No such file`);
      return ok(node.content.split("\n").filter(Boolean).sort().join("\n"));
    }
    case "uniq": {
      if (!args[0]) return fail("uniq: missing operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const node = getNode(root, path);
      if (!node || node.type !== "file") return fail(`uniq: ${args[0]}: No such file`);
      return ok([...new Set(node.content.split("\n").filter(Boolean))].join("\n"));
    }
    case "find": {
      const path = resolvePath(snapshot.cwd, args[0] ?? ".");
      const nameIdx = args.indexOf("-name");
      const pattern = nameIdx !== -1 ? args[nameIdx + 1]?.replace(/^['"]|['"]$/g, "") : "*";
      const results: string[] = [];
      const walk = (p: string) => {
        const node = getNode(root, p);
        if (!node) return;
        if (node.type === "dir") {
          for (const name of Object.keys(node.children)) {
            const childPath = normalize(p + "/" + name);
            const matches = pattern.includes("*")
              ? new RegExp("^" + pattern.replace(/\*/g, ".*") + "$").test(name)
              : name === pattern;
            if (matches) results.push(childPath);
            walk(childPath);
          }
        }
      };
      walk(path);
      return ok(results.join("\n"));
    }
    case "man":
      return ok(args[0] ? `${args[0]}(1)\n\nSee 'help' for the Vex OS command reference.` : "What manual page do you want?");
    case "alias": {
      if (!args[0]) return ok(Object.entries(ctx.aliases).map(([k, v]) => `alias ${k}='${v}'`).join("\n"));
      const [name, ...rest] = args.join(" ").split("=");
      ctx.aliases[name.trim()] = rest.join("=").replace(/^['"]|['"]$/g, "");
      return ok(null);
    }
    case "chmod":
      return ok(null);
    case "neofetch":
      return ok(neofetch(ctx));
    case "theme": {
      const accent = args[0];
      if (!accent) return fail("theme: usage theme <green|amber|cyan|violet>");
      return { snapshot, stdout: null, effect: { type: "theme", accent } };
    }
    case "resetfs":
      return { snapshot, stdout: null, effect: { type: "reset-fs" } };
    case "vexbit":
    case "nano":
    case "vim":
    case "code": {
      const target = args[0];
      if (target) {
        const path = resolvePath(snapshot.cwd, target);
        const existing = getNode(root, path);
        // A directory target scopes VexBit's file tree to that folder
        // instead of the whole OS filesystem — "open project" rather than
        // "open every file on the machine".
        if (existing && existing.type === "dir") {
          return { snapshot, stdout: null, effect: { type: "open-app", app: "vexbit", root: path } };
        }
        if (!existing) {
          const res = writeFile(root, path, "");
          if (res.ok && res.root) snapshot = { ...snapshot, root: res.root };
        }
        return { snapshot, stdout: null, effect: { type: "open-app", app: "vexbit", path } };
      }
      return { snapshot, stdout: null, effect: { type: "open-app", app: "vexbit" } };
    }
    case "vexnet": {
      const target = args[0];
      if (target) {
        const path = resolvePath(snapshot.cwd, target);
        const node = getNode(root, path);
        if (!node || node.type !== "file") return fail(`vexnet: can't open '${target}': No such file`);
        return { snapshot, stdout: null, effect: { type: "open-app", app: "vexnet", path } };
      }
      return { snapshot, stdout: null, effect: { type: "open-app", app: "vexnet" } };
    }
    case "python3":
    case "python": {
      if (!args[0]) return fail("python3: missing script operand");
      const path = resolvePath(snapshot.cwd, args[0]);
      const node = getNode(root, path);
      if (!node || node.type !== "file") return fail(`python3: can't open file '${args[0]}': No such file or directory`);
      const result = runVexPy(node.content);
      if (result.error) {
        push(result.output.join("\n"));
        return fail(`Traceback (most recent call last):\n  ${result.error}`);
      }
      return ok(result.output.join("\n"));
    }
    case "sudo": {
      if (args.length === 0) return fail("sudo: missing command");
      return { snapshot, stdout: null, effect: { type: "sudo-request", command: args.join(" ") } };
    }
    case "exit":
      return ok("logout");
    case "":
      return { snapshot, stdout: null };
    default:
      return fail(`vexsh: ${cmd}: command not found`);
  }
}
