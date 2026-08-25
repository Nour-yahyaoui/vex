import { Sandbox } from "@vercel/sandbox";
import { auth } from "@/auth";
import { checkRatelimit, configured as redisConfigured, sandboxRatelimit } from "@/lib/redis";

export const runtime = "nodejs";
export const maxDuration = 60;

type Language = "python" | "javascript";

const RUNTIME_BY_LANG: Record<Language, string> = {
  python: "python3.13",
  javascript: "node24",
};

const FILE_BY_LANG: Record<Language, string> = {
  python: "main.py",
  javascript: "main.js",
};

const CMD_BY_LANG: Record<Language, { cmd: string; args: (file: string) => string[] }> = {
  python: { cmd: "python3", args: (f) => [f] },
  javascript: { cmd: "node", args: (f) => [f] },
};

// Hard wall-clock budget for the *actual command*, separate from and tighter
// than the sandbox's own lifetime timeout below. This is what actually stops
// an infinite loop (`while True: pass`) from riding out the full sandbox
// lifetime — we stop waiting and kill the sandbox ourselves well before that.
const COMMAND_TIMEOUT_MS = 20_000;
const SANDBOX_LIFETIME_MS = 30_000;
const MAX_CODE_LENGTH = 20_000;

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(`Execution exceeded ${ms / 1000}s and was terminated.`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  // Sandbox runs are real, billed compute — if there's no rate limiter
  // configured, refuse rather than silently allowing unlimited runs. Fail
  // closed, not open.
  if (!redisConfigured) {
    return Response.json(
      { error: "Sandbox execution isn't available yet — the server needs UPSTASH_REDIS_REST_URL/TOKEN configured to rate-limit it." },
      { status: 503 }
    );
  }

  let body: { code?: string; language?: Language };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { code, language } = body;
  if (typeof code !== "string" || !code.trim() || !language || !RUNTIME_BY_LANG[language]) {
    return Response.json({ error: "code and a supported language ('python' | 'javascript') are required." }, { status: 400 });
  }
  if (code.length > MAX_CODE_LENGTH) {
    return Response.json({ error: `Script is too long for a sandbox run (max ${MAX_CODE_LENGTH} characters).` }, { status: 413 });
  }

  const { ok } = await checkRatelimit(sandboxRatelimit, session.user.id);
  if (!ok) {
    return Response.json(
      { error: "Sandbox run limit reached for this hour — try again later." },
      { status: 429 }
    );
  }

  let sandbox: Sandbox | null = null;
  try {
    sandbox = await Sandbox.create({
      runtime: RUNTIME_BY_LANG[language],
      timeout: SANDBOX_LIFETIME_MS,
    });

    const file = FILE_BY_LANG[language];
    await sandbox.writeFiles([{ path: file, content: Buffer.from(code, "utf-8") }]);

    const { cmd, args } = CMD_BY_LANG[language];

    let result;
    try {
      result = await withTimeout(sandbox.runCommand({ cmd, args: args(file) }), COMMAND_TIMEOUT_MS);
    } catch (err) {
      if (err instanceof TimeoutError) {
        return Response.json(
          { error: `Script didn't finish in time (likely an infinite loop) and was terminated after ${COMMAND_TIMEOUT_MS / 1000}s.` },
          { status: 408 }
        );
      }
      throw err;
    }

    const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);

    return Response.json({
      stdout,
      stderr,
      exitCode: result.exitCode,
    });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Sandbox execution failed." }, { status: 500 });
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // best-effort cleanup — sandboxes also self-expire on their own timeout
      }
    }
  }
}
