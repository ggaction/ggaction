import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { findStoredResource, requireStoredResource } from "../selectors/resources.js";
import { projectionParameters } from "../grammar/geo/projectionDefinition.js";
import { normalizeProjectionOptions, projectionTuple } from "../grammar/geo/projectionOptions.js";
import { transformHitPoint } from "../grammar/hitCoordinates.js";
import { programHitOwnerPlacement } from "./hitProgram.js";
import { prepareMovementFrame } from "./movementFrame.js";
import { interactionOwner, prepareInteractionEdit } from "./selection.js";
import { interactionOptions as options } from "./input.js";

export function resolveCameraNavigation(program, binding, allowMissing = false) {
  const owner = interactionOwner(program, binding.target, allowMissing);
  if (!owner || (allowMissing && !findStoredResource(owner.view, "projection", owner.target.id))) return null;
  if (typeof program.navigateProjection !== "function") throw new Error("Camera navigation requires Full projection navigation.");
  if (owner.target.facetSource || owner.view.compositionSpec) throw new Error("Camera navigation requires one concrete projection owner.");
  const projection = requireStoredResource(owner.view, { kind: "projection", id: owner.target.id });
  const parameters = projectionParameters(projection);
  if (parameters.type !== binding.initial.type) throw new TypeError("Camera navigation reset type must match its projection.");
  if (binding.mode === "rotate" && parameters.rotateDeg === undefined) throw new TypeError("Rotation navigation requires a non-composite spherical projection.");
  return { ...owner, parameters };
}

export function normalizeCameraNavigation(program, value) {
  const request = options(value, ["type", "target", "mode", "scaleExtent", "initial"], ["rotationStepDeg"], "Navigation binding");
  if (!["pan", "rotate"].includes(request.mode)) throw new TypeError("Navigation mode must be pan or rotate.");
  const scaleExtent = projectionTuple(request.scaleExtent, [2], "Navigation scale extent");
  if (scaleExtent[0] <= 0 || scaleExtent[1] < scaleExtent[0]) throw new RangeError("Navigation scale extent must be positive and ordered.");
  if (request.mode === "rotate" ? !Number.isFinite(request.rotationStepDeg) || request.rotationStepDeg <= 0 : Object.hasOwn(request, "rotationStepDeg")) {
    throw new TypeError("Only rotation navigation requires a positive rotationStepDeg.");
  }
  const initial = normalizeProjectionOptions(request.initial), binding = { ...request, initial, scaleExtent };
  const owner = resolveCameraNavigation(program, binding);
  return cloneAndFreeze({ ...binding, target: owner.target });
}

export function navigationCenter(base, target, rootTransform) {
  const { clip } = programHitOwnerPlacement(base, target.childPath);
  return transformHitPoint(rootTransform, { x: clip[0] + clip[2] / 2, y: clip[1] + clip[3] / 2 });
}

export function prepareCameraNavigation(program, binding, base, scene, rootTransform, start) {
  const owner = resolveCameraNavigation(program, binding, true);
  if (!owner) return null;
  // Verify every concrete item in the exact owner. Sampled camera frames cannot
  // silently become a semantic baseline before the public animation adapter exists.
  const nodeKeys = new Set(); let work = 0;
  for (const entry of base.entries) {
    validateWorkLimit(work += 1 + entry.metadata.childPath.length, "Navigation frame work");
    if (entry.metadata.childPath.length === owner.target.childPath.length && entry.metadata.childPath.every((id, i) => id === owner.target.childPath[i])) nodeKeys.add(entry.nodeKey);
  }
  const frame = prepareMovementFrame(base, scene, rootTransform, owner.target, start, nodeKeys);
  const { offset, clip } = programHitOwnerPlacement(base, owner.target.childPath);
  const x = frame.start.x + offset[0], y = frame.start.y + offset[1];
  if (x < clip[0] || y < clip[1] || x > clip[0] + clip[2] || y > clip[1] + clip[3]) return null;
  return freezeOwned({ program, binding, target: owner.target, parameters: cloneAndFreeze(owner.parameters), ...frame });
}

function movement(context, point) {
  const end = context.map(point), dx = end.x - context.start.x, dy = end.y - context.start.y;
  if (dx === 0 && dy === 0) return null;
  return context.binding.mode === "pan" ? { type: "pan", deltaPx: [dx, dy] }
    : { type: "rotate", rotateDeg: [context.parameters.rotateDeg[0] + dx * context.binding.rotationStepDeg,
      context.parameters.rotateDeg[1] - dy * context.binding.rotationStepDeg, context.parameters.rotateDeg[2]] };
}
function command(context, operation) { return { type: "setViewport", target: context.target, origin: "user", payload: { operation } }; }
function candidate(context, operation) {
  const result = command(context, operation ?? { type: "pan", deltaPx: [0, 0] });
  return { command: result, prepared: operation === null ? { program: context.program, affectedOwners: cloneAndFreeze([context.target]) }
    : prepareInteractionEdit(context.program, result) };
}

// Rebase once at the second pointer, without publishing or changing history.
// Each later sample applies one native pinch from this fixed phase candidate.
export function joinCameraNavigation(context, pointers) {
  const phase = candidate(context, movement(context, pointers[0].point)).prepared.program;
  const fromPx = pointers.map(pointer => { const p = context.map(pointer.point); return [p.x, p.y]; });
  return freezeOwned({ ...context, program: phase, fromPx: cloneAndFreeze(fromPx) });
}

export function cameraNavigationDraft(context, pointers) {
  if (!context.fromPx) return candidate(context, movement(context, pointers[0].point));
  const toPx = pointers.map(pointer => { const p = context.map(pointer.point); return [p.x, p.y]; });
  const equal = toPx.every((point, i) => point.every((value, j) => value === context.fromPx[i][j]));
  return candidate(context, equal ? null : { type: "pinch", fromPx: context.fromPx, toPx, scaleExtent: context.binding.scaleExtent });
}

export function cameraWheelCommand(context, deltaY, deltaMode, pageHeight) {
  if (!Number.isFinite(deltaY) || ![0, 1, 2].includes(deltaMode) || !Number.isFinite(pageHeight) || pageHeight <= 0) throw new TypeError("Wheel navigation requires finite delta and CSS page height.");
  if (deltaY === 0) return null;
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1);
  if (!Number.isFinite(pixels)) throw new RangeError("Wheel delta exceeds finite coordinates.");
  return command(context, { type: "zoom", anchorPx: [context.start.x, context.start.y],
    factor: 2 ** Math.max(-20, Math.min(20, -pixels / 300)), scaleExtent: context.binding.scaleExtent });
}

export function cameraKeyboardCommand(context, key) {
  if (key === "Home") return command(context, { type: "reset", initial: context.binding.initial });
  if (["+", "=", "-", "_"].includes(key)) return command(context, { type: "zoom", anchorPx: [context.start.x, context.start.y], factor: key === "+" || key === "=" ? 2 : 0.5, scaleExtent: context.binding.scaleExtent });
  const delta = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[key];
  if (!Array.isArray(delta)) return null;
  return command(context, context.binding.mode === "pan" ? { type: "pan", deltaPx: delta }
    : { type: "rotate", rotateDeg: [context.parameters.rotateDeg[0] + delta[0] * context.binding.rotationStepDeg,
      context.parameters.rotateDeg[1] - delta[1] * context.binding.rotationStepDeg, context.parameters.rotateDeg[2]] });
}
