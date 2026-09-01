import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const artifacts = Object.freeze([
  ["knowledge/action-card.schema.json", "docs/schemas/action-card.schema.json"],
  ["knowledge/action-cards.schema.json", "docs/schemas/action-cards.schema.json"],
  ["knowledge/task-packet.schema.json", "docs/schemas/task-packet.schema.json"],
  ["knowledge/llms-manifest.schema.json", "docs/schemas/llms-manifest.schema.json"],
  ["knowledge/intent-taxonomy.schema.json", "docs/schemas/intent-taxonomy.schema.json"],
  ["knowledge/mcp-resources.schema.json", "docs/schemas/mcp-resources.schema.json"],
  ["knowledge/action-cards.json", "docs/actions.json"],
  ["knowledge/intent-taxonomy.json", "docs/intent-taxonomy.json"],
  ["knowledge/mcp-resources.json", "docs/mcp-resources.json"],
  ["types/program.d.ts", "docs/types/program.d.ts"]
]);

export async function buildDocMachineArtifacts() {
  return Promise.all(artifacts.map(async ([source, destination]) => ({
    source,
    destination,
    content: await readFile(path.join(root, source), "utf8")
  })));
}

export async function generateDocMachineArtifacts({ check = false } = {}) {
  const expected = await buildDocMachineArtifacts();
  if (check) {
    for (const artifact of expected) {
      const current = await readFile(path.join(root, artifact.destination), "utf8");
      if (current !== artifact.content) {
        throw new Error(
          `${artifact.destination} is stale. Run npm run docs:machine.`
        );
      }
    }
    return;
  }
  for (const artifact of expected) {
    const destination = path.join(root, artifact.destination);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, artifact.content);
  }
  process.stdout.write(`generated ${expected.length} documentation machine artifacts\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocMachineArtifacts({ check: process.argv.includes("--check") });
}
