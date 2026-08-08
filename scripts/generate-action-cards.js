import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildActionCards } from "./action-card-source.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputFile = path.join(root, "knowledge/action-cards.json");

export async function generateActionCards({ check = false } = {}) {
  const { artifact, stats } = await buildActionCards();
  const expected = `${JSON.stringify(artifact, null, 2)}\n`;
  if (check) {
    const current = await readFile(outputFile, "utf8");
    if (current !== expected) {
      throw new Error("Generated compact action cards are stale. Run node scripts/generate-action-cards.js.");
    }
  } else {
    await writeFile(outputFile, expected);
  }
  process.stdout.write(
    `${stats.count} compact action cards; max ${stats.maxBytes} bytes; ` +
    `median ${stats.medianBytes} bytes\n`
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateActionCards({ check: process.argv.includes("--check") });
}
