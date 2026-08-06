import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildActionKnowledge, root } from "./action-knowledge.js";
import { generateKnowledgeSearch } from "./generate-knowledge-search.js";
import { buildRecipeKnowledge } from "./recipe-knowledge.js";

const knowledgeOutput = path.join(root, "knowledge/index.json");
const docsActionOutput = path.join(root, "docs/llms-actions.json");
const docsRecipeOutput = path.join(root, "docs/llms-recipes.json");

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function buildKnowledge() {
  const actionKnowledge = await buildActionKnowledge();
  const recipeKnowledge = await buildRecipeKnowledge(actionKnowledge.document.actions);
  const generated = {
    ...actionKnowledge.document.generated,
    ...recipeKnowledge.generated
  };
  return {
    document: {
      schemaVersion: 2,
      generated,
      actions: actionKnowledge.document.actions,
      recipes: recipeKnowledge.document.recipes,
      coverage: recipeKnowledge.document.coverage
    },
    actionDocument: {
      schemaVersion: 2,
      generated,
      actions: actionKnowledge.document.actions
    },
    recipeDocument: {
      schemaVersion: 2,
      generated,
      recipes: recipeKnowledge.document.recipes,
      coverage: recipeKnowledge.document.coverage
    },
    report: {
      actions: actionKnowledge.report.actions,
      domains: actionKnowledge.report.domains,
      parameterNotes: actionKnowledge.report.parameterNotes,
      actionExamples: actionKnowledge.report.exampleCoverage,
      recipes: recipeKnowledge.report.recipes,
      recipeActions: recipeKnowledge.report.recipeActions,
      recipeExamples: recipeKnowledge.report.exampleCoverage,
      classifications: recipeKnowledge.report.classifications
    }
  };
}

export async function generateActionKnowledge({ check = false } = {}) {
  const { document, actionDocument, recipeDocument, report } = await buildKnowledge();
  const outputs = [
    [knowledgeOutput, serialized(document)],
    [docsActionOutput, serialized(actionDocument)],
    [docsRecipeOutput, serialized(recipeDocument)]
  ];

  if (check) {
    for (const [file, expected] of outputs) {
      if (await readFile(file, "utf8") !== expected) {
        throw new Error(`Generated action knowledge is stale: ${path.relative(root, file)}`);
      }
    }
    await generateKnowledgeSearch({ knowledgeDocument: document, check: true });
    return report;
  }

  await Promise.all(outputs.map(([file, content]) => writeFile(file, content)));
  const search = await generateKnowledgeSearch({ knowledgeDocument: document });
  report.search = search;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await generateActionKnowledge({ check: process.argv.includes("--check") });
}
