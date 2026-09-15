import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import {
  findDataset,
  hasDataset,
  hasDatasetOwner,
  resolveDatasetReference
} from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
import { applyLayerDataRematerialization } from
  "../../materialization/dependencies.js";
import { collectResourceReferences } from "../../core/resourceReferences.js";
import {
  assertFieldsAvailable,
  transformInputFields
} from "../../grammar/datasetSchema.js";

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
  "regression",
  "statisticalReference"
]);

export const createDerivedData = /* @__PURE__ */ closedAction(
  { op: "createDerivedData", description: "Create an immutable derived dataset definition." }, OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Derived dataset id");
    const requestedSource = validateUserId(args.source, "Source dataset id");
    const source = resolveDatasetReference(
      this,
      requestedSource,
      "Source dataset"
    ).id;
    if (hasDataset(this, id) || hasDatasetOwner(this, id)) {
      throw new Error(`Dataset "${id}" already exists.`);
    }
    if (!hasDataset(this, source)) {
      throw new Error(`Unknown source dataset "${source}".`);
    }
    const created = this
      .editSemantic({ property: `dataset[${id}].source`, value: source })
      .editSemantic({ property: `dataset[${id}].transform`, value: args.transform });
    const input = resolveDatasetReference(created, source, "Source dataset");
    const transform = args.transform[0];
    assertFieldsAvailable(input.schema, transformInputFields(transform), {
      data: input.id,
      operation: "createDerivedData"
    });
    return created;
  }
);

export const releaseDerivedData = /* @__PURE__ */ closedAction(
  {
    op: "releaseDerivedData",
    description: "Release one unreferenced derived dataset."
  }, RELEASE_OPTIONS,
  function (args = {}) {
    const validatedId = validateUserId(args.id, "Derived dataset id");
    const dataset = findDataset(this, validatedId);
    if (dataset === undefined || dataset.source === undefined) {
      throw new Error(`Unknown derived dataset "${validatedId}".`);
    }
    const references = collectResourceReferences(this, {
      kind: "data",
      id: validatedId
    });
    const selfOwners = references.filter(reference =>
      reference.ownerKind === "dataOwner" &&
      reference.path.at(-1) === "current"
    );
    if (references.some(reference =>
      reference.strength === "live" && !selfOwners.includes(reference)
    )) return this;
    let next = this.editSemantic({
      property: `dataset[${validatedId}]`,
      remove: true
    });
    next = next._withoutMaterializationConfig([
      "calculations", "datasets", validatedId
    ]);
    for (const owner of selfOwners) {
      const [, family, ownerId] = owner.path;
      next = next._withoutMaterializationConfig(["data", family, ownerId]);
    }
    return next;
  }
);

export const rebindLayerData = /* @__PURE__ */ closedAction(
  {
    op: "rebindLayerData",
    description: "Rebind one semantic layer to an existing dataset."
  }, REBIND_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Layer id");
    const requestedData = validateUserId(args.data, "Layer dataset id");
    const data = resolveDatasetReference(
      this,
      requestedData,
      "Layer dataset"
    ).id;
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

export const bindMarkData = /* @__PURE__ */ closedAction(
  {
    op: "bindMarkData",
    description: "Atomically bind one independent mark to materialized data."
  }, BIND_OPTIONS,
  function (args = {}) {
    const target = validateUserId(args.target, "Mark target id");
    const requestedData = validateUserId(args.data, "Mark dataset id");
    const data = resolveDatasetReference(
      this,
      requestedData,
      "Mark dataset"
    ).id;
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
