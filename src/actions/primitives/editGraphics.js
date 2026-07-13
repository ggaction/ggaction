import { action } from "../../core/action.js";
import {
  isStructuralGraphicType,
  isPrimitiveDrawableGraphicType,
  validateGraphicType,
  validateGraphicProperty
} from "../../grammar/schemas/graphic.js";
import { cloneAndFreeze, freezeOwned, isPlainObject } from "../../core/immutable.js";

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
    "rotation",
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

  if (property === "closed" && typeof value !== "boolean") {
    throw new TypeError(`${type}.closed must be a boolean.`);
  }

  if (property === "strokeDash") {
    if (
      !Array.isArray(value) ||
      !value.every(item => Number.isFinite(item) && item >= 0)
    ) {
      throw new TypeError(
        `${type}.strokeDash must be an array of non-negative finite numbers.`
      );
    }
  }

  if (type === "path" && property === "points") {
    if (
      !Array.isArray(value) ||
      value.length < 2 ||
      !value.every(point =>
        isPlainObject(point) &&
        Object.keys(point).length === 2 &&
        Number.isFinite(point.x) &&
        Number.isFinite(point.y)
      )
    ) {
      throw new TypeError(
        "path.points must contain at least two finite { x, y } points."
      );
    }
  }
}

function validateCollectionChild(child, collectionId, index) {
  if (!isPlainObject(child)) {
    throw new TypeError(
      `collection.children[${index}] must be a plain object.`
    );
  }

  const unknown = Object.keys(child).find(
    key => !["type", "properties"].includes(key)
  );
  if (unknown !== undefined) {
    throw new Error(
      `Unknown collection child property "${unknown}".`
    );
  }

  const type = validateGraphicType(child.type);
  if (!isPrimitiveDrawableGraphicType(type)) {
    throw new Error(
      `Collection child "${collectionId}:${index}" requires a primitive drawable type.`
    );
  }
  if (!isPlainObject(child.properties)) {
    throw new TypeError(
      `Collection child "${collectionId}:${index}" requires plain properties.`
    );
  }

  for (const [property, value] of Object.entries(child.properties)) {
    validateGraphicProperty(type, property);
    validateConcreteGraphicValue(type, property, value);
  }

  return freezeOwned({
    id: `${collectionId}:${index}`,
    type,
    properties: cloneAndFreeze(child.properties)
  });
}

function replaceCollectionChildren(value, id) {
  if (!Array.isArray(value)) {
    throw new TypeError("collection.children must be an array.");
  }

  return freezeOwned(value.map(
    (child, index) => validateCollectionChild(child, id, index)
  ));
}

function editDirectChild(object, childIndex, property, value) {
  const children = [...object.children];
  const child = children[childIndex];
  const type = child.type ?? object.type;
  validateGraphicProperty(type, property);
  validateConcreteGraphicValue(type, property, value);
  children[childIndex] = freezeOwned({
    ...child,
    properties: setGraphicProperty(child.properties, property, value)
  });

  return freezeOwned({ ...object, children: freezeOwned(children) });
}

function editGraphicCollection(object, property, value, id) {
  if (object.type === "collection" && property === "children") {
    return freezeOwned({
      ...object,
      children: replaceCollectionChildren(value, id)
    });
  }

  if (property === "length") {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError("Graphic collection length must be a non-negative integer.");
    }

    const children = object.children.slice(0, value);

    for (let index = children.length; index < value; index += 1) {
      if (object.type === "collection") {
        throw new Error(
          "A heterogeneous collection can only grow by replacing its children."
        );
      }
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
    const type = child.type ?? object.type;
    validateGraphicProperty(type, property);
    validateConcreteGraphicValue(type, property, childValue);

    return freezeOwned({
      ...child,
      properties: setGraphicProperty(child.properties, property, childValue)
    });
  });

  return freezeOwned({ ...object, children: freezeOwned(children) });
}

function editStructuralGraphic(object, property, value) {
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
    const convertsToCollection =
      found.childIndex === undefined &&
      property === "children" &&
      found.object.children !== undefined &&
      found.object.type !== "collection";
    const validatedProperty = convertsToCollection
      ? "children"
      : validateGraphicProperty(found.object.type, property);
    let updated;

    if (convertsToCollection) {
      updated = freezeOwned({
        type: "collection",
        children: replaceCollectionChildren(value, found.id)
      });
    } else if (found.childIndex !== undefined) {
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
      updated = editStructuralGraphic(found.object, validatedProperty, value);
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

export function registerEditGraphicsAction(ProgramClass) {
  ProgramClass.prototype.editGraphics = editGraphics;
}
