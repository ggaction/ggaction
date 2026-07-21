import { spawnSync } from "node:child_process";
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

function run(command) {
  const result = spawnSync(process.execPath, command, {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

export async function runRenderTests(selectors = []) {
  await resetPngArtifacts();
  for (const command of renderTestCommands(selectors)) run(command);
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
