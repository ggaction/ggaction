import path from "node:path";
import { pathToFileURL } from "node:url";

import { runExecutableRecipeSmoke } from "./run-corrective-smoke.js";

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.stdout.write(`${JSON.stringify(await runExecutableRecipeSmoke(), null, 2)}\n`);
}
