import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { validateGeneratedItemLimit, validateKeys } from "../core/validation.js";
import { resolveRotation } from "./rotation.js";

const SEQUENCE = Object.freeze(["wrap", "skip", "rotate"]);

function record(value, keys, label) {
  ownRecord(value, label);
  validateKeys(value, keys, label);
  return value;
}

function positiveInteger(value, label, minimum = 1) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}.`);
  }
  return validateGeneratedItemLimit(value, label);
}

// This is authored label intent. The materializer owns measured widths, chosen
// values, actual line origins and the reason a fallback became necessary.
export function normalizeResponsiveLabels(value) {
  record(value, ["sequence", "maxLines", "skipStride", "rotationCandidates"], "Responsive labels");
  const sequence = Object.hasOwn(value, "sequence") ? value.sequence : SEQUENCE;
  ownArray(sequence, "Responsive label sequence");
  if (sequence.length !== SEQUENCE.length || sequence.some((stage, index) => stage !== SEQUENCE[index])) {
    throw new Error("Responsive label sequence must be wrap, skip, rotate in that order.");
  }
  const maxLines = positiveInteger(Object.hasOwn(value, "maxLines") ? value.maxLines : 2, "Responsive maxLines");
  const skipStride = positiveInteger(Object.hasOwn(value, "skipStride") ? value.skipStride : 2, "Responsive skipStride", 2);
  const rotations = Object.hasOwn(value, "rotationCandidates") ? value.rotationCandidates : [-Math.PI / 4, -Math.PI / 2];
  ownArray(rotations, "Responsive rotationCandidates");
  positiveInteger(rotations.length, "Responsive rotationCandidates length");
  const seen = new Set();
  const rotationCandidates = rotations.map(value => {
    if (typeof value === "object" && value !== null) record(value, ["value", "unit"], "Responsive rotation");
    const radians = resolveRotation(value, "Responsive rotation");
    if (!Number.isFinite(radians)) throw new RangeError("Responsive rotation must resolve to finite radians.");
    if (seen.has(radians)) throw new Error("Responsive rotationCandidates must be distinct.");
    seen.add(radians);
    return radians === 0 ? 0 : radians;
  });
  return cloneAndFreeze({ sequence: [...SEQUENCE], maxLines, skipStride, rotationCandidates });
}

export function validateResponsiveLabelState(config) {
  const policy = config?.responsive, result = config?.responsiveResult;
  if (policy === undefined) {
    if (result !== undefined) throw new Error("Responsive label result requires a policy.");
    return;
  }
  if (canonicalJSON(normalizeResponsiveLabels(policy)) !== canonicalJSON(policy)) {
    throw new Error("Stored responsive label policy must be canonical.");
  }
  if (result === undefined) return;
  record(result, ["stage", "reason", "indices", "rotation", "maxWidth", "wrap"], "Responsive label result");
  if (!["native", ...SEQUENCE].includes(result.stage) ||
      !["native-fit", "label-overlap", "label-lines", "label-size"].includes(result.reason) ||
      (result.stage === "native") !== (result.reason === "native-fit") ||
      !Number.isFinite(result.rotation) ||
      (result.stage === "rotate" ? !policy.rotationCandidates.includes(result.rotation) : result.rotation !== config.rotation)) {
    throw new Error("Stored responsive label decision is invalid.");
  }
  ownArray(result.indices, "Responsive label indices");
  validateGeneratedItemLimit(result.indices.length, "Responsive label indices");
  for (const [index, value] of result.indices.entries()) {
    if (!Number.isSafeInteger(value) || value < 0 || value >= 10000 || index > 0 && value <= result.indices[index - 1] ||
        ["skip", "rotate"].includes(result.stage) && value % policy.skipStride !== 0) {
      throw new Error("Responsive label indices must retain ordered source positions.");
    }
  }
  if (result.maxWidth !== undefined && (!Number.isFinite(result.maxWidth) || result.maxWidth <= 0 ||
      !["word", "character"].includes(result.wrap) || config.maxWidth !== undefined && config.maxWidth !== result.maxWidth)) {
    throw new Error("Responsive label width must preserve an explicit wrap policy.");
  }
  if (result.maxWidth === undefined && result.wrap !== undefined) throw new Error("Responsive wrap requires a width.");
  if (result.stage !== "native" && result.maxWidth === undefined) throw new Error("Responsive fallback requires a measured width.");
}

