import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveBin2DRows,
  normalizeBin2DTransform
} from "../../grammar/bin2d.js";
import { applyLayerDataRematerialization } from
  "../../materialization/dependencies.js";
import { planDerivedDataRevision } from
  "../../materialization/dataProvenance.js";
import {
  findDataset,
  findDatasetConsumer
} from "../../selectors/datasets.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "x", "y", "bins", "extent", "includeEmpty", "members", "as"
]);

function ownerConfig(program, id) {
  return program.materializationConfigs.data?.bin2d?.[id];
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

export const materializeBin2DData = action(
  {
    op: "materializeBin2DData",
    description: "Materialize one immutable rectangular 2D-bin dataset."
  },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeBin2DData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "bin2d"
    );
    const result = deriveBin2DRows(source.values, transform);
    return this
      .editSemantic({
        property: `dataset[${id}].transform`,
        value: [{ ...transform, resolved: result.resolved }]
      })
      .editSemantic({
        property: `dataset[${id}].values`,
        value: result.values
      });
  }
);

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

    rejectDerivedConsumers(this, previous.id);
    const consumers = directLayerConsumers(this, previous.id);
    const revision = planDerivedDataRevision(this, {
      owner,
      role: "Bin2DData",
      previous: previous.id,
      consumers
    });
    let next = this
      .createDerivedData({ id: revision.id, source, transform: [transform] })
      .materializeBin2DData({ id: revision.id });
    for (const rebind of revision.rebinds) {
      next = next.rebindLayerData(rebind);
      next = applyLayerDataRematerialization(next, rebind.id);
    }
    next = next.releaseDerivedData(revision.release);
    return next._withMaterializationConfig(
      ["data", "bin2d", owner],
      { current: revision.id }
    );
  }
);
