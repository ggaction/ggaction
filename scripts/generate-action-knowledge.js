import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildActionKnowledge, root } from "./action-knowledge.js";

const knowledgeOutput = path.join(root, "knowledge/index.json");
const docsOutput = path.join(root, "docs/llms-actions.json");

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function generateActionKnowledge({ check = false } = {}) {
  const { document, report } = await buildActionKnowledge();
  const publicDocument = {
    schemaVersion: document.schemaVersion,
    generated: document.generated,
    actions: document.actions
  };
  const outputs = [
    [knowledgeOutput, serialized(document)],
    [docsOutput, serialized(publicDocument)]
  ];

  if (check) {
    for (const [file, expected] of outputs) {
      if (await readFile(file, "utf8") !== expected) {
        throw new Error(`Generated action knowledge is stale: ${path.relative(root, file)}`);
      }
    }
    return report;
  }

  await Promise.all(outputs.map(([file, content]) => writeFile(file, content)));
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await generateActionKnowledge({ check: process.argv.includes("--check") });
}
