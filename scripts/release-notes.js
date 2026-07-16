import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractReleaseNotes(changelog, version) {
  if (typeof changelog !== "string") {
    throw new Error("Release notes require changelog text.");
  }
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("Release notes require a semantic version.");
  }
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\](?: - .+)?$`, "m");
  const match = heading.exec(changelog);
  if (!match) throw new Error(`CHANGELOG.md has no release section for ${version}.`);
  const bodyStart = match.index + match[0].length;
  const remaining = changelog.slice(bodyStart);
  const nextHeading = remaining.search(/^## /m);
  const body = (nextHeading === -1 ? remaining : remaining.slice(0, nextHeading)).trim();
  if (body.length === 0) throw new Error(`CHANGELOG.md release ${version} is empty.`);
  return `# ggaction ${version}\n\n${body}\n`;
}

export async function generateReleaseNotes({
  version,
  changelog = path.join(root, "CHANGELOG.md"),
  output = path.join(root, ".artifacts", "release", `ggaction-${version}-release-notes.md`)
}) {
  const notes = extractReleaseNotes(await readFile(changelog, "utf8"), version);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, notes);
  return Object.freeze({ output: path.resolve(output), notes });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const version = process.argv[2];
  if (!version) throw new Error("Usage: npm run release:notes -- <version>");
  const result = await generateReleaseNotes({ version });
  process.stdout.write(`${result.output}\n`);
}
