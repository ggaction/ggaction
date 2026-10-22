import { isNominalValue, readNominalField } from "./fields.js";
import { BAR_GRAINS, resolveBarChannels, resolveBarGrain } from "../bars/policy.js";
import { validateAggregate, validateAggregateFieldType } from "../aggregate.js";
import { isDiscretizedColorScaleType } from "./types.js";

export function validateTickColorChannels(layer, requestedChannel) {
  if (layer.mark?.type !== "tick") return;
  const { color, stroke } = layer.encoding ?? {};
  if (color !== undefined && stroke !== undefined ||
      requestedChannel === "color" && stroke !== undefined ||
      requestedChannel === "stroke" && color !== undefined) {
    throw new Error("Tick color and stroke cannot coexist; remove the existing encoding before switching channels.");
  }
  if (color !== undefined && !["quantitative", "temporal"].includes(color.fieldType)) {
    throw new Error("Tick color requires a quantitative or temporal field.");
  }
}

export function validateContinuousColorConsumer(layer, encoding, scale, {
  inferAggregate = false,
  channel = "color"
} = {}) {
  const kind = layer.mark?.type;
  validateTickColorChannels(layer, channel);
  if (["log", "pow", "sqrt", "symlog"].includes(scale.type) && encoding.fieldType !== "quantitative") {
    throw new Error(`Scale type "${scale.type}" requires quantitative color.`);
  }
  if (channel === "stroke") {
    if (!["point", "line", "area", "bar", "rect", "arc", "rule", "tick"].includes(kind)) {
      throw new Error("Continuous stroke requires a supported graphical mark consumer.");
    }
    if (!['quantitative', 'temporal'].includes(encoding.fieldType) ||
      (isDiscretizedColorScaleType(scale.type) && encoding.fieldType !== "quantitative")) {
      throw new Error(`Scale type "${scale.type}" has an incompatible stroke field type.`);
    }
    if (encoding.aggregate !== undefined) {
      throw new Error("Continuous stroke does not support aggregate.");
    }
    if (Object.hasOwn(scale, "unknown") && kind !== "point") {
      throw new Error("Continuous stroke scale unknown currently requires a row-owned point mark.");
    }
    return undefined;
  }
  if (!["point", "line", "bar", "rect", "text", "area", "arc", "tick"].includes(kind)) {
    throw new Error("Continuous color requires a Point, Line, aggregate Bar, Rect, Text, Arc, Tick, or quantitative Area consumer.");
  }
  if (!["quantitative", "temporal"].includes(encoding.fieldType) ||
    (isDiscretizedColorScaleType(scale.type) && encoding.fieldType !== "quantitative")) {
    throw new Error(`Scale type "${scale.type}" has an incompatible color field type.`);
  }
  if (Object.hasOwn(scale, "unknown") && kind !== "point") {
    throw new Error("Continuous color scale unknown currently requires a row-owned point mark.");
  }
  if (kind === "area" && encoding.fieldType !== "quantitative") {
    throw new Error("Continuous area color requires a quantitative field.");
  }
  if (kind !== "bar") {
    if (encoding.aggregate !== undefined) throw new Error(`${kind} continuous color does not support aggregate.`);
    return undefined;
  }
  if (["nominal", "ordinal"].includes(layer.encoding?.color?.fieldType)) {
    throw new Error("Continuous bar color cannot replace an existing nominal color layout.");
  }
  if (encoding.fieldType !== "quantitative") {
    throw new Error("Aggregate bar color currently requires a quantitative field.");
  }
  if (resolveBarGrain(layer) !== BAR_GRAINS.aggregate) {
    throw new Error("Continuous bar color requires a complete categorical aggregate bar.");
  }
  const measure = layer.encoding?.[resolveBarChannels(layer).measure];
  const aggregate = encoding.aggregate ?? (inferAggregate && measure?.field === encoding.field ? measure.aggregate : undefined);
  if (aggregate === undefined) {
    throw new Error("Continuous bar color requires aggregate when its field differs from the measure field.");
  }
  validateAggregate(aggregate);
  validateAggregateFieldType(aggregate, encoding.fieldType);
  return aggregate;
}

export function validateCategoricalColorConsumer(layer, encoding, scale, channel = "color") {
  if (!Object.hasOwn(scale, "unknown")) return false;
  if (layer.mark?.type === "point") return false;
  const position = layer.encoding ?? {};
  if (channel === "strokeDash") {
    if (!["line", "rule"].includes(layer.mark?.type) ||
        !["nominal", "ordinal"].includes(encoding.fieldType) || scale.type !== "ordinal" ||
        position.parallel !== undefined || position.theta !== undefined || position.radius !== undefined ||
        [position.x, position.y, position.x2, position.y2].some(item =>
          item?.aggregate !== undefined || item?.bin !== undefined)) {
      throw new Error("StrokeDash unknown requires a Cartesian line or rule with categorical ordinal mapping.");
    }
    // Dash fallback maps valid categories only; never enable missing-color reads.
    return false;
  }
  if (layer.mark?.type !== "line" || channel !== "color" ||
      !["nominal", "ordinal"].includes(encoding.fieldType) ||
      scale.type !== "ordinal" || !Array.isArray(scale.domain) || scale.domain.length === 0 ||
      position.parallel !== undefined || position.theta !== undefined || position.radius !== undefined ||
      [position.x, position.y].some(item => item?.aggregate !== undefined || item?.bin !== undefined)) {
    throw new Error("Categorical unknown requires a row-owned point or a Cartesian line with explicit ordinal domain.");
  }
  return true;
}

export function readCategoricalLineColor(rows, field) {
  readNominalField([], field);
  // Missing colors preserve the vertex; malformed categorical values remain errors.
  return rows.map((row, index) => {
    const value = row[field];
    if (value == null || isNominalValue(value)) return value;
    throw new TypeError(`Field "${field}" must contain a nominal value at row ${index}.`);
  });
}
