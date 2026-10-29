import { cloneAndFreeze } from "../core/immutable.js";
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

