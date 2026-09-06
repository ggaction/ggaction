import { hasSemanticScaleReferences } from "../../selectors/scales.js";
import { action } from "../../core/action.js";
import {
  cloneAndFreeze,
  freezeOwned,
  isPlainObject,
  removeOwnedPath
} from "../../core/immutable.js";
import { parseSemanticPath } from "../../grammar/schemas/semanticPath.js";

const CONTEXT_KEYS = Object.freeze({
  dataset: "currentData",
  layer: "currentMark",
  scale: "currentScale",
  coordinate: "currentCoordinate",
  guide: "currentGuide"
});

function setNestedProperty(source, path, value) {
  const [key, ...rest] = path;

  if (rest.length === 0) {
    return freezeOwned({ ...source, [key]: cloneAndFreeze(value) });
  }

  const child = isPlainObject(source[key]) ? source[key] : {};
  return freezeOwned({
    ...source,
    [key]: setNestedProperty(child, rest, value)
  });
}

function updateEntity(spec, parsed, value) {
  const collection = spec[parsed.collection];
  const index = collection.findIndex(item => item.id === parsed.id);

  if (
    parsed.kind === "dataset" &&
    index !== -1 &&
    Object.hasOwn(collection[index], "values")
  ) {
    throw new Error(`Dataset "${parsed.id}" is immutable after creation.`);
  }

  const current = index === -1 ? { id: parsed.id } : collection[index];
  const updated = setNestedProperty(current, parsed.path, value);
  const nextCollection = [...collection];

  if (index === -1) {
    nextCollection.push(updated);
  } else {
    nextCollection[index] = updated;
  }

  return freezeOwned({
    ...spec,
    [parsed.collection]: freezeOwned(nextCollection)
  });
}

function updateGuides(spec, parsed, value) {
  return freezeOwned({
    ...spec,
    guides: setNestedProperty(spec.guides, parsed.path, value)
  });
}

function updateTitle(spec, parsed, value) {
  return freezeOwned({
    ...spec,
    title: setNestedProperty(spec.title, parsed.path, value)
  });
}

function removeEntity(spec, parsed) {
  const collection = spec[parsed.collection];
  const index = collection.findIndex(item => item.id === parsed.id);
  if (index === -1) return spec;
  if (parsed.kind === "scale" && parsed.path.length === 0) {
    if (hasSemanticScaleReferences(spec, parsed.id)) throw new Error(`Scale "${parsed.id}" is still referenced.`);
  }
  if (["layer", "scale"].includes(parsed.kind) && parsed.path.length === 0) {
    const nextCollection = collection.filter((_, itemIndex) => itemIndex !== index);
    return freezeOwned({
      ...spec,
      [parsed.collection]: freezeOwned(nextCollection)
    });
  }
  if (parsed.kind === "dataset" && parsed.path.length === 0) {
    const dataset = collection[index];
    if (dataset.source === undefined) {
      throw new Error(`Source dataset "${parsed.id}" is immutable after creation.`);
    }
    const referenced = spec.layers.some(layer => layer.data === parsed.id) ||
      spec.datasets.some(candidate => candidate.source === parsed.id);
    if (referenced) {
      throw new Error(`Derived dataset "${parsed.id}" is still referenced.`);
    }
    const nextCollection = collection.filter((_, itemIndex) => itemIndex !== index);
    return freezeOwned({
      ...spec,
      [parsed.collection]: freezeOwned(nextCollection)
    });
  }
  if (parsed.kind === "dataset") {
    throw new Error(`Dataset "${parsed.id}" is immutable after creation.`);
  }
  const removed = removeOwnedPath(collection[index], parsed.path);
  if (!removed.removed) return spec;
  const nextCollection = [...collection];
  nextCollection[index] = removed.value;
  return freezeOwned({
    ...spec,
    [parsed.collection]: freezeOwned(nextCollection)
  });
}

function removeRootProperty(spec, root, path) {
  const removed = removeOwnedPath(spec[root], path);
  return removed.removed
    ? freezeOwned({ ...spec, [root]: removed.value })
    : spec;
}

// Materializers use this only for an immutable speculative branch while they
// replay a multi-step recipe. The public semantic primitive deliberately keeps
// materialized dataset values immutable after creation.
export function withPreviewDatasetValues(program, {
  id,
  values,
  target,
  omitValues = false
}) {
  const semanticSpec = {
    ...program.semanticSpec,
    datasets: program.semanticSpec.datasets.map(dataset => {
      if (dataset.id !== id) return dataset;
      if (omitValues) {
        const { values: unused, ...definition } = dataset;
        void unused;
        return definition;
      }
      return { ...dataset, values };
    }),
    layers: target === undefined
      ? program.semanticSpec.layers
      : program.semanticSpec.layers.map(layer =>
          layer.id === target ? { ...layer, data: id } : layer
        )
  };
  return program._clone({ semanticSpec });
}

export function createSemanticPrimitiveAction(validateSemanticValue) {
  return action(
    {
      op: "editSemantic",
      description: "Create, replace, or remove one semantic property.",
      scope: "any"
    },
    function ({ property, value, remove = false } = {}) {
      if (typeof remove !== "boolean") {
        throw new TypeError("editSemantic remove must be a boolean.");
      }
      if (remove && value !== undefined) {
        throw new Error("editSemantic cannot combine value and remove.");
      }
      if (!remove && value === undefined) {
        throw new TypeError("editSemantic requires a value.");
      }

      const parsed = parseSemanticPath(property, { allowContainer: remove });
      if (this.compositionSpec !== undefined && !(
        this.compositionSpec.type === "facet" && parsed.kind === "title"
      )) {
        throw new Error(
          "editSemantic on a composition parent currently supports only facet title state."
        );
      }
      if (remove) {
        const semanticSpec = parsed.kind === "guide"
          ? removeRootProperty(this.semanticSpec, "guides", parsed.path)
          : parsed.kind === "title"
            ? removeRootProperty(this.semanticSpec, "title", parsed.path)
            : removeEntity(this.semanticSpec, parsed);
        if (semanticSpec === this.semanticSpec) return this;
        const clearsCurrentData =
          parsed.kind === "dataset" &&
          parsed.path.length === 0 &&
          this.context.currentData === parsed.id;
        const clearsCurrentMark =
          parsed.kind === "layer" &&
          parsed.path.length === 0 &&
          this.context.currentMark === parsed.id;
        const removesScale = parsed.kind === "scale" && parsed.path.length === 0;
        const resolvedScales = removesScale ? Object.fromEntries(Object.entries(this.resolvedScales).filter(([id]) => id !== parsed.id)) : this.resolvedScales;
        return this._clone({
          semanticSpec,
          ...(removesScale ? { resolvedScales: freezeOwned(resolvedScales) } : {}),
          ...(clearsCurrentData || clearsCurrentMark || (removesScale && this.context.currentScale === parsed.id)
            ? { context: freezeOwned({
                ...this.context,
                ...(removesScale && this.context.currentScale === parsed.id ? { currentScale: undefined } : {}),
                ...(clearsCurrentData ? { currentData: undefined } : {}),
                ...(clearsCurrentMark ? { currentMark: undefined } : {})
              }) }
            : {})
        });
      }
      validateSemanticValue(this, parsed, value);

      const semanticSpec = parsed.kind === "guide"
        ? updateGuides(this.semanticSpec, parsed, value)
        : parsed.kind === "title"
          ? updateTitle(this.semanticSpec, parsed, value)
          : updateEntity(this.semanticSpec, parsed, value);
      const contextKey = CONTEXT_KEYS[parsed.kind];
      const context = contextKey === undefined
        ? this.context
        : freezeOwned({ ...this.context, [contextKey]: parsed.id });

      return this._clone({ semanticSpec, context });
    }
  );
}
