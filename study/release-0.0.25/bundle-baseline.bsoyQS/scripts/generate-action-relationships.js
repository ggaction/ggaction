import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildActionRelationships } from "./action-relationship-source.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputFile = path.join(root, "knowledge/action-relationships.json");
const check = process.argv.includes("--check");
const output = `${JSON.stringify(await buildActionRelationships(), null, 2)}\n`;

if (check) {
  const current = await readFile(outputFile, "utf8").catch(() => "");
  if (current !== output) {
    throw new Error("Generated action relationships are stale. Run node scripts/generate-action-relationships.js.");
  }
} else {
  await writeFile(outputFile, output);
}
