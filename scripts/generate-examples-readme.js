import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readDocChartCatalog } from "./doc-chart-catalog.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "docs/_data/chart_examples.yml");
const outputFile = path.join(root, "examples/README.md");

function documentationUrl(route) {
  const [pathname, fragment] = route.split("#");
  return `https://ggaction.github.io/ggaction${pathname}${fragment ? `#${fragment}` : ""}`;
}

function localExampleUrl(route) {
  return `./${route.replace(/^\/examples\//, "")}`;
}

function actionList(actions) {
  return actions.split(" · ").map(action => `\`${action}\``).join(", ");
}

export async function buildExamplesReadme() {
  const catalog = readDocChartCatalog(await readFile(catalogFile, "utf8"));
  for (const chart of catalog) {
    await access(path.join(root, chart.example.replace(/^\//, "")));
  }
  const charts = catalog.flatMap(chart => [
    `### [${chart.title}](${localExampleUrl(chart.example)})`,
    "",
    chart.summary,
    "",
    `Representative actions: ${actionList(chart.actions)}. ` +
      `[Documentation](${documentationUrl(chart.url)}).`,
    ""
  ]);
  return [
    "# Examples",
    "",
    "This index is generated from the canonical public chart catalog. Serve the",
    "repository root over HTTP, then open any linked directory:",
    "",
    "```bash",
    "python3 -m http.server 8000",
    "```",
    "",
    "## Start here",
    "",
    "- [Getting Started](./getting-started/) is the small inline-data browser example",
    "  used by the Getting Started guide.",
    "- [Quarto and Observable JS](./quarto-ojs/README.md) embeds the exact public package in a",
    "  responsive Quarto document and exposes its retained action trace.",
    "- [Extension TypeScript](./extension-typescript/) demonstrates strict custom",
    "  action authoring against the installed package.",
    "",
    "## Curated chart programs",
    "",
    ...charts,
    "## Development fixtures",
    "",
    "Other directories under `examples/` support focused browser, package, and",
    "cross-capability tests. They are development fixtures rather than additional",
    "user-facing chart contracts; use the curated catalog above for supported",
    "public examples.",
    ""
  ].join("\n");
}

export async function generateExamplesReadme({ check = false } = {}) {
  const expected = await buildExamplesReadme();
  if (check) {
    const current = await readFile(outputFile, "utf8");
    if (current !== expected) {
      throw new Error(
        "Generated examples/README.md is stale. Run npm run examples:index."
      );
    }
    return;
  }
  await writeFile(outputFile, expected);
  process.stdout.write("generated examples/README.md\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await generateExamplesReadme({ check: process.argv.includes("--check") });
}
