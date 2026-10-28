import { annotateError } from "../core/diagnostics.js";
import { validateUserId } from "../core/identifiers.js";
import { freezeOwned } from "../core/immutable.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { EXPRESSION_LIMITS, limit } from "./expressionValues.js";

const TYPES = Object.freeze(["number", "string", "boolean"]);

function invalid(message, optionPath) {
  return annotateError(new TypeError(message), { code: "invalid-value", optionPath });
}

function record(value, required, optional, label) {
  ownRecord(value, label);
  if (required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) {
    throw invalid(`${label} has missing or unknown properties.`, label);
  }
  return value;
}

export function normalizeParameterValue(value, definition) {
  const { type, nullable } = record(definition, ["type", "nullable"], [], "Parameter definition");
  if (!TYPES.includes(type)) throw invalid("Parameter type must be number, string, or boolean.", "type");
  if (typeof nullable !== "boolean") throw invalid("Parameter nullable must be a boolean.", "nullable");
  if (value === null && nullable) return value;
  if (typeof value !== type || value === null) throw invalid(`Parameter value must be ${nullable ? `${type} or null` : type}.`, "value");
  if (type === "number" && !Number.isFinite(value)) throw invalid("Parameter value must be finite.", "value");
  if (type === "string") limit(value.length, EXPRESSION_LIMITS.string, "string");
  return value;
}

export function normalizeParameterOptions(options) {
  record(options, ["id", "value"], ["type", "nullable"], "Parameter options");
  const id = validateUserId(options.id, "Parameter id");
  const type = Object.hasOwn(options, "type") ? options.type : typeof options.value;
  const nullable = Object.hasOwn(options, "nullable") ? options.nullable : false;
  const value = normalizeParameterValue(options.value, { type, nullable });
  return freezeOwned({ id, type, nullable, value });
}

export function normalizeParameterEditOptions(options) {
  record(options, ["target", "value"], [], "Parameter edit options");
  const target = validateUserId(options.target, "Parameter target");
  // The existing resource definition owns value type and nullability. Reject
  // missing values here, before a named-resource lookup or any state change.
  if (options.value === undefined) throw invalid("Parameter edit requires a value.", "value");
  normalizeParameterValue(options.value, { type: options.value === null ? "number" : typeof options.value, nullable: true });
  return freezeOwned({ target, value: options.value });
}

// Generic identity, algorithm version, revision, and typed input shapes are
// validated by the stored-resource owner before these scalar-specific fields.
export function validateParameterResource(resource) {
  ownRecord(resource, "Parameter resource");
  record(resource.ownership, ["mode"], [], "Parameter ownership");
  if (resource.ownership.mode !== "authored") throw invalid("Parameter ownership must be authored.", "ownership");
  ownArray(resource.inputs, "Parameter inputs");
  if (resource.inputs.length !== 0) throw invalid("Authored parameters cannot have inputs.", "inputs");
  const definition = record(resource.options, ["type", "nullable"], [], "Parameter definition");
  record(resource.result, ["value"], [], "Parameter result");
  normalizeParameterValue(resource.result.value, definition);
  record(resource.provenance, ["origin"], [], "Parameter provenance");
  if (resource.provenance.origin !== "authored") throw invalid("Parameter provenance must be authored.", "provenance");
  return resource;
}

export function parameterEnvironment(resources) {
  ownArray(resources, "Semantic resources");
  const environment = Object.create(null);
  for (const resource of resources) {
    ownRecord(resource, "Semantic resource");
    if (resource.kind !== "parameter") continue;
    validateParameterResource(resource);
    const id = validateUserId(resource.id, "Parameter id");
    if (Object.hasOwn(environment, id)) throw annotateError(new Error("Duplicate parameter identity."), {
      code: "duplicate-id", resourceId: id
    });
    environment[id] = freezeOwned({ type: resource.options.type, value: resource.result.value });
  }
  return freezeOwned(environment);
}
