import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const LOG_LIMIT = 2 * 1024 * 1024;

export async function runCheck(label, command, args, { cwd = root, outputDirectory = path.join(root, ".artifacts/checks"), stdout = process.stdout, stderr = process.stderr } = {}) {
  if (!/^[a-z0-9-]+$/.test(label) || !command) throw new Error("A check requires a safe label and command.");
  let tail = Buffer.alloc(0);
  let bytes = 0;
  const started = Date.now();
  const child = spawn(command === "node" ? process.execPath : command, args, { cwd, stdio: ["inherit", "pipe", "pipe"] });
  for (const [stream, destination] of [[child.stdout, stdout], [child.stderr, stderr]]) {
    stream.on("data", chunk => {
      destination.write(chunk);
      bytes += chunk.length;
      tail = Buffer.concat([tail, chunk]).subarray(-LOG_LIMIT);
    });
  }
  let startupError;
  child.on("error", error => { startupError = error.message; });
  const result = await new Promise(resolve => child.on("close", (code, signal) => resolve({ code: code === null || code < 0 ? 1 : code, signal })));
  try {
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(path.join(outputDirectory, `${label}.log`), tail);
    await writeFile(path.join(outputDirectory, `${label}.json`), JSON.stringify({
      label, command, args, ...result, startupError, durationMs: Date.now() - started,
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
