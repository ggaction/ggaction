import { validateUserId } from "../../../../core/identifiers.js";
import {
  isTransformedScaleType,
  mapContinuousScaleValues,
  mapOrdinalPositionValues,
  transformedTicks
} from "../../../../grammar/scales/index.js";
import { niceTicks } from "../../../../grammar/ticks.js";
import { resolveGraphicBounds } from "../../../../layout/canvas.js";
import { findCoordinate } from "../../../../selectors/coordinates.js";
import { findLayer } from "../../../../selectors/layers.js";
import { formatAxisValue } from "../policy.js";
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

function ticksForScale(scale, count = 5) {
  if (["ordinal", "band", "point"].includes(scale.type)) return scale.domain;
  if (isTransformedScaleType(scale.type)) {
    return transformedTicks(scale.type, scale.domain, count, {
      ...(scale.base === undefined ? {} : { base: scale.base }),
      ...(scale.exponent === undefined ? {} : { exponent: scale.exponent }),
      ...(scale.constant === undefined ? {} : { constant: scale.constant })
    });
  }
  return niceTicks(scale.domain, count);
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
  if (discrete && config.mode === "count") throw new Error("Ordinal Parallel axes use domain values, not count.");
  const values = config.mode === "values" ? config.values : ticksForScale(scale, config.count ?? 5);
  if (new Set(values).size !== values.length || values.some(value => discrete
    ? !scale.domain.includes(value)
    : !Number.isFinite(value) || value < Math.min(...scale.domain) || value > Math.max(...scale.domain))) {
    throw new Error(`Parallel axis values must be distinct values inside the scale domain for "${dimension.field}".`);
  }
  return {
    values,
    y: discrete ? mapOrdinalPositionValues(values, scale) : mapContinuousScaleValues(values, scale),
    text: config.format === undefined ? undefined : values.map(value =>
      formatAxisValue(value, scale.type, config.format, formatValue))
  };
}

export function resolveStyledParallelAxes(program, dimensions) {
  const bounds = resolveGraphicBounds(program);
  const step = bounds.width / (dimensions.length - 1);
  const configs = resolveParallelAxisConfigs(program, dimensions);
  const titles = program.semanticSpec.guides.axis?.parallel?.titles ?? [];
  return {
    bounds,
    configs,
    axes: dimensions.map((dimension, index) => {
      const config = configs.dimensions[index];
      return {
        ...dimension,
        x: bounds.x + step * index,
        config,
        title: titles.find(title => title.field === dimension.field)?.text ?? dimension.title,
        ticks: config.ticks === undefined ? undefined : componentValues(program, dimension, config.ticks),
        labels: config.labels === undefined ? undefined : componentValues(program, dimension, config.labels)
      };
    })
  };
}
