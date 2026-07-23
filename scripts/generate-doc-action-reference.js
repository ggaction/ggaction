import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildRuntimeSignatureSection } from "./generate-doc-signatures.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const docsRoot = path.join(root, "docs");
const sourceFile = path.join(docsRoot, "_sources/action-reference.md");
const landingFile = path.join(docsRoot, "reference/actions.md");
const linksFile = path.join(docsRoot, "_data/action_reference_links.json");
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");

const families = Object.freeze([
  {
    id: "charts-data",
    title: "Charts, Data, and Composition Actions",
    description: "Create complete charts, manage data, select marks, and compose complete programs.",
    domains: ["core", "charts", "composition", "mark-selection"]
  },
  {
    id: "marks",
    title: "Mark Actions",
    description: "Create, edit, jitter, and remove semantic chart marks.",
    domains: ["marks"]
  },
  {
    id: "encodings",
    title: "Encoding Actions",
    description: "Map fields and constants to position, grouping, color, shape, size, and appearance.",
    domains: ["encodings"]
  },
  {
    id: "statistics",
    title: "Statistical Layer Actions",
    description: "Create and edit regression, density, interval, error, and box-plot layers.",
    domains: ["statistics"]
  },
  {
    id: "guides",
    title: "Guide, Axis, Grid, and Title Actions",
    description: "Create, edit, and remove axes, grids, legends, and chart titles.",
    domains: ["axes", "grid", "legend_and_title"]
  }
]);

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function bootstrapSource() {
  if (await exists(sourceFile)) return;
  await mkdir(path.dirname(sourceFile), { recursive: true });
  await copyFile(landingFile, sourceFile);
}

function h2Section(source, title, nextTitle) {
  const start = source.indexOf(`## ${title}`);
  if (start === -1) throw new Error(`Action reference source is missing ${title}.`);
  const end = nextTitle === undefined ? source.length : source.indexOf(`## ${nextTitle}`, start + 1);
  if (end === -1) throw new Error(`Action reference source is missing ${nextTitle}.`);
  return source.slice(start, end).trim();
}

function h3Blocks(section) {
  const starts = [...section.matchAll(/^###\s+/gm)].map(match => match.index);
  return starts.map((start, index) => section.slice(start, starts[index + 1] ?? section.length).trim());
}

function calls(source) {
  return new Set([...source.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\s*\(/g)].map(match => match[1]));
}

function headingId(block) {
  const title = block.match(/^###\s+(.+)$/m)?.[1] ?? "";
  return title.replace(/`/g, "").toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function page({ title, description, introduction, body }) {
  const nestedBody = body.replace(/\]\(\.\.\//g, "](../../");
  return [
    "---",
    "layout: default",
    `title: ${title}`,
    `description: ${description}`,
    "---",
    "",
    `# ${title}`,
    "",
    introduction,
    "",
    nestedBody.replace(/^### /gm, "## ").replace(/^#### /gm, "### "),
    "",
    "## Related",
    "",
    "[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)",
    ""
  ].join("\n");
}

export async function buildDocActionReference() {
  await bootstrapSource();
  const [source, catalogSource, runtimeSignatures] = await Promise.all([
    readFile(sourceFile, "utf8"),
    readFile(catalogFile, "utf8"),
    buildRuntimeSignatureSection()
  ]);
  const catalog = JSON.parse(catalogSource);
  const actionByName = new Map(catalog.actions.map(action => [action.name, action]));
  const chartSection = h2Section(source, "Chart Authoring API", "Advanced Chart API");
  const blocks = h3Blocks(chartSection);
  const outputs = new Map();
  const locations = new Map();

  for (const family of families) {
    const selected = blocks.filter(block => {
      const names = [...calls(block)].filter(name => actionByName.has(name));
      const domains = new Set(names.map(name => actionByName.get(name).domain));
      return family.domains.some(domain => domains.has(domain));
    });
    if (selected.length === 0) throw new Error(`Action family ${family.id} is empty.`);
    const relative = `reference/actions/${family.id}.md`;
    outputs.set(relative, page({
      ...family,
      introduction: "These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.",
      body: selected.join("\n\n")
    }));
    for (const block of selected) {
      const anchor = headingId(block);
      for (const name of calls(block)) {
        if (actionByName.has(name)) locations.set(name, `/reference/actions/${family.id}/#${anchor}`);
      }
    }
  }

  const advanced = h2Section(source, "Advanced Chart API", "Extension API");
  outputs.set("reference/actions/advanced.md", page({
    title: "Advanced Chart Actions",
    description: "Author explicit semantic resources and control individual Cartesian axis and grid components.",
    introduction: "Use these actions when the complete chart and guide facades do not expose the required control.",
    body: advanced.replace(/^## Advanced Chart API\n+/, "")
  }));
  for (const block of h3Blocks(advanced)) {
    const anchor = headingId(block);
    for (const name of calls(block)) {
      if (actionByName.has(name)) locations.set(name, `/reference/actions/advanced/#${anchor}`);
    }
  }

  const extension = h2Section(source, "Extension API", "Internal trace operations");
  outputs.set("reference/actions/extension.md", page({
    title: "Extension Actions",
    description: "Use wrapped actions and low-level semantic, graphic, and scale primitives to extend ggaction.",
    introduction: "Import extension-authoring APIs from `ggaction/extension`; ordinary chart authors should prefer chart actions.",
    body: extension.replace(/^## Extension API\n+/, "")
  }));
  for (const name of calls(extension)) {
    if (actionByName.has(name)) locations.set(name, "/reference/actions/extension/#extension-actions");
  }

  const runtime = [
    h2Section(source, "Program functions", "Rendering functions").replace(
      /<!-- BEGIN GENERATED RUNTIME SIGNATURES -->[\s\S]*?<!-- END GENERATED RUNTIME SIGNATURES -->/,
      runtimeSignatures
    ),
    h2Section(source, "Rendering functions"),
    h2Section(source, "Internal trace operations", "Program functions")
  ].join("\n\n");
  outputs.set("reference/runtime.md", [
    "---",
    "layout: default",
    "title: Program and Rendering Functions",
    "description: Create, compose, render, and inspect programs without confusing package functions with chainable actions.",
    "---",
    "",
    "# Program and Rendering Functions",
    "",
    runtime,
    ""
  ].join("\n"));

  const missing = catalog.actions.filter(action => !locations.has(action.name));
  if (missing.length > 0) {
    throw new Error(`Reference locations are missing: ${missing.map(action => action.name).join(", ")}`);
  }

  const cards = [
    ...families.map(family => [family.title, `/reference/actions/${family.id}/`, family.description]),
    ["Advanced chart actions", "/reference/actions/advanced/", "Explicit resources and focused axis or grid control."],
    ["Extension actions", "/reference/actions/extension/", "Wrapped actions and public authoring primitives."],
    ["Program and rendering functions", "/reference/runtime/", "Package functions, renderers, and internal trace boundaries."],
    ["Exact TypeScript contract", "/reference/types/", "The complete generated `ChartProgram` action interface."]
  ].map(([title, url, description]) =>
    `  <a href="{{ '${url}' | relative_url }}"><strong>${title}</strong><span>${description}</span></a>`
  ).join("\n");

  const actionRows = [...locations].sort(([left], [right]) => left.localeCompare(right))
    .map(([name, url]) => {
      const markdownUrl = url.replace(/^\/reference\//, "./").replace(/\/#/, ".md#");
      return `| [\`${name}\`](${markdownUrl}) | ${actionByName.get(name).layer} | ${actionByName.get(name).domain} |`;
    })
    .join("\n");
  outputs.set("reference/actions.md", [
    "---",
    "layout: default",
    "title: Action Reference",
    "description: Find every public ggaction action by task, API layer, or exact action name.",
    "---",
    "",
    "# Action Reference",
    "",
    "Every direct action accepts one option object and returns a new immutable `ChartProgram`. Choose a task family for readable behavior, defaults, inference, and errors; use the exact lookup when you already know the action name. The API-layer labels match the action catalog layers `user-facing`, `advanced`, and `primitive`, respectively.",
    "",
    '<div class="docs-entry-grid docs-entry-grid--two">',
    cards,
    "</div>",
    "",
    "## Exact action lookup",
    "",
    "Use document search with `Ctrl+K`, or filter the alphabetical list by action name, API layer, or domain. Each action has one canonical family entry.",
    "",
    '<div class="docs-action-filter docs-action-lookup" data-action-lookup>',
    '  <label for="docs-action-lookup-input">Filter exact actions</label>',
    '  <input id="docs-action-lookup-input" type="search" placeholder="Try legend, primitive, or encodeColor" autocomplete="off">',
    '  <span class="docs-action-filter__status" aria-live="polite"></span>',
    "</div>",
    "",
    "| Action | API layer | Domain |",
    "| --- | --- | --- |",
    actionRows,
    ""
  ].join("\n"));

  return { outputs, locations: Object.fromEntries(locations) };
}

export async function generateDocActionReference({ check = false } = {}) {
  const { outputs, locations } = await buildDocActionReference();
  const expectedLinks = `${JSON.stringify(locations, null, 2)}\n`;
  const stale = [];
  for (const [relative, expected] of outputs) {
    const file = path.join(docsRoot, relative);
    if (check) {
      if (!(await exists(file)) || await readFile(file, "utf8") !== expected) stale.push(relative);
    } else {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, expected);
    }
  }
  if (check) {
    if (!(await exists(linksFile)) || await readFile(linksFile, "utf8") !== expectedLinks) {
      stale.push("_data/action_reference_links.json");
    }
    if (stale.length > 0) throw new Error(`Generated action reference is stale: ${stale.join(", ")}`);
    return;
  }
  await writeFile(linksFile, expectedLinks);
  process.stdout.write("generated split action reference\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocActionReference({ check: process.argv.includes("--check") });
}
