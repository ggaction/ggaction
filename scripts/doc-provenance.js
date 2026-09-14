import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
async function contractFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? contractFiles(`${directory}/${entry.name}`)
    : /\.(?:js|ts)$/.test(entry.name) ? [`${directory}/${entry.name}`] : []))).flat().sort();
}
export async function buildDocProvenance({ releaseContract } = {}) {
  const baseline = JSON.parse(await readFile(path.join(root, "docs/_data/release_baseline.json"), "utf8"));
  releaseContract ??= JSON.parse(await readFile(path.join(root, "docs/_data/release_contract.json"), "utf8"));
  const packageInfo = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const declaration = await readFile(path.join(root, "types/program.d.ts"), "utf8");
  const names = [...declaration.split("export class ChartProgram {")[1].matchAll(/^  ([A-Za-z][A-Za-z0-9]*)\(/gm)]
    .map(match => match[1]).filter(name => name !== "constructor");
  const hash = createHash("sha256");
  for (const file of [...await contractFiles("src"), ...await contractFiles("types")]) {
    hash.update(file); hash.update(await readFile(path.join(root, file)));
  }
  hash.update(JSON.stringify({ version: packageInfo.version, exports: packageInfo.exports,
    dependencies: packageInfo.dependencies, engines: packageInfo.engines }));
  const sourceCommit = execFileSync("git", ["log", "-1", "--format=%H", "--", "src", "types"], { cwd: root, encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["diff", "HEAD", "--", "src", "types"], { cwd: root, encoding: "utf8" }).length > 0;
  const baselineDiff = execFileSync("git", ["diff", "--name-only", baseline.commit, "--", "src", "types"], { cwd: root, encoding: "utf8" });
  // Examples can change without a runtime change. Never link them to an older
  // runtime-only commit. Local edits use the active review branch until committed.
  const exampleDirty = execFileSync("git", ["status", "--porcelain", "--", "examples", "data", ":(exclude)examples/README.md"], { cwd: root, encoding: "utf8" }).length > 0;
  const exampleCommit = execFileSync("git", ["log", "-1", "--format=%H", "--", "examples", "data", ":(exclude)examples/README.md"], { cwd: root, encoding: "utf8" }).trim();
  const exampleSourceRef = exampleDirty
    ? execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
    : exampleCommit;
  const contractId = `sha256:${hash.digest("hex")}`;
  const released = !dirty && (
    (releaseContract.tag === `v${packageInfo.version}` && releaseContract.contractId === contractId) ||
    (!baselineDiff.split("\n").some(file => /\.(?:js|ts)$/.test(file)) && packageInfo.version === baseline.tag.slice(1))
  );
  return {
    schemaVersion: 1,
    status: released ? "published-release" : "development",
    packageVersion: packageInfo.version,
    contractId,
    sourceCommit: dirty ? null : sourceCommit,
    sourceRef: dirty ? "main" : sourceCommit,
    exampleSourceRef,
    baseline: { tag: baseline.tag, commit: baseline.commit, actionCount: baseline.actions.length },
    actionCount: names.length,
    actionAvailability: Object.fromEntries(names.map(name => [name, baseline.actions.includes(name)
      ? { availableBy: baseline.tag }
      : { introducedAfter: baseline.tag, ...(released
          ? { availableBy: `v${packageInfo.version}`, status: "published-release" }
          : { status: "development" }) }]))
  };
}
export async function generateDocProvenance({ check = false } = {}) {
  const expected = JSON.stringify(await buildDocProvenance(), null, 2) + "\n";
  for (const file of ["docs/_data/provenance.json", "docs/doc-provenance.json"]) {
    if (check) {
      if (await readFile(path.join(root, file), "utf8") !== expected) throw new Error(`${file} is stale.`);
    } else await writeFile(path.join(root, file), expected);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocProvenance({ check: process.argv.includes("--check") });
}
