import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveBin2DRows,
  normalizeBin2DTransform,
  requestedBin2DTransform
} from "../../grammar/bin2d.js";
import { applyLayerDataRematerialization } from
  "../../materialization/dependencies.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import {
  findDataset,
  findDatasetConsumer
} from "../../selectors/datasets.js";
import { requireLayer } from "../../selectors/layers.js";
export { materializeBin2DData } from "./bin2dMaterialize.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "bins", "extent", "includeEmpty", "members", "as"
]);
const EDIT_OPTIONS = Object.freeze([
  "target", "source", "x", "y", "bins", "extent", "includeEmpty", "members", "as"
]);
const EDITABLE = Object.freeze(EDIT_OPTIONS.slice(1));
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

function directLayerConsumers(program, data) {
  return program.semanticSpec.layers
    .filter(layer => layer.data === data)
    .map(layer => layer.id);
}

function outputFieldChanges(previous, next) {
  return new Map(OUTPUT_FIELDS.flatMap(role => {
    const from = previous.as[role];
    const to = next.as[role];
    return from !== undefined && from !== to
      ? [[from, [role, to]]]
      : [];
  }));
}

function changedConsumerField(field, changes) {
  const change = changes.get(field);
  if (change === undefined) return field;
  const [role, next] = change;
  if (next === undefined) {
    throw new Error(
      `Cannot remove referenced 2D bin ${role} output field "${field}".`
    );
  }
  return next;
}

function rebindLayerOutputFields(program, id, changes) {
  const layer = requireLayer(program, id);
  let next = program;
  const changed = field => changedConsumerField(field, changes);
  const editField = (property, field) => {
    if (field === undefined) return;
    const value = changed(field);
    if (value !== field) next = next.editSemantic({ property, value });
  };
  for (const [channel, encoding] of Object.entries(layer.encoding ?? {})) {
    editField(
      `layer[${id}].encoding.${channel}.field`,
      encoding?.field
    );
    const summary = encoding?.categoryOrder?.by;
    if (summary?.field !== undefined) {
      const field = changed(summary.field);
      if (field !== summary.field) {
        next = next.editSemantic({
          property: `layer[${id}].encoding.${channel}.categoryOrder`,
          value: { ...encoding.categoryOrder, by: { ...summary, field } }
        });
      }
    }
  }
  editField(
    `layer[${id}].encoding.theta.weight`,
    layer.encoding?.theta?.weight
  );

  const parallel = layer.encoding?.parallel;
  if (parallel?.dimensions !== undefined) {
    const dimensions = parallel.dimensions.map(dimension => {
      const field = changed(dimension.field);
      return { ...dimension, field };
    });
    if (dimensions.some((dimension, index) =>
      dimension.field !== parallel.dimensions[index].field
    )) {
      next = next.editSemantic({
        property: `layer[${id}].encoding.parallel.dimensions`,
        value: dimensions
      });
    }
  }
  editField(
    `layer[${id}].encoding.parallel.key`,
    parallel?.key
  );

  for (const [selectionId, config] of Object.entries(
    program.materializationConfigs.selections ?? {}
  )) {
    if (config.target !== id) continue;
    const selector = { ...config.selector };
    if (selector.field !== undefined) {
      selector.field = changed(selector.field);
    }
    if (selector.groupBy !== undefined) {
      selector.groupBy = selector.groupBy.map(changed);
    }
    if (JSON.stringify(selector) !== JSON.stringify(config.selector)) {
      next = next._withSelectionConfig(selectionId, { ...config, selector });
    }
  }

  const jitter = program.materializationConfigs.jitters?.[id];
  const key = jitter?.key === undefined
    ? undefined
    : changed(jitter.key);
  if (key !== undefined && key !== jitter.key) {
    next = next._withMaterializationConfig(
      ["jitters", id], { ...jitter, key }
    );
  }
  return next;
}

function rejectDerivedConsumers(program, data) {
  const dependent = findDatasetConsumer(program, data);
  if (dependent !== undefined) {
    throw new Error(
      `Cannot replace 2D bin dataset "${data}" while derived dataset ` +
      `"${dependent.id}" depends on it.`
    );
  }
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
  const prior = requestedBin2DTransform(previous.transform[0]);
  const option = property => Object.hasOwn(args, property)
    ? args[property]
    : prior[property];
  const members = option("members");
  let as = option("as");
  if (!Object.hasOwn(args, "as")) {
    as = { ...as };
    if (members && as.members === undefined) {
      as.members = `__${owner}_members`;
    } else if (!members) {
      delete as.members;
    }
  }
  const transform = normalizeBin2DTransform({
    id: owner,
    x: option("x"),
    y: option("y"),
    bins: option("bins"),
    extent: option("extent"),
    includeEmpty: option("includeEmpty"),
    members,
    as
  });
  if (Object.hasOwn(args, "as")) {
    requireCompleteEditOutputFields(args.as, members);
  }
  return transform;
}

function sameRequestedTransform(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyBin2DRevision(program, { owner, previous, source, transform }) {
  rejectDerivedConsumers(program, previous.id);
  const consumers = directLayerConsumers(program, previous.id);
  const changes = outputFieldChanges(previous.transform[0], transform);
  const revision = planDerivedDataRevision(program, {
    owner,
    role: "Bin2DData",
    previous: previous.id,
    consumers
  });
  let next = program
    .createDerivedData({ id: revision.id, source, transform: [transform] })
    .materializeBin2DData({ id: revision.id });
  for (const rebind of revision.rebinds) {
    next = next.rebindLayerData(rebind);
    next = rebindLayerOutputFields(next, rebind.id, changes);
    next = applyLayerDataRematerialization(next, rebind.id);
  }
  next = next.releaseDerivedData(revision.release);
  return next._withMaterializationConfig(
    ["data", "bin2d", owner],
    { current: revision.id }
  );
}

export const createBin2DData = action(
  {
    op: "createBin2DData",
    description: "Create or revise immutable rectangular 2D-bin values."
  },
  function (args = {}) {
    validateKeys(args, OPTIONS, "createBin2DData");
    const owner = validateUserId(args.id, "2D bin dataset id");
    const config = ownerConfig(this, owner);
    const previous = config === undefined
      ? undefined
      : requireCurrentBin2D(this, owner, config);
    const source = validateUserId(
      args.source ?? previous?.source ?? this.context.currentData,
      "Source dataset id"
    );
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

export const editBin2DData = action(
  {
    op: "editBin2DData",
    description: "Partially revise one logical rectangular 2D-bin owner."
  },
  function (args = {}) {
    validateKeys(args, EDIT_OPTIONS, "editBin2DData");
    if (!EDITABLE.some(option => Object.hasOwn(args, option))) {
      throw new Error("editBin2DData requires at least one transform or source option.");
    }
    const owner = resolveBin2DOwner(this, args.target);
    const previous = requireCurrentBin2D(this, owner, ownerConfig(this, owner));
    const source = validateUserId(
      args.source ?? previous.source,
      "2D bin source dataset id"
    );
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
    const revision = { owner, previous, source, transform };

    // Execute one speculative immutable branch so every consumer plan is known
    // to succeed before the returned action trace records its first child.
    applyBin2DRevision(this, revision);
    return applyBin2DRevision(this, revision);
  }
);
