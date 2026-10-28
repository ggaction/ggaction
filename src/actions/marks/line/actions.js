import { conditionalPositionTemplate } from "../../../core/encodingBindings.js";
import { conditionalLinePositions } from "../../../materialization/conditionalLineValues.js";
import { hasConditionalLinePosition, LINE_POSITION_CHANNELS } from "../../../materialization/conditionalLineStructure.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../../../materialization/selection/policies/index.js";
import { getLayerScaleIds } from "../../../materialization/marks/index.js";
import { assertIndependentOverlayGeometry } from "../../../grammar/overlay.js";
import { requestedMarkClip, validateMarkClipCoordinate } from "../../../selectors/markClip.js";
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
  editMarkGraphic,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkId,
  resolveMarkData,
  validateMarkOptions
} from "../shared.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import { validateCurveInterpolation, validateCardinalTension } from "../../../grammar/curveCommands.js";
import {
  resolveCoordinateBounds,
  resolveCoordinatePolarFrame
} from "../../../materialization/coordinateBounds.js";
import { rematerializeExistingLegend } from "../../encodings/shared.js";
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
import { validateLineMissing, validateLineMissingScope } from "../../../grammar/lineMissing.js";
import { requireSemanticScale } from "../../../selectors/scales.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../../grammar/strokeStyle.js";

const DEFAULT_LINE_STROKE = DEFAULT_COLORS.mark;
const DEFAULT_LINE_WIDTH = 2;
const CREATE_OPTIONS = Object.freeze([
  "clip", "missing", "id", "data", "stroke", "strokeWidth", "opacity", "curve", "tension", "closed",
  ...STROKE_STYLE_PROPERTIES
]);
const EDIT_OPTIONS = Object.freeze([
  "clip", "missing", "target", "stroke", "strokeWidth", "opacity", "curve", "tension", "closed",
  ...STROKE_STYLE_PROPERTIES
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

function applyLineMaterialization(program, id, materialization, config) {
  return editMarkGraphic(program, id, {
    length: materialization.commands.length,
    commands: materialization.commands,
    stroke: materialization.strokes,
    strokeWidth: materialization.strokeWidths,
    strokeDash: materialization.strokeDashes,
    ...(materialization.opacities === undefined ? {} : { opacity: materialization.opacities }),
    ...requestedStrokeDetails(config, "Line mark")
  });
}

const createLineMark = /* @__PURE__ */ action(
  {
    op: "createLineMark",
    description: "Create a semantic line mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createLineMark");
    requestedMarkClip(args);
    const strokeDetails = requestedStrokeDetails(args, "createLineMark");
    const missing = validateLineMissing(args.missing);
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
    validateCardinalTension(args.tension, curve);
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
    if (Object.hasOwn(args, "missing")) {
      created = created.editSemantic({ property: `layer[${id}].mark.missing`, value: missing });
    }
    validateLineMissingScope(findLayer(created, id));
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
          ...(args.tension === undefined ? {} : { tension: args.tension }),
          ...(Object.hasOwn(args, "closed") ? { closed } : {}),
          ...strokeDetails
        }
      );
    created = materializeInheritedMark(created, id);
    const appearance = {
      ...requestedMarkClip(args),
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

const rematerializeLineMark = /* @__PURE__ */ action(
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
    if (findLayer(this, id)?.derivedBindings?.overlay) return this.rematerializeOverlay({ id });
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeLineMark",
      scales: args.scales,
      resetProperty: "length",
      resetValue: 0
    });
    if (highlighted !== undefined) return highlighted;
    const { dataset, layer: storedLayer } = requireLine(this, id);
    const conditional = hasConditionalLinePosition(storedLayer);
    const layer = conditional ? conditionalPositionTemplate(storedLayer, LINE_POSITION_CHANNELS) : storedLayer;
    validateLineMissingScope(layer);
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
    }
    const positions = parallel !== undefined
      ? parallel.dimensions.map(dimension => dimension.scale)
      : polar ? [thetaScaleId, radiusScaleId] : [xScaleId, yScaleId];
    if (positions.some(scale => scale === undefined)) {
      throw new Error(`Line mark "${id}" requires ${polar ? "theta and radius" : "x and y"} scales.`);
    }
    let resolved = this;
    if (args.scales !== false) {
      const appearance = ["color", "stroke", "strokeDash", "strokeWidth", "opacity"]
        .map(channel => layer.encoding?.[channel]?.scale).filter(scale => scale !== undefined);
      for (const scale of (conditional ? [...new Set(getLayerScaleIds(storedLayer))] : [...positions, ...appearance])) {
        resolved = resolved.rematerializeScale({ id: scale });
      }
    }
    const shared = {
      rows: dataset.values, layer, config, existingChildren,
      resolvedScales: resolved.resolvedScales,
      bounds: resolveCoordinateBounds(resolved, layer.coordinate),
      defaults: { stroke: DEFAULT_LINE_STROKE, strokeWidth: DEFAULT_LINE_WIDTH }
    };
    if (parallel !== undefined) {
      return applyLineMaterialization(resolved, id,
        resolveParallelLineMaterialization({ ...shared, parallel }), config);
    }

    const materialization = resolvePositionedLineMaterialization({
      ...shared,
      ...(conditional ? { conditional: conditionalLinePositions(resolved, storedLayer, dataset, { resolveMarkItems, resolveMarkSourceItems }) } : {}),
      xBinBoundaries: layer.encoding?.x?.bin === undefined
        ? undefined
        : resolveLineBins(
            dataset.values,
            layer,
            requireSemanticScale(resolved, xScaleId)
          ).boundaries,
      polar,
      ...(polar
        ? { polarFrame: resolveCoordinatePolarFrame(resolved, layer.coordinate) }
        : {})
    });

    return applyLineMaterialization(
      resolved,
      id,
      materialization,
      config
    );
  }
);

const editLineMark = /* @__PURE__ */ action(
  {
    op: "editLineMark",
    description: "Edit line-mark curve and stroke width."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editLineMark");
    requestedMarkClip(args);
    const strokeDetails = requestedStrokeDetails(args, "editLineMark");
    if (!EDIT_OPTIONS.filter(key => key !== "target").some(key => Object.hasOwn(args, key))) {
      throw new Error("editLineMark requires stroke, strokeWidth, opacity, curve, tension, closed, or missing.");
    }
    const target = Object.hasOwn(args, "target")
      ? validateUserId(args.target, "Line mark id")
      : undefined;
    const layer = resolveEligibleLayer(this, {
      target,
      predicate: candidate => candidate.mark?.type === "line",
      label: "line mark"
    });
    if (Object.hasOwn(args, "missing")) assertIndependentOverlayGeometry(layer, "editLineMark missing");
    if (Object.hasOwn(args, "stroke") && (
      layer.encoding?.color !== undefined ||
      layer.encoding?.stroke !== undefined
    )) {
      throw new Error(
        "editLineMark stroke cannot be combined with a color encoding or a stroke encoding; use encodeStroke with value to replace it."
      );
    }
    for (const channel of ["strokeWidth", "opacity"]) {
      if (Object.hasOwn(args, channel) && layer.encoding?.[channel]?.field !== undefined) {
        throw new Error(`editLineMark ${channel} conflicts with a field encoding; use its encoder with value to replace it.`);
      }
    }
    if (Object.hasOwn(args, "closed") && args.closed === true &&
        (layer.encoding?.x !== undefined || isParallelLine(layer))) {
      throw new Error("Line closed requires theta/radius Polar position encodings.");
    }
    validateMarkClipCoordinate(this, layer, args.clip ?? this.markConfigs[layer.id]?.clip);
    const config = { ...this.markConfigs[layer.id], ...requestedMarkClip(args) };
    Object.assign(config, strokeDetails);
    for (const [key, validate] of Object.entries({
      stroke: validateNonEmptyString,
      strokeWidth: validateNonNegativeFinite,
      opacity: validateUnitInterval,
      curve: validateCurveInterpolation,
      closed: validateClosed
    })) {
      if (Object.hasOwn(args, key)) config[key] = validate(args[key], `Line ${key}`);
    }
    if (args.curve !== undefined && args.curve !== "cardinal" && args.tension === undefined) {
      delete config.tension;
    }
    if (Object.hasOwn(args, "tension")) config.tension = args.tension;
    validateCardinalTension(config.tension, config.curve ?? "linear");
    validatePolarLineConfig(layer, config);
    let next = this._withMarkConfig(layer.id, config);
    if (Object.hasOwn(args, "missing")) {
      const missing = validateLineMissing(args.missing);
      validateLineMissingScope({ ...layer, mark: { ...layer.mark, missing } });
      next = next.editSemantic({ property: `layer[${layer.id}].mark.missing`, value: missing });
    }
    const materialized = canMaterializeLine(next, layer)
      ? next.rematerializeLineMark({ id: layer.id })
      : next;
    return rematerializeExistingLegend(materialized);
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
