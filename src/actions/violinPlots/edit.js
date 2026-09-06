import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import { rebindDistributionGuides } from "../distributions/revision.js";
import {
  resolveViolinDensity,
  resolveViolinRoles,
  resolveViolinSplit
} from "./create.js";

const OPERATION = "editViolinPlot";
const OPTIONS = Object.freeze([
  "target", "data", "x", "y", "split", "density"
]);

function resolveOwner(program, requested) {
  const eligible = program.semanticSpec.layers.filter(
    layer => program.markConfigs[layer.id]?.violinPlot?.materialized === true
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Violin-plot owner id");
    const layer = findLayer(program, id);
    if (layer === undefined || !eligible.includes(layer)) {
      throw new Error(`Unknown violin-plot owner "${id}".`);
    }
    return layer;
  }
  const current = findLayer(program, program.context.currentMark);
  if (current !== undefined && eligible.includes(current)) return current;
  if (eligible.length === 1) return eligible[0];
  if (eligible.length === 0) throw new Error(`${OPERATION} requires a violin plot.`);
  throw new Error(`${OPERATION} target is ambiguous; provide target.`);
}

function currentPosition(owner, current, channel) {
  const categorical = current.orientation === "vertical"
    ? channel === "x"
    : channel === "y";
  return {
    field: categorical ? current.category : current.value,
    fieldType: categorical ? current.categoryType : "quantitative",
    scale: { id: owner.encoding[channel].scale }
  };
}

function requestedScale(args, channel, expectedId) {
  if (!Object.hasOwn(args, channel) || typeof args[channel] !== "object") {
    return undefined;
  }
  const scale = args[channel].scale;
  if (scale === undefined) return undefined;
  if (scale.id !== undefined && scale.id !== expectedId) {
    throw new Error(`${OPERATION} ${channel} scale cannot change its id.`);
  }
  const { id: _id, ...definition } = scale;
  void _id;
  return definition;
}

function assertSplitSelectionCompatibility(program, owner, changesSplit) {
  if (!changesSplit) return;
  const referenced = Object.entries(
    program.materializationConfigs.selections ?? {}
  ).find(([, selection]) =>
    selection.target === owner.id && selection.selector?.channel === "color"
  );
  if (referenced !== undefined) {
    throw new Error(
      `${OPERATION} cannot change split while selection "${referenced[0]}" ` +
      "references color."
    );
  }
}

export const editViolinPlot = action(
  {
    op: OPERATION,
    description: "Revise one violin plot's data and statistical roles."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, OPERATION);
    if (!OPTIONS.slice(1).some(key => Object.hasOwn(args, key))) {
      throw new Error(`${OPERATION} requires at least one violin-plot option.`);
    }
    const owner = resolveOwner(this, args.target);
    const current = this.markConfigs[owner.id].violinPlot;
    const source = Object.hasOwn(args, "data")
      ? validateUserId(args.data, "Violin-plot data id")
      : current.source;
    const dataset = findDataset(this, source);
    if (dataset === undefined) {
      throw new Error(`Unknown violin-plot data "${source}".`);
    }
    const roles = resolveViolinRoles(
      dataset,
      Object.hasOwn(args, "x") ? args.x : currentPosition(owner, current, "x"),
      Object.hasOwn(args, "y") ? args.y : currentPosition(owner, current, "y"),
      OPERATION
    );
    const split = Object.hasOwn(args, "split")
      ? resolveViolinSplit(args.split, roles.category, OPERATION, {
          removable: true
        })
      : current.split;
    if (split?.field === roles.category.field) {
      throw new Error(
        `${OPERATION} split field must differ from its category field.`
      );
    }
    const density = resolveViolinDensity(args.density, current.density, OPERATION);
    const changesSplit = split?.field !== current.split?.field;
    assertSplitSelectionCompatibility(this, owner, changesSplit);
    if (current.colorRole === "split" && split === undefined) {
      throw new Error(
        `${OPERATION} cannot remove split while color encodes the split field.`
      );
    }

    const categoryChannel = roles.orientation === "vertical" ? "x" : "y";
    const valueChannel = roles.orientation === "vertical" ? "y" : "x";
    const categoryScale = requestedScale(
      args, categoryChannel, owner.encoding[categoryChannel].scale
    );
    const valueScale = requestedScale(
      args, valueChannel, owner.encoding[valueChannel].scale
    );
    const { width, side, ...densityOptions } = density;
    let next = this;
    if (current.colorRole === "split" && changesSplit) {
      next = next.editSemantic({
        property: `layer[${owner.id}].encoding.color.field`,
        value: split.field
      });
    }
    next = next.editDensity({
      target: owner.id,
      source,
      field: roles.value.field,
      groupBy: roles.category.field,
      densityChannel: roles.densityChannel,
      ...densityOptions,
      ...(valueScale === undefined ? {} : { valueScale }),
      placement: {
        type: "category",
        ...(side === undefined ? {} : { side }),
        width,
        ...(split === undefined ? {} : { split }),
        ...(categoryScale === undefined ? {} : { scale: categoryScale })
      }
    });
    next = rebindDistributionGuides(next, {
      oldXScale: owner.encoding.x.scale,
      oldYScale: owner.encoding.y.scale,
      newXScale: owner.encoding.x.scale,
      newYScale: owner.encoding.y.scale,
      oldXTitle: current.orientation === "vertical" ? current.category : current.value,
      oldYTitle: current.orientation === "vertical" ? current.value : current.category,
      newXTitle: roles.x.field,
      newYTitle: roles.y.field,
      oldMeasureChannel: current.orientation === "vertical" ? "y" : "x",
      newMeasureChannel: valueChannel
    });
    const revisedLayer = findLayer(next, owner.id);
    const transform = findDataset(next, revisedLayer.data).transform[0];
    next = next._withMarkConfig(owner.id, {
      ...next.markConfigs[owner.id],
      violinPlot: {
        ...current,
        materialized: true,
        source,
        orientation: roles.orientation,
        category: roles.category.field,
        categoryType: roles.category.fieldType,
        value: roles.value.field,
        split: transform.placement.split,
        density: {
          bandwidth: transform.bandwidth,
          extent: transform.extent,
          steps: transform.steps,
          kernel: transform.kernel,
          normalization: transform.normalization,
          width: transform.placement.width,
          side: transform.placement.side
        }
      }
    });
    return next._withContext({ currentMark: owner.id, currentData: source });
  }
);
