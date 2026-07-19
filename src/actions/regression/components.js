import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { findDataset } from "../../selectors/datasets.js";
import { resolveEligibleLayer } from "../../selectors/layers.js";
import {
  REGRESSION_LOWER_FIELD,
  REGRESSION_UPPER_FIELD
} from "../../grammar/regression/index.js";
import { validateAreaCreateOutline } from "../marks/area/index.js";

const BAND_OPTIONS = Object.freeze([
  "id", "data", "x", "lower", "upper", "groupBy", "coordinate", "xScale", "yScale",
  "color", "opacity", "stroke", "strokeWidth", "curve"
]);
const LINE_OPTIONS = Object.freeze([
  "id", "data", "x", "y", "groupBy", "coordinate", "xScale", "yScale", "colorScale",
  "strokeWidth", "curve"
]);
const EDIT_BAND_OPTIONS = Object.freeze([
  "target", "color", "opacity", "stroke", "strokeWidth", "curve"
]);
const EDIT_LINE_OPTIONS = Object.freeze(["target", "strokeWidth", "curve"]);

function isRegressionLayer(program, layer, type) {
  const dataset = findDataset(program, layer.data);
  return layer.mark?.type === type &&
    dataset?.transform?.length === 1 &&
    dataset.transform[0].type === "regression";
}

function resolveRegressionComponent(program, args, type, label) {
  const target = Object.hasOwn(args, "target")
    ? validateUserId(args.target, `${label} id`)
    : undefined;
  return resolveEligibleLayer(program, {
    target,
    predicate: layer => isRegressionLayer(program, layer, type),
    label
  });
}

function requireRegressionBandDataset(program, args) {
  const dataset = findDataset(program, args.data);
  const transform = dataset?.transform?.length === 1
    ? dataset.transform[0]
    : undefined;
  if (transform?.type !== "regression" || transform.method === "loess") {
    throw new Error(
      "createRegressionBand requires a regression dataset with interval bounds."
    );
  }
  if (
    args.x !== transform.x ||
    args.lower !== REGRESSION_LOWER_FIELD ||
    args.upper !== REGRESSION_UPPER_FIELD ||
    args.groupBy !== transform.groupBy
  ) {
    throw new Error(
      "createRegressionBand fields and grouping must match regression provenance."
    );
  }
  return { dataset, transform };
}

export const createRegressionBand = action(
  {
    op: "createRegressionBand",
    description: "Create and encode a grouped regression confidence band."
  },
  function (args = {}) {
    validateKeys(args, BAND_OPTIONS, "createRegressionBand");
    const id = validateUserId(args.id, "Regression band id");
    const { transform } = requireRegressionBandDataset(this, args);
    validateAreaCreateOutline(args, "createRegressionBand");
    let next = this
      .createErrorBand({
        id,
        data: args.data,
        x: {
          field: args.x,
          fieldType: "quantitative",
          scale: { id: args.xScale }
        },
        y: {
          center: transform.y,
          lower: args.lower,
          upper: args.upper,
          scale: { id: args.yScale }
        },
        ...(args.groupBy === undefined ? {} : { groupBy: args.groupBy }),
        coordinate: args.coordinate,
        fill: args.color ?? DEFAULT_COLORS.regressionBand,
        opacity: args.opacity ?? 0.18,
        ...(args.curve === undefined ? {} : { curve: args.curve })
      })
      .editSemantic({
        property: `layer[${id}].encoding.y.title`,
        remove: true
      });
    if (args.stroke !== undefined || args.strokeWidth !== undefined) {
      next = next.editAreaMark({
        target: id,
        ...(args.stroke === undefined ? {} : { stroke: args.stroke }),
        ...(args.strokeWidth === undefined
          ? {}
          : { strokeWidth: args.strokeWidth })
      });
    }
    return next;
  }
);

export const editRegressionBand = action(
  {
    op: "editRegressionBand",
    description: "Edit regression-band fill, opacity, and outline."
  },
  function (args = {}) {
    validateKeys(args, EDIT_BAND_OPTIONS, "editRegressionBand");
    const changes = ["color", "opacity", "stroke", "strokeWidth", "curve"];
    if (!changes.some(key => Object.hasOwn(args, key))) {
      throw new Error(
        "editRegressionBand requires color, opacity, stroke, strokeWidth, or curve."
      );
    }
    const layer = resolveRegressionComponent(
      this,
      args,
      "area",
      "regression band"
    );
    return this.editAreaMark({
      target: layer.id,
      ...(Object.hasOwn(args, "color") ? { fill: args.color } : {}),
      ...(Object.hasOwn(args, "opacity") ? { opacity: args.opacity } : {}),
      ...(Object.hasOwn(args, "stroke") ? { stroke: args.stroke } : {}),
      ...(Object.hasOwn(args, "strokeWidth")
        ? { strokeWidth: args.strokeWidth }
        : {}),
      ...(Object.hasOwn(args, "curve") ? { curve: args.curve } : {})
    });
  }
);

export const editRegressionLine = action(
  {
    op: "editRegressionLine",
    description: "Edit regression-line width or curve."
  },
  function (args = {}) {
    validateKeys(args, EDIT_LINE_OPTIONS, "editRegressionLine");
    if (
      !Object.hasOwn(args, "strokeWidth") &&
      !Object.hasOwn(args, "curve")
    ) {
      throw new Error("editRegressionLine requires strokeWidth or curve.");
    }
    const layer = resolveRegressionComponent(
      this,
      args,
      "line",
      "regression line"
    );
    return this.editLineMark({
      target: layer.id,
      ...(Object.hasOwn(args, "strokeWidth")
        ? { strokeWidth: args.strokeWidth }
        : {}),
      ...(Object.hasOwn(args, "curve") ? { curve: args.curve } : {})
    });
  }
);

export const createRegressionLine = action(
  {
    op: "createRegressionLine",
    description: "Create and encode grouped regression line paths."
  },
  function (args = {}) {
    validateKeys(args, LINE_OPTIONS, "createRegressionLine");
    const id = validateUserId(args.id, "Regression line id");
    let next = this
      .createLineMark({
        id,
        data: args.data,
        strokeWidth: args.strokeWidth ?? 3,
        ...(args.curve === undefined ? {} : { curve: args.curve })
      })
      .encodeX({
        target: id,
        field: args.x,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.xScale }
      })
      .encodeY({
        target: id,
        field: args.y,
        fieldType: "quantitative",
        coordinate: args.coordinate,
        scale: { id: args.yScale }
      });
    if (args.groupBy !== undefined) {
      next = next
        .encodeColor({
          target: id,
          field: args.groupBy,
          scale: { id: args.colorScale }
        })
        .encodeGroup({ target: id, field: args.groupBy });
    }
    return next.rematerializeLineMark({ id });
  }
);
