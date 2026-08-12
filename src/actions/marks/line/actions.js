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
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import { validateCurveInterpolation } from "../../../grammar/curveCommands.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { canMaterializeLine } from "../../../materialization/marks/index.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import { validateParallelRows } from "../../../grammar/parallelCoordinates.js";
import {
  resolveParallelLineMaterialization,
  resolvePositionedLineMaterialization
} from "./materialize.js";
import { resolveLineBins } from "../../../grammar/lineSeries.js";
import { requireSemanticScale } from "../../../selectors/scales.js";

const DEFAULT_LINE_STROKE = DEFAULT_COLORS.mark;
const DEFAULT_LINE_WIDTH = 2;
const CREATE_OPTIONS = Object.freeze([
  "id", "data", "stroke", "strokeWidth", "opacity", "curve", "closed"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "stroke", "strokeWidth", "opacity", "curve", "closed"
]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);

function validateClosed(value) {
  if (typeof value !== "boolean") {
    throw new TypeError("Line closed must be a boolean.");
  }
  return value;
}

function isPolarLine(layer) {
  return layer.encoding?.theta !== undefined ||
    layer.encoding?.radius !== undefined;
}

function isParallelLine(layer) {
  return layer.encoding?.parallel !== undefined;
}

function validatePolarLineConfig(layer, config) {
  if (isParallelLine(layer)) {
    if ((config.curve ?? "linear") !== "linear" || config.closed === true) {
      throw new Error("Parallel lines require curve \"linear\" and closed false.");
    }
    return;
  }
  if (!isPolarLine(layer)) return;
  if ((config.curve ?? "linear") !== "linear") {
    throw new Error("Polar line position currently requires curve \"linear\".");
  }
}

const createLineMark = action(
  {
    op: "createLineMark",
    description: "Create a semantic line mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createLineMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "line",
      label: "Line mark id",
      markType: "line",
      operation: "createLineMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "line");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });
    const strokeWidth = validateNonNegativeFinite(
      args.strokeWidth ?? DEFAULT_LINE_WIDTH,
      "Line strokeWidth"
    );
    const curve = validateCurveInterpolation(args.curve ?? "linear");
    const closed = Object.hasOwn(args, "closed")
      ? validateClosed(args.closed)
      : false;
    const stroke = Object.hasOwn(args, "stroke")
      ? validateNonEmptyString(args.stroke, "Line stroke")
      : undefined;
    const opacity = Object.hasOwn(args, "opacity")
      ? validateUnitInterval(args.opacity, "Line opacity")
      : undefined;
    assertMarkAvailable(this, id);

    let created = this
      .editSemantic({
        property: `layer[${id}].mark.type`,
        value: "line"
      })
      .editSemantic({
        property: `layer[${id}].data`,
        value: data
      });
    created = applyLayeredMarkInheritance(created, id, inherited);
    created = created
      .createGraphics({
        id,
        type: "path",
        length: 0,
        ...resolveMarkGraphicPlacement(created, { data, markType: "line" })
      })
      ._withMarkConfig(
        id,
        {
          ...(Object.hasOwn(args, "strokeWidth") ? { strokeWidth } : {}),
          ...(Object.hasOwn(args, "curve") ? { curve } : {}),
          ...(Object.hasOwn(args, "closed") ? { closed } : {})
        }
      );
    created = materializeInheritedMark(created, id);
    const appearance = {
      ...(stroke === undefined ? {} : { stroke }),
      ...(opacity === undefined ? {} : { opacity })
    };
    return Object.keys(appearance).length === 0
      ? created
      : created.editLineMark({ target: id, ...appearance });
  }
);

function requireLine(program, id) {
  const layer = findLayer(program, id);

  if (layer?.mark?.type !== "line") {
    throw new Error(`Unknown line mark "${id}".`);
  }

  const dataset = findDataset(program, layer.data);

  if (dataset === undefined) {
    throw new Error(`Line mark "${id}" requires an existing dataset.`);
  }

  if (program.graphicSpec.objects[id]?.type !== "path") {
    throw new Error(`Line mark "${id}" requires path graphics.`);
  }

  return { dataset, layer };
}

const rematerializeLineMark = action(
  {
    op: "rematerializeLineMark",
    description: "Recompute aggregate series and concrete line paths."
  },
  function (args = {}) {
    validateMarkOptions(
      args,
      REMATERIALIZE_OPTIONS,
      "rematerializeLineMark"
    );
    const id = validateUserId(args.id, "Line mark id");
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeLineMark",
      resetProperty: "length",
      resetValue: 0
    });
    if (highlighted !== undefined) return highlighted;
    const { dataset, layer } = requireLine(this, id);
    const existingChildren = this.graphicSpec.objects[id].items;
    const parallel = layer.encoding?.parallel;
    const xScaleId = layer.encoding?.x?.scale;
    const yScaleId = layer.encoding?.y?.scale;
    const thetaScaleId = layer.encoding?.theta?.scale;
    const radiusScaleId = layer.encoding?.radius?.scale;
    const polar = isPolarLine(layer);
    const config = this.markConfigs[id] ?? {};
    validatePolarLineConfig(layer, config);

    if (parallel !== undefined) {
      validateParallelRows(dataset.values, parallel.dimensions, parallel);
      let resolved = this;
      if (args.scales !== false) {
        for (const dimension of parallel.dimensions) {
          resolved = resolved.rematerializeScale({ id: dimension.scale });
        }
      }
      for (const channel of args.scales === false
        ? []
        : ["color", "strokeDash", "strokeWidth"]) {
        const scaleId = layer.encoding?.[channel]?.scale;
        if (scaleId !== undefined) {
          resolved = resolved.rematerializeScale({ id: scaleId });
        }
      }
      const materialization = resolveParallelLineMaterialization({
        rows: dataset.values,
        parallel,
        layer,
        resolvedScales: resolved.resolvedScales,
        bounds: resolveGraphicBounds(resolved),
        config,
        existingChildren,
        defaults: { stroke: DEFAULT_LINE_STROKE, strokeWidth: DEFAULT_LINE_WIDTH }
      });
      let next = resolved
        .editGraphics({
          target: id,
          property: "length",
          value: materialization.commands.length
        })
        .editGraphics({
          target: id,
          property: "commands",
          value: materialization.commands
        })
        .editGraphics({ target: id, property: "stroke", value: materialization.strokes })
        .editGraphics({
          target: id,
          property: "strokeWidth",
          value: materialization.strokeWidths
        })
        .editGraphics({
          target: id,
          property: "strokeDash",
          value: materialization.strokeDashes
        });
      if (config.opacity !== undefined) {
        next = next.editGraphics({
          target: id,
          property: "opacity",
          value: config.opacity
        });
      }
      return next;
    }

    if (
      polar
        ? thetaScaleId === undefined || radiusScaleId === undefined
        : xScaleId === undefined || yScaleId === undefined
    ) {
      throw new Error(
        polar
          ? `Line mark "${id}" requires theta and radius scales.`
          : `Line mark "${id}" requires x and y scales.`
      );
    }

    let resolved = args.scales === false
      ? this
      : polar
        ? this
            .rematerializeScale({ id: thetaScaleId })
            .rematerializeScale({ id: radiusScaleId })
        : this
            .rematerializeScale({ id: xScaleId })
            .rematerializeScale({ id: yScaleId });

    for (const channel of args.scales === false ? [] : ["color", "strokeDash", "strokeWidth"]) {
      const scaleId = layer.encoding?.[channel]?.scale;
      if (scaleId !== undefined) {
        resolved = resolved.rematerializeScale({ id: scaleId });
      }
    }

    const materialization = resolvePositionedLineMaterialization({
      rows: dataset.values,
      layer,
      resolvedScales: resolved.resolvedScales,
      xBinBoundaries: layer.encoding?.x?.bin === undefined
        ? undefined
        : resolveLineBins(
            dataset.values,
            layer,
            requireSemanticScale(resolved, xScaleId)
          ).boundaries,
      bounds: resolveGraphicBounds(resolved),
      config,
      existingChildren,
      polar,
      defaults: { stroke: DEFAULT_LINE_STROKE, strokeWidth: DEFAULT_LINE_WIDTH }
    });

    let next = resolved
      .editGraphics({
        target: id,
        property: "length",
        value: materialization.commands.length
      })
      .editGraphics({ target: id, property: "commands", value: materialization.commands })
      .editGraphics({ target: id, property: "stroke", value: materialization.strokes })
      .editGraphics({ target: id, property: "strokeWidth", value: materialization.strokeWidths })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: materialization.strokeDashes
      });
    if (config.opacity !== undefined) {
      next = next.editGraphics({
        target: id,
        property: "opacity",
        value: config.opacity
      });
    }
    return next;
  }
);

const editLineMark = action(
  {
    op: "editLineMark",
    description: "Edit line-mark curve and stroke width."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editLineMark");
    if (
      !Object.hasOwn(args, "stroke") &&
      !Object.hasOwn(args, "strokeWidth") &&
      !Object.hasOwn(args, "opacity") &&
      !Object.hasOwn(args, "curve") &&
      !Object.hasOwn(args, "closed")
    ) {
      throw new Error(
        "editLineMark requires stroke, strokeWidth, opacity, curve, or closed."
      );
    }
    const target = Object.hasOwn(args, "target")
      ? validateUserId(args.target, "Line mark id")
      : undefined;
    const layer = resolveEligibleLayer(this, {
      target,
      predicate: candidate => candidate.mark?.type === "line",
      label: "line mark"
    });
    if (Object.hasOwn(args, "stroke") && layer.encoding?.color !== undefined) {
      throw new Error(
        "editLineMark stroke cannot be combined with a color encoding."
      );
    }
    if (Object.hasOwn(args, "closed") && args.closed === true &&
        (layer.encoding?.x !== undefined || isParallelLine(layer))) {
      throw new Error("Line closed requires theta/radius Polar position encodings.");
    }
    if (Object.hasOwn(args, "curve") && isPolarLine(layer) &&
        args.curve !== "linear") {
      throw new Error("Polar line position currently requires curve \"linear\".");
    }
    if (Object.hasOwn(args, "curve") && isParallelLine(layer) &&
        args.curve !== "linear") {
      throw new Error("Parallel lines require curve \"linear\".");
    }
    const config = {
      ...this.markConfigs[layer.id],
      ...(Object.hasOwn(args, "stroke")
        ? { stroke: validateNonEmptyString(args.stroke, "Line stroke") }
        : {}),
      ...(Object.hasOwn(args, "strokeWidth")
        ? {
            strokeWidth: validateNonNegativeFinite(
              args.strokeWidth,
              "Line strokeWidth"
            )
          }
        : {}),
      ...(Object.hasOwn(args, "opacity")
        ? { opacity: validateUnitInterval(args.opacity, "Line opacity") }
        : {}),
      ...(Object.hasOwn(args, "curve")
        ? { curve: validateCurveInterpolation(args.curve) }
        : {}),
      ...(Object.hasOwn(args, "closed")
        ? { closed: validateClosed(args.closed) }
        : {})
    };
    const next = this._withMarkConfig(layer.id, config);
    return canMaterializeLine(next, layer)
      ? next.rematerializeLineMark({ id: layer.id })
      : next;
  }
);

export function registerLineMarkActions(ProgramClass) {
  ProgramClass.prototype.editLineMark = editLineMark;
  registerBasicLineMarkActions(ProgramClass);
}

export function registerBasicLineMarkActions(ProgramClass) {
  ProgramClass.prototype.createLineMark = createLineMark;
  ProgramClass.prototype.rematerializeLineMark = rematerializeLineMark;
}
