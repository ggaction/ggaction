import { execFileSync } from "node:child_process";
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Keep a fresh process and exact stdin bytes without depending on pipe EOF
// delivery. Some Node/macOS combinations block in readFileSync(0) on a pipe.
// This helper serves UTF-8 fixture strings or bytes, not arbitrary stdio options.
export function execFileWithInput(command, args, { input, ...options }) {
  const directory = mkdtempSync(path.join(tmpdir(), "ggaction-consumer-input-"));
  let fd, failed = false;
  try {
    const file = path.join(directory, "stdin");
    writeFileSync(file, input);
    fd = openSync(file, "r");
    return execFileSync(command, args, { ...options, stdio: [fd, "pipe", "pipe"] });
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    try {
      try { if (fd !== undefined) closeSync(fd); }
      finally { rmSync(directory, { recursive: true, force: true }); }
    } catch (error) {
      if (!failed) throw error;
    }
  }
}
