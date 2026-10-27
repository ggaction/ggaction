import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentationCodeBlocks, documentationPrograms } from "./doc-snippets.js";

const root = fileURLToPath(new URL("../", import.meta.url));
async function markdownFiles(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(file) : entry.name.endsWith(".md") && entry.name !== "AGENTS.md" ? [file] : [];
  }))).flat().sort();
}
function receiverNames(code) {
  const declared = new Set([...code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)].map(match => match[1]));
  for (const match of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*=>/g)) declared.add(match[1]);
  for (const match of code.matchAll(/import\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(",")) declared.add(part.trim().split(/\s+as\s+/).at(-1));
  }
  const builtins = new Set(["this", "Math", "JSON", "Object", "Array", "Number", "String", "console", "document", "window", "globalThis", "Promise"]);
  return [...new Set([...code.matchAll(/(?<![.\w])([A-Za-z_$][\w$]*)\.[A-Za-z_$][\w$]*\s*\(/g)]
    .map(match => match[1]))].filter(name => !declared.has(name) && !builtins.has(name));
}
export async function generateDocSnippetContracts({ check = false } = {}) {
  const programs = await documentationPrograms();
  const files = (await Promise.all(["api", "advanced", "extension"].map(group => markdownFiles(path.join(root, "docs", group))))).flat();
  const records = [];
  for (const file of files) {
    const original = await readFile(file, "utf8");
    let source = original.replace(/<!-- snippet-context:start -->[\s\S]*?<!-- snippet-context:end -->\n*/g, "");
    const relative = path.relative(path.join(root, "docs"), file);
    const blocks = documentationCodeBlocks(source).filter(block => ["javascript", "js"].includes(block.language));
    for (const [index, block] of blocks.entries()) {
      const registered = programs.find(program => program.file === relative && program.code === block.code);
      const receivers = receiverNames(block.code);
      const resources = [...new Set([...block.code.matchAll(/\b(target|data|source|selection):\s*["']([^"']+)["']/g)]
        .map(match => `${match[1]}: "${match[2]}"`))];
      const mode = registered?.mode ?? (/\btry\s*\{/.test(block.code) ? "expected-error" : /\b(?:alternative|each starts)\b/i.test(block.code) ? "alternative" : "fragment");
      const prerequisites = registered?.prerequisites ?? [
        "Use an ES module with the imports, data, and prepared resource state described in this section.",
        ...(receivers.length ? [`Caller-provided receivers: ${receivers.map(name => `\`${name}\``).join(", ")}.`] : []),
        ...(resources.length ? [`Resource selectors used here: ${resources.map(value => `\`${value}\``).join("; ")}.`] : []),
        "Resolve these names from setup in this fragment or section; alternatives branch from the same base."
      ].join(" ");
      records.push({ file: relative, block: index + 1, heading: block.heading, mode,
        environment: registered?.environment ?? (/\bdocument\./.test(block.code) ? "browser-module" : "esm-context"),
        receivers, resources, prerequisites,
        sha256: createHash("sha256").update(block.code).digest("hex"),
        executable: Boolean(registered) });
      const label = registered ? `Executable ${mode}` : mode === "fragment" ? "Contextual fragment" : mode;
      const callout = `<!-- snippet-context:start -->\n\n> **${label}.** ${prerequisites}\n\n<!-- snippet-context:end -->\n\n`;
      const fenced = `${block.fence}${block.language}\n${block.code}\n${block.fence}`;
      source = source.replace(fenced, callout + fenced);
    }
    if (check && original !== source) throw new Error(`${relative} has stale snippet prerequisites.`);
    if (!check) await writeFile(file, source);
  }
  const manifestFile = path.join(root, "docs/_data/snippet_contracts.json");
  const expected = JSON.stringify(records, null, 2) + "\n";
  if (check && await readFile(manifestFile, "utf8") !== expected) throw new Error("Snippet inventory is stale.");
  if (!check) await writeFile(manifestFile, expected);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocSnippetContracts({ check: process.argv.includes("--check") });
}
