import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { hasDataset } from "../../selectors/index.js";
import { findDataset } from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { applyLayerDataRematerialization } from
  "../../materialization/dependencies.js";

const OPTIONS = Object.freeze(["id", "source", "transform"]);
const RELEASE_OPTIONS = Object.freeze(["id"]);
const REBIND_OPTIONS = Object.freeze(["id", "data"]);
const BIND_OPTIONS = Object.freeze(["target", "data"]);
const OWNED_MARK_ROLES = Object.freeze([
  "boxPlot",
  "errorBand",
  "errorBandBoundary",
  "errorBar",
  "gradientPlot",
  "ecdfPlot",
  "regression"
]);

export const createDerivedData = action(
  { op: "createDerivedData", description: "Create an immutable derived dataset definition." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createDerivedData");
    const id = validateUserId(args.id, "Derived dataset id");
    const source = validateUserId(args.source, "Source dataset id");
    if (hasDataset(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    if (!hasDataset(this, source)) {
      throw new Error(`Unknown source dataset "${source}".`);
    }
    return this
      .editSemantic({ property: `dataset[${id}].source`, value: source })
      .editSemantic({ property: `dataset[${id}].transform`, value: args.transform });
  }
);

export const releaseDerivedData = action(
  {
    op: "releaseDerivedData",
    description: "Release one unreferenced derived dataset."
  },
  function (args = {}) {
    validateKeys(args, RELEASE_OPTIONS, "releaseDerivedData");
    const validatedId = validateUserId(args.id, "Derived dataset id");
    const dataset = findDataset(this, validatedId);
    if (dataset === undefined || dataset.source === undefined) {
      throw new Error(`Unknown derived dataset "${validatedId}".`);
    }
    const referenced = this.semanticSpec.layers.some(
      layer => layer.data === validatedId
    ) || this.semanticSpec.datasets.some(
      candidate => candidate.source === validatedId
    );
    return referenced
      ? this
      : this.editSemantic({
          property: `dataset[${validatedId}]`,
          remove: true
        });
  }
);

export const rebindLayerData = action(
  {
    op: "rebindLayerData",
    description: "Rebind one semantic layer to an existing dataset."
  },
  function (args = {}) {
    validateKeys(args, REBIND_OPTIONS, "rebindLayerData");
    const id = validateUserId(args.id, "Layer id");
    const data = validateUserId(args.data, "Layer dataset id");
    requireLayer(this, id);
    if (!hasDataset(this, data)) {
      throw new Error(`Layer dataset "${data}" does not exist.`);
    }
    return this.editSemantic({
      property: `layer[${id}].data`,
      value: data
    });
  }
);

function assertIndependentMark(program, layer) {
  const config = program.markConfigs[layer.id] ?? {};
  const role = OWNED_MARK_ROLES.find(key => config[key] !== undefined);
  if (role !== undefined) {
    throw new Error(
      `Mark "${layer.id}" is owned by its ${role} lifecycle; use that ` +
      "resource's edit action to change data roles."
    );
  }
  const source = findDataset(program, layer.data);
  const transform = source?.transform?.[0]?.type;
  if (["density", "ecdf", "horizon", "markFilter"].includes(transform)) {
    throw new Error(
      `Mark "${layer.id}" consumes owned ${transform} data; use its ` +
      "data or filter lifecycle action to change the source."
    );
  }
}

function applyMarkDataBinding(program, target, data) {
  const rebound = program.rebindLayerData({ id: target, data });
  return applyLayerDataRematerialization(rebound, target);
}

export const bindMarkData = action(
  {
    op: "bindMarkData",
    description: "Atomically bind one independent mark to materialized data."
  },
  function (args = {}) {
    validateKeys(args, BIND_OPTIONS, "bindMarkData");
    const target = validateUserId(args.target, "Mark target id");
    const data = validateUserId(args.data, "Mark dataset id");
    const layer = requireLayer(this, target);
    const dataset = findDataset(this, data);
    if (dataset === undefined) {
      throw new Error(`Mark dataset "${data}" does not exist.`);
    }
    if (!Array.isArray(dataset.values)) {
      throw new Error(`Mark dataset "${data}" requires materialized values.`);
    }
    if (layer.data === data) {
      throw new Error(`Mark "${target}" already uses dataset "${data}".`);
    }
    assertIndependentMark(this, layer);

    // Finish the entire dependency plan on an immutable speculative branch.
    // A field, type, coordinate, scale, guide, label, selection, or highlight
    // incompatibility therefore rejects before this action returns any state.
    applyMarkDataBinding(this, target, data);
    return applyMarkDataBinding(this, target, data);
  }
);
