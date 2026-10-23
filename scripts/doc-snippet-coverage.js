import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentationCodeBlocks, documentationPrograms } from "./doc-snippets.js";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function publicSnippetCoverage() {
  async function visit(directory) {
    return (await Promise.all((await readdir(path.join(root, directory), { withFileTypes: true })).filter(entry => !entry.name.startsWith("_") && !["AGENTS.md", "README.md", "llm"].includes(entry.name)).map(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? visit(file) : entry.name.endsWith(".md") ? [file] : [];
    }))).flat();
  }
  const programs = await documentationPrograms();
  const records = [];
  for (const file of ["README.md", ...await visit("docs")]) {
    const source = await readFile(path.join(root, file), "utf8");
    const seen = new Map();
    for (const block of documentationCodeBlocks(source).filter(block => ["js", "javascript"].includes(block.language))) {
      const heading = block.heading.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      const ordinal = (seen.get(heading) ?? 0) + 1; seen.set(heading, ordinal);
      const id = `${file}#${heading}:${ordinal}`;
      const executable = programs.some(program => `docs/${program.file}` === file && program.code === block.code);
      const generated = file.startsWith("docs/reference/actions/");
      records.push({ id, file, heading: block.heading, executable, generated,
        sha256: createHash("sha256").update(block.code).digest("hex") });
    }
  }
  return records;
}
