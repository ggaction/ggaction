import {
  BAR_ORIENTATIONS,
  resolveBarOrientation
} from "../../grammar/bars/policy.js";
import {
  CARTESIAN_POSITION_CHANNELS,
  POLAR_POSITION_CHANNELS
} from "../../core/vocabulary.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { findDataset } from "../../selectors/datasets.js";
import { isOpacityLegendLayer } from "../../materialization/legends.js";
import { findUpstreamTransform } from
  "../../materialization/dataProvenance.js";

function isHorizonLayer(program, layer) {
  return findUpstreamTransform(
    program,
    findDataset(program, layer.data),
    "horizon"
  ) !== undefined;
}

function hasEncoding(program, layers, channel, { scaled = false, grid = false } = {}) {
  return layers.some(layer => {
    if (isHorizonLayer(program, layer) && channel !== "x") return false;
    const encoding = layer.encoding?.[channel];
    if (!scaled && !grid) return encoding !== undefined;
    if (encoding?.scale === undefined) return false;
    if (!grid || POLAR_POSITION_CHANNELS.includes(channel)) return true;
    const type = findSemanticScale(program, encoding.scale)?.type;
    return type !== undefined && !["ordinal", "band", "point"].includes(type);
  });
}

function positionalApplicability(program, layers, channels) {
  return Object.freeze(Object.fromEntries(
    channels.map(channel => [
      channel,
      Object.freeze({
        axis: hasEncoding(program, layers, channel),
        grid: hasEncoding(program, layers, channel, { grid: true })
      })
    ])
  ));
}

export function hasInferableLegend(program, layers = program.semanticSpec.layers) {
  return layers.some(layer =>
    !isHorizonLayer(program, layer) && (
      isOpacityLegendLayer(layer) ||
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
    )
  );
}

export function resolveGuideApplicability(program, layers = program.semanticSpec.layers) {
  const cartesian = positionalApplicability(
    program,
    layers,
    CARTESIAN_POSITION_CHANNELS
  );
  const polar = positionalApplicability(program, layers, POLAR_POSITION_CHANNELS);
  const parallel = layers.some(layer =>
    layer.encoding?.parallel?.dimensions?.length >= 2
  );
  return Object.freeze({
    axes: Object.freeze({
      cartesian: CARTESIAN_POSITION_CHANNELS.some(
        channel => cartesian[channel].axis
      ),
      polar: POLAR_POSITION_CHANNELS.some(channel => polar[channel].axis),
      parallel,
      directions: Object.freeze({
        x: cartesian.x.axis,
        y: cartesian.y.axis,
        theta: polar.theta.axis,
        radius: polar.radius.axis
      })
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
    legend: hasInferableLegend(program, layers)
  });
}

export function resolveAutomaticGridOptions(program, layers = program.semanticSpec.layers) {
  const applicability = resolveGuideApplicability(program, layers);
  const directions = applicability.grid.directions;
  if (applicability.grid.polar && !applicability.grid.cartesian) {
    return Object.freeze({
      ...(directions.theta ? { theta: {} } : {}),
      ...(directions.radial ? { radial: {} } : {})
    });
  }
  if (directions.vertical && !directions.horizontal) {
    return Object.freeze({ horizontal: false, vertical: {} });
  }

  const barOrientations = layers
    .map(resolveBarOrientation)
    .filter(Boolean);
  const positionedLayers = layers.filter(
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
