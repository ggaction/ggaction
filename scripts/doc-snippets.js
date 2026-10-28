import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

// Explicit example modules/assets accompany a displayed module entry unchanged.
// Installed consumers receive only these public example files, never library src.
export async function copyDocumentationSupportFiles(example, destination) {
  const files = Object.entries(example.supportFiles ?? {}).map(([relative, source]) => {
    const safe = value => typeof value === "string" && value.length > 0 &&
      !path.isAbsolute(value) && !value.includes("\\") && value.split("/").every(part => part && part !== "." && part !== "..");
    if (!safe(relative) || !safe(source) || !source.startsWith("examples/")) {
      throw new Error("Documentation support files require relative example sources and local destinations.");
    }
    return { relative, source };
  });
  for (const { relative, source } of files) {
    const bytes = await readFile(path.join(root, source));
    if (/\.[cm]?js$/.test(source) && /(?:from\s*|import\s*\()["'][^"']*\bsrc\//.test(bytes.toString("utf8"))) {
      throw new Error("Documentation support modules must import the public installed package.");
    }
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}

/** Preserve the displayed code and its heading; do not rewrite API calls. */
export function documentationCodeBlocks(markdown) {
  const blocks = [];
  let heading = "";
  let block;
  for (const [index, line] of markdown.split("\n").entries()) {
    if (block) {
      if (new RegExp(`^ {0,3}${block.fence[0]}{${block.fence.length},}\\s*$`).test(line)) {
        blocks.push({ ...block, code: block.lines.join("\n") });
        block = undefined;
      } else block.lines.push(line);
      continue;
    }
    if (/^#{1,6} /.test(line)) heading = line.replace(/^#+ /, "");
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})([\w-]*)(?:[ \t]+[^\n]*)?$/);
    if (fence) block = {
      fence: fence[1], language: fence[2], heading, line: index + 1, lines: []
    };
  }
  if (block) throw new Error("Unclosed documentation code fence.");
  return blocks;
}

export async function documentationPrograms() {
  const registry = JSON.parse(await readFile(
    path.join(root, "docs/_data/snippet_programs.json"), "utf8"
  ));
  const expected = (await Promise.all(["recipes", "tutorials"].map(async group =>
    (await readdir(path.join(root, "docs", group)))
      .filter(name => name.endsWith(".md") && name !== "index.md")
      .map(name => `${group}/${name}`)
  ))).flat().sort();
  const registered = Object.keys(registry).filter(file =>
    /^(?:recipes|tutorials)\//.test(file)
  ).sort();
  if (JSON.stringify(expected) !== JSON.stringify(registered)) {
    throw new Error("Every tutorial and recipe needs a runnable entry in docs/_data/snippet_programs.json.");
  }
  const extra = JSON.parse(await readFile(path.join(root, "docs/_data/snippet_cases.json"), "utf8"));
  if (new Set(extra.map(entry => entry.id)).size !== extra.length) throw new Error("Snippet case IDs must be unique.");
  return Promise.all([...Object.entries(registry), ...extra.map(({ file, ...options }) => [file, options])].map(async ([file, options]) => {
    const source = await readFile(path.join(root, "docs", file), "utf8");
    const blocks = documentationCodeBlocks(source);
    const javascript = blocks.filter(block => ["js", "javascript"].includes(block.language));
    if (options.contains && javascript.filter(item => item.code.includes(options.contains)).length !== 1) {
      throw new Error(`${file}: snippet marker must select exactly one block: ${options.contains}`);
    }
    const block = options.contains
      ? javascript.find(item => item.code.includes(options.contains))
      : javascript.find(item => item.heading === "Complete program") ?? javascript[0];
    if (!block) throw new Error(`${file} is missing its registered executable block.`);
    if (!["node-esm", "browser-module"].includes(options.environment) ||
        !["authoring-only", "renders-canvas"].includes(options.rendering) ||
        !["complete", "continuation"].includes(options.mode) ||
        !/^[A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*$/.test(options.result ?? "")) {
      throw new Error(`${file} must identify its environment and observable result.`);
    }
    return { file, ...options, ...block, sha256: createHash("sha256").update(block.code).digest("hex") };
  }));
}
