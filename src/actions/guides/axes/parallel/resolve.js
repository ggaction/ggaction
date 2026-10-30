import { parallelAxisPosition } from "../../../../grammar/parallelGuides.js";
import { resolveDisplayLabel } from "../../../../grammar/displayLabels.js";
import { validateUserId } from "../../../../core/identifiers.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../../../grammar/scales/index.js";
import { resolveParallelTickValues } from "../../../../materialization/guides/tickValues.js";
import { resolveCoordinateBounds } from "../../../../materialization/coordinateBounds.js";
import { findCoordinate } from "../../../../selectors/coordinates.js";
import { findLayer } from "../../../../selectors/layers.js";
import { formatAxisValue, formatNumericAxisTicks } from "../policy.js";
import { resolveParallelAxisConfigs } from "./policy.js";

export function requireParallelAxisLayer(program, target) {
  const layer = findLayer(program, target);
  const coordinate = layer === undefined
    ? undefined
    : findCoordinate(program, layer.coordinate);
  if (
    layer?.mark?.type !== "line" ||
    coordinate?.type !== "parallel" ||
    !Array.isArray(layer.encoding?.parallel?.dimensions) ||
    layer.encoding.parallel.dimensions.length < 2
  ) {
    throw new Error(`Parallel axes require an encoded Parallel line "${target}".`);
  }
  return { coordinate, dimensions: layer.encoding.parallel.dimensions, layer };
}

export function resolveParallelAxisTarget(program, requested) {
  if (requested !== undefined) {
    const target = validateUserId(requested, "Parallel axes target");
    requireParallelAxisLayer(program, target);
    return target;
  }
  const candidates = program.semanticSpec.layers.filter(layer => {
    const coordinate = findCoordinate(program, layer.coordinate);
    return layer.encoding?.parallel !== undefined && coordinate?.type === "parallel";
  });
  if (candidates.length !== 1) {
    throw new Error(
      "Parallel axes require target when one Parallel layer cannot be inferred."
    );
  }
  return candidates[0].id;
}

function formatValue(value) {
  if (Number.isFinite(value) && Math.abs(value) >= 1000 && value % 1000 === 0) {
    return `${value / 1000}k`;
  }
  return String(value);
}

function componentValues(program, dimension, config) {
  const scale = program.resolvedScales[dimension.scale];
  if (scale === undefined) throw new Error(`Parallel axis requires resolved scale "${dimension.scale}".`);
  const discrete = ["ordinal", "band", "point"].includes(scale.type);
  const values = resolveParallelTickValues(scale, config, dimension.field);
  return {
    values,
    y: discrete ? mapOrdinalPositionValues(values, scale) : mapContinuousScaleValues(values, scale),
    text: config.format === undefined ? undefined
      : config.format === "ticks" ? formatNumericAxisTicks(values, scale.type)
        : values.map(value => resolveDisplayLabel(value, config.labelMap, () => formatAxisValue(value, scale.type, config.format, formatValue)))
  };
}

export function resolveStyledParallelAxes(program, dimensions) {
  const stored = program.guideConfigs.axis?.parallel?.axes;
  const layer = stored === undefined
    ? undefined
    : findLayer(program, stored.target);
  const bounds = resolveCoordinateBounds(program, layer?.coordinate);
  const configs = resolveParallelAxisConfigs(program, dimensions);
  const titles = program.semanticSpec.guides.axis?.parallel?.titles ?? [];
  return {
    bounds,
    configs,
    axes: dimensions.map((dimension, index) => {
      const config = configs.dimensions[index];
      return {
        ...dimension,
        x: parallelAxisPosition(bounds, index, dimensions.length),
        config,
        title: titles.find(title => title.field === dimension.field)?.text ?? dimension.title,
        ticks: config.ticks === undefined ? undefined : componentValues(program, dimension, config.ticks),
        labels: config.labels === undefined ? undefined : componentValues(program, dimension, config.labels)
      };
    })
  };
}
