import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { findCoordinate } from "../../selectors/coordinates.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import { resolveFacadeData, resolveFacadeId, validateFacadeOptions } from "../charts/shared.js";

const COMMON_OPTIONS = ["id", "x", "y", "space", "source", "data", "coordinate", "temporalUnit"];
const LINE_STYLE = ["stroke", "strokeWidth", "strokeDash", "opacity"];
const BAND_STYLE = ["fill", "opacity", "stroke", "strokeWidth"];

function resolveBinding(program, args, axis, operation, band) {
  const space = args.space === undefined ? "data" : args.space;
  if (space !== "data" && space !== "plot") {
    throw new Error(`${operation} space must be data or plot.`);
  }
  if (space === "plot") {
    if (Object.hasOwn(args, "source") || Object.hasOwn(args, "temporalUnit")) {
      throw new Error(`${operation} plot space does not accept source or temporalUnit.`);
    }
    return { data: resolveFacadeData(program, args.data, operation),
      fieldType: "quantitative", coordinate: args.coordinate, plot: true };
  }
  if (Object.hasOwn(args, "data") || Object.hasOwn(args, "coordinate")) {
    throw new Error(`${operation} data space uses source data and coordinate.`);
  }
  const source = resolveEligibleLayer(program, {
    target: args.source === undefined ? undefined : validateUserId(args.source, `${operation} source`),
    predicate: layer => layer.data !== undefined && layer.encoding?.[axis]?.scale !== undefined &&
      findCoordinate(program, layer.coordinate)?.type === "cartesian" &&
      (!band || ["quantitative", "temporal"].includes(layer.encoding[axis].fieldType)),
    label: `${operation} Cartesian layer`,
    targetOption: "source"
  });
  const encoding = source.encoding[axis];
  return { data: source.data, coordinate: source.coordinate, scale: encoding.scale,
    fieldType: encoding.fieldType, temporalUnit: args.temporalUnit === undefined ? encoding.temporalUnit : args.temporalUnit };
}

function createReference(program, args, band) {
  const operation = band ? "createReferenceBand" : "createReferenceLine";
  const styleOptions = band ? BAND_STYLE : LINE_STYLE;
  validateFacadeOptions(args, [...COMMON_OPTIONS, ...styleOptions], operation);
  const axes = ["x", "y"].filter(axis => Object.hasOwn(args, axis));
  if (axes.length !== 1) throw new Error(`${operation} requires exactly one of x or y.`);
  const axis = axes[0];
  const values = band ? args[axis] : [args[axis]];
  if (!Array.isArray(values) || values.length !== (band ? 2 : 1)) {
    throw new Error(`${operation} ${axis} requires a two-value interval.`);
  }
  const id = resolveFacadeId(program, args.id, {
    defaultId: band ? "referenceBand" : "referenceLine", operation
  });
  const binding = resolveBinding(program, args, axis, operation, band);
  if (binding.plot && !values.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error(`${operation} plot coordinates must be finite numbers in [0, 1].`);
  }
  const scale = binding.plot ? `${id}-${axis}` : binding.scale;
  const style = Object.fromEntries(styleOptions.filter(key => args[key] !== undefined).map(key => [key, args[key]]));
  const encode = axis === "x" ? "encodeX" : "encodeY";
  const options = { target: id, fieldType: binding.fieldType, scale: { id: scale },
    ...(binding.coordinate === undefined ? {} : { coordinate: binding.coordinate }),
    ...(binding.temporalUnit === undefined ? {} : { temporalUnit: binding.temporalUnit }) };
  const apply = initial => {
    let next = binding.plot
      ? initial.createScale({ id: scale, type: "linear", domain: [0, 1] })
      : initial;
    next = band
      ? next.createRectMark({ id, data: binding.data, fill: "#94a3b8", opacity: 0.15, stroke: false, ...style })
      : next.createRuleMark({ id, data: binding.data, stroke: "#64748b", strokeWidth: 1, strokeDash: "dashed", ...style });
    next = next[encode]({ ...options, datum: values[0] });
    return band ? next[`${encode}2`]({ ...options, datum: values[1] }) : next;
  };
  // Validate the complete lower-action chain on a discarded immutable branch.
  apply(program);
  return apply(program);
}

export const createReferenceLine = action(
  { op: "createReferenceLine", description: "Create a constant reference line in data or plot coordinates." },
  function (args = {}) { return createReference(this, args, false); }
);

export const createReferenceBand = action(
  { op: "createReferenceBand", description: "Create a constant reference interval in data or plot coordinates." },
  function (args = {}) { return createReference(this, args, true); }
);
