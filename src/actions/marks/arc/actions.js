import { normalizeArcInnerRadius } from "../../../grammar/arcs.js";
import { action } from "../../../core/action.js";
import { validateUserId } from "../../../core/identifiers.js";
import {
  validateNonEmptyString,
  validateNonNegativeFinite,
  validateUnitInterval
} from "../../../core/validation.js";
import { deriveArcSectors } from "../../../grammar/arcs.js";
import { buildAnnularSectorCommands } from "../../../grammar/polarPaths.js";
import {
  mapOrdinalValues,
  readScaleField
} from "../../../grammar/scales/index.js";
import { resolveCoordinatePolarFrame } from
  "../../../materialization/coordinateBounds.js";
import {
  canMaterializeArc,
  getSourceDependentMarkSteps
} from "../../../materialization/marks/index.js";
import { findDataset } from "../../../selectors/datasets.js";
import { findLayer, resolveEligibleLayer } from "../../../selectors/layers.js";
import { DEFAULT_COLORS } from "../../../theme/defaults.js";
import { resolveMarkGraphicPlacement } from
  "../../../materialization/graphicHierarchy.js";
import { rematerializeExistingLegend } from "../../encodings/shared.js";
import { rematerializeHighlightBaseline } from "../lifecycle.js";
import { mapScaleConsumerValues } from
  "../../../materialization/scales/map.js";
import {
  assertMarkAvailable,
  applyLayeredMarkInheritance,
  editMarkGraphic,
  materializeInheritedMark,
  resolveLayeredMarkInheritance,
  resolveMarkData,
  resolveMarkId,
  validateMarkOptions
} from "../shared.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../../grammar/strokeStyle.js";

const ARC_OPTIONS = Object.freeze([
  "innerRadius", "padAngle", "fill", "opacity", "stroke", "strokeWidth",
  ...STROKE_STYLE_PROPERTIES
]);
const CREATE_OPTIONS = Object.freeze(["id", "data", ...ARC_OPTIONS]);
const EDIT_OPTIONS = Object.freeze(["target", ...ARC_OPTIONS]);
const REMATERIALIZE_OPTIONS = Object.freeze(["id", "scales"]);


function normalizeConfig(
  args,
  previous = {},
  { allowStrokeRemoval = false, strokeDetails = {} } = {}
) {
  let config = {
    ...previous,
    ...strokeDetails,
    ...(Object.hasOwn(args, "innerRadius")
      ? { innerRadius: normalizeArcInnerRadius(args.innerRadius), innerRadiusExplicit: true }
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

const createArcMark = /* @__PURE__ */ action(
  {
    op: "createArcMark",
    description: "Create a semantic arc mark and empty path collection."
  },
  function (args = {}) {
    validateMarkOptions(args, CREATE_OPTIONS, "createArcMark");
    const strokeDetails = requestedStrokeDetails(args, "createArcMark");
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
    }, { strokeDetails });
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

const rematerializeArcMark = /* @__PURE__ */ action(
  {
    op: "rematerializeArcMark",
    description: "Recompute concrete annular-sector paths."
  },
  function (args = {}) {
    validateMarkOptions(args, REMATERIALIZE_OPTIONS, "rematerializeArcMark");
    if (args.scales !== undefined && typeof args.scales !== "boolean") {
      throw new TypeError("rematerializeArcMark scales must be a boolean.");
    }
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
    const strokeScaleId = layer.encoding?.stroke?.scale;
    let resolved = args.scales === false
      ? this
      : this.rematerializeScale({ id: thetaScaleId });
    if (radiusScaleId !== undefined && args.scales !== false) {
      resolved = resolved.rematerializeScale({ id: radiusScaleId });
    }
    if (colorScaleId !== undefined && args.scales !== false) {
      resolved = resolved.rematerializeScale({ id: colorScaleId });
    }
    if (strokeScaleId !== undefined && args.scales !== false) {
      resolved = resolved.rematerializeScale({ id: strokeScaleId });
    }
    const config = resolved.markConfigs[id] ?? {};
    const frame = resolveCoordinatePolarFrame(resolved, layer.coordinate);
    const derived = deriveArcSectors(dataset.values, layer, {
      thetaScale: resolved.resolvedScales[thetaScaleId],
      ...(radiusScaleId === undefined
        ? {}
        : { radiusScale: resolved.resolvedScales[radiusScaleId] }),
      frame,
      innerRadius: config.innerRadius ?? 0
    });
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
    const strokeEncoding = layer.encoding?.stroke;
    const strokeValues = strokeEncoding === undefined ? undefined : derived.sectors.map(
      sector => {
        const values = readScaleField(
          sector.sourceIndices.map(index => dataset.values[index]),
          strokeEncoding.field,
          strokeEncoding.fieldType,
          { temporalUnit: strokeEncoding.temporalUnit }
        );
        if (new Set(values).size !== 1) {
          throw new Error("Arc stroke requires one value within each sector.");
        }
        return values[0];
      }
    );
    const strokes = strokeValues === undefined ? undefined : mapScaleConsumerValues(
      strokeValues,
      resolved.resolvedScales[strokeScaleId],
      "stroke"
    );
    return editMarkGraphic(resolved, id, {
      length: commands.length,
      commands,
      fill: fills,
      opacity: config.opacity ?? 1,
      stroke: strokes ?? (
        config.stroke === false ? "transparent" : config.stroke ?? "#ffffff"
      ),
      strokeWidth: config.stroke === false ? 0 : config.strokeWidth ?? 1,
      strokeDash: commands.map(() => []),
      ...requestedStrokeDetails(config, "Arc mark")
    });
  }
);

const editArcMark = /* @__PURE__ */ action(
  {
    op: "editArcMark",
    description: "Edit arc geometry and appearance."
  },
  function (args = {}) {
    validateMarkOptions(args, EDIT_OPTIONS, "editArcMark");
    const strokeDetails = requestedStrokeDetails(args, "editArcMark");
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
    if (Object.hasOwn(args, "stroke") && layer.encoding?.stroke !== undefined) {
      throw new Error(
        "editArcMark stroke conflicts with a field encoding; use encodeStroke with value to replace it."
      );
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
        allowStrokeRemoval: true,
        strokeDetails
      })
    );
    let materialized = next;
    if (canMaterializeArc(next, layer)) {
      materialized = next.rematerializeArcMark({ id: layer.id });
      for (const step of getSourceDependentMarkSteps(materialized, layer.id)) {
        materialized = materialized[step.op](step.args);
      }
    }
    return rematerializeExistingLegend(materialized);
  }
);

export function registerArcMarkActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, {
    createArcMark,
    editArcMark,
    rematerializeArcMark
  });
}
