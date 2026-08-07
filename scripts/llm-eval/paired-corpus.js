import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { supportsProgramValidation } from "./program-evaluator.js";

const root = new URL("../../", import.meta.url);
const generalizationCorpusUrl = new URL("../../test/llm/generalization-tasks.json", import.meta.url);
const historicalCorpusUrl = new URL("../../test/llm/tasks.json", import.meta.url);
const actionIndexUrl = new URL("../../agent_docs/contract/ACTION_INDEX.json", import.meta.url);

export const frozenAdaptationPolicy =
  "Do not change production knowledge, search aliases, recipes, prompts, or oracles in response to results from this corpus.";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedPrompt(prompt) {
  return prompt.trim().replace(/\s+/gu, " ").toLowerCase();
}

export function generalizationCorpusSha256(source) {
  return sha256(source);
}

export function validateGeneralizationCorpusStructure({
  corpus,
  historicalCorpus,
  actionNames,
  datasetEvidence
}) {
  invariant(corpus?.schemaVersion === 2, "Generalization corpus schemaVersion must be 2.");
  invariant(corpus.role === "frozen-generalization", "Generalization corpus role must be frozen-generalization.");
  invariant(corpus.adaptationPolicy === frozenAdaptationPolicy, "Generalization corpus adaptation policy changed.");
  invariant(Array.isArray(corpus.tasks) && corpus.tasks.length >= 16, "Generalization corpus needs at least 16 tasks.");
  invariant(unique(corpus.tasks.map(task => task.id)), "Generalization task IDs must be unique.");

  const historicalIds = new Set(historicalCorpus.tasks.map(task => task.id));
  const historicalPrompts = new Set(historicalCorpus.tasks.map(task => normalizedPrompt(task.prompt)));
  const knownActions = new Set(actionNames);
  const categories = new Set();

  for (const [datasetId, dataset] of Object.entries(corpus.datasets ?? {})) {
    const evidence = datasetEvidence[datasetId];
    invariant(evidence !== undefined, `Dataset ${datasetId} has no frozen file evidence.`);
    invariant(dataset.sha256 === evidence.sha256, `Dataset ${datasetId} SHA-256 does not match its file.`);
    invariant(Array.isArray(dataset.fields) && dataset.fields.length > 0 && unique(dataset.fields),
      `Dataset ${datasetId} fields must be a non-empty unique list.`);
    invariant(dataset.fields.every(field => evidence.fields.includes(field)),
      `Dataset ${datasetId} declares a field absent from its file.`);
  }

  for (const task of corpus.tasks) {
    invariant(task.split === "generalization", `Task ${task.id} must use the generalization split.`);
    invariant(!historicalIds.has(task.id), `Task ${task.id} reuses a historical task ID.`);
    invariant(!historicalPrompts.has(normalizedPrompt(task.prompt)), `Task ${task.id} reuses a historical prompt.`);
    invariant(typeof task.category === "string" && task.category.length > 0, `Task ${task.id} has no category.`);
    categories.add(task.category);
    invariant(Array.isArray(task.data) && task.data.length > 0, `Task ${task.id} must declare data.`);
    for (const selection of task.data) {
      const dataset = corpus.datasets[selection.id];
      invariant(dataset !== undefined, `Task ${task.id} references unknown dataset ${selection.id}.`);
      invariant(task.prompt.includes(selection.id), `Task ${task.id} prompt omits dataset ID ${selection.id}.`);
      invariant(Array.isArray(selection.fields) && selection.fields.length > 0 && unique(selection.fields),
        `Task ${task.id} has an invalid field selection.`);
      for (const field of selection.fields) {
        invariant(dataset.fields.includes(field), `Task ${task.id} references undeclared field ${field}.`);
        invariant(task.prompt.includes(field), `Task ${task.id} prompt omits field ${field}.`);
      }
    }

    const oracle = task.oracle;
    for (const key of [
      "requiredActions",
      "anyOfActionSets",
      "forbiddenActions",
      "requiredRuntimeFunctions",
      "requiredValidations",
      "renderers"
    ]) invariant(Array.isArray(oracle?.[key]), `Task ${task.id} oracle.${key} must be an array.`);
    const oracleActions = [
      ...oracle.requiredActions,
      ...oracle.forbiddenActions,
      ...oracle.anyOfActionSets.flat()
    ];
    invariant(oracleActions.every(action => knownActions.has(action)), `Task ${task.id} uses an unknown action.`);
    invariant(oracle.requiredRuntimeFunctions.includes("chart"), `Task ${task.id} must require chart.`);
    invariant(oracle.requiredRuntimeFunctions.every(name => !/^render(?:To)?/u.test(name)),
      `Task ${task.id} must leave rendering to the evaluator.`);
    invariant(oracle.requiredValidations.every(supportsProgramValidation),
      `Task ${task.id} uses an unsupported program validation.`);
    invariant(oracle.renderers.length > 0 && oracle.renderers.every(renderer =>
      ["canvas", "svg", "png", "pdf"].includes(renderer)
    ), `Task ${task.id} uses an unsupported renderer.`);
  }

  invariant(categories.size >= 10, "Generalization corpus needs at least 10 task categories.");
  return true;
}

async function datasetEvidence(corpus) {
  const entries = await Promise.all(Object.entries(corpus.datasets).map(async ([id, dataset]) => {
    const source = await readFile(new URL(dataset.path, root));
    const values = JSON.parse(source);
    invariant(Array.isArray(values) && values.length > 0, `Dataset ${id} must contain rows.`);
    const fields = [...new Set(values.flatMap(row => Object.keys(row)))];
    return [id, { sha256: sha256(source), fields }];
  }));
  return Object.fromEntries(entries);
}

export async function loadGeneralizationCorpus({
  corpusUrl = generalizationCorpusUrl,
  historicalUrl = historicalCorpusUrl,
  actionsUrl = actionIndexUrl
} = {}) {
  const [source, historicalSource, actionSource] = await Promise.all([
    readFile(corpusUrl, "utf8"),
    readFile(historicalUrl, "utf8"),
    readFile(actionsUrl, "utf8")
  ]);
  const corpus = JSON.parse(source);
  const historicalCorpus = JSON.parse(historicalSource);
  const actionIndex = JSON.parse(actionSource);
  validateGeneralizationCorpusStructure({
    corpus,
    historicalCorpus,
    actionNames: actionIndex.actions.map(action => action.name),
    datasetEvidence: await datasetEvidence(corpus)
  });
  return Object.freeze({
    corpus,
    source,
    sha256: generalizationCorpusSha256(source),
    path: fileURLToPath(corpusUrl)
  });
}

export function expectedGeneralizationManifest({ corpus, source }) {
  return Object.freeze({
    schemaVersion: 1,
    role: corpus.role,
    corpusSha256: generalizationCorpusSha256(source),
    taskCount: corpus.tasks.length,
    datasetSha256: Object.fromEntries(Object.entries(corpus.datasets).map(([id, dataset]) => [id, dataset.sha256])),
    adaptationPolicy: corpus.adaptationPolicy
  });
}

export function validateGeneralizationManifest(manifest, loaded) {
  const expected = expectedGeneralizationManifest(loaded);
  invariant(JSON.stringify(manifest) === JSON.stringify(expected), "Generalization corpus manifest is stale.");
  return true;
}
