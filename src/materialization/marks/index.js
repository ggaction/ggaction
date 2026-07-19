import { POSITION_CHANNELS } from "../../core/vocabulary.js";
import { getMarkMaterializationPolicy } from "./policies.js";

export {
  canMaterializeArc,
  canMaterializeArea,
  canMaterializeBar,
  canMaterializeLine,
  canMaterializePoint,
  canMaterializeRect,
  canMaterializeRule,
  canMaterializeText
} from "./capabilities.js";

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
  return program.semanticSpec.layers.flatMap(layer =>
    layer.source === sourceId &&
    getMarkMaterializationPolicy(layer)?.sourceDependent === true
      ? [getMarkMaterializationStep(program, layer)].filter(
          step => step !== undefined
        )
      : []
  );
}

export function getPositionEncodingMaterializationSteps(program, layer, scaleId) {
  const policy = getMarkMaterializationPolicy(layer);
  if (policy === undefined) return [];
  const scale = { op: "rematerializeScale", args: { id: scaleId } };
  const complete = policy.canMaterialize(program, layer);
  const mark = getMarkRematerializationStep(layer);
  if (!complete) {
    if (policy.positionEncoding.incomplete === "scale") return [scale];
    return policy.positionEncoding.scaleFirst ? [scale, mark] : [mark];
  }
  return policy.positionEncoding.scaleFirst ? [scale, mark] : [mark];
}

export function getScaleConsumerMaterializationMode(layer, channel) {
  const policy = getMarkMaterializationPolicy(layer);
  if (policy === undefined) return "direct";
  if (POSITION_CHANNELS.includes(channel)) {
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
  const shared = policy.encoding?.sharedChannels?.includes(channel) === true &&
    scale !== undefined;
  const candidates = shared
    ? program.semanticSpec.layers.filter(candidate =>
        candidate.mark?.type === layer.mark?.type &&
        candidate.encoding?.[channel]?.scale === scale
      )
    : [layer];
  const marks = candidates.flatMap(candidate => {
    const step = policy.encoding?.completeOnly === true
      ? getMarkMaterializationStep(program, candidate)
      : getMarkRematerializationStep(candidate);
    return step === undefined ? [] : [step];
  });
  return { scales, marks };
}
