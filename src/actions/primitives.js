import { action } from "../core/action.js";
import {
  cloneAndFreeze,
  freezeOwned,
  isPlainObject
} from "../core/immutable.js";
import { parseSemanticPath } from "../core/semanticPath.js";
import {
  isDrawableGraphicType,
  isStructuralGraphicType,
  validateGraphicProperty,
  validateGraphicType
} from "../core/graphicSchema.js";

const CONTEXT_KEYS = Object.freeze({
  dataset: "currentData",
  layer: "currentMark",
  scale: "currentScale",
  coordinate: "currentCoordinate",
  guide: "currentGuide"
});

const MARK_TYPES = new Set(["point", "line", "bar", "area"]);
const GRAPHIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

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

function validateSemanticValue(parsed, value) {
  if (parsed.kind === "dataset" && parsed.path[0] === "values") {
    if (!Array.isArray(value) || !value.every(isPlainObject)) {
      throw new TypeError("Dataset values must be an array of plain row objects.");
    }
  }

  if (
    parsed.kind === "layer" &&
    parsed.path.join(".") === "mark.type" &&
    !MARK_TYPES.has(value)
  ) {
    throw new Error(`Unknown mark type "${value}".`);
  }
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
    validateSemanticValue(parsed, value);

    const semanticSpec =
      parsed.kind === "guide"
        ? updateGuides(this.semanticSpec, parsed, value)
        : updateEntity(this.semanticSpec, parsed, value);
    const context = freezeOwned({
      ...this.context,
      [CONTEXT_KEYS[parsed.kind]]: parsed.id
    });

    return this._clone({ semanticSpec, context });
  }
);

function createGraphicDefinition({ id, type, length }) {
  if (length === undefined) {
    return freezeOwned({
      type,
      properties: freezeOwned({})
    });
  }

  return freezeOwned({
    type,
    children: freezeOwned(
      Array.from({ length }, (_, index) =>
        freezeOwned({
          id: `${id}:${index}`,
          properties: freezeOwned({})
        })
      )
    )
  });
}

function hasEquivalentGraphicDefinition(existing, { type, length }) {
  if (existing.type !== type) {
    return false;
  }

  if (length === undefined) {
    return !Object.hasOwn(existing, "children");
  }

  return existing.children?.length === length;
}

const createGraphics = action(
  {
    op: "createGraphics",
    description: "Create a concrete graphic or homogeneous collection."
  },
  function ({ id, type, length } = {}) {
    if (typeof id !== "string" || !GRAPHIC_ID_PATTERN.test(id)) {
      throw new TypeError(
        "createGraphics requires an id containing only letters, numbers, _ or -."
      );
    }

    const validatedType = validateGraphicType(type);

    if (
      length !== undefined &&
      (!Number.isInteger(length) || length < 0)
    ) {
      throw new TypeError("createGraphics length must be a non-negative integer.");
    }

    if (length !== undefined && !isDrawableGraphicType(validatedType)) {
      throw new Error(`Graphic type "${validatedType}" does not accept length.`);
    }

    const existing = this.graphicSpec.objects[id];

    if (existing !== undefined) {
      if (hasEquivalentGraphicDefinition(existing, { type: validatedType, length })) {
        return this;
      }

      throw new Error(`Graphic "${id}" already exists with a different definition.`);
    }

    const graphicSpec = freezeOwned({
      objects: freezeOwned({
        ...this.graphicSpec.objects,
        [id]: createGraphicDefinition({ id, type: validatedType, length })
      }),
      order: freezeOwned([...this.graphicSpec.order, id])
    });

    return this._clone({ graphicSpec });
  }
);

function findGraphicTarget(graphicSpec, target) {
  const object = graphicSpec.objects[target];

  if (object !== undefined) {
    return { id: target, object, childIndex: undefined };
  }

  for (const [id, candidate] of Object.entries(graphicSpec.objects)) {
    const childIndex = candidate.children?.findIndex(child => child.id === target);

    if (childIndex !== undefined && childIndex !== -1) {
      return { id, object: candidate, childIndex };
    }
  }

  throw new Error(`Unknown graphic target "${target}".`);
}

function setGraphicProperty(properties, property, value) {
  return freezeOwned({
    ...properties,
    [property]: cloneAndFreeze(value)
  });
}

function validateConcreteGraphicValue(type, property, value) {
  const finiteProperties = new Set([
    "x",
    "y",
    "x1",
    "y1",
    "x2",
    "y2",
    "width",
    "height",
    "radius",
    "strokeWidth",
    "fontSize",
    "opacity",
    "gap"
  ]);

  if (finiteProperties.has(property) && !Number.isFinite(value)) {
    throw new TypeError(`${type}.${property} must be a finite number.`);
  }

  if (
    ["width", "height", "radius", "strokeWidth", "fontSize", "gap"].includes(
      property
    ) &&
    value < 0
  ) {
    throw new RangeError(`${type}.${property} must not be negative.`);
  }

  if (property === "opacity" && (value < 0 || value > 1)) {
    throw new RangeError(`${type}.opacity must be between 0 and 1.`);
  }
}

function editDirectChild(object, childIndex, property, value) {
  validateConcreteGraphicValue(object.type, property, value);
  const children = [...object.children];
  const child = children[childIndex];
  children[childIndex] = freezeOwned({
    ...child,
    properties: setGraphicProperty(child.properties, property, value)
  });

  return freezeOwned({ ...object, children: freezeOwned(children) });
}

function editGraphicCollection(object, property, value, id) {
  if (property === "length") {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError("Graphic collection length must be a non-negative integer.");
    }

    const children = object.children.slice(0, value);

    for (let index = children.length; index < value; index += 1) {
      children.push(
        freezeOwned({
          id: `${id}:${index}`,
          properties: freezeOwned({})
        })
      );
    }

    return freezeOwned({ ...object, children: freezeOwned(children) });
  }

  if (Array.isArray(value) && value.length !== object.children.length) {
    throw new Error(
      `${object.type}.${property} requires ${object.children.length} values, received ${value.length}.`
    );
  }

  const children = object.children.map((child, index) => {
    const childValue = Array.isArray(value) ? value[index] : value;
    validateConcreteGraphicValue(object.type, property, childValue);

    return freezeOwned({
      ...child,
      properties: setGraphicProperty(child.properties, property, childValue)
    });
  });

  return freezeOwned({ ...object, children: freezeOwned(children) });
}

function validateStructuralChildren(program, type, value) {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string")) {
    throw new TypeError(`${type}.children must be an array of string IDs.`);
  }

  const scope = type === "canvas" ? program.graphicSpec.objects : program.children;
  const unknown = value.find(id => !Object.hasOwn(scope, id));

  if (unknown !== undefined) {
    throw new Error(`Unknown ${type} child "${unknown}".`);
  }
}

function editStructuralGraphic(program, object, property, value) {
  if (property === "children") {
    validateStructuralChildren(program, object.type, value);
    return freezeOwned({ ...object, children: cloneAndFreeze(value) });
  }

  validateConcreteGraphicValue(object.type, property, value);
  return freezeOwned({
    ...object,
    properties: setGraphicProperty(object.properties, property, value)
  });
}

const editGraphics = action(
  {
    op: "editGraphics",
    description: "Create or replace one concrete graphic property."
  },
  function ({ target, property, value } = {}) {
    if (typeof target !== "string" || target.length === 0) {
      throw new TypeError("editGraphics requires a non-empty target string.");
    }

    if (value === undefined) {
      throw new TypeError("editGraphics requires a value.");
    }

    const found = findGraphicTarget(this.graphicSpec, target);
    const validatedProperty = validateGraphicProperty(found.object.type, property);
    let updated;

    if (found.childIndex !== undefined) {
      if (validatedProperty === "length") {
        throw new Error("length can only target a graphic collection.");
      }
      updated = editDirectChild(
        found.object,
        found.childIndex,
        validatedProperty,
        value
      );
    } else if (isStructuralGraphicType(found.object.type)) {
      updated = editStructuralGraphic(this, found.object, validatedProperty, value);
    } else if (found.object.children) {
      updated = editGraphicCollection(
        found.object,
        validatedProperty,
        value,
        found.id
      );
    } else {
      if (validatedProperty === "length") {
        if (!Number.isInteger(value) || value < 0) {
          throw new TypeError(
            "Graphic collection length must be a non-negative integer."
          );
        }

        const children = Array.from({ length: value }, (_, index) =>
          freezeOwned({
            id: `${found.id}:${index}`,
            properties:
              index === 0 ? found.object.properties : freezeOwned({})
          })
        );
        updated = freezeOwned({
          type: found.object.type,
          children: freezeOwned(children)
        });
      } else {
        validateConcreteGraphicValue(
          found.object.type,
          validatedProperty,
          value
        );
        updated = freezeOwned({
          ...found.object,
          properties: setGraphicProperty(
            found.object.properties,
            validatedProperty,
            value
          )
        });
      }
    }

    const graphicSpec = freezeOwned({
      ...this.graphicSpec,
      objects: freezeOwned({
        ...this.graphicSpec.objects,
        [found.id]: updated
      })
    });

    return this._clone({ graphicSpec });
  }
);

export function registerPrimitiveActions(ProgramClass) {
  ProgramClass.prototype.editSemantic = editSemantic;
  ProgramClass.prototype.createGraphics = createGraphics;
  ProgramClass.prototype.editGraphics = editGraphics;
}
