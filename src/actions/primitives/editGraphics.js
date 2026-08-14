import { action } from "../../core/action.js";
import { cloneAndFreeze, freezeOwned, isPlainObject } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import {
  isPrimitiveDrawableGraphicType,
  isStructuralGraphicType,
  validateGraphicProperty,
  validateGraphicType
} from "../../grammar/schemas/graphic.js";
import { validateConcreteGraphicValue } from
  "../../grammar/schemas/concreteGraphic.js";
import {
  collectGraphicSubtreeIds,
  findGraphicParent,
  requireGraphic
} from "../../grammar/schemas/graphicTree.js";

function setGraphicProperty(properties, property, value) {
  return freezeOwned({ ...properties, [property]: cloneAndFreeze(value) });
}

function validateCollectionItem(item, ownerId, index) {
  if (!isPlainObject(item)) {
    throw new TypeError(`collection.items[${index}] must be a plain object.`);
  }
  const unknown = Object.keys(item).find(key => !["type", "properties"].includes(key));
  if (unknown !== undefined) throw new Error(`Unknown collection item property "${unknown}".`);
  const type = validateGraphicType(item.type);
  if (!isPrimitiveDrawableGraphicType(type)) {
    throw new Error(`Collection item "${ownerId}:${index}" requires a primitive drawable type.`);
  }
  if (!isPlainObject(item.properties)) {
    throw new TypeError(`Collection item "${ownerId}:${index}" requires plain properties.`);
  }
  for (const [property, value] of Object.entries(item.properties)) {
    validateGraphicProperty(type, property);
    validateConcreteGraphicValue(type, property, value);
  }
  return freezeOwned({
    id: `${ownerId}:${index}`,
    type,
    properties: cloneAndFreeze(item.properties)
  });
}

function replaceCollectionItems(value, id) {
  if (!Array.isArray(value)) throw new TypeError("collection.items must be an array.");
  validateGeneratedItemLimit(value.length, "collection.items length");
  return freezeOwned(value.map((item, index) => validateCollectionItem(item, id, index)));
}

function replaceDrawableItems(value, id, type) {
  const items = replaceCollectionItems(value, id);
  if (!items.every(item => item.type === type)) {
    return freezeOwned({ type: "collection", items });
  }
  return freezeOwned({
    type,
    items: freezeOwned(items.map(item => freezeOwned({
      id: item.id,
      properties: item.properties
    })))
  });
}

function editGeneratedItem(owner, itemIndex, property, value) {
  const items = [...owner.items];
  const item = items[itemIndex];
  const type = item.type ?? owner.type;
  validateGraphicProperty(type, property);
  validateConcreteGraphicValue(type, property, value);
  items[itemIndex] = freezeOwned({
    ...item,
    properties: setGraphicProperty(item.properties, property, value)
  });
  return freezeOwned({ ...owner, items: freezeOwned(items) });
}

function editItems(owner, property, value, id) {
  if (owner.type === "collection" && property === "items") {
    return freezeOwned({ ...owner, items: replaceCollectionItems(value, id) });
  }
  if (property === "length") {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError("Graphic collection length must be a non-negative integer.");
    }
    validateGeneratedItemLimit(value, "Graphic collection length");
    const items = owner.items.slice(0, value);
    for (let index = items.length; index < value; index += 1) {
      if (owner.type === "collection") {
        throw new Error("A heterogeneous collection can only grow by replacing its items.");
      }
      items.push(freezeOwned({ id: `${id}:${index}`, properties: freezeOwned({}) }));
    }
    return freezeOwned({ ...owner, items: freezeOwned(items) });
  }
  if (Array.isArray(value) && value.length !== owner.items.length) {
    throw new Error(
      `${owner.type}.${property} requires ${owner.items.length} values, received ${value.length}.`
    );
  }
  const items = owner.items.map((item, index) => {
    const itemValue = Array.isArray(value) ? value[index] : value;
    const type = item.type ?? owner.type;
    validateGraphicProperty(type, property);
    validateConcreteGraphicValue(type, property, itemValue);
    return freezeOwned({
      ...item,
      properties: setGraphicProperty(item.properties, property, itemValue)
    });
  });
  return freezeOwned({ ...owner, items: freezeOwned(items) });
}

function removeGraphicTree(graphicSpec, id) {
  const parent = findGraphicParent(graphicSpec, id);
  if (
    graphicSpec.objects[id].type === "canvas" &&
    parent?.kind !== "parent"
  ) {
    throw new Error("The canvas root cannot be removed.");
  }
  const removedIds = new Set(collectGraphicSubtreeIds(graphicSpec, id));
  const objects = Object.fromEntries(
    Object.entries(graphicSpec.objects).filter(([objectId]) => !removedIds.has(objectId))
  );
  let order = graphicSpec.order;
  if (parent?.kind === "parent") {
    objects[parent.id] = freezeOwned({
      ...objects[parent.id],
      children: freezeOwned(parent.object.children.filter(childId => childId !== id))
    });
  } else {
    order = freezeOwned(order.filter(objectId => objectId !== id));
  }
  return freezeOwned({ objects: freezeOwned(objects), order });
}

const editGraphics = action(
  {
    op: "editGraphics",
    description: "Replace or remove concrete graphic state.",
    scope: "any"
  },
  function ({ target, property, value, remove = false } = {}) {
    if (typeof target !== "string" || target.length === 0) {
      throw new TypeError("editGraphics requires a non-empty target string.");
    }
    if (typeof remove !== "boolean") throw new TypeError("editGraphics remove must be a boolean.");
    if (remove && (property !== undefined || value !== undefined)) {
      throw new Error("editGraphics target removal cannot include property or value.");
    }
    if (!remove && value === undefined) throw new TypeError("editGraphics requires a value.");

    const found = requireGraphic(this.graphicSpec, target);
    if (remove) {
      if (found.kind === "item") {
        throw new Error("editGraphics cannot remove a generated item independently.");
      }
      return this._clone({ graphicSpec: removeGraphicTree(this.graphicSpec, found.id) });
    }

    const ownerId = found.kind === "item" ? found.ownerId : found.id;
    const owner = found.kind === "item" ? found.owner : found.object;
    const replacesDrawableItems =
      found.kind === "object" && property === "items" &&
      owner.items !== undefined && owner.type !== "collection";
    const validatedProperty = replacesDrawableItems
      ? "items"
      : validateGraphicProperty(found.kind === "item"
          ? (found.object.type ?? owner.type)
          : owner.type, property);
    let updated;
    if (replacesDrawableItems) {
      updated = replaceDrawableItems(value, ownerId, owner.type);
    } else if (found.kind === "item") {
      if (validatedProperty === "length" || validatedProperty === "items") {
        throw new Error(`${validatedProperty} can only target an owning graphic.`);
      }
      updated = editGeneratedItem(owner, found.itemIndex, validatedProperty, value);
    } else if (isStructuralGraphicType(owner.type)) {
      validateConcreteGraphicValue(owner.type, validatedProperty, value);
      updated = freezeOwned({
        ...owner,
        properties: setGraphicProperty(owner.properties, validatedProperty, value)
      });
    } else if (owner.items !== undefined) {
      updated = editItems(owner, validatedProperty, value, ownerId);
    } else if (validatedProperty === "length") {
      if (!Number.isInteger(value) || value < 0) {
        throw new TypeError("Graphic collection length must be a non-negative integer.");
      }
      validateGeneratedItemLimit(value, "Graphic collection length");
      updated = freezeOwned({
        type: owner.type,
        items: freezeOwned(Array.from({ length: value }, (_, index) => freezeOwned({
          id: `${ownerId}:${index}`,
          properties: index === 0 ? owner.properties : freezeOwned({})
        })))
      });
    } else {
      validateConcreteGraphicValue(owner.type, validatedProperty, value);
      updated = freezeOwned({
        ...owner,
        properties: setGraphicProperty(owner.properties, validatedProperty, value)
      });
    }
    return this._clone({
      graphicSpec: freezeOwned({
        ...this.graphicSpec,
        objects: freezeOwned({ ...this.graphicSpec.objects, [ownerId]: updated })
      })
    });
  }
);

export function registerEditGraphicsAction(ProgramClass) {
  ProgramClass.prototype.editGraphics = editGraphics;
}
