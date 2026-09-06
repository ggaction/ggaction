import { isSourceOwnedText } from "../../grammar/text.js";
import { findLayer } from "../../selectors/layers.js";
import {
  POSITION_CHANNELS,
  POSITION_ENCODING_CHANNELS
} from "../../core/vocabulary.js";
import { getMarkMaterializationPolicy } from "./policies.js";
import { buildMaterializationPlan } from "../planner.js";

export {
  canMaterializeArc,
  canMaterializeArea,
  canMaterializeBar,
  canMaterializeLine,
  canMaterializePoint,
  canMaterializeRect,
  canMaterializeRule,
  canMaterializeText,
  canMaterializeTick,
  isTextSource
} from "./capabilities.js";

export function getLayerScaleIds(layer) {
  if (isSourceOwnedText(layer)) return [];
  return [
    ...Object.values(layer.encoding ?? {}).map(encoding => encoding?.scale),
    ...(layer.encoding?.parallel?.dimensions ?? []).map(dimension => dimension.scale)
  ].filter(scale => scale !== undefined);
}

export function getScaleConsumerMarkSteps(program, scaleIds) {
  return program.semanticSpec.layers
    .filter(layer => getLayerScaleIds(layer).some(id => scaleIds.includes(id)))
    .map(layer => getMarkMaterializationStep(program, layer))
    .filter(step => step !== undefined);
}

export function getMarkRematerializationStep(layer) {
  const policy = getMarkMaterializationPolicy(layer);
  return policy === undefined
    ? undefined
    : { op: policy.op, args: { id: layer.id } };
}

export function getMarkMaterializationStep(program, layer) {
  const policy = getMarkMaterializationPolicy(layer);
  if (policy === undefined || !policy.canMaterialize(program, layer)) {
    return undefined;
  }
  return getMarkRematerializationStep(layer);
}

export function getSourceDependentMarkSteps(program, sourceId) {
  return (program.semanticSpec.layers ?? []).flatMap(layer =>
    layer.source === sourceId &&
    getMarkMaterializationPolicy(layer)?.sourceDependent === true
      ? [getMarkMaterializationStep(program, layer) ??
          getExistingMarkRematerializationStep(program, layer)].filter(
          step => step !== undefined
        )
      : []
  );
}

export function getPositionEncodingMaterializationSteps(program, layer, scaleId) {
  const policy = getMarkMaterializationPolicy(layer);
  if (policy === undefined) return [];
  const complete = policy.canMaterialize(program, layer);
  const mark = getMarkRematerializationStep(layer);
  const sharedConsumerMarks = (program.semanticSpec.layers ?? [])
    .filter(candidate =>
      candidate.id !== layer.id &&
      !isSourceOwnedText(candidate) &&
      POSITION_CHANNELS.some(channel =>
        candidate.encoding?.[channel]?.scale === scaleId
      )
    )
    .map(candidate => getMarkMaterializationStep(program, candidate))
    .filter(step => step !== undefined);
  const dependentMarks = [mark, ...sharedConsumerMarks]
    .flatMap(step => getSourceDependentMarkSteps(program, step.args.id));
  const scale = {
    op: "rematerializeScale",
    args: sharedConsumerMarks.length === 0
      ? { id: scaleId }
      : { id: scaleId, marks: false }
  };
  const direct = !complete && policy.positionEncoding.incomplete === "scale"
    ? [scale, ...sharedConsumerMarks]
    : policy.positionEncoding.scaleFirst
      ? [scale, mark, ...sharedConsumerMarks]
      : [mark, ...sharedConsumerMarks];
  return buildMaterializationPlan({ marks: [...direct, ...dependentMarks] });
}

export function getScaleConsumerMaterializationMode(layer, channel) {
  const policy = getMarkMaterializationPolicy(layer);
  if (policy === undefined) return "direct";
  if (POSITION_ENCODING_CHANNELS.includes(channel)) {
    // Attached labels require their source's completed geometry, after scales.
    if (layer.source !== undefined && policy.sourceDependent === true) return "defer";
    return policy.scaleApplication.position ?? policy.scaleApplication.default;
  }
  if (policy.scaleApplication.deferredChannels?.includes(channel)) {
    return "defer";
  }
  return policy.scaleApplication.default;
}

export function canDeferScaleConsumerApplication(layer) {
  return getMarkMaterializationPolicy(layer)?.scaleApplication.deferWithMark === true;
}

export function getExistingMarkRematerializationStep(program, layer) {
  const policy = getMarkMaterializationPolicy(layer);
  if (
    policy?.rematerializeIncompleteExisting !== true ||
    program.graphicSpec.objects[layer.id] === undefined
  ) {
    return undefined;
  }
  return getMarkRematerializationStep(layer);
}

export function getEncodingMaterializationStages(program, layer, channel, scale) {
  const policy = getMarkMaterializationPolicy(layer);
  if (policy === undefined) return { scales: [], marks: [] };
  const scales = policy.encoding?.scaleFirst === true && scale !== undefined
    ? [{
        op: "rematerializeScale",
        args: { id: scale, guides: false, marks: false }
      }]
    : [];
  const shared = scale !== undefined && (
    scales.length > 0 || policy.encoding?.sharedChannels?.includes(channel) === true
  );
  const candidates = shared
    ? program.semanticSpec.layers.filter(candidate =>
        candidate.id === layer.id || candidate.encoding?.[channel]?.scale === scale
      )
    : [layer];
  const marks = candidates.flatMap(candidate => {
    const candidatePolicy = getMarkMaterializationPolicy(candidate);
    if (candidatePolicy?.encoding?.skipRematerialization?.(program, candidate) === true) {
      return [];
    }
    const step = candidate.id !== layer.id || candidatePolicy?.encoding?.completeOnly === true
      ? getMarkMaterializationStep(program, candidate)
      : getMarkRematerializationStep(candidate);
    return step === undefined ? [] : [step];
  });
  return { scales, marks };
}

// Reuse a plan's scale stage only when it covers every scale consumed by the mark.
export function reusePlannedMarkScales(program, steps, scaleIds) {
  const resolved = new Set(scaleIds);
  return steps.map(step => {
    const layer = findLayer(program, step.args?.id);
    if (layer === undefined || getMarkMaterializationPolicy(layer)?.acceptsResolvedScales !== true ||
        !getLayerScaleIds(layer).every(id => resolved.has(id))) return step;
    return { ...step, args: { ...step.args, scales: false } };
  });
}
