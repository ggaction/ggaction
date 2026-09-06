import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import { withPreviewDatasetValues } from
  "../primitives/semanticAction.js";
import {
  deriveFilteredRows,
  normalizeFilterTransform
} from "../../grammar/filter.js";
import {
  deriveMarkFilteredRows,
  markFilterSelectors,
  normalizeMarkFilterTransform
} from "../../grammar/markFilter.js";
import { resolveMarkFilterSelection } from "../../materialization/selection/filter.js";
import { findSelectionPolicy } from
  "../../materialization/selection/policies/index.js";
import {
  applyLayerDataRematerialization,
  applyLayerEmptyDataView
} from "../../materialization/dependencies.js";
import {
  hasDataset,
  findDataset,
  requireLayer,
  resolveEligibleLayer
} from "../../selectors/index.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "oneOf", "predicate", "range"
]);
const MARK_SELECTOR_KEYS = Object.freeze([
  "grain", "field", "channel", "property", "op", "value", "values",
  "min", "max", "inclusive", "count", "groupBy", "ties"
]);
const MARK_OPTIONS = Object.freeze(["target", "mode", ...MARK_SELECTOR_KEYS]);
const REMOVE_MARK_FILTER_OPTIONS = Object.freeze(["target"]);
const EMPTY_MARK_OPTIONS = Object.freeze(["id"]);

function retainedHistogramBoundaries(layer, items) {
  if (layer.mark?.type !== "bar" || layer.encoding?.x?.bin === undefined) {
    return undefined;
  }
  const boundaries = [...new Set(items.flatMap(item => [
    item.channels.x,
    item.channels.x2
  ]).filter(Number.isFinite))].sort((left, right) => left - right);
  return boundaries.length < 2 ? undefined : boundaries;
}

export const materializeFilteredData = action(
  { op: "materializeFilteredData", description: "Materialize one filtered derived dataset." },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeFilteredData");
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "filter"
    );
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: deriveFilteredRows(source.values, transform)
    });
  }
);

export const filterData = action(
  { op: "filterData", description: "Create a named dataset from one field filter." },
  function (args = {}) {
    validateKeys(args, OPTIONS, "filterData");
    const id = validateUserId(args.id, "Filtered dataset id");
    const source = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const transform = normalizeFilterTransform(args);
    return this
      .createDerivedData({
        id,
        source,
        transform: [transform]
      })
      .materializeFilteredData({ id });
  }
);

export const materializeMarkFilteredData = action(
  {
    op: "materializeMarkFilteredData",
    description: "Materialize member rows retained by one final-item mark selection."
  },
  function (args = {}) {
    validateKeys(args, MATERIALIZE_OPTIONS, "materializeMarkFilteredData");
    const { id, dataset, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "markFilter"
    );
    const layer = requireLayer(this, transform.target);
    if (layer?.data !== dataset.source) {
      throw new Error(
        `Mark filter target "${transform.target}" must still use source dataset "${dataset.source}".`
      );
    }
    let preview = this;
    let currentRows = source.values;
    const selectors = markFilterSelectors(transform);
    for (const [index, selector] of selectors.entries()) {
      const resolved = resolveMarkFilterSelection(
        preview,
        transform.target,
        selector
      );
      currentRows = deriveMarkFilteredRows(
        currentRows,
        resolved.items,
        resolved.keys
      );
      if (index < selectors.length - 1) {
        preview = withPreviewDatasetValues(preview, {
          id,
          values: currentRows,
          target: transform.target
        });
        preview = currentRows.length === 0
          ? applyLayerEmptyDataView(preview, transform.target)
          : applyLayerDataRematerialization(preview, transform.target);
        currentRows = findDataset(preview, id).values;
      }
    }
    if (selectors.length > 1) {
      preview = withPreviewDatasetValues(preview, {
        id,
        omitValues: true
      });
    }
    let next = preview.editSemantic({
      property: `dataset[${id}].values`,
      value: currentRows
    });
    if (requireLayer(next, transform.target).data !== id) {
      next = next.editSemantic({
        property: `layer[${transform.target}].data`,
        value: id
      });
    }
    next = next._withMarkConfig(transform.target, {
      ...next.markConfigs[transform.target],
      markFilter: {
        ...next.markConfigs[transform.target].markFilter,
        empty: currentRows.length === 0
      }
    });
    return currentRows.length === 0
      ? next.materializeEmptyMark({ id: transform.target })
      : applyLayerDataRematerialization(next, transform.target);
  }
);

export const materializeEmptyMark = action(
  {
    op: "materializeEmptyMark",
    description: "Clear one active empty-filter mark without changing its domains."
  },
  function (args = {}) {
    validateKeys(args, EMPTY_MARK_OPTIONS, "materializeEmptyMark");
    const id = validateUserId(args.id, "Empty mark id");
    const layer = requireLayer(this, id);
    const owner = this.markConfigs[id]?.markFilter;
    const dataset = findDataset(this, layer.data);
    if (owner?.empty !== true || dataset?.values?.length !== 0) {
      throw new Error(`Mark "${id}" does not own an active empty filter.`);
    }
    return applyLayerEmptyDataView(this, id);
  }
);

function activeMarkFilter(program, layer) {
  const configured = program.markConfigs[layer.id]?.markFilter;
  const dataset = findDataset(program, layer.data);
  const transform = dataset?.transform?.[0];
  if (
    dataset?.source === undefined ||
    transform?.type !== "markFilter" ||
    transform.target !== layer.id
  ) {
    return undefined;
  }
  return {
    dataset: dataset.id,
    source: dataset.source,
    selectors: markFilterSelectors(transform),
    ...(configured?.originalBin === undefined
      ? {}
      : { originalBin: configured.originalBin })
  };
}

function withoutMarkFilterConfig(program, id) {
  const config = program.markConfigs[id] ?? {};
  const { markFilter: unused, ...remaining } = config;
  void unused;
  return program._withMarkConfig(id, remaining);
}

function restoreHistogramBin(program, layer, originalBin) {
  let next = program;
  const current = layer.encoding?.x?.bin ?? {};
  for (const property of ["maxBins", "step", "boundaries"]) {
    if (Object.hasOwn(originalBin, property)) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.bin.${property}`,
        value: originalBin[property]
      });
    } else if (Object.hasOwn(current, property)) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.bin.${property}`,
        remove: true
      });
    }
  }
  return next;
}

function removeActiveMarkFilter(program, layer, owner) {
  let next = program.editSemantic({
    property: `layer[${layer.id}].data`,
    value: owner.source
  });
  if (owner.originalBin !== undefined) {
    next = restoreHistogramBin(next, requireLayer(next, layer.id), owner.originalBin);
  }
  next = withoutMarkFilterConfig(next, layer.id)
    .releaseDerivedData({ id: owner.dataset })
    ._withContext({ currentData: owner.source });
  return applyLayerDataRematerialization(next, layer.id);
}

function nextMarkFilterDatasetId(program, layerId) {
  const base = `${layerId}FilteredData`;
  if (!hasDataset(program, base)) return base;
  let revision = 2;
  while (hasDataset(program, `${base}${revision}`)) revision += 1;
  return `${base}${revision}`;
}

function sameSelector(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export const removeMarkFilter = action(
  {
    op: "removeMarkFilter",
    description: "Remove one active final-item filter and restore its source."
  },
  function (args = {}) {
    validateKeys(args, REMOVE_MARK_FILTER_OPTIONS, "removeMarkFilter");
    const target = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Mark filter target id");
    const layer = resolveEligibleLayer(this, {
      target,
      label: "mark filter",
      predicate: candidate => activeMarkFilter(this, candidate) !== undefined
    });
    return removeActiveMarkFilter(this, layer, activeMarkFilter(this, layer));
  }
);

export const filterMarks = action(
  {
    op: "filterMarks",
    description: "Retain selected final mark items through immutable derived data."
  },
  function (args = {}) {
    validateKeys(args, MARK_OPTIONS, "filterMarks");
    if (args.mode !== undefined && !["replace", "compose"].includes(args.mode)) {
      throw new Error(`Unknown mark filter mode "${args.mode}".`);
    }
    const target = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Filter mark target id");
    const layer = resolveEligibleLayer(this, {
      target,
      label: "filter mark",
      predicate: candidate =>
        candidate.data !== undefined &&
        findSelectionPolicy(candidate.mark?.type) !== undefined
    });
    if (this.markConfigs[layer.id]?.itemFilterable === false) {
      throw new Error(
        `filterMarks does not support composite mark "${layer.id}"; filter its source dataset first.`
      );
    }
    const owner = activeMarkFilter(this, layer);
    const selector = Object.fromEntries(
      MARK_SELECTOR_KEYS.flatMap(key =>
        Object.hasOwn(args, key) ? [[key, args[key]]] : []
      )
    );
    const resolved = resolveMarkFilterSelection(this, layer.id, selector);
    const previousSelector = owner?.selectors.at(-1);
    if (previousSelector !== undefined && sameSelector(previousSelector, resolved.selector)) {
      return this;
    }
    if (owner !== undefined && args.mode === undefined) {
      throw new Error(
        "Repeated filterMarks requires mode \"replace\" or \"compose\"."
      );
    }
    const selectors = owner === undefined || args.mode === "replace"
      ? [resolved.selector]
      : [...owner.selectors, resolved.selector];
    let next = owner === undefined
      ? this
      : removeActiveMarkFilter(this, layer, owner);
    const baseLayer = requireLayer(next, layer.id);
    const first = resolveMarkFilterSelection(next, layer.id, selectors[0]);
    const transform = normalizeMarkFilterTransform(layer.id, selectors);
    const boundaries = retainedHistogramBoundaries(baseLayer, first.items);
    const originalBin = baseLayer.mark?.type === "bar" &&
      baseLayer.encoding?.x?.bin !== undefined
      ? baseLayer.encoding.x.bin
      : undefined;
    const derivedId = nextMarkFilterDatasetId(next, layer.id);
    next = next
      .createDerivedData({
        id: derivedId,
        source: baseLayer.data,
        transform: [transform]
      });
    if (boundaries !== undefined) {
      for (const property of ["maxBins", "step"]) {
        if (Object.hasOwn(baseLayer.encoding.x.bin, property)) {
          next = next.editSemantic({
            property: `layer[${baseLayer.id}].encoding.x.bin.${property}`,
            remove: true
          });
        }
      }
      next = next.editSemantic({
        property: `layer[${baseLayer.id}].encoding.x.bin.boundaries`,
        value: boundaries
      });
    }
    next = next._withMarkConfig(baseLayer.id, {
      ...next.markConfigs[baseLayer.id],
      markFilter: {
        dataset: derivedId,
        source: baseLayer.data,
        selectors,
        empty: false,
        ...(originalBin === undefined ? {} : { originalBin })
      }
    });
    return next.materializeMarkFilteredData({ id: derivedId });
  }
);
