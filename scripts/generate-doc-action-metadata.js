import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const outputFile = path.join(root, "docs/_data/action_metadata.json");

function operation(name) {
  for (const candidate of [
    "create", "edit", "encode", "filter", "highlight", "select", "render", "remove"
  ]) {
    if (name.startsWith(candidate)) return candidate;
  }
  if (name === "facet") return "compose";
  if (
    name === "jitterPoints" ||
    name === "layoutLabels" ||
    name === "orderCategories" ||
    name === "replaceCompositionChild"
  ) return "edit";
  throw new Error(`Public action ${name} needs a documentation operation classification.`);
}

export async function buildDocActionMetadata() {
  const catalog = JSON.parse(await readFile(catalogFile, "utf8"));
  return Object.fromEntries(catalog.actions.map(action => [action.name, {
    operation: operation(action.name),
    layer: action.layer,
    domain: action.domain
  }]));
}

export async function generateDocActionMetadata({ check = false } = {}) {
  const expected = `${JSON.stringify(await buildDocActionMetadata(), null, 2)}\n`;
  if (check) {
    const current = await readFile(outputFile, "utf8");
    if (current !== expected) {
      throw new Error("Generated documentation action metadata is stale. Run npm run docs:actions.");
    }
    return;
  }
  await writeFile(outputFile, expected);
  process.stdout.write("generated documentation action metadata\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocActionMetadata({ check: process.argv.includes("--check") });
}
