import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { isAggregate } from "../../grammar/aggregate.js";
import {
  BAR_GRAINS,
  resolveBarColorLayout,
  resolveBarOffsetChannel,
  resolveBarGrain
} from "../../grammar/bars/policy.js";
import { resolveRuleMode } from "../../grammar/rules.js";
import { findUpstreamTransform } from "../dataProvenance.js";
import { resolveRectMode } from "../../grammar/rects.js";

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

export function canMaterializePoint(_program, layer) {
  return layer.mark?.type === "point" && (
    hasCartesianPositionScales(layer) || hasPolarPositionScales(layer)
  );
}

export function canMaterializeTick(_program, layer) {
  return layer.mark?.type === "tick" && hasCartesianPositionScales(layer);
}

export function canMaterializeLine(program, layer) {
  const parallel = layer.encoding?.parallel;
  if (parallel !== undefined) {
    const coordinate = findCoordinate(program, layer.coordinate);
    return layer.mark?.type === "line" &&
      coordinate?.type === "parallel" &&
      parallel.dimensions?.length >= 2 &&
      parallel.dimensions.every(dimension => dimension.scale !== undefined);
  }
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
    hasCartesianPositionScales(layer) &&
    ((isAggregate(layer.encoding.y.aggregate) &&
      (layer.encoding.x.fieldType === "temporal" ||
        (layer.encoding.x.fieldType === "quantitative" &&
          layer.encoding.x.bin !== undefined))) ||
      (layer.encoding.x.fieldType === "quantitative" &&
        layer.encoding.y.fieldType === "quantitative") ||
      ((interval || layer.encoding.y.aggregate === undefined) &&
        ["quantitative", "temporal"].includes(layer.encoding.x.fieldType) &&
        ["quantitative", "temporal"].includes(layer.encoding.y.fieldType) &&
        layer.encoding.x.fieldType !== layer.encoding.y.fieldType))
  );
}

export function canMaterializeArea(program, layer) {
  if (layer.mark?.type !== "area" || !hasCartesianPositionScales(layer)) {
    return false;
  }
  const dataset = findDataset(program, layer.data);
  const densityTransform = findUpstreamTransform(program, dataset, "density");
  if (isIntentionallyEmptyArea(program, layer)) return false;
  const completeDensity =
    densityTransform !== undefined &&
    (densityTransform.groupBy === undefined ||
      layer.encoding?.group?.field === densityTransform.groupBy);
  const completeCenter =
    densityTransform === undefined &&
    layer.encoding?.y?.stack === "center" &&
    layer.encoding?.group?.fieldType === "nominal";
  return (
    completeDensity ||
    completeCenter ||
    layer.encoding?.y2?.scale === layer.encoding.y.scale ||
    layer.encoding?.x2?.scale === layer.encoding.x.scale
  );
}

export function isIntentionallyEmptyArea(program, layer) {
  if (
    layer.mark?.type !== "area" ||
    !Array.isArray(program.semanticSpec?.datasets)
  ) return false;
  const dataset = findDataset(program, layer.data);
  return dataset?.values?.length === 0 &&
    findUpstreamTransform(program, dataset, "horizon") !== undefined;
}

export function canMaterializeArc(_program, layer) {
  if (
    layer.mark?.type !== "arc" ||
    layer.encoding?.theta?.scale === undefined
  ) {
    return false;
  }
  if (layer.encoding.theta.fieldType === "quantitative") {
    return (
      layer.encoding.theta.aggregate === undefined &&
      layer.encoding?.radius === undefined
    );
  }
  if (!["nominal", "ordinal"].includes(layer.encoding.theta.fieldType)) {
    return false;
  }
  if (["count", "sum"].includes(layer.encoding.theta.aggregate)) {
    return layer.encoding?.radius === undefined;
  }
  return (
    layer.encoding.theta.aggregate === undefined &&
    layer.encoding?.radius?.scale !== undefined &&
    layer.encoding.radius.fieldType === "quantitative"
  );
}

export function canMaterializeBar(program, layer) {
  if (layer.mark?.type !== "bar" || !hasCartesianPositionScales(layer)) {
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
      (layer.encoding?.group !== undefined || (layer.encoding?.color?.field !== undefined &&
      layer.encoding?.[offsetChannel]?.field === layer.encoding.color.field)) &&
      layer.encoding[offsetChannel]?.scale !== undefined
    );
  }
  return true;
}

export function canMaterializeRule(program, layer) {
  const fixedSpan = program.markConfigs[layer.id]?.fixedSpan;
  const boxSpanOwner = program.markConfigs[layer.id]?.boxSpanOwner;
  return layer.mark?.type === "rule" && (
    resolveRuleMode(layer) !== undefined ||
    (boxSpanOwner !== undefined && hasCartesianPositionScales(layer)) ||
    (fixedSpan !== undefined && hasCartesianPositionScales(layer))
  );
}

export function canMaterializeText(program, layer) {
  if (layer.mark?.type !== "text" || layer.encoding?.text === undefined) {
    return false;
  }
  if (layer.source !== undefined) {
    const source = findLayer(program, layer.source);
    return source !== undefined &&
      ["point", "bar", "rule", "rect", "arc"].includes(source.mark?.type) &&
      Array.isArray(program.graphicSpec.objects[source.id]?.items);
  }
  return hasCartesianPositionScales(layer);
}

export function canMaterializeRect(_program, layer) {
  return resolveRectMode(layer) !== undefined;
}
