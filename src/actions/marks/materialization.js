import { findDataset } from "../../selectors/datasets.js";
import { isAggregate } from "../../grammar/aggregate.js";

function hasPositionScales(layer) {
  return (
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined
  );
}

export function canMaterializePoint(_program, layer) {
  return layer.mark?.type === "point" && hasPositionScales(layer);
}

export function canMaterializeLine(_program, layer) {
  return (
    layer.mark?.type === "line" &&
    hasPositionScales(layer) &&
    (isAggregate(layer.encoding.y.aggregate) ||
      (layer.encoding.x.fieldType === "quantitative" &&
        layer.encoding.y.fieldType === "quantitative"))
  );
}

export function canMaterializeArea(program, layer) {
  if (layer.mark?.type !== "area" || !hasPositionScales(layer)) {
    return false;
  }

  const dataset = findDataset(program, layer.data);
  const densityTransform =
    dataset?.transform?.length === 1 &&
    dataset.transform[0].type === "density"
      ? dataset.transform[0]
      : undefined;
  const completeDensity =
    densityTransform !== undefined &&
    (densityTransform.groupBy === undefined ||
      layer.encoding?.group?.field === densityTransform.groupBy);

  return (
    completeDensity ||
    layer.encoding?.y2?.scale === layer.encoding.y.scale
  );
}

export function canMaterializeBar(program, layer) {
  if (layer.mark?.type !== "bar" || !hasPositionScales(layer)) {
    return false;
  }

  const histogram =
    layer.encoding?.x?.bin !== undefined &&
    layer.encoding?.y?.aggregate === "count" &&
    layer.encoding.y.stack === "zero";
  const grouped =
    layer.encoding?.x?.fieldType === "ordinal" &&
    isAggregate(layer.encoding?.y?.aggregate) &&
    layer.encoding.y.stack === null &&
    program.markConfigs[layer.id]?.barWidth !== undefined;

  return histogram || grouped;
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
  })
});

export function getMarkMaterializationStep(program, layer) {
  const policy = MARK_MATERIALIZATION_POLICIES[layer.mark?.type];
  if (policy === undefined || !policy.canMaterialize(program, layer)) {
    return undefined;
  }
  return { op: policy.op, args: { id: layer.id } };
}
