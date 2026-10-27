import { runCheck } from "./run-check.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resetPngArtifacts } from "../test/support/artifacts.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

export function renderTestCommands(selectors = []) {
  const commands = [
    Object.freeze(["scripts/run-tests.js", "render", ...selectors])
  ];
  if (selectors.length === 0) {
    commands.push(
      Object.freeze(["scripts/generate-artifact-gallery.js"]),
      Object.freeze(["scripts/test-artifact-gallery.js"])
    );
  }
  return Object.freeze(commands);
}

export async function runRenderTests(selectors = []) {
  await resetPngArtifacts();
  for (const [index, command] of renderTestCommands(selectors).entries()) {
    const code = await runCheck(`render-stage-${index}`, process.execPath, command, { cwd: repositoryRoot });
    if (code !== 0) { process.exitCode = code; return; }
  }
  if (selectors.length > 0) {
    process.stdout.write(
      "Focused render completed; full artifact galleries were not regenerated.\n"
    );
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  await runRenderTests(process.argv.slice(2));
}
