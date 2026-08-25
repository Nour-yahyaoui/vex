export type VexNodeType = "dir" | "file";

export interface VexFileMeta {
  created: number;
  modified: number;
  executable: boolean;
}

export interface VexFileNode {
  type: "file";
  content: string;
  meta: VexFileMeta;
}

export interface VexDirNode {
  type: "dir";
  meta: VexFileMeta;
  children: Record<string, VexNode>;
}

export type VexNode = VexFileNode | VexDirNode;

export interface VexEnv {
  [key: string]: string;
}

export interface VexFsSnapshot {
  root: VexDirNode;
  cwd: string;
  env: VexEnv;
  hostname: string;
  user: string;
  rootPassword: string;
  version: number;
}

export interface TerminalLine {
  id: string;
  kind: "input" | "output" | "error" | "success" | "raw";
  text: string;
  promptUser?: string;
  promptPath?: string;
  isRoot?: boolean;
}

export type AppId = "terminal" | "vexbit" | "files" | "settings" | "monitor" | "about" | "vexnet";

export interface WindowState {
  id: string;
  app: AppId;
  title: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  prev?: { x: number; y: number; w: number; h: number };
  openedWith?: { path?: string; root?: string };
}
