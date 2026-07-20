import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const registryFile = path.join(root, "docs/_data/action_capabilities.json");

const targets = Object.freeze({
  summary: ["docs/api/encodings.md"],
  position: ["docs/api/position-encodings.md", "docs/_sources/action-reference.md"],
  color: ["docs/api/series/color.md", "docs/_sources/action-reference.md"],
  highlight: ["docs/api/appearance.md"],
  legends: ["docs/api/legends.md"],
  axes: ["docs/advanced/axis-components.md"]
});

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function action(value) {
  const values = Array.isArray(value) ? value : value.split(" / ");
  return values.map(name => `\`${name}\``).join(" / ");
}

function marks(support) {
  return Object.keys(support).join(", ");
}

function fieldTypes(support) {
  const groups = new Map();
  for (const [mark, types] of Object.entries(support)) {
    const key = types.join(", ");
    groups.set(key, [...(groups.get(key) ?? []), mark]);
  }
  return [...groups].map(([types, groupedMarks]) =>
    `${groupedMarks.join("/")}: ${types}`
  ).join("; ");
}

export function capabilitySections(registry) {
  const position = table(
    ["Action", "Supported marks", "Field types", "Important modes"],
    registry.position.map(row => [
      action(row.action), marks(row.support), fieldTypes(row.support), row.modes
    ])
  );
  const color = table(
    ["Mode", "Supported marks", "Field types", "Important options"],
    registry.color.map(row => [
      row.mode, marks(row.support), fieldTypes(row.support), row.options
    ])
  );
  const highlight = table(
    ["Action", "Supported marks", "Grain", "Result"],
    registry.highlight.map(row => [
      action(row.action), row.marks.join(", "), row.grain, row.result
    ])
  );
  const legends = table(
    ["Legend family", "Supported marks", "Channels"],
    registry.legends.map(row => [row.family, row.marks.join(", "), row.channels])
  );
  const axes = table(
    ["Axis family", "Create", "Edit", "Editable components"],
    registry.axes.map(row => [
      row.family, action(row.create), action(row.edit), row.components.join(", ")
    ])
  );
  return {
    position,
    color,
    highlight,
    legends,
    axes,
    summary: [
      "The tables below are generated from the same reviewed capability registry used by the focused API pages.",
      "",
      "### Position channels",
      "",
      position,
      "",
      "### Color channels",
      "",
      color,
      "",
      "### Selection and guides",
      "",
      highlight,
      "",
      legends,
      "",
      axes
    ].join("\n")
  };
}

function replaceSection(source, id, body, file) {
  const start = `<!-- action-capabilities:${id}:start -->`;
  const end = `<!-- action-capabilities:${id}:end -->`;
  const first = source.indexOf(start);
  const last = source.indexOf(end);
  assert.notEqual(first, -1, `${file} is missing ${start}`);
  assert.notEqual(last, -1, `${file} is missing ${end}`);
  assert.equal(source.indexOf(start, first + start.length), -1, `${file} repeats ${start}`);
  assert.equal(source.indexOf(end, last + end.length), -1, `${file} repeats ${end}`);
  return `${source.slice(0, first + start.length)}\n${body}\n${source.slice(last)}`;
}

export async function generateDocCapabilities({ check = false } = {}) {
  const registry = JSON.parse(await readFile(registryFile, "utf8"));
  assert.equal(registry.version, 1, "Unknown action capability registry version.");
  const sections = capabilitySections(registry);
  const stale = [];
  for (const [id, files] of Object.entries(targets)) {
    for (const relative of files) {
      const file = path.join(root, relative);
      const source = await readFile(file, "utf8");
      const generated = replaceSection(source, id, sections[id], relative);
      if (source === generated) continue;
      if (check) stale.push(relative);
      else await writeFile(file, generated);
    }
  }
  if (stale.length > 0) {
    throw new Error(`Generated capability documentation is stale: ${[...new Set(stale)].join(", ")}`);
  }
  if (!check) process.stdout.write("generated action capability documentation\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocCapabilities({ check: process.argv.includes("--check") });
}
