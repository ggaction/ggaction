import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authoringRoles } from "./action-card-metadata.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const outputFile = path.join(root, "docs/_data/action_metadata.json");
const browserOutputFile = path.join(root, "docs/assets/js/action-metadata.js");

function operation(name) {
  for (const candidate of [
    "create", "apply", "edit", "encode", "filter", "highlight", "select", "render", "remove"
  ]) {
    if (name.startsWith(candidate)) return candidate;
  }
  if (["facet", "facetGrid", "repeatCharts"].includes(name)) return "compose";
  if (
    name === "bindMarkData" ||
    name === "jitterPoints" ||
    name === "packPoints" ||
    name === "fitCanvas" ||
    name === "layoutLabels" ||
    name === "layoutSeries" ||
    name === "orderCategories" ||
    name === "replaceCompositionChild" ||
    name === "insertCompositionChild" ||
    name === "reorderCompositionChildren"
  ) return "edit";
  throw new Error(`Public action ${name} needs a documentation operation classification.`);
}

export async function buildDocActionMetadata() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  return Object.fromEntries(catalog.actions.map(action => [action.name, {
    operation: operation(action.name),
    authoringRoles: authoringRoles(action),
    layer: action.layer,
    domain: action.domain
  }]));
}

export async function generateDocActionMetadata({ check = false } = {}) {
  const metadata = await buildDocActionMetadata();
  const expected = `${JSON.stringify(metadata, null, 2)}\n`;
  const browserExpected = `globalThis.ggactionDocsActionMetadata = ${JSON.stringify(metadata)};\n`;
  if (check) {
    const [current, browserCurrent] = await Promise.all([
      readFile(outputFile, "utf8"),
      readFile(browserOutputFile, "utf8")
    ]);
    if (current !== expected || browserCurrent !== browserExpected) {
      throw new Error("Generated documentation action metadata is stale. Run npm run docs:actions.");
    }
    return;
  }
  await Promise.all([
    writeFile(outputFile, expected),
    writeFile(browserOutputFile, browserExpected)
  ]);
  process.stdout.write("generated documentation action metadata\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocActionMetadata({ check: process.argv.includes("--check") });
}
