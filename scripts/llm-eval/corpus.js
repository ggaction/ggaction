import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
export const defaultCorpusFile = path.join(root, "test/llm/tasks.json");

const splits = new Set(["authoring", "heldout"]);
const difficulties = new Set(["direct", "composed", "repair"]);
const renderers = new Set(["canvas", "svg", "png", "pdf"]);
const conditions = new Set(["A", "B", "C"]);
const reasoningEfforts = new Set(["none", "low", "medium", "high", "xhigh", "max"]);
const reasoningModes = new Set(["standard", "pro"]);
const textVerbosities = new Set(["low", "medium", "high"]);
const serviceTiers = new Set(["default", "flex", "fast"]);
const failureCategories = new Set([
  "invalid-program",
  "forbidden-primitive",
  "missing-action",
  "runtime-error",
  "validation-failed",
  "renderer-failed",
  "package-failed",
  "timeout",
  "provider-error",
  "budget-exceeded"
]);
const knowledgeModes = new Map([
  ["A", "current-docs"],
  ["B", "structured-knowledge"],
  ["C", "local-mcp"]
]);

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

function uniqueStrings(values, label) {
  requireCondition(Array.isArray(values), `${label} must be an array.`);
  requireCondition(values.every(value => typeof value === "string" && value.length > 0), `${label} must contain non-empty strings.`);
  requireCondition(new Set(values).size === values.length, `${label} must not contain duplicates.`);
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

export async function loadEvaluationCorpus(file = defaultCorpusFile) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function validateEvaluationCorpus(corpus, { verifyDatasets = true } = {}) {
  requireCondition(corpus?.schemaVersion === 1, "Corpus schemaVersion must be 1.");
  requireCondition(corpus.datasets && typeof corpus.datasets === "object", "Corpus datasets are required.");
  requireCondition(Array.isArray(corpus.tasks), "Corpus tasks are required.");

  const actionIndex = JSON.parse(await readFile(path.join(root, "agent_docs/contract/ACTION_INDEX.json"), "utf8"));
  const actionNames = new Set(actionIndex.actions.map(action => action.name));
  const taskIds = new Set();
  const splitCounts = { authoring: 0, heldout: 0 };

  for (const [id, dataset] of Object.entries(corpus.datasets)) {
    requireCondition(/^[a-z0-9-]+-v\d+$/u.test(id), `Dataset ${id} needs a versioned ID.`);
    requireCondition(typeof dataset.path === "string" && dataset.path.startsWith("data/"), `Dataset ${id} needs a repository data path.`);
    requireCondition(/^[0-9a-f]{64}$/u.test(dataset.sha256), `Dataset ${id} needs a SHA-256 digest.`);
    uniqueStrings(dataset.fields, `Dataset ${id} fields`);
    if (verifyDatasets) {
      requireCondition(await sha256(path.join(root, dataset.path)) === dataset.sha256, `Dataset ${id} digest does not match ${dataset.path}.`);
    }
  }

  for (const task of corpus.tasks) {
    requireCondition(typeof task.id === "string" && /^[a-z0-9-]+$/u.test(task.id), "Every task needs a stable kebab-case ID.");
    requireCondition(!taskIds.has(task.id), `Duplicate task ID ${task.id}.`);
    taskIds.add(task.id);
    requireCondition(splits.has(task.split), `Task ${task.id} has an unknown split.`);
    splitCounts[task.split] += 1;
    requireCondition(typeof task.category === "string" && task.category.length > 0, `Task ${task.id} needs a category.`);
    requireCondition(difficulties.has(task.difficulty), `Task ${task.id} has an unknown difficulty.`);
    requireCondition(typeof task.prompt === "string" && task.prompt.length >= 80, `Task ${task.id} needs an informative prompt.`);
    requireCondition(Array.isArray(task.data) && task.data.length > 0, `Task ${task.id} needs explicit data.`);

    for (const selection of task.data) {
      const dataset = corpus.datasets[selection.id];
      requireCondition(dataset !== undefined, `Task ${task.id} uses unknown dataset ${selection.id}.`);
      requireCondition(task.prompt.includes(selection.id), `Task ${task.id} prompt must name dataset ${selection.id}.`);
      uniqueStrings(selection.fields, `Task ${task.id} fields for ${selection.id}`);
      for (const field of selection.fields) {
        requireCondition(dataset.fields.includes(field), `Task ${task.id} uses unknown field ${field} from ${selection.id}.`);
        requireCondition(task.prompt.includes(field), `Task ${task.id} prompt must name field ${field}.`);
      }
    }

    const oracle = task.oracle;
    requireCondition(oracle && typeof oracle === "object", `Task ${task.id} needs an oracle.`);
    for (const [label, values] of [
      ["requiredActions", oracle.requiredActions],
      ["forbiddenActions", oracle.forbiddenActions],
      ["requiredRuntimeFunctions", oracle.requiredRuntimeFunctions],
      ["requiredValidations", oracle.requiredValidations],
      ["renderers", oracle.renderers]
    ]) uniqueStrings(values, `Task ${task.id} ${label}`);
    requireCondition(Array.isArray(oracle.anyOfActionSets), `Task ${task.id} anyOfActionSets must be an array.`);
    for (const [index, set] of oracle.anyOfActionSets.entries()) {
      uniqueStrings(set, `Task ${task.id} anyOfActionSets[${index}]`);
      requireCondition(set.length > 0, `Task ${task.id} anyOfActionSets cannot contain an empty set.`);
    }
    for (const name of [
      ...oracle.requiredActions,
      ...oracle.forbiddenActions,
      ...oracle.anyOfActionSets.flat()
    ]) requireCondition(actionNames.has(name), `Task ${task.id} references unknown action ${name}.`);
    for (const renderer of oracle.renderers) requireCondition(renderers.has(renderer), `Task ${task.id} references unknown renderer ${renderer}.`);
  }

  requireCondition(splitCounts.authoring > 0 && splitCounts.heldout > 0, "Corpus needs authoring and heldout tasks.");
  return Object.freeze({ taskCount: corpus.tasks.length, splitCounts, datasetCount: Object.keys(corpus.datasets).length });
}

function nonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

export function validateEvaluationResult(result, corpus) {
  requireCondition(result?.schemaVersion === 1, "Result schemaVersion must be 1.");
  requireCondition(typeof result.runId === "string" && result.runId.length > 0, "Result runId is required.");
  requireCondition(conditions.has(result.condition), "Result condition must be A, B, or C.");
  requireCondition(corpus.tasks.some(task => task.id === result.taskId), `Result references unknown task ${result.taskId}.`);
  requireCondition(result.knowledge?.mode === knowledgeModes.get(result.condition), `Result condition ${result.condition} needs matching knowledge mode.`);
  requireCondition(/^[0-9a-f]{40}$/u.test(result.knowledge?.commit ?? ""), "Result knowledge commit must be a full SHA.");
  requireCondition(typeof result.model?.provider === "string" && result.model.provider.length > 0, "Result model provider is required.");
  requireCondition(typeof result.model?.name === "string" && result.model.name.length > 0, "Result model name is required.");
  requireCondition(reasoningEfforts.has(result.model?.reasoningEffort), "Result reasoningEffort is invalid.");
  requireCondition(reasoningModes.has(result.model?.reasoningMode), "Result reasoningMode is invalid.");
  requireCondition(textVerbosities.has(result.model?.textVerbosity), "Result textVerbosity is invalid.");
  requireCondition(serviceTiers.has(result.model?.serviceTier), "Result serviceTier is invalid.");
  requireCondition(typeof result.model?.store === "boolean", "Result store must be boolean.");
  for (const key of ["maxOutputTokensPerCall", "maxCumulativeInputTokens", "maxCumulativeOutputTokens"]) {
    requireCondition(Number.isInteger(result.model?.[key]) && result.model[key] > 0, `Result ${key} must be positive.`);
  }

  for (const key of [
    "promptTokens",
    "cachedInputTokens",
    "cacheWriteTokens",
    "completionTokens",
    "reasoningTokens",
    "totalTokens",
    "modelCalls",
    "mcpCalls",
    "repairRounds"
  ]) {
    requireCondition(nonNegativeInteger(result.metrics?.[key]), `Result metric ${key} must be a non-negative integer.`);
  }
  requireCondition(result.metrics.totalTokens === result.metrics.promptTokens + result.metrics.completionTokens, "Result totalTokens must equal promptTokens plus completionTokens.");
  requireCondition(result.metrics.reasoningTokens <= result.metrics.completionTokens, "Result reasoningTokens cannot exceed completionTokens.");
  requireCondition(result.metrics.timeToValidMs === null || nonNegativeInteger(result.metrics.timeToValidMs), "Result timeToValidMs must be null or non-negative.");
  requireCondition(nonNegativeNumber(result.metrics.estimatedCostUsd), "Result estimatedCostUsd must be non-negative.");

  requireCondition(typeof result.outcome?.firstPassValid === "boolean", "Result firstPassValid must be boolean.");
  requireCondition(typeof result.outcome?.finalValid === "boolean", "Result finalValid must be boolean.");
  requireCondition(
    result.outcome.failureCategory === null || failureCategories.has(result.outcome.failureCategory),
    "Result failureCategory is invalid."
  );
  requireCondition(result.outcome.finalValid === (result.outcome.failureCategory === null), "Result finalValid and failureCategory disagree.");

  uniqueStrings(result.evidence?.actions, "Result actions");
  uniqueStrings(result.evidence?.runtimeFunctions, "Result runtimeFunctions");
  uniqueStrings(result.evidence?.renderers, "Result renderers");
  requireCondition(Array.isArray(result.evidence?.validations), "Result validations must be an array.");
  const validationIds = result.evidence.validations.map(validation => validation.id);
  uniqueStrings(validationIds, "Result validation IDs");
  requireCondition(result.evidence.validations.every(validation => typeof validation.passed === "boolean"), "Every validation needs a boolean passed value.");
  requireCondition(result.evidence.runtimeError === undefined || result.evidence.runtimeError === null || typeof result.evidence.runtimeError === "string", "Result runtimeError must be null or a string.");

  requireCondition(typeof result.artifacts?.validationLogFile === "string" && result.artifacts.validationLogFile.length > 0, "Result validationLogFile is required.");
  requireCondition(result.artifacts.programFile === null || (typeof result.artifacts.programFile === "string" && result.artifacts.programFile.length > 0), "Result programFile must be null or a path.");
  requireCondition(result.artifacts.programSha256 === null || /^[0-9a-f]{64}$/u.test(result.artifacts.programSha256), "Result programSha256 must be null or a SHA-256 digest.");
  uniqueStrings(result.artifacts.rendererFiles, "Result rendererFiles");
  return true;
}
