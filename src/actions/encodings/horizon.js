import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  deriveHorizon,
  validateHorizonTransform
} from "../../grammar/horizon.js";
import { numericExtent } from "../../grammar/numeric.js";
import {
  normalizeTemporalValue,
  readQuantitativeField
} from "../../grammar/scales/index.js";
import {
  resolveColorScaleDefinition,
  resolvePositionScaleDefinition
} from "../scales/definitions.js";
import {
  findDataset,
  hasDataset,
  resolveEligibleLayer
} from "../../selectors/index.js";
import { applyMaterializationPlan } from
  "../../materialization/dependencies.js";
import { planHorizonRematerialization } from
  "../../materialization/horizon.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import { changedScaleEditPatch } from "../scales/patch.js";
import {
  findExistingHorizonScale,
  findHorizonArea,
  horizonOutputFields,
  inferHorizonTitle,
  mergeHorizonPalette,
  resolveEditedHorizonField,
  resolveEditedHorizonGroupBy,
  resolveFoldedHorizonScaleOptions,
  resolveHorizonField,
  resolveHorizonGroupBy,
  resolveHorizonPaletteColors,
  resolveHorizonSource,
  validateUnusedHorizonEncodings
} from "./horizon/resolve.js";

import { applyTemporalUnit } from "./temporal.js";

const OPTIONS = Object.freeze([
  "target", "source", "x", "y", "groupBy", "bands", "baseline", "extent",
  "resolve", "missing", "overflow", "palette"
]);
const EDIT_OPTIONS = OPTIONS;
const EDITABLE = Object.freeze(EDIT_OPTIONS.filter(option => option !== "target"));

function clearOwnedEncodings(program, layer) {
  let next = program;
  for (const channel of ["x", "y", "group"]) {
    if (layer.encoding?.[channel] === undefined) continue;
    next = next.editSemantic({
      property: `layer[${layer.id}].encoding.${channel}`,
      remove: true
    });
  }
  return next;
}

function applyHorizonEncoding(program, {
  layer,
  transform,
  xScale,
  yScale,
  colorScale
}) {
  let next = clearOwnedEncodings(program, layer)
    .encodeX({
      target: layer.id,
      field: transform.as.x,
      fieldType: transform.x.fieldType,
      ...(transform.x.fieldType === "temporal" ? { temporalUnit: "timestamp" } : {}),
      scale: xScale
    })
    .editSemantic({
      property: `layer[${layer.id}].encoding.x.title`,
      value: layer.encoding?.x?.title ?? inferHorizonTitle(transform.x.field)
    })
    .encodeY({
      target: layer.id,
      field: transform.as.lower,
      fieldType: "quantitative",
      scale: yScale
    })
    .encodeGroup({ target: layer.id, field: transform.as.group })
    .encodeY2({
      target: layer.id,
      field: transform.as.upper,
      fieldType: "quantitative"
    })
    .encodeColor({
      target: layer.id,
      field: transform.as.color,
      fieldType: "nominal",
      scale: colorScale
    })
    .editAreaMark({ target: layer.id, opacity: 1 });
  return next;
}

function applyScaleDefinition(program, current, definition) {
  const patch = changedScaleEditPatch(current, definition);
  return patch === undefined ? program : program.editScale(patch);
}

const editHorizon = action(
  {
    op: "editHorizon",
    description: "Revise one Horizon transform and rematerialize its consumers."
  },
  function (args = {}) {
    validateOptionObject(args, EDIT_OPTIONS, "editHorizon");
    if (Object.hasOwn(args, "groupBy") && args.groupBy === undefined) {
      throw new Error("editHorizon groupBy requires a field string or false.");
    }
    if (!EDITABLE.some(option => Object.hasOwn(args, option))) {
      throw new Error("editHorizon requires at least one Horizon option.");
    }
    const layer = resolveEligibleLayer(this, {
      target: args.target,
      label: "Horizon area",
      predicate: candidate => {
        const dataset = findDataset(this, candidate.data);
        return candidate.mark?.type === "area" &&
          dataset?.transform?.length === 1 &&
          dataset.transform[0].type === "horizon";
      }
    });
    const previous = findDataset(this, layer.data);
    const prior = previous.transform[0];
    const sourceId = validateUserId(
      args.source ?? previous.source,
      "Horizon source dataset id"
    );
    const source = findDataset(this, sourceId);
    if (source === undefined) {
      throw new Error(`Unknown Horizon source dataset "${sourceId}".`);
    }
    const x = resolveEditedHorizonField(this, layer, source, prior, args.x, "x");
    const y = resolveEditedHorizonField(this, layer, source, prior, args.y, "y");
    const groupBy = resolveEditedHorizonGroupBy(
      source,
      prior.groupBy,
      args.groupBy
    );
    const candidate = validateHorizonTransform({
      type: "horizon",
      x: { field: x.field, fieldType: x.fieldType,
        ...(x.temporalUnit === undefined ? {} : { temporalUnit: x.temporalUnit }) },
      y: { field: y.field, fieldType: y.fieldType },
      ...(groupBy === undefined ? {} : { groupBy }),
      bands: args.bands ?? prior.bands,
      baseline: args.baseline ?? prior.baseline,
      extent: args.extent ?? prior.extent,
      resolve: args.resolve ?? prior.resolve,
      missing: args.missing ?? prior.missing,
      overflow: args.overflow ?? prior.overflow,
      palette: mergeHorizonPalette(prior.palette, args.palette),
      as: prior.as
    });
    const preflight = deriveHorizon(source.values, candidate);
    const revision = planDerivedDataRevision(this, {
      owner: layer.id,
      role: "HorizonData",
      previous: previous.id,
      consumers: [layer.id]
    });
    let next = this
      .createHorizonData({
        id: revision.id,
        source: source.id,
        x: candidate.x,
        y: candidate.y,
        ...(groupBy === undefined ? {} : { groupBy }),
        bands: candidate.bands,
        baseline: candidate.baseline,
        extent: candidate.extent,
        resolve: candidate.resolve,
        missing: candidate.missing,
        overflow: candidate.overflow,
        palette: candidate.palette,
        as: candidate.as
      })
      .rebindLayerData(revision.rebinds[0])
      .releaseDerivedData(revision.release);

    if (layer.encoding.x.fieldType !== x.fieldType) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.fieldType`,
        value: x.fieldType
      });
    }
    next = applyTemporalUnit(next, layer.id, "x",
      x.fieldType === "temporal" ? "timestamp" : undefined, layer.encoding.x);
    if (Object.hasOwn(args, "x")) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.title`,
        value: inferHorizonTitle(x.field)
      });
    }

    const currentX = findExistingHorizonScale(
      next,
      layer.encoding.x.scale,
      "Horizon x"
    );
    const requestedXScale = x.scale ?? {};
    if (requestedXScale.id !== undefined && requestedXScale.id !== currentX.id) {
      throw new Error("editHorizon x scale cannot change its id.");
    }
    const xTypeChanged = prior.x.fieldType !== x.fieldType;
    const emptyXDomain = preflight.values.length === 0 &&
      requestedXScale.domain === undefined &&
      currentX.domain === "auto"
      ? source.values.map((row, index) => x.fieldType === "temporal"
          ? normalizeTemporalValue(row[x.field], x.field, index, x.temporalUnit)
          : row[x.field])
      : undefined;
    const nextX = resolvePositionScaleDefinition(next, "x", x.fieldType, {
      ...requestedXScale,
      id: currentX.id,
      ...(emptyXDomain === undefined
        ? {}
        : { domain: numericExtent(emptyXDomain) }),
      ...(xTypeChanged && requestedXScale.type === undefined
        ? { type: x.fieldType === "temporal" ? "time" : "linear" }
        : {})
    });
    next = applyScaleDefinition(next, currentX, nextX);

    const currentY = findExistingHorizonScale(
      next,
      layer.encoding.y.scale,
      "Horizon y"
    );
    const requestedYScale = y.scale ?? {};
    if (requestedYScale.id !== undefined && requestedYScale.id !== currentY.id) {
      throw new Error("editHorizon y scale cannot change its id.");
    }
    const nextY = resolveFoldedHorizonScaleOptions(
      layer.id,
      { ...requestedYScale, id: currentY.id },
      currentY
    );
    next = applyScaleDefinition(next, currentY, nextY);

    const colors = resolveHorizonPaletteColors(candidate);
    const currentColor = findExistingHorizonScale(
      next,
      layer.encoding.color.scale,
      "Horizon color"
    );
    const nextColor = resolveColorScaleDefinition(next, {
      id: currentColor.id,
      type: "ordinal",
      domain: colors.domain,
      range: colors.range
    });
    next = applyScaleDefinition(next, currentColor, nextColor);

    if (preflight.values.length === 0) {
      return next.editGraphics({
        target: layer.id,
        property: "length",
        value: 0
      });
    }
    return applyMaterializationPlan(
      next,
      planHorizonRematerialization(next, layer.id)
    );
  }
);

const encodeHorizon = action(
  {
    op: "encodeHorizon",
    description: "Derive and encode one folded Horizon area."
  },
  function (args = {}) {
    validateOptionObject(args, OPTIONS, "encodeHorizon");
    const layer = findHorizonArea(this, args.target);
    validateUnusedHorizonEncodings(layer);
    const source = resolveHorizonSource(this, layer, args.source);
    const x = resolveHorizonField(this, layer, source, args.x, "x");
    const y = resolveHorizonField(this, layer, source, args.y, "y");
    const groupBy = resolveHorizonGroupBy(layer, source, args.groupBy);
    const as = horizonOutputFields(layer.id);
    const transform = validateHorizonTransform({
      type: "horizon",
      x: { field: x.field, fieldType: x.fieldType,
        ...(x.temporalUnit === undefined ? {} : { temporalUnit: x.temporalUnit }) },
      y: { field: y.field, fieldType: y.fieldType },
      ...(groupBy === undefined ? {} : { groupBy }),
      bands: args.bands ?? 3,
      baseline: args.baseline ?? 0,
      extent: args.extent ?? "auto",
      resolve: args.resolve ?? "shared",
      missing: args.missing ?? "break",
      overflow: args.overflow ?? "clip",
      palette: args.palette ?? {},
      as
    });
    const preflight = deriveHorizon(source.values, transform);
    const id = `${layer.id}HorizonData`;
    if (hasDataset(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    const xScale = {
      ...(x.scale ?? {}),
      ...(preflight.values.length === 0 && x.scale?.domain === undefined
        ? {
            domain: source.values.map((row, index) =>
              x.fieldType === "temporal"
                ? normalizeTemporalValue(row[x.field], x.field, index, x.temporalUnit)
                : row[x.field]
            )
          }
        : {})
    };
    if (Array.isArray(xScale.domain) && xScale.domain.length > 2) {
      xScale.domain = numericExtent(xScale.domain);
    }
    const yScale = resolveFoldedHorizonScaleOptions(layer.id, y.scale);
    const colors = resolveHorizonPaletteColors(transform);
    const colorScale = {
      id: `${layer.id}HorizonColor`,
      type: "ordinal",
      domain: colors.domain,
      range: colors.range
    };
    resolvePositionScaleDefinition(this, "x", x.fieldType, xScale);
    resolvePositionScaleDefinition(this, "y", "quantitative", yScale);
    resolveColorScaleDefinition(this, colorScale);
    if (x.fieldType === "quantitative") readQuantitativeField(source.values, x.field);

    let next = this
      .createHorizonData({
        id,
        source: source.id,
        x: transform.x,
        y: transform.y,
        ...(groupBy === undefined ? {} : { groupBy }),
        bands: transform.bands,
        baseline: transform.baseline,
        extent: transform.extent,
        resolve: transform.resolve,
        missing: transform.missing,
        overflow: transform.overflow,
        palette: transform.palette,
        as
      })
      .rebindLayerData({ id: layer.id, data: id });
    const stored = findDataset(next, id).transform[0];
    next = applyHorizonEncoding(next, {
      layer,
      transform: stored,
      xScale,
      yScale,
      colorScale
    });
    return next;
  }
);

export function registerHorizonEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeHorizon = encodeHorizon;
  ProgramClass.prototype.editHorizon = editHorizon;
}
