import { createHash } from "node:crypto";
import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../.artifacts/failures/", import.meta.url));
const FILE_LIMIT = 10 * 1024 * 1024;

export async function recordFailure({ label, error, files = [], details = {} }, directory = root) {
  try {
    const id = createHash("sha256").update(label).digest("hex").slice(0, 16);
    const target = path.join(directory, `${process.pid}-${id}`);
    await mkdir(target, { recursive: true });
    const saved = [];
    for (const [index, file] of files.slice(0, 4).entries()) {
      try {
        const info = await stat(file);
        if (!info.isFile() || info.size > FILE_LIMIT) continue;
        const name = `${index}-${path.basename(file)}`;
        await copyFile(file, path.join(target, name));
        saved.push({ source: file, file: name, bytes: info.size });
      } catch { /* Missing output must not hide the original failure. */ }
    }
    await writeFile(path.join(target, "failure.json"), JSON.stringify({
      label, message: error?.message, stack: error?.stack, details, files: saved
    }, null, 2));
    return target;
  } catch (failure) {
    process.stderr.write(`Could not record failure evidence: ${failure.message}\n`);
    return undefined;
  }
}
