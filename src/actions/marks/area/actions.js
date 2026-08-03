import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "../shared.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer } from "../../../selectors/layers.js";
import { validateCurveInterpolation } from "../../../grammar/curveCommands.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";
import { canMaterializeArea } from "../../../materialization/marks/index.js";
import { findUpstreamTransform } from "../../../materialization/dataProvenance.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import { resolveAreaMaterialization } from "./materialize.js";

const CREATE_OPTIONS = Object.freeze([
  "id", "data", "fill", "opacity", "stroke", "strokeWidth", "curve"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "fill", "opacity", "stroke", "strokeWidth", "curve"
]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);
const STROKE_FROM_FILL_OPTIONS = Object.freeze(["id", "strokeWidth"]);

export function validateAreaCreateOutline(args, operation = "createAreaMark") {
  if (Object.hasOwn(args, "strokeWidth") && !Object.hasOwn(args, "stroke")) {
    throw new Error(`${operation} strokeWidth requires stroke.`);
  }
  const stroke = Object.hasOwn(args, "stroke")
    ? validateNonEmptyString(args.stroke, "Area stroke")
    : undefined;
  return {
    stroke,
    strokeWidth: stroke === undefined
      ? undefined
      : validateNonNegativeFinite(args.strokeWidth ?? 1, "Area strokeWidth")
  };
}

const createAreaMark = action(
  {
    op: "createAreaMark",
    description: "Create a semantic area mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createAreaMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "area",
      label: "Area mark id",
      markType: "area",
      operation: "createAreaMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "area");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });
    const fill = validateNonEmptyString(args.fill ?? DEFAULT_COLORS.mark, "Area fill");
    const opacity = validateUnitInterval(args.opacity ?? 0.2, "Area opacity");
    const curve = validateCurveInterpolation(args.curve ?? "linear");
    const { stroke, strokeWidth } = validateAreaCreateOutline(args);
    assertMarkAvailable(this, id);
    let created = this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "area" })
      .editSemantic({ property: `layer[${id}].data`, value: data });
    created = applyLayeredMarkInheritance(created, id, inherited);
    created = created
      .createGraphics({
        id,
        type: "path",
        length: 0,
        ...resolveMarkGraphicPlacement(created, { data, markType: "area" })
      })
      ._withMarkConfig(id, {
        fill,
        opacity,
        ...(Object.hasOwn(args, "curve") ? { curve } : {}),
        ...(stroke === undefined ? {} : { stroke, strokeWidth })
      });
    return materializeInheritedMark(created, id);
  }
);

const configureAreaStrokeFromFill = action(
  {
    op: "configureAreaStrokeFromFill",
    description: "Use each area path fill as its outline color."
  },
  function (args = {}) {
    validateMarkOptions(
      args,
      STROKE_FROM_FILL_OPTIONS,
      "configureAreaStrokeFromFill"
    );
    const id = validateUserId(args.id, "Area mark id");
    const layer = findLayer(this, id);
    if (layer?.mark?.type !== "area") {
      throw new Error(`Unknown area mark "${id}".`);
    }
    const { stroke: _stroke, ...config } = this.markConfigs[id] ?? {};
    void _stroke;
    return this._withMarkConfig(id, {
      ...config,
      strokeFromFill: true,
      strokeWidth: validateNonNegativeFinite(
        args.strokeWidth ?? 1,
        "Area strokeWidth"
      )
    });
  }
);

const rematerializeAreaMark = action(
  {
    op: "rematerializeAreaMark",
    description: "Recompute grouped closed area paths."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeAreaMark");
    if (args.scales !== undefined && typeof args.scales !== "boolean") {
      throw new TypeError("rematerializeAreaMark scales must be a boolean.");
    }
    const id = validateUserId(args.id, "Area mark id");
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeAreaMark",
      resetProperty: "length",
      resetValue: 0
    });
    if (highlighted !== undefined) return highlighted;
    const layer = findLayer(this, id);
    const dataset = findDataset(this, layer?.data);
    if (layer?.mark?.type !== "area" || this.graphicSpec.objects[id]?.type !== "path") {
      throw new Error(`Unknown area mark "${id}".`);
    }
    if (dataset === undefined) {
      throw new Error(`Area mark "${id}" requires an existing dataset.`);
    }
    const densityTransform = findUpstreamTransform(
      this,
      dataset,
      "density"
    );
    const xScaleId = layer.encoding?.x?.scale;
    const yScaleId = layer.encoding?.y?.scale;
    const verticalRange = layer.encoding?.y2?.scale === yScaleId;
    const horizontalRange = layer.encoding?.x2?.scale === xScaleId;
    const centered = densityTransform === undefined &&
      layer.encoding?.y?.stack === "center";
    if (
      xScaleId === undefined ||
      yScaleId === undefined ||
      (densityTransform === undefined && !centered && verticalRange === horizontalRange)
    ) {
      throw new Error(
        densityTransform === undefined
          ? `Area mark "${id}" requires exactly one shared x/x2 or y/y2 range.`
          : `Density area mark "${id}" requires x and y scales.`
      );
    }
    const colorEncoding = layer.encoding?.color;
    let resolved = args.scales === false
      ? this
      : this
          .rematerializeScale({ id: xScaleId })
          .rematerializeScale({ id: yScaleId });
    if (args.scales !== false && colorEncoding?.scale !== undefined) {
      resolved = resolved.rematerializeScale({ id: colorEncoding.scale });
    }
    const config = this.markConfigs[id];
    const { paths, fills } = resolveAreaMaterialization({
      rows: dataset.values,
      layer,
      densityTransform,
      resolvedScales: resolved.resolvedScales,
      config
    });
    const existingChildren = resolved.graphicSpec.objects[id].items ?? [];
    const hasOutline = config.stroke !== undefined || config.strokeFromFill === true;
    const removesOutline = !hasOutline && existingChildren.some(
      child => child.properties.stroke !== undefined
    );
    let next = removesOutline
      ? resolved
          .editGraphics({ target: id, property: "length", value: 0 })
          .editGraphics({ target: id, property: "length", value: paths.length })
      : resolved.editGraphics({ target: id, property: "length", value: paths.length });
    next = next
      .editGraphics({ target: id, property: "commands", value: paths })
      .editGraphics({ target: id, property: "fill", value: fills })
      .editGraphics({ target: id, property: "opacity", value: config.opacity });
    if (hasOutline) {
      next = next
        .editGraphics({
          target: id,
          property: "stroke",
          value: config.strokeFromFill === true ? fills : config.stroke
        })
        .editGraphics({
          target: id,
          property: "strokeWidth",
          value: config.strokeWidth
        });
    }
    return next;
  }
);

const editAreaMark = action(
  {
    op: "editAreaMark",
    description: "Edit area curve and constant appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editAreaMark");
    const changes = ["fill", "opacity", "stroke", "strokeWidth", "curve"];
    if (!changes.some(key => Object.hasOwn(args, key))) {
      throw new Error(
        "editAreaMark requires fill, opacity, stroke, strokeWidth, or curve."
      );
    }
    const target = Object.hasOwn(args, "target")
      ? validateUserId(args.target, "Area mark id")
      : undefined;
    const layer = resolveEligibleLayer(this, {
      target,
      predicate: candidate => candidate.mark?.type === "area",
      label: "area mark"
    });
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error(
        "editAreaMark fill cannot be combined with a color encoding."
      );
    }
    if (args.stroke === false && Object.hasOwn(args, "strokeWidth")) {
      throw new Error("editAreaMark cannot set strokeWidth while removing stroke.");
    }

    let config = { ...this.markConfigs[layer.id] };
    if (Object.hasOwn(args, "fill")) {
      config.fill = validateNonEmptyString(args.fill, "Area fill");
    }
    if (Object.hasOwn(args, "opacity")) {
      config.opacity = validateUnitInterval(args.opacity, "Area opacity");
    }
    if (Object.hasOwn(args, "curve")) {
      config.curve = validateCurveInterpolation(args.curve);
    }
    if (Object.hasOwn(args, "stroke")) {
      if (args.stroke === false) {
        const {
          stroke: removedStroke,
          strokeFromFill: removedStrokeFromFill,
          strokeWidth: removedWidth,
          ...rest
        } = config;
        void removedStroke;
        void removedStrokeFromFill;
        void removedWidth;
        config = rest;
      } else {
        const hadStroke = config.stroke !== undefined || config.strokeFromFill === true;
        const { strokeFromFill: _strokeFromFill, ...withoutFillStroke } = config;
        void _strokeFromFill;
        config = withoutFillStroke;
        config.stroke = validateNonEmptyString(args.stroke, "Area stroke");
        config.strokeWidth = Object.hasOwn(args, "strokeWidth")
          ? validateNonNegativeFinite(args.strokeWidth, "Area strokeWidth")
          : hadStroke ? config.strokeWidth : 1;
      }
    } else if (Object.hasOwn(args, "strokeWidth")) {
      if (config.stroke === undefined) {
        throw new Error("editAreaMark strokeWidth requires an active stroke.");
      }
      config.strokeWidth = validateNonNegativeFinite(
        args.strokeWidth,
        "Area strokeWidth"
      );
    }

    const next = this._withMarkConfig(layer.id, config);
    return canMaterializeArea(next, layer)
      ? next.rematerializeAreaMark({ id: layer.id })
      : next;
  }
);

export function registerAreaMarkActions(ProgramClass) {
  ProgramClass.prototype.createAreaMark = createAreaMark;
  ProgramClass.prototype.configureAreaStrokeFromFill =
    configureAreaStrokeFromFill;
  ProgramClass.prototype.editAreaMark = editAreaMark;
  ProgramClass.prototype.rematerializeAreaMark = rematerializeAreaMark;
}
