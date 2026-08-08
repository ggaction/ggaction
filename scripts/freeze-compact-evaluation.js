import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildFrozenManifest,
  evaluationRoot
} from "./compact-evaluation.js";

const output = path.join(evaluationRoot, "FROZEN.json");
const expected = `${JSON.stringify(await buildFrozenManifest(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(output, "utf8");
  if (current !== expected) throw new Error("Compact evaluation freeze is stale.");
  process.stdout.write("compact evaluation freeze is current\n");
} else {
  await writeFile(output, expected);
  process.stdout.write("froze compact evaluation corpus\n");
}
