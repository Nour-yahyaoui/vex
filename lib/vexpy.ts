// vexpy — a small, safe, educational subset interpreter for python3-style scripts.
// It supports the patterns learners actually write early on: print(), variables,
// f-strings, arithmetic, string concatenation, if/elif/else, and for-in-range loops.
// It is intentionally NOT a full Python implementation.

type Scope = Record<string, any>;

interface RunResult {
  output: string[];
  error: string | null;
}

const MAX_STEPS = 200000;
const MAX_LOOP_ITERS = 100000;
// Caps the size of any single string value. Without this, something like
// `s = "a"` followed by `s = s + s` in a loop doubles in size every
// iteration — a handful of iterations reaches gigabytes long before the
// loop-count guard above would ever notice, which freezes/crashes the tab.
const MAX_STRING_LEN = 500000;

class VexPyError extends Error {}

function checkStringLen(s: string): string {
  if (s.length > MAX_STRING_LEN) {
    throw new VexPyError(`RuntimeError: string exceeded vexpy's ${MAX_STRING_LEN}-character limit`);
  }
  return s;
}

function indentOf(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].replace(/\t/g, "    ").length : 0;
}

function stripComment(line: string): string {
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === inStr && line[i - 1] !== "\\") inStr = null;
    } else if (c === '"' || c === "'") {
      inStr = c;
    } else if (c === "#") {
      return line.slice(0, i);
    }
  }
  return line;
}

interface Block {
  header: string;
  indent: number;
  body: Block[];
}

function buildBlocks(lines: string[]): Block[] {
  const filtered: { text: string; indent: number }[] = [];
  for (const raw of lines) {
    const noComment = stripComment(raw).replace(/\s+$/, "");
    if (noComment.trim() === "") continue;
    filtered.push({ text: noComment.trim(), indent: indentOf(raw) });
  }

  function parse(startIndent: number, pos: { i: number }): Block[] {
    const blocks: Block[] = [];
    while (pos.i < filtered.length) {
      const line = filtered[pos.i];
      if (line.indent < startIndent) break;
      if (line.indent > startIndent) {
        throw new VexPyError(`IndentationError: unexpected indent at "${line.text}"`);
      }
      pos.i++;
      const block: Block = { header: line.text, indent: line.indent, body: [] };
      if (line.text.endsWith(":")) {
        const childIndent = pos.i < filtered.length ? filtered[pos.i].indent : startIndent;
        if (pos.i < filtered.length && childIndent > startIndent) {
          block.body = parse(childIndent, pos);
        }
      }
      blocks.push(block);
    }
    return blocks;
  }

  return parse(0, { i: 0 });
}

// ---- expression evaluation (small recursive-descent parser) ----

function evalExpr(expr: string, scope: Scope): any {
  const tokens = tokenize(expr);
  const parser = new ExprParser(tokens, scope);
  const value = parser.parseOr();
  parser.expectEnd();
  return value;
}

type Tok = { t: string; v: string };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const isDigit = (c: string) => /[0-9]/.test(c);
  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c);
  const isIdent = (c: string) => /[A-Za-z0-9_]/.test(c);
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) {
          const next = src[j + 1];
          s += next === "n" ? "\n" : next === "t" ? "\t" : next;
          j += 2;
        } else {
          s += src[j];
          j++;
        }
      }
      toks.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    if (isDigit(c) || (c === "." && isDigit(src[i + 1]))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      toks.push({ t: "num", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i;
      while (j < src.length && isIdent(src[j])) j++;
      toks.push({ t: "ident", v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (src.startsWith("**", i)) {
      toks.push({ t: "op", v: "**" });
      i += 2;
      continue;
    }
    if (
      src.startsWith("==", i) ||
      src.startsWith("!=", i) ||
      src.startsWith(">=", i) ||
      src.startsWith("<=", i)
    ) {
      toks.push({ t: "op", v: src.slice(i, i + 2) });
      i += 2;
      continue;
    }
    if ("+-*/%()[],<>".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    throw new VexPyError(`SyntaxError: unexpected character '${c}'`);
  }
  return toks;
}

class ExprParser {
  pos = 0;
  constructor(private toks: Tok[], private scope: Scope) {}

  peek() {
    return this.toks[this.pos];
  }
  next() {
    return this.toks[this.pos++];
  }
  expectEnd() {
    if (this.pos < this.toks.length) {
      throw new VexPyError(`SyntaxError: unexpected token '${this.peek().v}'`);
    }
  }

  parseOr(): any {
    let left = this.parseAnd();
    while (this.peek() && this.peek().t === "ident" && this.peek().v === "or") {
      this.next();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }
  parseAnd(): any {
    let left = this.parseNot();
    while (this.peek() && this.peek().t === "ident" && this.peek().v === "and") {
      this.next();
      const right = this.parseNot();
      left = left && right;
    }
    return left;
  }
  parseNot(): any {
    if (this.peek() && this.peek().t === "ident" && this.peek().v === "not") {
      this.next();
      return !this.parseNot();
    }
    return this.parseCompare();
  }
  parseCompare(): any {
    let left = this.parseAdd();
    const ops = ["==", "!=", ">=", "<=", "<", ">"];
    while (this.peek() && this.peek().t === "op" && ops.includes(this.peek().v)) {
      const op = this.next().v;
      const right = this.parseAdd();
      switch (op) {
        case "==":
          left = left === right;
          break;
        case "!=":
          left = left !== right;
          break;
        case ">=":
          left = left >= right;
          break;
        case "<=":
          left = left <= right;
          break;
        case "<":
          left = left < right;
          break;
        case ">":
          left = left > right;
          break;
      }
    }
    return left;
  }
  parseAdd(): any {
    let left = this.parseMul();
    while (this.peek() && this.peek().t === "op" && (this.peek().v === "+" || this.peek().v === "-")) {
      const op = this.next().v;
      const right = this.parseMul();
      if (op === "+") {
        left =
          typeof left === "string" || typeof right === "string"
            ? checkStringLen(String(left) + String(right))
            : left + right;
      } else {
        left = left - right;
      }
    }
    return left;
  }
  parseMul(): any {
    let left = this.parseUnary();
    while (
      this.peek() &&
      this.peek().t === "op" &&
      ["*", "/", "%", "**"].includes(this.peek().v)
    ) {
      const op = this.next().v;
      const right = this.parseUnary();
      if (op === "*") {
        if (typeof left === "string") {
          const count = Math.max(0, right);
          if (left.length * count > MAX_STRING_LEN) {
            throw new VexPyError(`RuntimeError: string repeat would exceed vexpy's ${MAX_STRING_LEN}-character limit`);
          }
          left = left.repeat(count);
        } else {
          left = left * right;
        }
      } else if (op === "/") left = left / right;
      else if (op === "%") left = left % right;
      else if (op === "**") left = Math.pow(left, right);
    }
    return left;
  }
  parseUnary(): any {
    if (this.peek() && this.peek().t === "op" && this.peek().v === "-") {
      this.next();
      return -this.parseUnary();
    }
    return this.parsePostfix();
  }
  parsePostfix(): any {
    let val = this.parseAtom();
    while (this.peek() && this.peek().t === "op" && this.peek().v === "[") {
      this.next();
      const idx = this.parseOr();
      if (!this.peek() || this.peek().v !== "]") throw new VexPyError("SyntaxError: expected ']'");
      this.next();
      val = val[idx < 0 ? val.length + idx : idx];
    }
    return val;
  }
  parseAtom(): any {
    const tok = this.next();
    if (!tok) throw new VexPyError("SyntaxError: unexpected end of expression");
    if (tok.t === "num") return tok.v.includes(".") ? parseFloat(tok.v) : parseInt(tok.v, 10);
    if (tok.t === "str") return tok.v;
    if (tok.t === "op" && tok.v === "(") {
      const val = this.parseOr();
      if (!this.peek() || this.peek().v !== ")") throw new VexPyError("SyntaxError: expected ')'");
      this.next();
      return val;
    }
    if (tok.t === "op" && tok.v === "[") {
      const items: any[] = [];
      if (this.peek() && this.peek().v !== "]") {
        items.push(this.parseOr());
        while (this.peek() && this.peek().v === ",") {
          this.next();
          items.push(this.parseOr());
        }
      }
      if (!this.peek() || this.peek().v !== "]") throw new VexPyError("SyntaxError: expected ']'");
      this.next();
      return items;
    }
    if (tok.t === "ident") {
      if (tok.v === "True") return true;
      if (tok.v === "False") return false;
      if (tok.v === "None") return null;
      if (this.peek() && this.peek().v === "(") {
        this.next();
        const args: any[] = [];
        if (this.peek() && this.peek().v !== ")") {
          args.push(this.parseOr());
          while (this.peek() && this.peek().v === ",") {
            this.next();
            args.push(this.parseOr());
          }
        }
        if (!this.peek() || this.peek().v !== ")") throw new VexPyError("SyntaxError: expected ')'");
        this.next();
        return callBuitin(tok.v, args);
      }
      if (Object.prototype.hasOwnProperty.call(this.scope, tok.v)) return this.scope[tok.v];
      throw new VexPyError(`NameError: name '${tok.v}' is not defined`);
    }
    throw new VexPyError(`SyntaxError: unexpected token`);
  }
}

function callBuitin(name: string, args: any[]): any {
  switch (name) {
    case "len":
      return args[0]?.length ?? 0;
    case "str":
      return pyStr(args[0]);
    case "int":
      return parseInt(args[0], 10);
    case "float":
      return parseFloat(args[0]);
    case "abs":
      return Math.abs(args[0]);
    case "round":
      return args.length > 1 ? Number(args[0].toFixed(args[1])) : Math.round(args[0]);
    case "min":
      return Math.min(...args);
    case "max":
      return Math.max(...args);
    case "sum":
      return (args[0] as any[]).reduce((a, b) => a + b, 0);
    case "range":
      return rangeArgs(args);
    default:
      throw new VexPyError(`NameError: name '${name}' is not defined`);
  }
}

function rangeArgs(args: any[]): number[] {
  let start = 0,
    stop = 0,
    step = 1;
  if (args.length === 1) stop = args[0];
  else if (args.length === 2) {
    start = args[0];
    stop = args[1];
  } else {
    start = args[0];
    stop = args[1];
    step = args[2];
  }
  const out: number[] = [];
  if (step === 0) throw new VexPyError("ValueError: range() arg 3 must not be zero");
  if (step > 0) for (let v = start; v < stop; v += step) out.push(v);
  else for (let v = start; v > stop; v += step) out.push(v);
  if (out.length > MAX_LOOP_ITERS) throw new VexPyError("RuntimeError: range too large for vexpy");
  return out;
}

function pyStr(v: any): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (Array.isArray(v)) return "[" + v.map((x) => (typeof x === "string" ? `'${x}'` : pyStr(x))).join(", ") + "]";
  return String(v);
}

function renderFString(literal: string, scope: Scope): string {
  let out = "";
  let i = 0;
  while (i < literal.length) {
    if (literal[i] === "{") {
      const end = literal.indexOf("}", i);
      if (end === -1) {
        out += literal.slice(i);
        break;
      }
      const inner = literal.slice(i + 1, end);
      out += pyStr(evalExpr(inner, scope));
      i = end + 1;
    } else {
      out += literal[i];
      i++;
    }
  }
  return out;
}

function evalMaybeFString(raw: string, scope: Scope): any {
  const trimmed = raw.trim();
  const fMatch = trimmed.match(/^[fF](['"])([\s\S]*)\1$/);
  if (fMatch) return renderFString(fMatch[2], scope);
  return evalExpr(trimmed, scope);
}

function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr: string | null = null;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      cur += c;
      if (c === inStr && s[i - 1] !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      cur += c;
      continue;
    }
    if ("([".includes(c)) depth++;
    if (")]".includes(c)) depth--;
    if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim() !== "") parts.push(cur);
  return parts;
}

export function runVexPy(source: string): RunResult {
  const output: string[] = [];
  let steps = 0;
  const step = () => {
    steps++;
    if (steps > MAX_STEPS) throw new VexPyError("RuntimeError: script exceeded the vexpy step limit");
  };

  function execBlocks(blocks: Block[], scope: Scope) {
    let i = 0;
    while (i < blocks.length) {
      const b = blocks[i];
      step();
      const header = b.header;

      if (header.startsWith("print(") && header.endsWith(")")) {
        const inner = header.slice(6, -1);
        const parts = splitTopLevelCommas(inner).map((p) => evalMaybeFString(p, scope));
        output.push(parts.map(pyStr).join(" "));
        i++;
        continue;
      }

      if (header.startsWith("for ") && header.endsWith(":")) {
        const m = header.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+):$/);
        if (!m) throw new VexPyError(`SyntaxError: invalid for statement "${header}"`);
        const [, varName, iterExpr] = m;
        const iterable = evalExpr(iterExpr.trim(), scope);
        const items: any[] = Array.isArray(iterable) ? iterable : [];
        let count = 0;
        for (const item of items) {
          if (++count > MAX_LOOP_ITERS) throw new VexPyError("RuntimeError: loop exceeded max iterations");
          scope[varName] = item;
          execBlocks(b.body, scope);
        }
        i++;
        continue;
      }

      if (header.startsWith("while ") && header.endsWith(":")) {
        const cond = header.slice(6, -1);
        let guard = 0;
        while (evalExpr(cond, scope)) {
          if (++guard > MAX_LOOP_ITERS) throw new VexPyError("RuntimeError: loop exceeded max iterations");
          execBlocks(b.body, scope);
        }
        i++;
        continue;
      }

      if ((header.startsWith("if ") && header.endsWith(":")) ) {
        let handled = false;
        const chain: { cond: string | null; blocks: Block[] }[] = [];
        chain.push({ cond: header.slice(3, -1), blocks: b.body });
        let j = i + 1;
        while (j < blocks.length && (blocks[j].header.startsWith("elif ") || blocks[j].header === "else:")) {
          const h = blocks[j].header;
          if (h.startsWith("elif ")) chain.push({ cond: h.slice(5, -1), blocks: blocks[j].body });
          else chain.push({ cond: null, blocks: blocks[j].body });
          j++;
        }
        for (const branch of chain) {
          if (branch.cond === null || evalExpr(branch.cond, scope)) {
            execBlocks(branch.blocks, scope);
            handled = true;
            break;
          }
        }
        i = j;
        continue;
      }

      if (header === "pass") {
        i++;
        continue;
      }

      if (header.startsWith("import ")) {
        // no-op: vexpy has no modules, but we don't want to hard-fail simple scripts
        i++;
        continue;
      }

      const assignMatch = header.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|\*=|=)\s*(.+)$/);
      if (assignMatch) {
        const [, name, op, rhs] = assignMatch;
        const value = evalMaybeFString(rhs, scope);
        if (op === "=") scope[name] = value;
        else if (op === "+=")
          scope[name] =
            typeof scope[name] === "string" ? checkStringLen(String(scope[name]) + String(value)) : scope[name] + value;
        else if (op === "-=") scope[name] = scope[name] - value;
        else if (op === "*=") scope[name] = scope[name] * value;
        i++;
        continue;
      }

      // bare expression statement (e.g. a function call for side effects)
      evalMaybeFString(header, scope);
      i++;
    }
  }

  try {
    const blocks = buildBlocks(source.split("\n"));
    execBlocks(blocks, {});
    return { output, error: null };
  } catch (e: any) {
    return { output, error: e?.message ?? String(e) };
  }
}
