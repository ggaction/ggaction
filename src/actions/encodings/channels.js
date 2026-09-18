import {
  action,
  invokeWrappedActionImplementation
} from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { findScaleConsumers } from "../scales/consumers/index.js";
import { resolveScalePreview, validatePendingMeasuredScale } from
  "../scales/preview.js";
import { isPendingMeasuredRadiusConsumer } from
  "../../materialization/scales/policies/arc.js";
import {
  getMarkRematerializationStep,
  getScaleConsumerMarkSteps,
  getSourceDependentMarkSteps
} from "../../materialization/marks/index.js";
import {
  applyMaterializationPlan,
  planScaleGuideRematerialization
} from "../../materialization/dependencies.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
import { hasMaterializedLegend } from "../../materialization/legends.js";
import { rebindPositionGuides } from "./shared.js";
import { withoutPreviewLayerEncodings } from
  "../primitives/semanticAction.js";

export const ENCODING_CHANNEL_ORDER = Object.freeze([
  "x", "y", "x2", "y2", "theta", "r", "xOffset", "yOffset",
  "group", "pathOrder", "color", "stroke", "size", "shape",
  "opacity", "strokeWidth", "strokeDash", "angle", "text"
]);

const CHANNEL_METHODS = Object.freeze({
  x: "encodeX",
  y: "encodeY",
  x2: "encodeX2",
  y2: "encodeY2",
  theta: "encodeTheta",
  r: "encodeR",
  xOffset: "encodeXOffset",
  yOffset: "encodeYOffset",
  group: "encodeGroup",
  pathOrder: "encodePathOrder",
  color: "encodeColor",
  stroke: "encodeStroke",
  size: "encodeSize",
  shape: "encodeShape",
  opacity: "encodeOpacity",
  strokeWidth: "encodeStrokeWidth",
  strokeDash: "encodeStrokeDash",
  angle: "encodeAngle",
  text: "encodeText"
});

const FORBIDDEN_PAYLOAD_KEYS = Object.freeze(["target", "coordinate", "id"]);

const DEFERRED_MARK_OPERATIONS = Object.freeze([
  "materializeEmptyMark",
  "rematerializePointMark",
  "rematerializeTickMark",
  "rematerializeLineMark",
  "rematerializeAreaMark",
  "rematerializeArcMark",
  "rematerializeBarMark",
  "rematerializeRuleMark",
  "rematerializeTextMark",
  "rematerializeRectMark",
  "rematerializeMarkHighlights",
  "materializeLabelLayout"
]);

const deferredClassByProgram = new WeakMap();

function sameSetting(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every(
      (value, index) => sameSetting(value, right[index])
    );
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length && leftKeys.every(
      key => Object.hasOwn(right, key) && sameSetting(left[key], right[key])
    );
  }
  return false;
}

function assertCompatibleScaleRequests(requests) {
  const patches = new Map();
  for (const { channel, payload } of requests) {
    if (!isPlainObject(payload.scale) || payload.scale.id === undefined) continue;
    const id = payload.scale.id;
    const previous = patches.get(id) ?? new Map();
    for (const [property, value] of Object.entries(payload.scale)) {
      if (property === "id" || value === undefined) continue;
      const existing = previous.get(property);
      if (existing !== undefined && !sameSetting(existing.value, value)) {
        throw new Error(
          `encodeChannels scale "${id}" has conflicting explicit ${property} requests for ${existing.channel} and ${channel}.`
        );
      }
      if (existing === undefined) previous.set(property, { channel, value });
    }
    patches.set(id, previous);
  }
}

export function normalizeEncodeChannelsArgs(args) {
  validateOptionObject(args, ["target", "channels"], "encodeChannels");
  const target = validateUserId(args.target, "Mark id");
  if (!isPlainObject(args.channels)) {
    throw new TypeError("encodeChannels channels must be a plain object.");
  }
  const keys = Object.keys(args.channels);
  if (keys.length === 0) {
    throw new TypeError("encodeChannels channels must contain at least one channel.");
  }
  for (const key of keys) {
    if (!Object.hasOwn(CHANNEL_METHODS, key)) {
      throw new Error(`encodeChannels does not support channel "${key}".`);
    }
  }
  const requests = ENCODING_CHANNEL_ORDER
    .filter(channel => Object.hasOwn(args.channels, channel))
    .map(channel => {
      const payload = args.channels[channel];
      if (!isPlainObject(payload)) {
        throw new TypeError(
          `encodeChannels ${channel} payload must be a plain object.`
        );
      }
      for (const key of FORBIDDEN_PAYLOAD_KEYS) {
        if (Object.hasOwn(payload, key)) {
          throw new Error(
            `encodeChannels ${channel} payload cannot specify ${key}.`
          );
        }
      }
      return Object.freeze({ channel, payload });
    });
  assertCompatibleScaleRequests(requests);
  return Object.freeze({ target, requests: Object.freeze(requests) });
}

function resolveScaleOnly(program, id) {
  const semanticScale = findSemanticScale(program, id);
  if (semanticScale === undefined) {
    throw new Error(`Unknown scale "${id}".`);
  }
  const consumers = findScaleConsumers(program, id);
  if (
    consumers.length > 0 &&
    consumers.every(isPendingMeasuredRadiusConsumer)
  ) {
    validatePendingMeasuredScale(program, semanticScale, consumers);
    return program._withoutResolvedScale(id);
  }
  return program._withResolvedScale(
    id,
    resolveScalePreview(program, id).resolvedScale
  );
}

function deferredProgramClass(ProgramClass) {
  const existing = deferredClassByProgram.get(ProgramClass);
  if (existing !== undefined) return existing;

  class DeferredEncodingProgram extends ProgramClass {
    rematerializeScale({ id } = {}) {
      return resolveScaleOnly(this, id);
    }

    rematerializeLegend() {
      return this;
    }
  }
  for (const operation of DEFERRED_MARK_OPERATIONS) {
    Object.defineProperty(DeferredEncodingProgram.prototype, operation, {
      configurable: true,
      value() {
        return this;
      }
    });
  }
  deferredClassByProgram.set(ProgramClass, DeferredEncodingProgram);
  return DeferredEncodingProgram;
}

function programState(program) {
  return Object.freeze({
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    resolvedScales: program.resolvedScales,
    materializationConfigs: program.materializationConfigs,
    children: program.children,
    compositionSpec: program.compositionSpec,
    context: program.context,
    trace: program.trace,
    actionStack: program.actionStack,
    actionSequence: program._actionSequence
  });
}

function instantiateProgram(state, ProgramClass) {
  return new ProgramClass({
    semanticSpec: state.semanticSpec,
    graphicSpec: state.graphicSpec,
    resolvedScales: state.resolvedScales,
    materializationConfigs: state.materializationConfigs,
    children: state.children,
    compositionSpec: state.compositionSpec,
    context: state.context,
    trace: state.trace,
    actionStack: state.actionStack,
    actionSequence: state.actionSequence
  });
}

function createDeferredProgram(program) {
  return instantiateProgram(
    programState(program),
    deferredProgramClass(program.constructor)
  );
}

function requestedFieldType(request) {
  if (request === undefined) return undefined;
  return request.payload.fieldType ?? "quantitative";
}

function isCategoricalBarType(fieldType) {
  return ["nominal", "ordinal", "temporal"].includes(fieldType);
}

function stageFinalPositionRoles(program, target, requests) {
  const layer = findLayer(program, target);
  if (layer?.mark?.type !== "bar") return program;
  const byChannel = new Map(requests.map(request => [request.channel, request]));
  const nextX = requestedFieldType(byChannel.get("x"));
  const nextY = requestedFieldType(byChannel.get("y"));
  if (nextX === undefined || nextY === undefined) return program;
  const currentX = layer.encoding?.x?.fieldType;
  const currentY = layer.encoding?.y?.fieldType;
  const changesOrientation =
    isCategoricalBarType(currentX) !== isCategoricalBarType(nextX) &&
    isCategoricalBarType(currentY) !== isCategoricalBarType(nextY);
  if (!changesOrientation) return program;

  return withoutPreviewLayerEncodings(program, {
    id: target,
    channels: ["x", "y"]
  });
}

const INTERNAL_SCALE_CHANNEL = Object.freeze({ r: "radius" });

function requestedScaleIds(originalLayer, finalLayer, requests) {
  const requestedChannels = new Set(requests.map(({ channel }) =>
    INTERNAL_SCALE_CHANNEL[channel] ?? channel
  ));
  const ids = [];
  for (const channel of [
    "x", "y", "x2", "y2", "theta", "radius", "xOffset", "yOffset",
    "color", "stroke", "size", "shape", "opacity", "strokeWidth",
    "strokeDash", "angle", "text", "group", "pathOrder"
  ]) {
    if (!requestedChannels.has(channel)) continue;
    for (const layer of [originalLayer, finalLayer]) {
      const id = layer?.encoding?.[channel]?.scale;
      if (id !== undefined && !ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function changedScaleIds(before, after) {
  const beforeById = new Map(before.semanticSpec.scales.map(scale => [scale.id, scale]));
  return after.semanticSpec.scales
    .filter(scale => !sameSetting(scale, beforeById.get(scale.id)))
    .map(scale => scale.id)
    .sort();
}

function finalScaleIds(before, after, originalLayer, finalLayer, requests) {
  const ids = [
    ...requestedScaleIds(originalLayer, finalLayer, requests),
    ...changedScaleIds(before, after)
  ];
  return [...new Set(ids)].filter(id =>
    findSemanticScale(after, id) !== undefined &&
    findScaleConsumers(after, id).length > 0
  );
}

const rematerializeEncodingScales = /* @__PURE__ */ action(
  {
    op: "rematerializeEncodingScales",
    description: "Resolve every scale affected by one atomic encoding assignment."
  },
  function ({ ids } = {}) {
    let next = this;
    for (const id of ids) next = resolveScaleOnly(next, id);
    return next;
  }
);

function finalMaterializationPlan(program, target, scaleIds) {
  const layer = findLayer(program, target);
  const targetStep = layer === undefined
    ? undefined
    : getMarkRematerializationStep(program, layer);
  const directMarks = [
    ...(targetStep === undefined ? [] : [targetStep]),
    ...getScaleConsumerMarkSteps(program, scaleIds)
  ];
  const marks = [
    ...directMarks,
    ...directMarks.flatMap(step =>
      getSourceDependentMarkSteps(program, step.args.id)
    )
  ];
  const guides = scaleIds.flatMap(id =>
    planScaleGuideRematerialization(program, id)
  );
  if (hasMaterializedLegend(program)) {
    guides.push({ op: "rematerializeLegend" });
  }
  return buildMaterializationPlan({ marks, guides });
}

function applyEncodingDraft(program, target, requests) {
  let draft = stageFinalPositionRoles(
    createDeferredProgram(program),
    target,
    requests
  );
  for (const { channel, payload } of requests) {
    const focusedAction = draft[CHANNEL_METHODS[channel]];
    draft = invokeWrappedActionImplementation(
      focusedAction,
      draft,
      { ...payload, target }
    );
  }
  const originalLayer = findLayer(program, target);
  const finalLayer = findLayer(draft, target);
  for (const channel of ["x", "y"]) {
    const previousScale = originalLayer?.encoding?.[channel]?.scale;
    const nextScale = finalLayer?.encoding?.[channel]?.scale;
    if (previousScale !== undefined && nextScale !== undefined) {
      draft = rebindPositionGuides(
        draft,
        channel,
        previousScale,
        nextScale,
        target
      );
    }
  }
  return draft;
}

function planEncodingAssignments(program, target, requests) {
  const originalLayer = findLayer(program, target);
  const draft = applyEncodingDraft(program, target, requests);
  const finalLayer = findLayer(draft, target);
  return Object.freeze({
    target,
    originalLayer,
    finalLayer,
    state: programState(draft),
    scaleIds: Object.freeze(finalScaleIds(
      program,
      draft,
      originalLayer,
      finalLayer,
      requests
    ))
  });
}

function applyEncodingAssignments(program, plan) {
  return instantiateProgram(plan.state, program.constructor);
}

export const encodeChannels = /* @__PURE__ */ action(
  {
    op: "encodeChannels",
    description: "Atomically assign multiple encoding channels to one mark."
  },
  function (args = {}) {
    const { target, requests } = normalizeEncodeChannelsArgs(args);
    const plan = planEncodingAssignments(this, target, requests);
    let next = applyEncodingAssignments(this, plan);
    const scaleIds = plan.scaleIds;
    if (scaleIds.length > 0) {
      next = rematerializeEncodingScales.call(next, { ids: scaleIds });
    }
    return applyMaterializationPlan(
      next,
      finalMaterializationPlan(next, target, scaleIds)
    );
  }
);

export function registerAtomicEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeChannels = encodeChannels;
}
