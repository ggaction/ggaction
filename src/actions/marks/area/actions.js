import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import {
  deriveAreaSeries,
  deriveDensityAreaSeries,
  layoutDensityAreaSeries
} from "../../../grammar/areaSeries.js";
import { mapContinuousScaleValues, mapOrdinalValues } from "../../../grammar/scales/index.js";
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
import {
  buildAreaCurvePathCommands,
  validateCurveInterpolation
} from "../../../grammar/curveCommands.js";
import { buildLinearPathCommands } from "../../../grammar/pathCommands.js";
import { resolveEligibleLayer } from "../../../selectors/layers.js";
import { canMaterializeArea } from "../../../materialization/marks.js";
import { findUpstreamTransform } from "../../../materialization/dataProvenance.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";

const CREATE_OPTIONS = Object.freeze([
  "id", "data", "fill", "opacity", "stroke", "strokeWidth", "curve"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "fill", "opacity", "stroke", "strokeWidth", "curve"
]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);

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
    if (
      xScaleId === undefined ||
      yScaleId === undefined ||
      (densityTransform === undefined && verticalRange === horizontalRange)
    ) {
      throw new Error(
        densityTransform === undefined
          ? `Area mark "${id}" requires exactly one shared x/x2 or y/y2 range.`
          : `Density area mark "${id}" requires x and y scales.`
      );
    }
    const rawDerived = densityTransform === undefined
      ? deriveAreaSeries(dataset.values, layer)
      : deriveDensityAreaSeries(dataset.values, layer, densityTransform);
    const colorEncoding = layer.encoding?.color;
    const layout = colorEncoding?.layout ?? "overlay";
    const derived = densityTransform === undefined
      ? rawDerived
      : layoutDensityAreaSeries(rawDerived, layout);
    let resolved = args.scales === false
      ? this
      : this
          .rematerializeScale({ id: xScaleId })
          .rematerializeScale({ id: yScaleId });
    if (args.scales !== false && colorEncoding?.scale !== undefined) {
      resolved = resolved.rematerializeScale({ id: colorEncoding.scale });
    }
    const xScale = resolved.resolvedScales[xScaleId];
    const yScale = resolved.resolvedScales[yScaleId];
    const densityScale = densityTransform === undefined
      ? undefined
      : derived.mode === "y-density" ? yScale : xScale;
    if (
      densityScale !== undefined &&
      (densityScale.domain[0] > 0 || densityScale.domain[1] < 0)
    ) {
      throw new Error(`Density area mark "${id}" requires a scale domain containing zero.`);
    }
    const paths = derived.series.map(series => {
      const curve = this.markConfigs[id]?.curve ?? "linear";
      if (densityTransform === undefined && derived.orientation === "horizontal") {
        const y = mapContinuousScaleValues(
          series.values.map(value => value.y),
          yScale
        );
        const lower = mapContinuousScaleValues(
          series.values.map(value => value.x),
          xScale
        );
        const upper = mapContinuousScaleValues(
          series.values.map(value => value.x2),
          xScale
        );
        return buildAreaCurvePathCommands(
          y.map((value, index) => ({ x: lower[index], y: value })),
          y.map((value, index) => ({ x: upper[index], y: value })),
          curve,
          { independentAxis: "y" }
        );
      }
      if (densityTransform !== undefined && derived.mode === "x-density") {
        const y = mapContinuousScaleValues(
          series.values.map(value => value.y),
          yScale
        );
        const upper = mapContinuousScaleValues(
          series.values.map(value => value.x),
          xScale
        );
        const baseline = mapContinuousScaleValues(
          [0],
          densityScale
        )[0];
        if (curve === "linear") {
          return buildLinearPathCommands([
            { x: baseline, y: y[0] },
            ...y.map((value, index) => ({ x: upper[index], y: value })),
            { x: baseline, y: y.at(-1) }
          ], { close: true });
        }
        return buildAreaCurvePathCommands(
          y.map(value => ({ x: baseline, y: value })),
          y.map((value, index) => ({ x: upper[index], y: value })),
          curve,
          { independentAxis: "y" }
        );
      }
      const x = mapContinuousScaleValues(
        series.values.map(value => value.x),
        xScale
      );
      const lowerValues = densityTransform === undefined
        ? series.values.map(value => value.y)
        : derived.mode === "y-density"
          ? series.values.map(value => value.lower)
          : series.values.map(value => value.y);
      const lower = mapContinuousScaleValues(
        lowerValues,
        yScale
      );
      const upperValues = densityTransform === undefined
        ? series.values.map(value => value.y2)
        : series.values.map(value => value.upper);
      const upper = mapContinuousScaleValues(
        upperValues,
        yScale
      );
      if (densityTransform !== undefined && layout === "overlay") {
        const baseline = mapContinuousScaleValues(
          [0],
          yScale
        )[0];
        if (curve === "linear") {
          return buildLinearPathCommands([
            { x: x[0], y: baseline },
            ...x.map((value, index) => ({ x: value, y: upper[index] })),
            { x: x.at(-1), y: baseline }
          ], { close: true });
        }
        return buildAreaCurvePathCommands(
          x.map(value => ({ x: value, y: baseline })),
          x.map((value, index) => ({ x: value, y: upper[index] })),
          curve
        );
      }
      return buildAreaCurvePathCommands(
        x.map((value, index) => ({ x: value, y: lower[index] })),
        x.map((value, index) => ({ x: value, y: upper[index] })),
        curve
      );
    });
    const config = this.markConfigs[id];
    const fills = config.errorBand?.fill !== undefined
      ? paths.map(() => config.errorBand.fill)
      : colorEncoding?.scale === undefined
      ? paths.map(() => config.fill)
      : mapOrdinalValues(
          derived.series.map(series => series.key[colorEncoding.field]),
          resolved.resolvedScales[colorEncoding.scale].domain,
          resolved.resolvedScales[colorEncoding.scale].range
        );
    const existingChildren = resolved.graphicSpec.objects[id].items ?? [];
    const removesOutline = config.stroke === undefined && existingChildren.some(
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
    if (config.stroke !== undefined) {
      next = next
        .editGraphics({ target: id, property: "stroke", value: config.stroke })
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
        const { stroke: removedStroke, strokeWidth: removedWidth, ...rest } = config;
        void removedStroke;
        void removedWidth;
        config = rest;
      } else {
        const hadStroke = config.stroke !== undefined;
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
  ProgramClass.prototype.editAreaMark = editAreaMark;
  ProgramClass.prototype.rematerializeAreaMark = rematerializeAreaMark;
}
