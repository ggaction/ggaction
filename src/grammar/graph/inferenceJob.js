import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { contentDigest, canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { normalizeGraphSourceOptions, resolveInferredGraphInput, INFERRED_GRAPH_FIELDS } from "./input.js";
import { inferenceDefinitionPolicy } from "./inferenceDefinition.js";
import { graphSourceRows } from "./fields.js";
import { graphLimits, indexGraphModel } from "./model.js";
import { validateInferenceBytes, INFERENCE_MAX_BYTES } from "./inferenceBudget.js";
import { resolvedInferenceResult } from "./inferenceResult.js";

const jobs = new WeakSet();
// Only a completed validation followed by ownership establishes this proof.
// A matching hash or a caller's frozen/structured-cloned value is insufficient.
const completions = new WeakMap();
const transportDefault = Object.freeze({ policy: "bounded-inference@1", maxWork: 10_000_000, maxBytes: INFERENCE_MAX_BYTES });
const active = signal => { if (signal !== undefined) AbortSignal.prototype.throwIfAborted.call(signal); };
export const inferenceValueHash = value => contentDigest(canonicalJSON(encodeValue(value)));
export const inferenceTransportPolicy = definition => Object.hasOwn(definition, "execution") ? definition.execution : transportDefault;
const optional = (object, key) => Object.hasOwn(object, key) ? object[key] : undefined;
const required = (object, keys, label) => {
  if (keys.some(key => !Object.hasOwn(object, key))) throw new TypeError(`${label} requires all own fields.`);
};

export function createInferenceJob(payload) {
  ownRecord(payload, "Inference job payload");
  rejectUnknownProperties(payload, ["inputs", "definition", "rows", "candidate", "candidateLimits", "candidateExecution"], "inference job payload");
  required(payload, ["inputs", "definition", "rows"], "Inference job payload");
  if (Object.values(payload).some(value => value === undefined)) throw new TypeError("Inference job payload cannot contain undefined fields.");
  const normalized = normalizeGraphSourceOptions(payload.definition, INFERRED_GRAPH_FIELDS);
  normalized.options = Object.hasOwn(normalized, "options") ? normalized.options : {};
  const candidate = Object.hasOwn(payload, "candidate");
  const { normalized: definition } = inferenceDefinitionPolicy(normalized, candidate);
  const policy = inferenceTransportPolicy(definition);
  validateInferenceBytes(payload, policy, "Inference job payload bytes");
  ownArray(payload.inputs, "Inference inputs");
  if (payload.inputs.length !== (candidate ? 2 : 1)) throw new TypeError("Inference inputs require the exact data and candidate roles.");
  payload.inputs.forEach((input, index) => {
    validateInputReference(input);
    if (input.kind !== (index === 0 ? "data" : "graph")) throw new TypeError("Inference input kind is incompatible.");
  });
  graphSourceRows(payload.rows, definition.maxNodes, "Inference source rows", optional(definition, "execution"));
  if (candidate) {
    required(payload, ["candidateLimits"], "Inference candidate");
    graphLimits(payload.candidateLimits);
    indexGraphModel(payload.candidate, payload.candidateLimits, optional(payload, "candidateExecution"));
  } else if (Object.hasOwn(payload, "candidateLimits") || Object.hasOwn(payload, "candidateExecution")) {
    throw new TypeError("Inference candidate policies require a candidate model.");
  }
  const body = { schemaVersion: 1, algorithmVersion: "1", inputs: payload.inputs, definition, rows: payload.rows,
    ...(candidate ? { candidate: payload.candidate, candidateLimits: payload.candidateLimits,
      ...(Object.hasOwn(payload, "candidateExecution") ? { candidateExecution: payload.candidateExecution } : {}) } : {}) };
  validateInferenceBytes(body, policy, "Inference job bytes");
  const job = { ...body, inputHash: inferenceValueHash(body) };
  validateInferenceBytes(job, policy, "Inference job bytes");
  const owned = cloneAndFreeze(job); jobs.add(owned); return owned;
}

export function validateInferenceJob(input) {
  if (jobs.has(input)) return input;
  ownRecord(input, "Inference job");
  rejectUnknownProperties(input, ["schemaVersion", "algorithmVersion", "inputHash", "inputs", "definition", "rows", "candidate", "candidateLimits", "candidateExecution"], "inference job");
  required(input, ["schemaVersion", "algorithmVersion", "inputHash", "inputs", "definition", "rows"], "Inference job");
  const { schemaVersion, algorithmVersion, inputHash, ...payload } = input;
  if (schemaVersion !== 1 || algorithmVersion !== "1" || typeof inputHash !== "string" || !/^[a-f0-9]{64}$/.test(inputHash)) throw new TypeError("Inference job version or hash is invalid.");
  const job = createInferenceJob(payload);
  if (inputHash !== job.inputHash) throw new TypeError("Inference job input hash is stale.");
  return job;
}

export function computeInferenceJob(input, signal) {
  active(signal);
  const job = validateInferenceJob(input);
  const resolved = resolveInferredGraphInput(job.rows, job.definition, optional(job, "candidate"), optional(job, "candidateLimits"), optional(job, "candidateExecution"), signal);
  active(signal);
  const result = resolvedInferenceResult(resolved);
  const body = { schemaVersion: 1, complete: true, inputHash: job.inputHash, result };
  const policy = inferenceTransportPolicy(job.definition);
  validateInferenceBytes(body, policy, "Inference completion bytes");
  const completion = { ...body, resultHash: inferenceValueHash(result) };
  validateInferenceBytes(completion, policy, "Inference completion bytes");
  return cloneAndFreeze(completion);
}

export function validateInferenceCompletion(input, completion) {
  const job = validateInferenceJob(input), policy = inferenceTransportPolicy(job.definition);
  if (completions.get(completion) === job) return completion;
  ownRecord(completion, "Inference completion");
  rejectUnknownProperties(completion, ["schemaVersion", "complete", "inputHash", "resultHash", "result"], "inference completion");
  required(completion, ["schemaVersion", "complete", "inputHash", "resultHash", "result"], "Inference completion");
  if (completion.schemaVersion !== 1 || completion.complete !== true || completion.inputHash !== job.inputHash) throw new TypeError("Inference completion is incomplete or stale.");
  validateInferenceBytes(completion, policy, "Inference completion bytes");
  ownRecord(completion.result, "Inference result");
  rejectUnknownProperties(completion.result, ["model", "diagnostics"], "inference result");
  required(completion.result, ["model", "diagnostics"], "Inference result");
  indexGraphModel(completion.result.model, { maxNodes: job.definition.maxNodes, maxEdges: job.definition.maxEdges }, optional(job.definition, "execution"));
  ownRecord(completion.result.diagnostics, "Inference diagnostics");
  if (typeof completion.resultHash !== "string" || completion.resultHash !== inferenceValueHash(completion.result)) throw new TypeError("Inference completion result hash is stale.");
  const owned = cloneAndFreeze(completion);
  completions.set(owned, job);
  return owned;
}
