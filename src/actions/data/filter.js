import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateKeys } from "../../core/validation.js";
import {
  deriveFilteredRows,
  normalizeFilterTransform
} from "../../grammar/filter.js";
import {
  deriveMarkFilteredRows,
  normalizeMarkFilterTransform
} from "../../grammar/markFilter.js";
import { resolveMarkFilterSelection } from "../../materialization/selection/filter.js";
import {
  applyLayerDataRematerialization
} from "../../materialization/dependencies.js";
import { hasDataset, resolveEligibleLayer } from "../../selectors/index.js";
import { MATERIALIZE_OPTIONS, requireDerivedDataset } from "./shared.js";

const OPTIONS = Object.freeze([
  "id", "source", "field", "oneOf", "predicate", "range"
]);
const MARK_SELECTOR_KEYS = Object.freeze([
  "grain", "field", "channel", "property", "op", "value", "values",
  "min", "max", "inclusive", "count", "groupBy", "ties"
]);
const MARK_OPTIONS = Object.freeze(["target", ...MARK_SELECTOR_KEYS]);

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
    const layer = this.semanticSpec.layers.find(
      candidate => candidate.id === transform.target
    );
    if (layer?.data !== dataset.source) {
      throw new Error(
        `Mark filter target "${transform.target}" must still use source dataset "${dataset.source}".`
      );
    }
    const resolved = resolveMarkFilterSelection(
      this,
      transform.target,
      transform.selector
    );
    return this.editSemantic({
      property: `dataset[${id}].values`,
      value: deriveMarkFilteredRows(source.values, resolved.items, resolved.keys)
    });
  }
);

export const filterMarks = action(
  {
    op: "filterMarks",
    description: "Retain selected final mark items through immutable derived data."
  },
  function (args = {}) {
    validateKeys(args, MARK_OPTIONS, "filterMarks");
    const target = args.target === undefined
      ? undefined
      : validateUserId(args.target, "Filter mark target id");
    const layer = resolveEligibleLayer(this, {
      target,
      label: "filter mark",
      predicate: candidate =>
        candidate.data !== undefined &&
        ["point", "bar", "line", "area", "rule"].includes(candidate.mark?.type)
    });
    const derivedId = `${layer.id}FilteredData`;
    if (hasDataset(this, derivedId)) {
      throw new Error(`Dataset "${derivedId}" already exists.`);
    }
    const selector = Object.fromEntries(
      MARK_SELECTOR_KEYS.flatMap(key =>
        Object.hasOwn(args, key) ? [[key, args[key]]] : []
      )
    );
    const resolved = resolveMarkFilterSelection(this, layer.id, selector);
    if (resolved.keys.length === 0) {
      throw new Error("filterMarks requires at least one matching mark item.");
    }
    const transform = normalizeMarkFilterTransform(layer.id, resolved.selector);
    const boundaries = retainedHistogramBoundaries(layer, resolved.items);
    let next = this
      .createDerivedData({
        id: derivedId,
        source: layer.data,
        transform: [transform]
      })
      .materializeMarkFilteredData({ id: derivedId });
    if (boundaries !== undefined) {
      for (const property of ["maxBins", "step"]) {
        if (Object.hasOwn(layer.encoding.x.bin, property)) {
          next = next.editSemantic({
            property: `layer[${layer.id}].encoding.x.bin.${property}`,
            remove: true
          });
        }
      }
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.bin.boundaries`,
        value: boundaries
      });
    }
    next = next.editSemantic({
      property: `layer[${layer.id}].data`,
      value: derivedId
    });
    return applyLayerDataRematerialization(next, layer.id);
  }
);
