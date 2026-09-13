import { isSourceOwnedText } from "../grammar/text.js";
import { resolveEffectiveBounds } from "../layout/aspect.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { findCoordinate, requireCoordinate } from "../selectors/coordinates.js";
import { findSemanticScale } from "../selectors/scales.js";

const DATA_CHANNELS = Object.freeze(["x", "y"]);
const SECONDARY_CHANNELS = Object.freeze({ x2: "x", y2: "y" });

function samePair(left, right) {
  return left.x === right.x && left.y === right.y;
}

export function resolveDataAspectScalePair(program, target) {
  const coordinate = typeof target === "string"
    ? requireCoordinate(program, target)
    : target;
  if (coordinate.type !== "cartesian") {
    throw new Error("Coordinate data aspect requires a Cartesian coordinate.");
  }
  const layers = program.semanticSpec.layers.filter(layer =>
    layer.coordinate === coordinate.id &&
    !isSourceOwnedText(layer) &&
    DATA_CHANNELS.some(channel => layer.encoding?.[channel] !== undefined)
  );
  if (layers.length === 0) {
    throw new Error(
      `Coordinate "${coordinate.id}" data aspect requires active x and y consumers.`
    );
  }
  const pairs = layers.map(layer => {
    for (const channel of DATA_CHANNELS) {
      const encoding = layer.encoding?.[channel];
      if (
        encoding?.scale === undefined ||
        encoding.fieldType !== "quantitative"
      ) {
        throw new Error(
          `Coordinate "${coordinate.id}" data aspect requires quantitative x and y scale consumers.`
        );
      }
    }
    for (const [secondary, primary] of Object.entries(SECONDARY_CHANNELS)) {
      const encoding = layer.encoding?.[secondary];
      if (encoding !== undefined && (
        encoding.fieldType !== "quantitative" ||
        encoding.scale !== layer.encoding[primary].scale
      )) {
        throw new Error(
          `Coordinate "${coordinate.id}" data aspect requires ${secondary} to share its quantitative ${primary} scale.`
        );
      }
    }
    return { x: layer.encoding.x.scale, y: layer.encoding.y.scale };
  });
  if (pairs.some(pair => !samePair(pair, pairs[0]))) {
    throw new Error(
      `Coordinate "${coordinate.id}" data aspect requires one consistent x/y scale pair.`
    );
  }
  const scales = {
    x: findSemanticScale(program, pairs[0].x),
    y: findSemanticScale(program, pairs[0].y)
  };
  for (const channel of DATA_CHANNELS) {
    if (scales[channel]?.type !== "linear") {
      throw new Error(
        `Coordinate data aspect requires a linear ${channel} scale.`
      );
    }
  }
  return Object.freeze({
    x: pairs[0].x,
    y: pairs[0].y
  });
}

export function findDataAspectCoordinatesForScale(program, scaleId) {
  return program.semanticSpec.coordinates.filter(coordinate => {
    if (coordinate.aspect?.mode !== "data") return false;
    const pair = resolveDataAspectScalePair(program, coordinate);
    return pair.x === scaleId || pair.y === scaleId;
  });
}

function sameNumericPair(left, right) {
  return Array.isArray(left) && left.length === 2 &&
    left.every((value, index) => Number.isFinite(value) &&
      Math.abs(value - right[index]) <= 1e-9);
}

function validateExplicitDataRanges(program, pair, bounds) {
  const expected = {
    x: [bounds.x, bounds.x + bounds.width],
    y: [bounds.y + bounds.height, bounds.y]
  };
  for (const channel of DATA_CHANNELS) {
    const scale = findSemanticScale(program, pair[channel]);
    if (scale.range === "auto") continue;
    const directed = scale.reverse === true
      ? [...expected[channel]].reverse()
      : expected[channel];
    if (!sameNumericPair(scale.range, directed)) {
      throw new Error(
        `Coordinate data aspect conflicts with explicit ${channel} scale range "${scale.id}".`
      );
    }
  }
}

export function resolveCoordinateBounds(program, target, {
  resolvedScales = program.resolvedScales
} = {}) {
  const allocated = resolveGraphicBounds(program);
  if (target === undefined) return allocated;
  const coordinate = requireCoordinate(program, target);
  const aspect = coordinate.aspect;
  if (aspect === undefined || aspect === "auto") return allocated;
  if (aspect.mode !== "data") {
    return resolveEffectiveBounds(allocated, aspect);
  }
  const pair = resolveDataAspectScalePair(program, coordinate);
  const x = resolvedScales[pair.x];
  const y = resolvedScales[pair.y];
  if (x?.type !== "linear" || y?.type !== "linear") {
    throw new Error(
      `Coordinate "${coordinate.id}" data aspect requires resolved linear x and y scales.`
    );
  }
  const bounds = resolveEffectiveBounds(allocated, aspect, {
    x: x.domain,
    y: y.domain
  });
  validateExplicitDataRanges(program, pair, bounds);
  return bounds;
}

function consumerCoordinateIds(consumers) {
  return [...new Set(consumers.map(consumer => consumer.layer.coordinate))];
}

function sameBounds(left, right) {
  return ["x", "y", "width", "height"].every(
    property => Math.abs(left[property] - right[property]) <= 1e-9
  );
}

export function resolveScaleConsumerBounds(program, consumers, options) {
  const coordinateIds = consumerCoordinateIds(consumers);
  if (coordinateIds.length === 0) return resolveGraphicBounds(program);
  const allocated = resolveGraphicBounds(program);
  const bounds = coordinateIds.map(id =>
    id === undefined || findCoordinate(program, id) === undefined
      ? allocated
      : resolveCoordinateBounds(program, id, options)
  );
  if (bounds.slice(1).some(candidate => !sameBounds(candidate, bounds[0]))) {
    throw new Error(
      "A position scale cannot be shared across coordinates with different effective bounds."
    );
  }
  return bounds[0];
}

export function resolveGuideCoordinateBounds(program, {
  coordinate,
  scale,
  channel,
  resolvedScales = program.resolvedScales
}) {
  let target = coordinate;
  if (target === undefined && scale !== undefined) {
    const candidates = new Set();
    for (const layer of program.semanticSpec.layers) {
      if (isSourceOwnedText(layer)) continue;
      if (layer.encoding?.[channel]?.scale === scale) {
        candidates.add(layer.coordinate);
      }
    }
    if (candidates.has(undefined)) {
      throw new Error("Guide scale consumers require stored coordinates.");
    }
    if (candidates.size > 1) {
      throw new Error("Guide bounds found no unique compatible coordinate.");
    }
    target = candidates.values().next().value;
  }
  if (target !== undefined && findCoordinate(program, target) === undefined) {
    throw new Error(`Unknown coordinate "${target}".`);
  }
  return resolveCoordinateBounds(program, target, { resolvedScales });
}
