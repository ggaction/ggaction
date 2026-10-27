import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDocProvenance } from "./doc-provenance.js";
import { extractReleaseNotes, generateReleaseNotes } from "./release-notes.js";
import { npmInvocation } from "./npm-command.js";

const root = fileURLToPath(new URL("../", import.meta.url));
export const RELEASE_INPUTS = Object.freeze([
  "package.json", "package-lock.json", "src/version.js", "README.md", "CHANGELOG.md", "docs/_config.yml",
  "knowledge/intent-taxonomy.json", "knowledge/mcp-resources.json", "context7.json"
]);
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function planRelease(files, { version, date }) {
  if (typeof version !== "string" || !versionPattern.test(version)) throw new Error("Release preparation requires a stable semantic version.");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error("Release date must be a valid YYYY-MM-DD date.");
  const manifest = JSON.parse(files["package.json"]);
  const lock = JSON.parse(files["package-lock.json"]);
  const current = manifest.version;
  if (!versionPattern.test(current) || manifest.name !== "ggaction") throw new Error("Release preparation requires the ggaction package with a stable version.");
  if (lock.version !== current || lock.packages?.[""]?.version !== current) throw new Error("Package and lock root versions must agree before preparation.");
  const runtime = files["src/version.js"];
  const identity = runtime.match(/export const packageVersion = "([^"]+)";/g) ?? [];
  if (identity.length !== 1 || identity[0] !== `export const packageVersion = "${current}";`) throw new Error("Runtime and package versions must agree before preparation.");
  const parts = value => value.split(".").map(BigInt);
  const a = parts(version), b = parts(current);
  const difference = a.findIndex((part,index)=>part!==b[index]);
  if (difference !== -1 && a[difference] < b[difference]) throw new Error("Release preparation cannot downgrade the package.");
  const status = `**Status:** \`${current}\` is the current experimental public release.`;
  if (files["README.md"].split(status).length !== 2) throw new Error("README release status must have one canonical current version.");
  const config = files["docs/_config.yml"];
  const configVersions = config.match(/^version: .+$/gm) ?? [];
  if (configVersions.length !== 1 || configVersions[0] !== `version: ${current}`) throw new Error("Documentation and package versions must agree before preparation.");
  const knowledge = {};
  for (const file of ["knowledge/intent-taxonomy.json", "knowledge/mcp-resources.json"]) {
    const value = JSON.parse(files[file]);
    if (value.packageVersion !== current) throw new Error(`${file} and package versions must agree before preparation.`);
    value.packageVersion = version;
    knowledge[file] = JSON.stringify(value,null,2)+"\n";
  }
  const context = JSON.parse(files["context7.json"]);
  if (!Array.isArray(context.previousVersions)) throw new Error("Context7 must list version-pinned documentation.");
  if (!context.previousVersions.some(entry=>entry.tag===`v${version}`)) context.previousVersions.unshift({tag:`v${version}`});
  let changelog = files["CHANGELOG.md"];
  if (version !== current) {
    if (changelog.includes(`## [${version}]`)) throw new Error("The requested release already exists in CHANGELOG.md.");
    const match = /^## (?:Unreleased|\[Unreleased\])\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(changelog);
    if (!match || !/^\s*[-*] \S/m.test(match[1])) throw new Error("Unreleased notes must contain concrete changes before preparation.");
    changelog = changelog.slice(0,match.index) + `## Unreleased\n\n## [${version}] - ${date}\n\n${match[1].trim()}\n\n` + changelog.slice(match.index+match[0].length);
  }
  extractReleaseNotes(changelog, version);
  manifest.version = version; lock.version = version; lock.packages[""].version = version;
  return Object.freeze({
    "package.json": JSON.stringify(manifest,null,2)+"\n",
    "package-lock.json": JSON.stringify(lock,null,2)+"\n",
    "src/version.js": runtime.replace(identity[0],`export const packageVersion = "${version}";`),
    "README.md": files["README.md"].replace(status,`**Status:** \`${version}\` is the current experimental public release.`),
    "CHANGELOG.md": changelog,
    "docs/_config.yml": config.replace(configVersions[0], `version: ${version}`),
    ...knowledge,
    "context7.json": JSON.stringify(context,null,2)+"\n"
  });
}

export async function prepareRelease({ version, date = new Date().toISOString().slice(0,10), dryRun = false }) {
  const status = execFileSync("git",["status","--porcelain"],{cwd:root,encoding:"utf8"}).trim();
  if (status) throw new Error("Release preparation requires a clean worktree; commit the reviewed changes first.");
  const files = Object.fromEntries(await Promise.all(RELEASE_INPUTS.map(async file => [file,await readFile(path.join(root,file),"utf8")])));
  const plan = planRelease(files,{version,date});
  const changed = RELEASE_INPUTS.filter(file=>plan[file]!==files[file]);
  if (dryRun) return {version,date,changed,generated:["docs/_data/release_contract.json","documentation and knowledge artifacts","local release notes"],publishes:false};
  for (const file of changed) await writeFile(path.join(root,file),plan[file]);
  const provenance = await buildDocProvenance({releaseContract:{}});
  await writeFile(path.join(root,"docs/_data/release_contract.json"),JSON.stringify({tag:`v${version}`,contractId:provenance.contractId},null,2)+"\n");
  const invocation = npmInvocation(["run","docs:generate"]);
  execFileSync(invocation.command,invocation.args,{cwd:root,stdio:"inherit"});
  const notes = await generateReleaseNotes({version});
  const preparation = {schemaVersion:1,version,tag:`v${version}`,contractId:provenance.contractId,releaseNotes:path.relative(root,notes.output),publishes:false,
    nextSteps:["Review and commit the diff.","Rerun preparation after the runtime commit to refresh exact source provenance.","Run integration checks and merge through required PR checks.","Create the annotated tag and dispatch the protected release workflow from that exact tag."]};
  await mkdir(path.join(root,".artifacts/release"),{recursive:true});
  await writeFile(path.join(root,".artifacts/release/preparation.json"),JSON.stringify(preparation,null,2)+"\n");
  return preparation;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [version,...flags] = process.argv.slice(2);
  if (flags.some(flag=>flag!=="--dry-run" && !/^--date=\d{4}-\d{2}-\d{2}$/.test(flag)) || new Set(flags).size!==flags.length || flags.filter(flag=>flag.startsWith("--date=")).length>1) throw new Error("Usage: npm run release:prepare -- <version> [--date=YYYY-MM-DD] [--dry-run]");
  const date = flags.find(flag=>flag.startsWith("--date="))?.slice(7);
  console.log(JSON.stringify(await prepareRelease({version,date,dryRun:flags.includes("--dry-run")}),null,2));
}
