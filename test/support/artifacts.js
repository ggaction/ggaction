import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PNG_ARTIFACT_ROOT } from "./artifact-paths.js";

export async function resetPngArtifacts(root = PNG_ARTIFACT_ROOT) {
  await mkdir(root, { recursive: true });
  for (const entry of await readdir(root, { withFileTypes: true })) {
    await rm(path.join(root, entry.name), { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await resetPngArtifacts();
}
