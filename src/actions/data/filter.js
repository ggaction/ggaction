import { retainedHistogramBoundaries, restoreHistogramBin, preserveHistogramBin } from "./filterGeometry.js";
import { findNativeMarkFilterDataset, findMarkVisibilityDataset, isEmptyMarkFilteredView } from "../../selectors/datasets.js";
import { preserveMarkVisibility } from "./visibility.js";
import { MARK_SELECTOR_KEYS } from "../../grammar/markSelection.js";
import { resolveFilterEnvironment } from "../../materialization/expressionInputs.js";
import { activeGraphFilter } from "../../selectors/graphFilters.js";
import { isSourceOwnedText } from "../../grammar/text.js";
import { markFilterSourceIndices } from "../../materialization/selection/rows.js";
import { assertIndependentOverlayGeometry } from "../../grammar/overlay.js";
import { findRaincloudParent } from "../../selectors/raincloud.js";
import { filterRaincloud, materializeRaincloudFilter, removeRaincloudFilter } from "./raincloudFilter.js";
import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";

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
import { resolveMarkFilterSelection, resolveMarkVisibilitySelection } from "../../materialization/selection/filter.js";
import { synchronizeBoxFilter } from "../boxPlots/components.js";
import { findSelectionPolicy } from
  "../../materialization/selection/policies/index.js";
import {
  applyLayerDataRematerialization,
  applyLayerEmptyDataView
} from "../../materialization/dependencies.js";
import {
  hasDataset,
  findDataset,
  resolveDatasetReference,
  requireLayer,
  resolveEligibleLayer
} from "../../selectors/index.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";
import {
  assertFieldsAvailable,
  deriveTransformSchema,
  transformInputFields
} from "../../grammar/datasetSchema.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "oneOf", "noneOf", "predicate", "range", "nulls", "where"
]);
const MARK_OPTIONS = Object.freeze(["target", "mode", "recompute", ...MARK_SELECTOR_KEYS]);
const REMOVE_MARK_FILTER_OPTIONS = Object.freeze(["target"]);
const EMPTY_MARK_OPTIONS = Object.freeze(["id"]);


export const materializeFilteredData = /* @__PURE__ */ closedAction(
  { op: "materializeFilteredData", description: "Materialize one filtered derived dataset." }, MATERIALIZE_OPTIONS,
  function (args = {}) {
    const { id, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "filter"
    );
    assertFieldsAvailable(source.schema, transformInputFields(transform), {
      data: source.id,
      operation: "materializeFilteredData"
    });
    const values = deriveFilteredRows(source.values, transform, resolveFilterEnvironment(this, source, transform));
    const schema = deriveTransformSchema(source.schema, transform, values, {
      sourceId: source.id,
      ownerId: id
    });
    return this.editSemantic({ property: `dataset[${id}].values`, value: values });
  }
);

export const filterData = /* @__PURE__ */ closedAction(
  { op: "filterData", description: "Create a named dataset from one field filter." }, OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Filtered dataset id");
    const requestedSource = validateUserId(
      args.source ?? this.context.currentData,
      "Source dataset id"
    );
    const source = resolveDatasetReference(
      this,
      requestedSource,
      "Filter source dataset"
    ).id;
    const transform = normalizeFilterTransform(args);
    const next = this
      .createDerivedData({
        id,
        source,
        transform: [transform]
      })
      .materializeFilteredData({ id });
    return this.actionStack.length === 1
      ? next._withMaterializationConfig(
          ["data", "filter", id],
          { current: id }
        )
      : next;
  }
);

export const materializeMarkFilteredData = /* @__PURE__ */ closedAction(
  {
    op: "materializeMarkFilteredData",
    description: "Materialize member rows retained by one final-item mark selection."
  }, MATERIALIZE_OPTIONS,
  function (args = {}) {
    const { id, dataset, source, transform } = requireDerivedDataset(
      this,
      args.id,
      "markFilter"
    );
    const raincloud = findRaincloudParent(this, transform.target);
    if (raincloud !== undefined) return materializeRaincloudFilter(this, { id, source, transform }, raincloud);
    const layer = requireLayer(this, transform.target);
    if (layer?.data !== dataset.source) {
      throw new Error(
        `Mark filter target "${transform.target}" must still use source dataset "${dataset.source}".`
      );
    }
    let preview = this;
    let currentRows = source.values;
    const selectors = transform.visibility === undefined ? markFilterSelectors(transform) : [];
    if (transform.visibility !== undefined) {
      const resolved = resolveMarkVisibilitySelection(preview, transform.target, transform.visibility);
      currentRows = deriveMarkFilteredRows(source.values, resolved.items, resolved.keys, layer);
    }
    for (const [index, selector] of selectors.entries()) {
      const resolved = resolveMarkFilterSelection(
        preview,
        transform.target,
        selector
      );
      currentRows = deriveMarkFilteredRows(
        currentRows,
        resolved.items,
        resolved.keys,
        layer
      );
      if (index < selectors.length - 1) {
        preview = withPreviewDatasetValues(preview, {
          id,
          values: currentRows,
          target: transform.target
        });
        preview = synchronizeBoxFilter(preview, transform.target, id);
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
    })._withMaterializationConfig(["rowProvenance", id], { indices: markFilterSourceIndices(source.values, currentRows) });
    if (requireLayer(next, transform.target).data !== id) {
      next = next.editSemantic({
        property: `layer[${transform.target}].data`,
        value: id
      });
    }
    const ownerKey = transform.visibility === undefined ? "markFilter" : "visibilityFilter";
    next = next._withMarkConfig(transform.target, {
      ...next.markConfigs[transform.target],
      [ownerKey]: {
        ...next.markConfigs[transform.target][ownerKey],
        dataset: id, source: dataset.source,
        empty: currentRows.length === 0
      }
    });
    next = synchronizeBoxFilter(next, transform.target, id);
    return currentRows.length === 0
      ? next.materializeEmptyMark({ id: transform.target })
      : applyLayerDataRematerialization(next, transform.target);
  }
);

export const materializeEmptyMark = /* @__PURE__ */ closedAction(
  {
    op: "materializeEmptyMark",
    description: "Clear one active empty-filter mark without changing its domains."
  }, EMPTY_MARK_OPTIONS,
  function (args = {}) {
    const id = validateUserId(args.id, "Empty mark id");
    const layer = requireLayer(this, id);
    if (!isEmptyMarkFilteredView(this, layer)) {
      throw new Error(`Mark "${id}" does not own an active empty filter.`);
    }
    return applyLayerEmptyDataView(this, id);
  }
);

function activeMarkFilter(program, layer) {
  const configured = program.markConfigs[layer.id]?.markFilter;
  const dataset = findNativeMarkFilterDataset(program, layer);
  if (dataset === undefined) return undefined;
  const transform = dataset.transform[0];
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


function removeActiveMarkFilter(program, layer, owner) {
  let next = synchronizeBoxFilter(program, layer.id).editSemantic({
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

export const removeMarkFilter = /* @__PURE__ */ closedAction(
  {
    op: "removeMarkFilter",
    description: "Remove one active final-item filter and restore its source."
  }, REMOVE_MARK_FILTER_OPTIONS,
  function (args = {}) {
    const target = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Mark filter target id");
    const raincloud = findRaincloudParent(this, target);
    if (raincloud !== undefined) return removeRaincloudFilter(this, raincloud);
    const layer = resolveEligibleLayer(this, {
      target,
      label: "mark filter",
      predicate: candidate => activeMarkFilter(this, candidate) !== undefined || activeGraphFilter(this, candidate) !== undefined
    });
    if (findMarkVisibilityDataset(this, layer)) {
      return preserveMarkVisibility(this, layer.id, next => next.removeMarkFilter({ target: layer.id }));
    }
    if (activeGraphFilter(this, layer) !== undefined) return this.restoreGraphPlotView({ target: layer.id });
    return removeActiveMarkFilter(this, layer, activeMarkFilter(this, layer));
  }
);

export const filterMarks = /* @__PURE__ */ closedAction(
  {
    op: "filterMarks",
    description: "Retain selected final mark items through immutable derived data."
  }, MARK_OPTIONS,
  function (args = {}) {
    if (Object.hasOwn(args, "recompute") && typeof args.recompute !== "boolean") throw new TypeError("filterMarks recompute must be boolean.");
    if (args.mode !== undefined && !["replace", "compose"].includes(args.mode)) {
      throw new Error(`Unknown mark filter mode "${args.mode}".`);
    }
    const target = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Filter mark target id");
    const raincloud = findRaincloudParent(this, target);
    if (raincloud !== undefined) {
      if (args.recompute === true) throw new TypeError("filterMarks recompute requires an inferred graph.");
      const selector = Object.fromEntries(MARK_SELECTOR_KEYS.flatMap(key => Object.hasOwn(args, key) ? [[key, args[key]]] : []));
      return filterRaincloud(this, args, raincloud, selector);
    }
    const layer = resolveEligibleLayer(this, {
      target,
      label: "filter mark",
      predicate: candidate =>
        (candidate.data !== undefined || candidate.mark?.type === "graph") && (target !== undefined || !isSourceOwnedText(candidate)) &&
        findSelectionPolicy(candidate.mark?.type) !== undefined
    });
    if (findMarkVisibilityDataset(this, layer)) {
      return preserveMarkVisibility(this, layer.id, next => next.filterMarks({ ...args, target: layer.id }));
    }
    assertIndependentOverlayGeometry(layer, "filterMarks");
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
    if (layer.mark.type === "graph") return this.filterGraphPlotView({ target: layer.id, selector,
      ...(args.mode === undefined ? {} : { mode: args.mode }), ...(args.recompute === undefined ? {} : { recompute: args.recompute }) });
    if (args.recompute === true) throw new TypeError("filterMarks recompute requires an inferred graph.");
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
    next = preserveHistogramBin(next, baseLayer, boundaries);
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
