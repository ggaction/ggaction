import { findDataset } from "../selectors/datasets.js";
import { isAggregate } from "../grammar/aggregate.js";
import { BAR_GRAINS, resolveBarGrain } from "../grammar/bars/policy.js";
import { resolveRuleMode } from "../grammar/rules.js";
import { findUpstreamTransform } from "./dataProvenance.js";

function hasPositionScales(layer) {
  return (
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined
  );
}

export function canMaterializePoint(_program, layer) {
  return layer.mark?.type === "point" && hasPositionScales(layer);
}

export function canMaterializeLine(program, layer) {
  const dataset = findDataset(program, layer.data);
  const interval = dataset?.transform?.some(item => item.type === "interval");
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

export function canMaterializeBar(program, layer) {
  if (layer.mark?.type !== "bar" || !hasPositionScales(layer)) {
    return false;
  }
  const grain = resolveBarGrain(layer);
  return grain === BAR_GRAINS.histogram || (
    [BAR_GRAINS.aggregate, BAR_GRAINS.ranged].includes(grain) &&
    program.markConfigs[layer.id]?.barWidth !== undefined
  );
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

const MARK_MATERIALIZATION_POLICIES = Object.freeze({
  point: Object.freeze({
    canMaterialize: canMaterializePoint,
    op: "rematerializePointMark"
  }),
  line: Object.freeze({
    canMaterialize: canMaterializeLine,
    op: "rematerializeLineMark"
  }),
  area: Object.freeze({
    canMaterialize: canMaterializeArea,
    op: "rematerializeAreaMark"
  }),
  bar: Object.freeze({
    canMaterialize: canMaterializeBar,
    op: "rematerializeBarMark"
  }),
  rule: Object.freeze({
    canMaterialize: canMaterializeRule,
    op: "rematerializeRuleMark"
  })
});

export function getMarkMaterializationStep(program, layer) {
  const policy = MARK_MATERIALIZATION_POLICIES[layer.mark?.type];
  if (policy === undefined || !policy.canMaterialize(program, layer)) {
    return undefined;
  }
  return { op: policy.op, args: { id: layer.id } };
}
