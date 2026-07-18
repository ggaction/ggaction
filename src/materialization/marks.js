import { findDataset } from "../selectors/datasets.js";
import { findLayer } from "../selectors/layers.js";
import { isAggregate } from "../grammar/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarColorLayout,
  resolveBarOffsetChannel,
  resolveBarGrain
} from "../grammar/bars/policy.js";
import { resolveRuleMode } from "../grammar/rules.js";
import { findUpstreamTransform } from "./dataProvenance.js";
import { POSITION_CHANNELS } from "../core/vocabulary.js";
import { resolveRectMode } from "../grammar/rects.js";

function hasCartesianPositionScales(layer) {
  return (
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined
  );
}

function hasPolarPositionScales(layer) {
  return (
    layer.encoding?.theta?.scale !== undefined &&
    layer.encoding?.radius?.scale !== undefined
  );
}

function hasPositionScales(layer) {
  return hasCartesianPositionScales(layer);
}

export function canMaterializePoint(_program, layer) {
  return layer.mark?.type === "point" && (
    hasCartesianPositionScales(layer) || hasPolarPositionScales(layer)
  );
}

export function canMaterializeLine(program, layer) {
  const dataset = findDataset(program, layer.data);
  const interval = dataset?.transform?.some(item => item.type === "interval");
  if (hasPolarPositionScales(layer)) {
    return (
      layer.mark?.type === "line" &&
      ["quantitative", "temporal", "ordinal", "nominal"].includes(
        layer.encoding.theta.fieldType
      ) &&
      layer.encoding.radius.fieldType === "quantitative"
    );
  }
  return (
    layer.mark?.type === "line" &&
    hasPositionScales(layer) &&
    (isAggregate(layer.encoding.y.aggregate) ||
      (layer.encoding.x.fieldType === "quantitative" &&
        layer.encoding.y.fieldType === "quantitative") ||
      ((interval || layer.encoding.y.aggregate === undefined) &&
        ["quantitative", "temporal"].includes(layer.encoding.x.fieldType) &&
        ["quantitative", "temporal"].includes(layer.encoding.y.fieldType) &&
        layer.encoding.x.fieldType !== layer.encoding.y.fieldType))
  );
}

export function canMaterializeArea(program, layer) {
  if (layer.mark?.type !== "area" || !hasPositionScales(layer)) {
    return false;
  }

  const dataset = findDataset(program, layer.data);
  const densityTransform = findUpstreamTransform(program, dataset, "density");
  const completeDensity =
    densityTransform !== undefined &&
    (densityTransform.groupBy === undefined ||
      layer.encoding?.group?.field === densityTransform.groupBy);

  return (
    completeDensity ||
    layer.encoding?.y2?.scale === layer.encoding.y.scale ||
    layer.encoding?.x2?.scale === layer.encoding.x.scale
  );
}

export function canMaterializeArc(_program, layer) {
  if (
    layer.mark?.type !== "arc" ||
    layer.encoding?.theta?.scale === undefined ||
    !["nominal", "ordinal"].includes(layer.encoding.theta.fieldType)
  ) {
    return false;
  }
  if (layer.encoding.theta.aggregate === "count") {
    return layer.encoding?.radius === undefined;
  }
  return (
    layer.encoding.theta.aggregate === undefined &&
    layer.encoding?.radius?.scale !== undefined &&
    layer.encoding.radius.fieldType === "quantitative"
  );
}

export function canMaterializeBar(program, layer) {
  if (layer.mark?.type !== "bar" || !hasPositionScales(layer)) {
    return false;
  }
  const grain = resolveBarGrain(layer);
  if (![BAR_GRAINS.histogram, BAR_GRAINS.aggregate, BAR_GRAINS.ranged].includes(grain)) {
    return false;
  }
  if (
    grain === BAR_GRAINS.aggregate &&
    resolveBarColorLayout(layer) === "group"
  ) {
    const offsetChannel = resolveBarOffsetChannel(layer);
    return (
      layer.encoding?.color?.field !== undefined &&
      layer.encoding?.[offsetChannel]?.field === layer.encoding.color.field &&
      layer.encoding[offsetChannel].scale !== undefined
    );
  }
  return true;
}

export function canMaterializeRule(program, layer) {
  const fixedSpan = program.markConfigs[layer.id]?.fixedSpan;
  const boxSpanOwner = program.markConfigs[layer.id]?.boxSpanOwner;
  return layer.mark?.type === "rule" && (
    resolveRuleMode(layer) !== undefined ||
    (boxSpanOwner !== undefined && hasPositionScales(layer)) ||
    (fixedSpan !== undefined && hasPositionScales(layer))
  );
}

export function canMaterializeText(program, layer) {
  if (layer.mark?.type !== "text" || layer.encoding?.text === undefined) {
    return false;
  }
  if (layer.source !== undefined) {
    const source = findLayer(program, layer.source);
    return source !== undefined &&
      ["point", "bar", "rule", "rect"].includes(source.mark?.type) &&
      Array.isArray(program.graphicSpec.objects[source.id]?.items);
  }
  return hasCartesianPositionScales(layer);
}

export function canMaterializeRect(_program, layer) {
  return resolveRectMode(layer) !== undefined;
}

const MARK_MATERIALIZATION_POLICIES = Object.freeze({
  point: Object.freeze({
    canMaterialize: canMaterializePoint,
    op: "rematerializePointMark",
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      deferredChannels: Object.freeze(["size", "shape"]),
      default: "direct"
    }),
    rematerializeIncompleteExisting: true
  }),
  line: Object.freeze({
    canMaterialize: canMaterializeLine,
    op: "rematerializeLineMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  area: Object.freeze({
    canMaterialize: canMaterializeArea,
    op: "rematerializeAreaMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: true }),
    encoding: Object.freeze({ sharedChannels: Object.freeze(["color"]) }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  arc: Object.freeze({
    canMaterialize: canMaterializeArc,
    op: "rematerializeArcMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    encoding: Object.freeze({ completeOnly: true }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  bar: Object.freeze({
    canMaterialize: canMaterializeBar,
    op: "rematerializeBarMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  rule: Object.freeze({
    canMaterialize: canMaterializeRule,
    op: "rematerializeRuleMark",
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: false }),
    scaleApplication: Object.freeze({ default: "defer" })
  }),
  text: Object.freeze({
    canMaterialize: canMaterializeText,
    op: "rematerializeTextMark",
    positionEncoding: Object.freeze({ incomplete: "mark", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      default: "defer"
    }),
    rematerializeIncompleteExisting: true,
    sourceDependent: true
  }),
  rect: Object.freeze({
    canMaterialize: canMaterializeRect,
    op: "rematerializeRectMark",
    positionEncoding: Object.freeze({ incomplete: "scale", scaleFirst: true }),
    encoding: Object.freeze({ scaleFirst: true }),
    scaleApplication: Object.freeze({
      deferWithMark: true,
      position: "rematerialize",
      default: "defer"
    }),
    rematerializeIncompleteExisting: true
  })
});

function getMarkPolicy(layer) {
  return MARK_MATERIALIZATION_POLICIES[layer.mark?.type];
}

export function getMarkRematerializationStep(layer) {
  const policy = getMarkPolicy(layer);
  return policy === undefined
    ? undefined
    : { op: policy.op, args: { id: layer.id } };
}

export function getMarkMaterializationStep(program, layer) {
  const policy = getMarkPolicy(layer);
  if (policy === undefined || !policy.canMaterialize(program, layer)) {
    return undefined;
  }
  return getMarkRematerializationStep(layer);
}

export function getSourceDependentMarkSteps(program, sourceId) {
  return program.semanticSpec.layers.flatMap(layer =>
    layer.source === sourceId && getMarkPolicy(layer)?.sourceDependent === true
      ? [getMarkMaterializationStep(program, layer)].filter(
          step => step !== undefined
        )
      : []
  );
}

export function getPositionEncodingMaterializationSteps(program, layer, scaleId) {
  const policy = getMarkPolicy(layer);
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
  const policy = getMarkPolicy(layer);
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
  return getMarkPolicy(layer)?.scaleApplication.deferWithMark === true;
}

export function getExistingMarkRematerializationStep(program, layer) {
  const policy = getMarkPolicy(layer);
  if (
    policy?.rematerializeIncompleteExisting !== true ||
    program.graphicSpec.objects[layer.id] === undefined
  ) {
    return undefined;
  }
  return getMarkRematerializationStep(layer);
}

export function getEncodingMaterializationStages(program, layer, channel, scale) {
  const policy = getMarkPolicy(layer);
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
