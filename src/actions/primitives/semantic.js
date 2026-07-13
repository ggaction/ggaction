import { action } from "../../core/action.js";
import { cloneAndFreeze, freezeOwned, isPlainObject } from "../../core/immutable.js";
import { parseSemanticPath } from "../../grammar/schemas/semanticPath.js";
import { validateSemanticValue } from "../../grammar/schemas/semanticValue.js";

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

const editSemantic = action(
  {
    op: "editSemantic",
    description: "Create or replace one semantic property."
  },
  function ({ property, value } = {}) {
    if (value === undefined) {
      throw new TypeError("editSemantic requires a value.");
    }

    const parsed = parseSemanticPath(property);
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

export function registerSemanticPrimitiveAction(ProgramClass) {
  ProgramClass.prototype.editSemantic = editSemantic;
}
