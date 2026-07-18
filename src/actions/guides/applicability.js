import {
  BAR_ORIENTATIONS,
  resolveBarOrientation
} from "../../grammar/bars/policy.js";
import {
  CARTESIAN_POSITION_CHANNELS,
  POLAR_POSITION_CHANNELS
} from "../../core/vocabulary.js";
import { findSemanticScale } from "../../selectors/scales.js";

function hasEncoding(program, channel, { scaled = false, grid = false } = {}) {
  return program.semanticSpec.layers.some(layer => {
    const encoding = layer.encoding?.[channel];
    if (!scaled && !grid) return encoding !== undefined;
    if (encoding?.scale === undefined) return false;
    if (!grid || POLAR_POSITION_CHANNELS.includes(channel)) return true;
    const type = findSemanticScale(program, encoding.scale)?.type;
    return type !== undefined && !["ordinal", "band", "point"].includes(type);
  });
}

function positionalApplicability(program, channels) {
  return Object.freeze(Object.fromEntries(
    channels.map(channel => [
      channel,
      Object.freeze({
        axis: hasEncoding(program, channel),
        grid: hasEncoding(program, channel, { grid: true })
      })
    ])
  ));
}

export function hasInferableLegend(program) {
  return program.semanticSpec.layers.some(layer =>
    (layer.mark?.type === "point" &&
      layer.encoding?.opacity?.scale !== undefined) ||
    (layer.mark?.type === "point" &&
      layer.encoding?.size?.scale !== undefined) ||
    (layer.mark?.type === "point" &&
      layer.encoding?.color?.scale !== undefined &&
      (layer.encoding?.shape?.scale !== undefined ||
        ["sequential", "quantize", "quantile", "threshold"].includes(
          findSemanticScale(program, layer.encoding.color.scale)?.type
        ))) ||
    (layer.mark?.type === "line" &&
      ["color", "strokeDash"].some(
        channel => layer.encoding?.[channel]?.scale !== undefined
      )) ||
    (["bar", "area", "arc", "rect"].includes(layer.mark?.type) &&
      layer.encoding?.color?.scale !== undefined)
  );
}

export function resolveGuideApplicability(program) {
  const cartesian = positionalApplicability(
    program,
    CARTESIAN_POSITION_CHANNELS
  );
  const polar = positionalApplicability(program, POLAR_POSITION_CHANNELS);
  return Object.freeze({
    axes: Object.freeze({
      cartesian: CARTESIAN_POSITION_CHANNELS.some(
        channel => cartesian[channel].axis
      ),
      polar: POLAR_POSITION_CHANNELS.some(channel => polar[channel].axis)
    }),
    grid: Object.freeze({
      cartesian: CARTESIAN_POSITION_CHANNELS.some(
        channel => cartesian[channel].grid
      ),
      polar: POLAR_POSITION_CHANNELS.some(channel => polar[channel].grid),
      directions: Object.freeze({
        horizontal: cartesian.y.grid,
        vertical: cartesian.x.grid,
        theta: polar.theta.grid,
        radial: polar.radius.grid
      })
    }),
    legend: hasInferableLegend(program)
  });
}

export function resolveAutomaticGridOptions(program) {
  const applicability = resolveGuideApplicability(program);
  const directions = applicability.grid.directions;
  if (applicability.grid.polar && !applicability.grid.cartesian) {
    return Object.freeze({
      ...(directions.theta ? { theta: {} } : {}),
      ...(directions.radial ? { radial: {} } : {})
    });
  }

  const barOrientations = program.semanticSpec.layers
    .map(resolveBarOrientation)
    .filter(Boolean);
  const positionedLayers = program.semanticSpec.layers.filter(
    layer => layer.encoding?.x !== undefined && layer.encoding?.y !== undefined
  );
  const horizontalQuantitative = positionedLayers.length > 0 &&
    positionedLayers.every(layer =>
      layer.encoding.x.fieldType === "quantitative" &&
      ["nominal", "ordinal", "temporal"].includes(layer.encoding.y.fieldType)
    );
  if (
    horizontalQuantitative ||
    (barOrientations.length > 0 &&
      barOrientations.every(value => value === BAR_ORIENTATIONS.horizontal))
  ) {
    return Object.freeze({ horizontal: false, vertical: {} });
  }
  return Object.freeze({ horizontal: {}, vertical: false });
}
