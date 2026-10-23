import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { npmInvocation } from "./npm-command.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const LOG_LIMIT = 2 * 1024 * 1024;

export async function runCheck(label, command, args, { cwd = root, outputDirectory = path.join(root, ".artifacts/checks"), stdout = process.stdout, stderr = process.stderr, timeoutMs = Number(process.env.GGACTION_CHECK_TIMEOUT_MS ?? 90 * 60 * 1000), killGraceMs = 1000 } = {}) {
  if (!/^[a-z0-9-]+$/.test(label) || !command) throw new Error("A check requires a safe label and command.");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || !Number.isFinite(killGraceMs) || killGraceMs < 0) throw new Error("Check deadlines must be finite and positive.");
  let tail = Buffer.alloc(0);
  let bytes = 0;
  const started = Date.now();
  const invocation = command === "npm" ? npmInvocation(args)
    : { command: command === "node" ? process.execPath : command, args };
  const child = spawn(invocation.command, invocation.args, { cwd, detached: process.platform !== "win32", stdio: ["inherit", "pipe", "pipe"] });
  let termination;
  let killTimer;
  function signalTree(signal) {
    if (!child.pid) return;
    try {
      if (process.platform === "win32") {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
        killer.on("error", () => child.kill(signal));
      } else process.kill(-child.pid, signal);
    } catch (error) { if (error.code !== "ESRCH") stderr.write(`${error.message}\n`); }
  }
  function terminate(reason) {
    if (termination) return;
    termination = reason;
    signalTree("SIGTERM");
    killTimer = setTimeout(() => signalTree("SIGKILL"), killGraceMs);
    killTimer.unref();
  }
  const deadline = setTimeout(() => terminate("timeout"), timeoutMs);
  const interrupted = () => terminate("SIGINT");
  const cancelled = () => terminate("SIGTERM");
  process.once("SIGINT", interrupted);
  process.once("SIGTERM", cancelled);
  for (const [stream, destination] of [[child.stdout, stdout], [child.stderr, stderr]]) {
    stream.on("data", chunk => {
      destination.write(chunk);
      bytes += chunk.length;
      tail = Buffer.concat([tail, chunk]).subarray(-LOG_LIMIT);
    });
  }
  let startupError;
  child.on("error", error => {
    startupError = error.message;
    const message = Buffer.from(`Could not start check: ${startupError}\n`);
    stderr.write(message);
    bytes += message.length;
    tail = Buffer.concat([tail, message]).subarray(-LOG_LIMIT);
  });
  const result = await new Promise(resolve => child.on("close", (code, signal) => resolve({ code: code === null || code < 0 ? 1 : code, signal })));
  clearTimeout(deadline);
  clearTimeout(killTimer);
  process.removeListener("SIGINT", interrupted);
  process.removeListener("SIGTERM", cancelled);
  if (termination) {
    signalTree("SIGKILL");
    result.code = termination === "timeout" ? 124 : termination === "SIGINT" ? 130 : 143;
  }
  try {
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, `${label}.log`), tail);
    await writeFile(path.join(outputDirectory, `${label}.json`), JSON.stringify({
      label, command, args, ...result, startupError, termination, timeoutMs, durationMs: Date.now() - started,
      node: process.version, platform: process.platform, bytes, retainedBytes: tail.length, truncated: bytes > tail.length
    }, null, 2));
  } catch (error) {
    process.stderr.write(`Could not retain check log: ${error.message}\n`);
  }
  return result.code;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (process.argv[3] !== "--") throw new Error("Usage: run-check <label> -- <command> [args...]");
  process.exitCode = await runCheck(process.argv[2], process.argv[4], process.argv.slice(5));
}
