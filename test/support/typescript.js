import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const compiler = path.join(root, "node_modules/typescript/bin/tsc");
const version = JSON.parse(readFileSync(path.join(root, "node_modules/typescript/package.json"), "utf8")).version;
let sequence = 0;

/** Preserve each contract's compiler flags, including its negative examples. */
export function compileTypeScript(args, options = {}) {
  const started = performance.now();
  const result = spawnSync(process.execPath, [compiler, ...args], {
    cwd: root, encoding: "utf8", timeout: 60_000, ...options
  });
  const directory = path.join(root, ".artifacts/types");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, `${process.pid}-${++sequence}.json`), JSON.stringify({
    compilerVersion: version, node: process.version, args,
    cwd: options.cwd ?? root, status: result.status, signal: result.signal,
    durationMs: performance.now() - started, error: result.error?.message,
    diagnostics: `${result.stdout ?? ""}${result.stderr ?? ""}`
  }, null, 2));
  return result;
}
