import { action } from "../../core/action.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  findTransformPolicy,
  normalizeDatasetTransformEdit,
  requestedDatasetTransform
} from "../../grammar/transforms.js";
import {
  findDataset,
  hasDataset
} from "../../selectors/datasets.js";
import { applyLayerDataRematerialization } from
  "../../materialization/dependencies.js";
import {
  outputFieldChanges,
  rebindLayerOutputFields,
  rebindMaterializationDataReferences
} from "./revisionBindings.js";

const GENERIC_OPTIONS = Object.freeze([
  "target", "definition", "dependents"
]);
const DEPENDENT_POLICIES = new Set(["reject", "recompute"]);
const CREATOR_BY_TYPE = Object.freeze({
  bin: "createBinData",
  bin2d: "createBin2DData",
  complete: "createCompleteData",
  computed: "createComputedData",
  density: "createDensityData",
  ecdf: "createECDFData",
  filter: "filterData",
  fold: "createFoldData",
  impute: "createImputedData",
  interval: "createIntervalData",
  normalize: "createNormalizedData",
  regression: "createRegressionData",
  stack: "createStackData",
  summary: "createSummaryData",
  timeUnit: "createTimeUnitData",
  window: "createWindowData"
});
const REVISION_ROLE = Object.freeze({
  bin: "BinData",
  bin2d: "Bin2DData",
  complete: "CompleteData",
  computed: "ComputedData",
  density: "DensityData",
  ecdf: "ECDFData",
  filter: "FilteredData",
  fold: "FoldData",
  impute: "ImputedData",
  interval: "IntervalData",
  normalize: "NormalizedData",
  regression: "RegressionData",
  stack: "StackData",
  summary: "SummaryData",
  timeUnit: "TimeUnitData",
  window: "WindowData"
});

function ownerRecords(program, type) {
  const families = program.materializationConfigs.data ?? {};
  return Object.entries(families).flatMap(([family, owners]) =>
    Object.entries(owners ?? {}).flatMap(([owner, config]) => {
      if (typeof config?.current !== "string") return [];
      const dataset = findDataset(program, config.current);
      const currentType = dataset?.transform?.[0]?.type ?? family;
      if (type !== undefined && currentType !== type) return [];
      return [{ family, owner, current: config.current, dataset }];
    })
  );
}

function escapedPattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function staleOwnerRecord(program, requested, type) {
  return ownerRecords(program, type).find(record => {
    const transformType = record.dataset?.transform?.[0]?.type ?? record.family;
    const role = REVISION_ROLE[transformType];
    if (role === undefined || requested === record.current) return false;
    return new RegExp(
      `^${escapedPattern(record.owner)}${role}Revision\\d+$`
    ).test(requested);
  });
}

function topLevelCreatorRecorded(program, dataset) {
  const creator = CREATOR_BY_TYPE[dataset.transform?.[0]?.type];
  return creator !== undefined && program.trace.children.some(node =>
    node.op === creator && node.args?.id === dataset.id
  );
}

export function resolveDerivedDataOwner(program, target, type) {
  const requested = validateUserId(target, "Derived dataset target");
  const matching = ownerRecords(program, type).filter(record =>
    record.owner === requested || record.current === requested
  );
  if (matching.length > 1) {
    throw new Error(`Derived dataset target "${requested}" is ambiguous.`);
  }
  if (matching.length === 1) {
    const record = matching[0];
    if (record.dataset === undefined) {
      throw new Error(
        `Derived dataset owner "${record.owner}" has no current dataset.`
      );
    }
    return { ...record, lazy: false };
  }

  const dataset = findDataset(program, requested);
  if (dataset === undefined) {
    throw new Error(staleOwnerRecord(program, requested, type) !== undefined
      ? `Derived dataset revision "${requested}" is stale.`
      : `Unknown derived dataset owner "${requested}".`
    );
  }
  if (staleOwnerRecord(program, requested, type) !== undefined) {
    throw new Error(`Derived dataset revision "${requested}" is stale.`);
  }
  if (dataset.source === undefined || dataset.transform?.length !== 1) {
    throw new Error(
      `Dataset "${requested}" is a source dataset and cannot be edited.`
    );
  }
  const currentType = dataset.transform[0].type;
  if (type !== undefined && currentType !== type) {
    throw new Error(
      `Derived dataset "${requested}" is ${currentType}, not ${type}.`
    );
  }
  if (
    findTransformPolicy(currentType)?.editable !== true ||
    !topLevelCreatorRecorded(program, dataset)
  ) {
    throw new Error(
      `Derived dataset "${requested}" is chart-owned; use its owning chart editor.`
    );
  }
  return {
    family: currentType,
    owner: dataset.id,
    current: dataset.id,
    dataset,
    lazy: true
  };
}

export function normalizeDerivedDependentPolicy(value) {
  const policy = value ?? "reject";
  if (!DEPENDENT_POLICIES.has(policy)) {
    throw new Error(
      'Derived data dependents must be "reject" or "recompute".'
    );
  }
  return policy;
}

function downstreamDatasets(program, root) {
  const order = new Map(
    program.semanticSpec.datasets.map((dataset, index) => [dataset.id, index])
  );
  const bySource = new Map();
  for (const dataset of program.semanticSpec.datasets) {
    if (dataset.source === undefined) continue;
    const children = bySource.get(dataset.source) ?? [];
    children.push(dataset);
    bySource.set(dataset.source, children);
  }
  for (const children of bySource.values()) {
    children.sort((left, right) => order.get(left.id) - order.get(right.id));
  }

  const result = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      throw new Error(`Derived dataset dependency graph contains a cycle at "${id}".`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of bySource.get(id) ?? []) {
      if (child.transform?.length !== 1) {
        throw new Error(
          `Derived dataset "${child.id}" requires one replayable transform.`
        );
      }
      const policy = findTransformPolicy(child.transform[0].type);
      if (typeof policy?.materializeOp !== "string") {
        throw new Error(
          `Derived dataset "${child.id}" has unsupported transform ` +
          `"${child.transform[0].type ?? "unknown"}".`
        );
      }
      // Statistical reference data is an owned cache. Its mark lifecycle
      // reconnects and recomputes it after the visible source mark is rebound.
      if (child.transform[0].type === "statisticalReference") continue;
      result.push(child);
      visit(child.id);
    }
    visiting.delete(id);
    visited.add(id);
  }
  visit(root);
  return result;
}

function ownerForCurrent(program, dataset) {
  const matches = ownerRecords(program).filter(record =>
    record.current === dataset.id
  );
  if (matches.length > 1) {
    throw new Error(
      `Derived dataset "${dataset.id}" has ambiguous logical ownership.`
    );
  }
  return matches[0];
}

function nextRevisionId(program, owner, role, reserved) {
  let revision = 1;
  const prefix = `${owner}${role}Revision`;
  while (
    hasDataset(program, `${prefix}${revision}`) ||
    reserved.has(`${prefix}${revision}`)
  ) revision += 1;
  const id = `${prefix}${revision}`;
  reserved.add(id);
  return id;
}

function buildRevisionPlan(
  program,
  resolved,
  definition,
  dependents,
  rootSource = resolved.dataset.source
) {
  const downstream = downstreamDatasets(program, resolved.current);
  if (dependents === "reject" && downstream.length > 0) {
    throw new Error(
      `Cannot edit derived dataset "${resolved.owner}" while derived dataset ` +
      `"${downstream[0].id}" depends on it; use dependents: "recompute".`
    );
  }
  if (downstream.some(dataset => dataset.id === rootSource)) {
    throw new Error(
      `Derived dataset "${resolved.owner}" cannot use one of its dependents as source.`
    );
  }
  const reserved = new Set();
  const revisions = [];
  const replacements = new Map();
  const add = (dataset, ownerRecord, transform, requestedSource) => {
    const owner = ownerRecord?.owner ?? dataset.id;
    const role = REVISION_ROLE[transform.type] ?? "DerivedData";
    const id = nextRevisionId(program, owner, role, reserved);
    const originalSource = requestedSource ?? dataset.source;
    const source = replacements.get(originalSource) ?? originalSource;
    const revision = {
      old: dataset.id,
      id,
      source,
      transform,
      family: ownerRecord?.family,
      owner: ownerRecord?.owner
    };
    revisions.push(revision);
    replacements.set(dataset.id, id);
  };
  add(resolved.dataset, resolved, definition, rootSource);
  if (dependents === "recompute") {
    for (const dataset of downstream) {
      const policy = findTransformPolicy(dataset.transform[0].type);
      const transform = policy.replayTransform?.(dataset.transform[0]) ??
        dataset.transform[0];
      add(dataset, ownerForCurrent(program, dataset), transform);
    }
  }
  return { revisions, replacements };
}

function directLayerConsumers(program, data) {
  return program.semanticSpec.layers
    .filter(layer => layer.data === data)
    .map(layer => layer.id);
}

function applyRevisionPlan(program, resolved, plan) {
  const root = plan.revisions[0];
  const changes = outputFieldChanges(
    resolved.dataset.transform[0],
    root.transform
  );
  let next = program;
  for (const revision of plan.revisions) {
    const policy = findTransformPolicy(revision.transform.type);
    next = next
      .createDerivedData({
        id: revision.id,
        source: revision.source,
        transform: [revision.transform]
      })
      [policy.materializeOp]({ id: revision.id });
  }

  const consumers = plan.revisions.flatMap(revision =>
    directLayerConsumers(program, revision.old).map(id => ({
      id,
      old: revision.old,
      data: revision.id,
      root: revision.old === root.old
    }))
  );
  for (const consumer of consumers) {
    next = next.rebindLayerData({ id: consumer.id, data: consumer.data });
  }
  for (const consumer of consumers) {
    if (consumer.root) {
      next = rebindLayerOutputFields(next, consumer.id, changes);
    }
  }

  next = rebindMaterializationDataReferences(next, plan.replacements);
  for (const revision of plan.revisions) {
    if (revision.owner !== undefined) {
      next = next._withMaterializationConfig(
        ["data", revision.family, revision.owner],
        { current: revision.id }
      );
    }
  }
  for (const consumer of consumers) {
    next = applyLayerDataRematerialization(next, consumer.id);
  }
  for (const revision of [...plan.revisions].reverse()) {
    next = next.releaseDerivedData({ id: revision.old });
  }

  const currentData = plan.replacements.get(program.context.currentData) ??
    program.context.currentData;
  return next._withContext({ ...program.context, currentData });
}

function sameRequested(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function reviseDerivedData(program, {
  resolved,
  definition,
  dependents = "reject",
  source = resolved.dataset.source
}) {
  const policy = normalizeDerivedDependentPolicy(dependents);
  const plan = buildRevisionPlan(
    program,
    resolved,
    definition,
    policy,
    source
  );
  applyRevisionPlan(program, resolved, plan);
  return applyRevisionPlan(program, resolved, plan);
}

export const editDerivedData = action(
  {
    op: "editDerivedData",
    description: "Atomically revise one standalone derived-data definition."
  },
  function (args = {}) {
    validateKeys(args, GENERIC_OPTIONS, "editDerivedData");
    if (!Object.hasOwn(args, "target")) {
      throw new TypeError("editDerivedData requires target.");
    }
    if (!isPlainObject(args.definition)) {
      throw new TypeError("editDerivedData definition must be a plain object.");
    }
    for (const forbidden of ["id", "source", "resolved", "current"]) {
      if (Object.hasOwn(args.definition, forbidden)) {
        throw new Error(`editDerivedData definition cannot include ${forbidden}.`);
      }
    }
    const dependents = normalizeDerivedDependentPolicy(args.dependents);
    const resolved = resolveDerivedDataOwner(
      this,
      args.target,
      args.definition.type
    );
    const definition = requestedDatasetTransform(args.definition);
    findTransformPolicy(definition.type).validate(definition);
    const previous = requestedDatasetTransform(resolved.dataset.transform[0]);
    if (sameRequested(definition, previous)) return this;

    return reviseDerivedData(this, { resolved, definition, dependents });
  }
);

function focusedEditor(op, type, properties) {
  const supported = Object.freeze(["target", "dependents", ...properties]);
  return action(
    { op, description: `Partially revise one standalone ${type} dataset.` },
    function (args = {}) {
      validateKeys(args, supported, op);
      if (!Object.hasOwn(args, "target")) {
        throw new TypeError(`${op} requires target.`);
      }
      const patch = Object.fromEntries(Object.entries(args).filter(
        ([key]) => key !== "target" && key !== "dependents"
      ));
      if (Object.keys(patch).length === 0) {
        throw new Error(`${op} requires at least one transform option.`);
      }
      const undefinedKey = Object.keys(patch).find(
        key => patch[key] === undefined
      );
      if (undefinedKey !== undefined) {
        throw new TypeError(
          `${op} ${undefinedKey} cannot be undefined; omission preserves it.`
        );
      }
      const resolved = resolveDerivedDataOwner(this, args.target, type);
      const definition = normalizeDatasetTransformEdit(
        resolved.dataset.transform[0],
        patch,
        resolved.owner
      );
      return this.editDerivedData({
        target: args.target,
        definition,
        ...(args.dependents === undefined
          ? {}
          : { dependents: args.dependents })
      });
    }
  );
}

export const editComputedData = focusedEditor(
  "editComputedData", "computed", ["as", "expression"]
);
export const editFilteredData = focusedEditor(
  "editFilteredData", "filter", ["field", "oneOf", "predicate", "range"]
);
export const editFoldData = focusedEditor(
  "editFoldData", "fold", ["fields", "as"]
);
export const editSummaryData = focusedEditor(
  "editSummaryData", "summary", ["groupBy", "aggregates", "members", "weight"]
);
export const editBinData = focusedEditor(
  "editBinData", "bin", [
    "field", "maxBins", "step", "boundaries", "extent", "nice", "zero",
    "includeEmpty", "members", "as", "weight"
  ]
);
export const editTimeUnitData = focusedEditor(
  "editTimeUnitData", "timeUnit", [
    "field", "unit", "as", "temporalUnit", "timeZone", "weekStartsOn",
    "weekRule"
  ]
);
export const editWindowData = focusedEditor(
  "editWindowData", "window", [
    "partitionBy", "sortBy", "operations", "temporalUnit"
  ]
);
export const editDensityData = focusedEditor(
  "editDensityData", "density", [
    "field", "groupBy", "bandwidth", "extent", "steps", "kernel",
    "normalization", "as", "weight"
  ]
);
export const editStackData = focusedEditor(
  "editStackData", "stack", ["category", "group", "value", "mode", "as"]
);
export const editRegressionData = focusedEditor(
  "editRegressionData", "regression", [
    "x", "y", "groupBy", "method", "degree", "span", "confidenceMethod",
    "level", "confidence", "interval"
  ]
);
export const editIntervalData = focusedEditor(
  "editIntervalData", "interval", [
    "field", "groupBy", "center", "extent", "method", "level", "as"
  ]
);
export const editECDFData = focusedEditor(
  "editECDFData", "ecdf", [
    "field", "groupBy", "weight", "missing", "as"
  ]
);
export const editNormalizedData = focusedEditor(
  "editNormalizedData", "normalize", [
    "field", "as", "groupBy", "method", "variance", "zeroDenominator",
    "baseline", "sortBy"
  ]
);
export const editCompleteData = focusedEditor(
  "editCompleteData", "complete", [
    "key", "groupBy", "values", "sequence", "fill", "members"
  ]
);
export const editImputedData = focusedEditor(
  "editImputedData", "impute", [
    "fields", "groupBy", "sortBy", "method", "value", "edges", "maxGap"
  ]
);

export const EDIT_DERIVED_DATA_ACTIONS = Object.freeze({
  editDerivedData,
  editComputedData,
  editFilteredData,
  editFoldData,
  editSummaryData,
  editBinData,
  editTimeUnitData,
  editWindowData,
  editDensityData,
  editStackData,
  editRegressionData,
  editIntervalData,
  editECDFData,
  editNormalizedData,
  editCompleteData,
  editImputedData
});
