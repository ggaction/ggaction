import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = file => readFile(path.join(root, file), "utf8");
export async function generateDocChartPicker({ check = false } = {}) {
  const { cards } = JSON.parse(await read("knowledge/action-cards.json"));
  const groups = JSON.parse(await read("docs/_data/chart_picker.json"));
  const h0 = cards.filter(card => card.authoringRoles.includes("H0"));
  assert.deepEqual(Object.values(groups).flatMap(group => Object.keys(group)).sort(), h0.map(card => card.name).sort());
  const link = name => {
    const card = cards.find(card => card.name === name);
    if (!card) throw new Error(`Unknown chart relationship ${name}`);
    const [route, anchor] = card.route.split("#");
    return `[\`${name}\`](../${route.slice(1).replace(/\/$/, ".md")}#${anchor})`;
  };
  const body = Object.entries(groups).flatMap(([title, entries]) => [
    `## ${title}`, "",
    "| Task / input | H0 action | Role · layer · entry | Direct editor | Lower-level actions |",
    "| --- | --- | --- | --- | --- |",
    ...Object.entries(entries).map(([name, input]) => {
      const card = h0.find(card => card.name === name);
      return `| ${input} | ${link(name)} | ${card.authoringRoles.join(", ")} · ${card.layer} · ${card.supports.entryPoints.join(", ")} | ${card.editableVia.map(link).join(" · ") || "Refine the owned marks, encodings, or guides"} | ${card.wraps.filter(name => cards.some(card => card.name === name)).map(link).join(" · ")} |`;
    }), ""
  ]).join("\n");
  const file = "docs/api/chart-picker.md";
  const current = await read(file);
  const expected = current.replace(/<!-- chart-picker:start -->[\s\S]*?<!-- chart-picker:end -->/,
    `<!-- chart-picker:start -->\n\n${body}\n<!-- chart-picker:end -->`);
  if (check && current !== expected) throw new Error("Chart picker is stale.");
  if (!check) await writeFile(path.join(root, file), expected);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocChartPicker({ check: process.argv.includes("--check") });
}
