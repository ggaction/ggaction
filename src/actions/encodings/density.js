import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  findDataset,
  findLayer,
  hasDataset,
  resolveEligibleLayer
} from "../../selectors/index.js";
import { applyMaterializationPlan } from
  "../../materialization/dependencies.js";
import { planDensityRematerialization } from
  "../../materialization/density.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import { validateOptions } from "./shared.js";

const OPTIONS = Object.freeze([
  "field", "target", "source", "groupBy", "bandwidth", "extent", "steps",
  "kernel", "normalization", "as", "densityChannel", "coordinate",
  "valueScale", "densityScale"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "bandwidth", "extent", "steps", "kernel", "normalization"
]);
const EDITABLE = Object.freeze(EDIT_OPTIONS.filter(option => option !== "target"));

function findArea(program, requested) {
  const areas = program.semanticSpec.layers.filter(layer => layer.mark?.type === "area");
  if (requested !== undefined) {
    const id = validateUserId(requested, "Density target id");
    const selected = findLayer(program, id);
    if (selected === undefined || !areas.includes(selected)) {
      throw new Error(`Unknown density area target "${id}".`);
    }
    return selected;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && areas.includes(current)) return current;
  if (areas.length === 1) return areas[0];
  if (areas.length === 0) {
    throw new Error("encodeDensity requires an eligible area mark.");
  }
  throw new Error("encodeDensity target is ambiguous; provide target.");
}

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function scaleOptions(value, defaults, label) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return { ...defaults, ...(value ?? {}) };
}

const encodeDensity = action(
  {
    op: "encodeDensity",
    description: "Derive and encode a baseline-oriented kernel density area."
  },
  function (args = {}) {
    validateOptions(args, OPTIONS, "encodeDensity");
    const layer = findArea(this, args.target);
    const field = requireField(args.field, "Density field");
    const groupBy = args.groupBy === undefined
      ? undefined
      : requireField(args.groupBy, "Density groupBy");
    const source = validateUserId(
      args.source ?? layer.data,
      "Density source dataset id"
    );
    if (!hasDataset(this, source)) {
      throw new Error(`Unknown density source dataset "${source}".`);
    }
    if (["x", "y", "y2", "group"].some(channel =>
      layer.encoding?.[channel] !== undefined
    )) {
      throw new Error(
        `Density area target "${layer.id}" already has positional or group encodings.`
      );
    }
    const densityChannel = args.densityChannel ?? "y";
    if (!["x", "y"].includes(densityChannel)) {
      throw new Error(`Unsupported densityChannel "${densityChannel}".`);
    }
    const output = args.as ?? [`${field}_value`, `${field}_density`];
    if (!Array.isArray(output) || output.length !== 2) {
      throw new TypeError("Density as must contain value and density field names.");
    }
    const derivedId = `${layer.id}DensityData`;
    if (hasDataset(this, derivedId)) {
      throw new Error(`Dataset "${derivedId}" already exists.`);
    }
    const valueScale = scaleOptions(
      args.valueScale,
      { nice: false, zero: false },
      "Density valueScale"
    );
    const densityScale = scaleOptions(
      args.densityScale,
      { nice: true, zero: true },
      "Density densityScale"
    );
    const xIsDensity = densityChannel === "x";
    const xField = output[xIsDensity ? 1 : 0];
    const yField = output[xIsDensity ? 0 : 1];
    const xScale = xIsDensity ? densityScale : valueScale;
    const yScale = xIsDensity ? valueScale : densityScale;

    let next = this
      .createDensityData({
        id: derivedId,
        source,
        field,
        ...(groupBy === undefined ? {} : { groupBy }),
        ...(args.bandwidth === undefined ? {} : { bandwidth: args.bandwidth }),
        ...(args.extent === undefined ? {} : { extent: args.extent }),
        ...(args.steps === undefined ? {} : { steps: args.steps }),
        ...(args.kernel === undefined ? {} : { kernel: args.kernel }),
        ...(args.normalization === undefined
          ? {}
          : { normalization: args.normalization }),
        ...(args.as === undefined ? {} : { as: args.as })
      })
      .editSemantic({
        property: `layer[${layer.id}].data`,
        value: derivedId
      })
      .encodeX({
        target: layer.id,
        field: xField,
        ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
        scale: xScale
      })
      .encodeY({
        target: layer.id,
        field: yField,
        ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
        scale: yScale
      });
    if (groupBy !== undefined) {
      next = next.encodeGroup({ target: layer.id, field: groupBy });
    }
    return next.rematerializeAreaMark({ id: layer.id });
  }
);

function findDensityArea(program, requested) {
  const target = requested === undefined
    ? undefined
    : validateUserId(requested, "Density target id");
  return resolveEligibleLayer(program, {
    target,
    label: "density area",
    predicate(layer) {
      const dataset = findDataset(program, layer.data);
      return layer.mark?.type === "area" &&
        dataset?.transform?.length === 1 &&
        dataset.transform[0].type === "density";
    }
  });
}

const editDensity = action(
  {
    op: "editDensity",
    description: "Revise one density transform and rematerialize its consumers."
  },
  function (args = {}) {
    validateOptions(args, EDIT_OPTIONS, "editDensity");
    if (!EDITABLE.some(option => Object.hasOwn(args, option))) {
      throw new Error("editDensity requires at least one density option.");
    }
    const layer = findDensityArea(this, args.target);
    const previous = findDataset(this, layer.data);
    const transform = previous.transform[0];
    const revision = planDerivedDataRevision(this, {
      owner: layer.id,
      role: "DensityData",
      previous: previous.id,
      consumers: [layer.id]
    });
    const option = property => Object.hasOwn(args, property)
      ? args[property]
      : transform[property];

    let next = this
      .createDensityData({
        id: revision.id,
        source: previous.source,
        field: transform.field,
        ...(transform.groupBy === undefined
          ? {}
          : { groupBy: transform.groupBy }),
        bandwidth: option("bandwidth"),
        extent: option("extent"),
        steps: option("steps"),
        kernel: option("kernel") ?? "gaussian",
        normalization: option("normalization") ?? "unit",
        as: transform.as
      })
      .rebindLayerData(revision.rebinds[0])
      .releaseDerivedData(revision.release);

    next = applyMaterializationPlan(
      next,
      planDensityRematerialization(next, layer.id)
    );
    return next;
  }
);

export function registerDensityEncodingAction(ProgramClass) {
  ProgramClass.prototype.encodeDensity = encodeDensity;
  ProgramClass.prototype.editDensity = editDensity;
}
