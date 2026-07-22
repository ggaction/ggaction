import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import { deriveArcSectors } from "../../../grammar/arcs.js";
import { buildAnnularSectorCommands } from "../../../grammar/polarPaths.js";
import { resolvePolarFrame } from "../../../grammar/polar.js";
import { mapOrdinalValues } from "../../../grammar/scales/index.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import { canMaterializeArc } from "../../../materialization/marks/index.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";

const CREATE_OPTIONS = Object.freeze([
  "id", "data", "innerRadius", "padAngle", "fill", "opacity", "stroke",
  "strokeWidth"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "innerRadius", "padAngle", "fill", "opacity", "stroke",
  "strokeWidth"
]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id"]);

function validateInnerRadius(value) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError(
      "Arc innerRadius must be from 0 (inclusive) to 1 (exclusive)."
    );
  }
  return value;
}

function normalizeConfig(args, previous = {}, { allowStrokeRemoval = false } = {}) {
  let config = {
    ...previous,
    ...(Object.hasOwn(args, "innerRadius")
      ? { innerRadius: validateInnerRadius(args.innerRadius) }
      : {}),
    ...(Object.hasOwn(args, "padAngle")
      ? { padAngle: validateNonNegativeFinite(args.padAngle, "Arc padAngle") }
      : {}),
    ...(Object.hasOwn(args, "fill")
      ? { fill: validateNonEmptyString(args.fill, "Arc fill") }
      : {}),
    ...(Object.hasOwn(args, "opacity")
      ? { opacity: validateUnitInterval(args.opacity, "Arc opacity") }
      : {}),
    ...(Object.hasOwn(args, "stroke") && args.stroke !== false
      ? { stroke: validateNonEmptyString(args.stroke, "Arc stroke") }
      : {})
  };
  if (args.stroke === false) {
    if (!allowStrokeRemoval) {
      throw new TypeError("Arc stroke must be a non-empty string.");
    }
    config.stroke = false;
    delete config.strokeWidth;
  } else if (Object.hasOwn(args, "stroke")) {
    if (previous.stroke === false && !Object.hasOwn(args, "strokeWidth")) {
      config.strokeWidth = 1;
    }
  }
  if (Object.hasOwn(args, "strokeWidth")) {
    config.strokeWidth = validateNonNegativeFinite(
      args.strokeWidth,
      "Arc strokeWidth"
    );
  }
  return config;
}

const createArcMark = action(
  {
    op: "createArcMark",
    description: "Create a semantic arc mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createArcMark");
    const id = resolveMarkId(this, args.id, {
      defaultId: "arc",
      label: "Arc mark id",
      markType: "arc",
      operation: "createArcMark"
    });
    const inherited = resolveLayeredMarkInheritance(this, args, "arc");
    const { data } = resolveMarkData(this, {
      ...args,
      ...(args.data === undefined && this.context.currentData === undefined &&
        inherited?.data !== undefined ? { data: inherited.data } : {})
    });
    assertMarkAvailable(this, id);
    const config = normalizeConfig(args, {
      innerRadius: 0,
      padAngle: 0,
      opacity: 1,
      stroke: "#ffffff",
      strokeWidth: 1
    });
    let created = this
      .editSemantic({ property: `layer[${id}].mark.type`, value: "arc" })
      .editSemantic({ property: `layer[${id}].data`, value: data });
    created = applyLayeredMarkInheritance(created, id, inherited);
    created = created
      .createGraphics({
        id,
        type: "path",
        length: 0,
        ...resolveMarkGraphicPlacement(created, { data, markType: "arc" })
      })
      ._withMarkConfig(id, config);
    return materializeInheritedMark(created, id);
  }
);

function requireArc(program, id) {
  const layer = findLayer(program, id);
  const dataset = findDataset(program, layer?.data);
  if (layer?.mark?.type !== "arc" || program.graphicSpec.objects[id]?.type !== "path") {
    throw new Error(`Unknown arc mark "${id}".`);
  }
  if (dataset === undefined) {
    throw new Error(`Arc mark "${id}" requires an existing dataset.`);
  }
  return { layer, dataset };
}

const rematerializeArcMark = action(
  {
    op: "rematerializeArcMark",
    description: "Recompute concrete annular-sector paths."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeArcMark");
    const id = validateUserId(args.id, "Arc mark id");
    const highlighted = rematerializeHighlightBaseline(this, {
      target: id,
      operation: "rematerializeArcMark",
      resetProperty: "length",
      resetValue: 0
    });
    if (highlighted !== undefined) return highlighted;
    const { layer, dataset } = requireArc(this, id);
    if (!canMaterializeArc(this, layer)) {
      throw new Error(`Arc mark "${id}" does not have a complete encoding.`);
    }
    const thetaScaleId = layer.encoding.theta.scale;
    const radiusScaleId = layer.encoding?.radius?.scale;
    const colorScaleId = layer.encoding?.color?.scale;
    let resolved = this.rematerializeScale({ id: thetaScaleId });
    if (radiusScaleId !== undefined) {
      resolved = resolved.rematerializeScale({ id: radiusScaleId });
    }
    if (colorScaleId !== undefined) {
      resolved = resolved.rematerializeScale({ id: colorScaleId });
    }
    const config = resolved.markConfigs[id] ?? {};
    const derived = deriveArcSectors(dataset.values, layer, {
      thetaScale: resolved.resolvedScales[thetaScaleId],
      ...(radiusScaleId === undefined
        ? {}
        : { radiusScale: resolved.resolvedScales[radiusScaleId] }),
      frame: resolvePolarFrame(resolveGraphicBounds(resolved)),
      innerRadiusRatio: config.innerRadius ?? 0
    });
    const frame = resolvePolarFrame(resolveGraphicBounds(resolved));
    const commands = derived.sectors.map(sector => buildAnnularSectorCommands({
      frame,
      startTheta: sector.startTheta,
      endTheta: sector.endTheta,
      innerRadius: sector.innerRadius,
      outerRadius: sector.outerRadius,
      padAngle: config.padAngle ?? 0
    }));
    const fills = colorScaleId === undefined
      ? commands.map(() => config.fill ?? DEFAULT_COLORS.mark)
      : mapOrdinalValues(
          derived.sectors.map(sector => sector.color),
          resolved.resolvedScales[colorScaleId].domain,
          resolved.resolvedScales[colorScaleId].range
        );
    return resolved
      .editGraphics({ target: id, property: "length", value: commands.length })
      .editGraphics({ target: id, property: "commands", value: commands })
      .editGraphics({ target: id, property: "fill", value: fills })
      .editGraphics({ target: id, property: "opacity", value: config.opacity ?? 1 })
      .editGraphics({
        target: id,
        property: "stroke",
        value: config.stroke === false ? "transparent" : config.stroke ?? "#ffffff"
      })
      .editGraphics({
        target: id,
        property: "strokeWidth",
        value: config.stroke === false ? 0 : config.strokeWidth ?? 1
      })
      .editGraphics({
        target: id,
        property: "strokeDash",
        value: commands.map(() => [])
      });
  }
);

const editArcMark = action(
  {
    op: "editArcMark",
    description: "Edit arc geometry and appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editArcMark");
    if (Object.keys(args).every(key => key === "target")) {
      throw new Error(
        "editArcMark requires innerRadius, padAngle, fill, opacity, stroke, or strokeWidth."
      );
    }
    const target = Object.hasOwn(args, "target")
      ? validateUserId(args.target, "Arc mark id")
      : undefined;
    const layer = resolveEligibleLayer(this, {
      target,
      predicate: candidate => candidate.mark?.type === "arc",
      label: "arc mark"
    });
    if (Object.hasOwn(args, "fill") && layer.encoding?.color !== undefined) {
      throw new Error("editArcMark fill cannot be combined with a color encoding.");
    }
    if (args.stroke === false && Object.hasOwn(args, "strokeWidth")) {
      throw new Error(
        "editArcMark cannot set strokeWidth while removing stroke."
      );
    }
    if (
      Object.hasOwn(args, "strokeWidth") &&
      !Object.hasOwn(args, "stroke") &&
      this.markConfigs[layer.id]?.stroke === false
    ) {
      throw new Error("editArcMark strokeWidth requires an active stroke.");
    }
    const next = this._withMarkConfig(
      layer.id,
      normalizeConfig(args, this.markConfigs[layer.id], {
        allowStrokeRemoval: true
      })
    );
    return canMaterializeArc(next, layer)
      ? next.rematerializeArcMark({ id: layer.id })
      : next;
  }
);

export function registerArcMarkActions(ProgramClass) {
  ProgramClass.prototype.createArcMark = createArcMark;
  ProgramClass.prototype.editArcMark = editArcMark;
  ProgramClass.prototype.rematerializeArcMark = rematerializeArcMark;
}
