import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function generateDocScaleEditors({ check = false } = {}) {
  const read = file => readFile(path.join(root, file), "utf8");
  const { cards } = JSON.parse(await read("knowledge/action-cards.json"));
  const declared = [...(await read("types/program.d.ts")).matchAll(/^  (edit\w+Scale)\(/gm)].map(match => match[1]);
  const editors = cards.filter(card => declared.includes(card.name));
  assert.equal(editors.length, declared.length);
  const rows = editors.map(card => {
    const [route, anchor] = card.route.split("#");
    const selectors = card.options.filter(option => ["id", "target", "dimension"].includes(option.name));
    return `| [\`${card.name}\`](../${route.slice(1).replace(/\/$/, ".md")}#${anchor}) | ${selectors.map(option => `\`${option.name}\`${option.required ? " (required)" : " (optional)"}`).join(", ")} | ${card.authoringRoles.join(", ")} · ${card.layer} |`;
  });
  const body = ["| Focused editor | Selectors | Role and API layer |", "| --- | --- | --- |", ...rows].join("\n");
  const current = await read("docs/api/scales.md");
  const expected = current.replace(/<!-- focused-scale-editors:start -->[\s\S]*?<!-- focused-scale-editors:end -->/,
    `<!-- focused-scale-editors:start -->\n\n${body}\n\n<!-- focused-scale-editors:end -->`);
  assert.ok(current.includes("<!-- focused-scale-editors:start -->"));
  if (check && current !== expected) throw new Error("Focused scale editor index is stale.");
  if (!check) await writeFile(path.join(root, "docs/api/scales.md"), expected);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocScaleEditors({ check: process.argv.includes("--check") });
}
