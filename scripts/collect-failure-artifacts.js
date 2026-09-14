import { copyFile, lstat, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 300;

async function filesAt(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const results = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await filesAt(file));
    else if (entry.isFile() && /\.(json|log|png|txt)$/.test(entry.name)) results.push(file);
  }
  return results;
}

export async function collectFailureArtifacts(repository = root) {
  const artifactRoot = path.join(repository, ".artifacts");
  const output = path.join(artifactRoot, "ci-evidence");
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const candidates = (await Promise.all(["checks", "failures", "docs"].map(name => filesAt(path.join(artifactRoot, name))))).flat();
  // Keep case identities and errors before images when the job exceeds its budget.
  candidates.sort((a, b) => Number(a.endsWith(".png")) - Number(b.endsWith(".png")) || a.localeCompare(b));
  const saved = [];
  let bytes = 0;
  let omitted = 0;
  for (const file of candidates) {
    const info = await lstat(file);
    if (!info.isFile() || info.size > 10 * 1024 * 1024 || bytes + info.size > MAX_BYTES || saved.length >= MAX_FILES) { omitted++; continue; }
    const relative = path.relative(artifactRoot, file);
    const destination = path.join(output, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(file, destination);
    bytes += info.size;
    saved.push({ file: relative.split(path.sep).join("/"), bytes: info.size });
  }
  const manifest = { schemaVersion: 1, maxBytes: MAX_BYTES, maxFiles: MAX_FILES, bytes, omitted, files: saved };
  await writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.stdout.write(`${JSON.stringify(await collectFailureArtifacts())}\n`); }
  catch (error) { process.stderr.write(`Failure artifact collection failed: ${error.message}\n`); process.exitCode = 1; }
}
