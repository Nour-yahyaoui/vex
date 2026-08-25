import { VexDirNode, VexFileNode, VexFsSnapshot, VexNode } from "./types";

const FS_KEY = "vexos:fs:v2";

function now() {
  return Date.now();
}

function newDir(): VexDirNode {
  const t = now();
  return { type: "dir", meta: { created: t, modified: t, executable: false }, children: {} };
}

function newFile(content = "", executable = false): VexFileNode {
  const t = now();
  return { type: "file", content, meta: { created: t, modified: t, executable } };
}

export function defaultReadme() {
  return [
    "Welcome to Vex OS",
    "==================",
    "",
    "Vex is a fully simulated Linux environment that runs entirely in your",
    "browser -- no VM, no ISO, no risk. Everything you touch here (files,",
    "directories, python scripts you write in VexBit) is saved straight to",
    "localStorage on your machine.",
    "",
    "Start here:",
    "  1. Open a Terminal and run: help",
    "  2. Try:  ls -la   cd Projects   cat notes.txt",
    "  3. Open VexBit (the code editor) and write a .py file",
    "  4. Run it from the terminal with: python3 filename.py",
    "",
    "Everything resets with `resetfs` if you want a clean slate.",
    "",
    "  -- nour-yahyaoui",
  ].join("\n");
}

export function defaultRoot(): VexDirNode {
  const root = newDir();
  const home = newDir();
  const user = newDir();
  const docs = newDir();
  const downloads = newDir();
  const projects = newDir();
  const vexbit = newDir();

  user.children["Documents"] = docs;
  user.children["Downloads"] = downloads;
  user.children["Projects"] = projects;
  user.children["vexbit"] = vexbit;
  user.children["README.md"] = newFile(defaultReadme());
  user.children[".bashrc"] = newFile(
    '# ~/.bashrc\nexport PS1="\\u@\\h:\\w\\$ "\nalias ll="ls -la"\nalias la="ls -A"\nexport EDITOR="vexbit"\n'
  );
  user.children[".vex_profile"] = newFile(
    "# Vex OS shell profile\n# This file is sourced when the terminal boots.\n"
  );

  projects.children["hello.py"] = newFile(
    ['# your first vex script', 'name = "learner"', 'print("hello, " + name)', "for i in range(3):", "    print(\"count:\", i)"].join("\n")
  );
  projects.children["welcome.sh"] = newFile(
    "#!/bin/bash\necho \"Welcome to Vex OS, $(whoami)!\"\necho \"Today is $(date)\"\n",
    true
  );

  home.children["user"] = user;
  home.children["root"] = newDir();

  root.children["home"] = home;

  const etc = newDir();
  etc.children["os-release"] = newFile(
    'NAME="Vex OS"\nVERSION="1.0 (phosphor)"\nID=vex\nPRETTY_NAME="Vex OS 1.0"\nHOME_URL="https://github.com/Nour-yahyaoui/vex"\n'
  );
  etc.children["hostname"] = newFile("vex\n");
  etc.children["passwd"] = newFile(
    "root:x:0:0:root:/home/root:/bin/bash\nuser:x:1000:1000:Vex User:/home/user:/bin/bash\n"
  );
  root.children["etc"] = etc;

  root.children["var"] = newDir();
  (root.children["var"] as VexDirNode).children["log"] = newDir();
  root.children["tmp"] = newDir();
  root.children["bin"] = newDir();
  root.children["usr"] = newDir();
  root.children["dev"] = newDir();
  root.children["proc"] = newDir();

  return root;
}

export function defaultSnapshot(): VexFsSnapshot {
  return {
    root: defaultRoot(),
    cwd: "/home/user",
    env: {
      PATH: "/usr/local/bin:/usr/bin:/bin",
      HOME: "/home/user",
      USER: "user",
      SHELL: "/bin/vexsh",
      TERM: "vex-256color",
      EDITOR: "vexbit",
      PWD: "/home/user",
    },
    hostname: "vex",
    user: "user",
    rootPassword: "vex",
    version: 2,
  };
}

export function loadSnapshot(): VexFsSnapshot {
  if (typeof window === "undefined") return defaultSnapshot();
  try {
    const raw = window.localStorage.getItem(FS_KEY);
    if (!raw) return defaultSnapshot();
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.root || parsed.version !== 2) return defaultSnapshot();
    return parsed as VexFsSnapshot;
  } catch {
    return defaultSnapshot();
  }
}

export function saveSnapshot(snap: VexFsSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FS_KEY, JSON.stringify(snap));
  } catch {
    // storage full or unavailable — fail silently, session state still works
  }
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function normalize(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const p of parts) {
    if (p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return "/" + stack.join("/");
}

// Real shells are case-sensitive, but that's a constant source of friction for
// people new to the terminal (`cd projects` vs `cd Projects`). Vex resolves
// child lookups case-insensitively while preserving the original casing on
// disk, so `ls` still shows "Projects" but `cd projects` still gets you there.
function findChildKey(children: Record<string, VexNode>, name: string): string | null {
  if (Object.prototype.hasOwnProperty.call(children, name)) return name;
  const lower = name.toLowerCase();
  for (const key of Object.keys(children)) {
    if (key.toLowerCase() === lower) return key;
  }
  return null;
}

export function resolvePath(cwd: string, input: string): string {
  if (!input || input === ".") return cwd;
  if (input === "~") return "/home/user";
  if (input.startsWith("~/")) return normalize("/home/user/" + input.slice(2));
  if (input.startsWith("/")) return normalize(input);
  return normalize(cwd + "/" + input);
}

export function getNode(root: VexDirNode, path: string): VexNode | null {
  if (path === "/") return root;
  const parts = normalize(path).split("/").filter(Boolean);
  let cur: VexNode = root;
  for (const part of parts) {
    if (cur.type !== "dir") return null;
    const key = findChildKey(cur.children, part);
    const child: VexNode | undefined = key ? cur.children[key] : undefined;
    if (!child) return null;
    cur = child;
  }
  return cur;
}

export function splitParent(path: string): { parent: string; name: string } {
  const norm = normalize(path);
  const idx = norm.lastIndexOf("/");
  const name = norm.slice(idx + 1);
  const parent = idx <= 0 ? "/" : norm.slice(0, idx);
  return { parent, name };
}

export interface OpResult {
  ok: boolean;
  error?: string;
  root?: VexDirNode;
}

export function mkdir(root: VexDirNode, path: string, parents = false): OpResult {
  const target = normalize(path);
  const next = clone(root);
  const segments = target.split("/").filter(Boolean);
  let cur: VexDirNode = next;
  let builtPath = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    builtPath += "/" + seg;
    const existingKey = findChildKey(cur.children, seg);
    const existing = existingKey ? cur.children[existingKey] : undefined;
    const isLast = i === segments.length - 1;
    if (existing) {
      if (existing.type !== "dir") return { ok: false, error: `mkdir: cannot create directory '${target}': Not a directory` };
      if (isLast && !parents) return { ok: false, error: `mkdir: cannot create directory '${target}': File exists` };
      cur = existing;
    } else {
      if (!isLast && !parents) return { ok: false, error: `mkdir: cannot create directory '${target}': No such file or directory (use -p)` };
      const d = newDir();
      cur.children[seg] = d;
      cur = d;
    }
  }
  return { ok: true, root: next };
}

export function writeFile(root: VexDirNode, path: string, content: string): OpResult {
  const target = normalize(path);
  const { parent, name } = splitParent(target);
  if (!name) return { ok: false, error: `invalid path` };
  const next = clone(root);
  const parentNode = getNode(next, parent);
  if (!parentNode || parentNode.type !== "dir") {
    return { ok: false, error: `No such file or directory: ${parent}` };
  }
  const existingKey = findChildKey(parentNode.children, name);
  const existing = existingKey ? parentNode.children[existingKey] : undefined;
  if (existing && existing.type === "dir") {
    return { ok: false, error: `Is a directory: ${target}` };
  }
  const executable = existing?.type === "file" ? existing.meta.executable : false;
  parentNode.children[existingKey ?? name] = existing
    ? { type: "file", content, meta: { ...existing.meta, modified: now() } }
    : newFile(content, executable);
  return { ok: true, root: next };
}

export function removeNode(root: VexDirNode, path: string, recursive = false): OpResult {
  const target = normalize(path);
  if (target === "/") return { ok: false, error: "rm: refusing to remove '/'" };
  const { parent, name } = splitParent(target);
  const next = clone(root);
  const parentNode = getNode(next, parent);
  if (!parentNode || parentNode.type !== "dir") {
    return { ok: false, error: `rm: cannot remove '${target}': No such file or directory` };
  }
  const key = findChildKey(parentNode.children, name);
  if (!key) {
    return { ok: false, error: `rm: cannot remove '${target}': No such file or directory` };
  }
  const node = parentNode.children[key];
  if (node.type === "dir" && Object.keys(node.children).length > 0 && !recursive) {
    return { ok: false, error: `rm: cannot remove '${target}': Directory not empty (use -r)` };
  }
  delete parentNode.children[key];
  return { ok: true, root: next };
}

export function moveNode(root: VexDirNode, from: string, to: string): OpResult {
  const src = normalize(from);
  const node = getNode(root, src);
  if (!node) return { ok: false, error: `mv: cannot stat '${from}': No such file or directory` };
  let dest = normalize(to);
  const destNode = getNode(root, dest);
  if (destNode && destNode.type === "dir") {
    const { name } = splitParent(src);
    dest = normalize(dest + "/" + name);
  }
  const next = clone(root);
  const removeRes = removeNode(next, src, true);
  if (!removeRes.ok || !removeRes.root) return removeRes;
  const { parent, name } = splitParent(dest);
  const parentNode = getNode(removeRes.root, parent);
  if (!parentNode || parentNode.type !== "dir") {
    return { ok: false, error: `mv: cannot move to '${to}': No such file or directory` };
  }
  parentNode.children[name] = clone(node);
  return { ok: true, root: removeRes.root };
}

export function copyNode(root: VexDirNode, from: string, to: string): OpResult {
  const src = normalize(from);
  const node = getNode(root, src);
  if (!node) return { ok: false, error: `cp: cannot stat '${from}': No such file or directory` };
  let dest = normalize(to);
  const next = clone(root);
  const destNode = getNode(next, dest);
  if (destNode && destNode.type === "dir") {
    const { name } = splitParent(src);
    dest = normalize(dest + "/" + name);
  }
  const { parent, name } = splitParent(dest);
  const parentNode = getNode(next, parent);
  if (!parentNode || parentNode.type !== "dir") {
    return { ok: false, error: `cp: cannot copy to '${to}': No such file or directory` };
  }
  parentNode.children[name] = clone(node);
  return { ok: true, root: next };
}

export function listDir(root: VexDirNode, path: string): { ok: boolean; entries?: [string, VexNode][]; error?: string } {
  const node = getNode(root, path);
  if (!node) return { ok: false, error: `cannot access '${path}': No such file or directory` };
  if (node.type !== "dir") return { ok: false, error: `${path}: Not a directory` };
  const entries = Object.entries(node.children).sort((a, b) => {
    const aDir = a[1].type === "dir" ? 0 : 1;
    const bDir = b[1].type === "dir" ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a[0].localeCompare(b[0]);
  });
  return { ok: true, entries };
}

export function tree(root: VexDirNode, path: string, prefix = "", isRoot = true): string {
  const node = getNode(root, path);
  if (!node || node.type !== "dir") return "";
  const entries = Object.entries(node.children).sort((a, b) => a[0].localeCompare(b[0]));
  let out = isRoot ? "." + "\n" : "";
  entries.forEach(([name, child], i) => {
    const last = i === entries.length - 1;
    const branch = last ? "└── " : "├── ";
    out += prefix + branch + name + (child.type === "dir" ? "/" : "") + "\n";
    if (child.type === "dir") {
      out += tree(root, normalize(path + "/" + name), prefix + (last ? "    " : "│   "), false);
    }
  });
  return out;
}

export function countAll(node: VexNode): { files: number; dirs: number; bytes: number } {
  if (node.type === "file") return { files: 1, dirs: 0, bytes: node.content.length };
  let files = 0,
    dirs = 1,
    bytes = 0;
  for (const child of Object.values(node.children)) {
    const c = countAll(child);
    files += c.files;
    dirs += c.dirs;
    bytes += c.bytes;
  }
  return { files, dirs, bytes };
}

export function displayPath(cwd: string): string {
  if (cwd === "/home/user") return "~";
  if (cwd.startsWith("/home/user/")) return "~" + cwd.slice("/home/user".length);
  return cwd;
}

// Walks the whole tree collecting file paths whose name ends with one of the
// given extensions (e.g. [".html", ".htm"]) — used by VexNet to populate its
// "open a page" picker.
export function listFilesByExtension(root: VexDirNode, extensions: string[], path = "/"): string[] {
  const node = getNode(root, path);
  if (!node || node.type !== "dir") return [];
  const results: string[] = [];
  for (const [name, child] of Object.entries(node.children)) {
    const childPath = normalize(path + "/" + name);
    if (child.type === "file" && extensions.some((ext) => name.toLowerCase().endsWith(ext))) {
      results.push(childPath);
    } else if (child.type === "dir") {
      results.push(...listFilesByExtension(root, extensions, childPath));
    }
  }
  return results;
}
