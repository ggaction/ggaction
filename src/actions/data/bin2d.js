import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

import {
  deriveBin2DRows,
  normalizeBin2DTransform,
  requestedBin2DTransform
} from "../../grammar/bin2d.js";
import {
  findDataset,
  resolveDatasetReference
} from "../../selectors/datasets.js";
import {
  normalizeDerivedDependentPolicy,
  resolveDerivedDataOwner,
  reviseDerivedData
} from "./edit.js";
import { normalizeDatasetTransformEdit } from "../../grammar/transforms.js";
export { materializeBin2DData } from "./bin2dMaterialize.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "bins", "extent", "includeEmpty", "members", "as"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "source", "x", "y", "bins", "extent", "includeEmpty",
  "members", "as", "dependents"
]);
const EDITABLE = Object.freeze(EDIT_OPTIONS.filter(option =>
  !["target", "dependents"].includes(option)
));
const OUTPUT_FIELDS = Object.freeze([
  "x0", "x1", "y0", "y1", "count", "members"
]);

function ownerConfig(program, id) {
  return program.materializationConfigs.data?.bin2d?.[id];
}

function ownerEntries(program) {
  return Object.entries(program.materializationConfigs.data?.bin2d ?? {});
}

function resolveBin2DOwner(program, requested) {
  if (requested !== undefined) {
    const owner = validateUserId(requested, "2D bin owner id");
    if (ownerConfig(program, owner) === undefined) {
      throw new Error(`Unknown 2D bin owner "${owner}".`);
    }
    return owner;
  }
  const owners = ownerEntries(program);
  const current = owners.filter(([, config]) =>
    config?.current === program.context.currentData
  );
  if (current.length === 1) return current[0][0];
  if (current.length > 1) {
    throw new Error("2D bin owner is ambiguous; provide target.");
  }
  if (owners.length === 1) return owners[0][0];
  if (owners.length === 0) throw new Error("No 2D bin owner is available.");
  throw new Error("2D bin owner is ambiguous; provide target.");
}

function requireCurrentBin2D(program, id, config) {
  const current = findDataset(program, config.current);
  if (
    current?.source === undefined ||
    current.transform?.length !== 1 ||
    current.transform[0].type !== "bin2d"
  ) {
    throw new Error(`2D bin owner "${id}" has no current derived dataset.`);
  }
  return current;
}

function preflight(program, sourceId, transform) {
  const source = findDataset(program, sourceId);
  if (source?.values === undefined) {
    throw new Error(`Source dataset "${sourceId}" has no values.`);
  }
  deriveBin2DRows(source.values, transform);
}

function requireCompleteEditOutputFields(value, members) {
  const required = OUTPUT_FIELDS.filter(field => field !== "members" || members);
  const missing = required.find(field => !Object.hasOwn(value, field));
  if (missing !== undefined) {
    throw new Error(
      `editBin2DData as requires the complete "${missing}" output field.`
    );
  }
}

function editedTransform(owner, previous, args) {
  const patch = Object.fromEntries(EDITABLE.flatMap(property =>
    property !== "source" && Object.hasOwn(args, property)
      ? [[property, args[property]]]
      : []
  ));
  const transform = normalizeDatasetTransformEdit(
    previous.transform[0],
    patch,
    owner
  );
  if (Object.hasOwn(args, "as")) {
    requireCompleteEditOutputFields(args.as, transform.members);
  }
  return transform;
}

function sameRequestedTransform(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyBin2DRevision(program, {
  owner,
  source,
  transform,
  dependents = "reject"
}) {
  return reviseDerivedData(program, {
    resolved: resolveDerivedDataOwner(program, owner, "bin2d"),
    definition: transform,
    dependents,
    source
  });
}

export const createBin2DData = /* @__PURE__ */ closedAction(
  {
    op: "createBin2DData",
    description: "Create or revise immutable rectangular 2D-bin values."
  }, OPTIONS,
  function (args = {}) {
    const owner = validateUserId(args.id, "2D bin dataset id");
    const config = ownerConfig(this, owner);
    const previous = config === undefined
      ? undefined
      : requireCurrentBin2D(this, owner, config);
    const source = resolveDatasetReference(
      this,
      validateUserId(
        args.source ?? previous?.source ?? this.context.currentData,
        "Source dataset id"
      ),
      "Source dataset"
    ).id;
    const transform = normalizeBin2DTransform({ ...args, id: owner });
    preflight(this, source, transform);

    if (previous === undefined) {
      return this
        .createDerivedData({ id: owner, source, transform: [transform] })
        .materializeBin2DData({ id: owner })
        ._withMaterializationConfig(
          ["data", "bin2d", owner],
          { current: owner }
        );
    }

    return applyBin2DRevision(this, {
      owner,
      previous,
      source,
      transform
    });
  }
);

export const editBin2DData = /* @__PURE__ */ closedAction(
  {
    op: "editBin2DData",
    description: "Partially revise one logical rectangular 2D-bin owner."
  }, EDIT_OPTIONS,
  function (args = {}) {
    if (!EDITABLE.some(option => Object.hasOwn(args, option))) {
      throw new Error("editBin2DData requires at least one transform or source option.");
    }
    const owner = resolveBin2DOwner(this, args.target);
    const previous = requireCurrentBin2D(this, owner, ownerConfig(this, owner));
    const dependents = normalizeDerivedDependentPolicy(args.dependents);
    const source = resolveDatasetReference(
      this,
      validateUserId(
        args.source ?? previous.source,
        "2D bin source dataset id"
      ),
      "2D bin source dataset"
    ).id;
    const transform = editedTransform(owner, previous, args);
    if (
      source === previous.source &&
      sameRequestedTransform(
        transform,
        requestedBin2DTransform(previous.transform[0])
      )
    ) {
      throw new Error("editBin2DData requires an actual transform or source change.");
    }
    preflight(this, source, transform);
    return applyBin2DRevision(this, {
      owner,
      source,
      transform,
      dependents
    });
  }
);
