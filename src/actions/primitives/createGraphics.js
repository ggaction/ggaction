import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { freezeOwned } from "../../core/immutable.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import {
  isDrawableGraphicType,
  isGraphicContainerType,
  validateGraphicType
} from "../../grammar/schemas/graphic.js";
import {
  findGraphicParent,
  graphicSiblings
} from "../../grammar/schemas/graphicTree.js";

const GRAPHIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function createGraphicDefinition({ id, type, length }) {
  if (type === "collection") {
    return freezeOwned({ type, items: freezeOwned([]) });
  }
  if (length === undefined) {
    return freezeOwned({ type, properties: freezeOwned({}) });
  }
  return freezeOwned({
    type,
    items: freezeOwned(Array.from({ length }, (_, index) => freezeOwned({
      id: `${id}:${index}`,
      properties: freezeOwned({})
    }))),
  });
}

function sameDefinition(existing, { type, length }) {
  if (existing.type !== type) return false;
  if (type === "collection") return length === undefined && existing.items?.length === 0;
  if (length === undefined) return existing.items === undefined;
  return existing.items?.length === length;
}

function samePlacement(graphicSpec, id, { parent, before, after }) {
  const actualParent = findGraphicParent(graphicSpec, id);
  const actualParentId = actualParent?.kind === "parent" ? actualParent.id : undefined;
  if (actualParentId !== parent) return false;
  const siblings = graphicSiblings(graphicSpec, id);
  const index = siblings.indexOf(id);
  if (before !== undefined) return index < siblings.indexOf(before);
  if (after !== undefined) return index > siblings.indexOf(after);
  return true;
}

function resolvePlacement(graphicSpec, { id, type, parent, before, after }) {
  if (before !== undefined && after !== undefined) {
    throw new Error("createGraphics cannot use before and after together.");
  }
  if (parent !== undefined) {
    validateUserId(parent, "Graphic parent");
    if (parent === id) throw new Error("createGraphics cannot attach a graphic to itself.");
    const parentGraphic = graphicSpec.objects[parent];
    if (parentGraphic === undefined) {
      throw new Error(`Unknown graphic parent "${parent}".`);
    }
    if (!isGraphicContainerType(parentGraphic.type)) {
      throw new Error(`Graphic parent "${parent}" must be a canvas or collection.`);
    }
    if (
      type === "canvas" &&
      !graphicSpec.order.some(id => graphicSpec.objects[id]?.type === "canvas")
    ) {
      throw new Error("A nested Canvas requires an ordered root Canvas.");
    }
  }
  const anchor = before ?? after;
  if (anchor === undefined) return;
  validateUserId(anchor, "Graphic placement target");
  if (anchor === id) {
    throw new Error("createGraphics cannot place a graphic relative to itself.");
  }
  const anchorGraphic = graphicSpec.objects[anchor];
  if (anchorGraphic === undefined) {
    throw new Error(`Unknown graphic placement target "${anchor}".`);
  }
  const anchorParent = findGraphicParent(graphicSpec, anchor);
  const anchorParentId = anchorParent?.kind === "parent" ? anchorParent.id : undefined;
  if (anchorParentId !== parent) {
    throw new Error("Graphic placement target must be a direct sibling.");
  }
  if (parent === undefined && before === "canvas") {
    throw new Error("createGraphics cannot place a graphic before the canvas.");
  }
  if (type === "canvas" && parent === undefined) {
    throw new Error("Canvas graphics do not accept before or after placement.");
  }
}

function insertSibling(siblings, id, { before, after }) {
  const next = [...siblings];
  if (before !== undefined) next.splice(next.indexOf(before), 0, id);
  else if (after !== undefined) next.splice(next.indexOf(after) + 1, 0, id);
  else next.push(id);
  return freezeOwned(next);
}

const createGraphics = action(
  {
    op: "createGraphics",
    description: "Create and optionally attach a concrete graphic.",
    scope: "any"
  },
  function ({ id, type, length, parent, before, after } = {}) {
    if (typeof id !== "string" || !GRAPHIC_ID_PATTERN.test(id)) {
      throw new TypeError(
        "createGraphics requires an id containing only letters, numbers, _ or -."
      );
    }
    const validatedType = validateGraphicType(type);
    if (length !== undefined && (!Number.isInteger(length) || length < 0)) {
      throw new TypeError("createGraphics length must be a non-negative integer.");
    }
    if (length !== undefined) {
      validateGeneratedItemLimit(length, "createGraphics length");
    }
    if (validatedType === "collection" && length !== undefined) {
      throw new Error("Heterogeneous collections use editGraphics items instead of length.");
    }
    if (length !== undefined && !isDrawableGraphicType(validatedType)) {
      throw new Error(`Graphic type "${validatedType}" does not accept length.`);
    }
    resolvePlacement(this.graphicSpec, {
      id, type: validatedType, parent, before, after
    });

    const existing = Object.hasOwn(this.graphicSpec.objects, id)
      ? this.graphicSpec.objects[id]
      : undefined;
    if (existing !== undefined) {
      if (
        sameDefinition(existing, { type: validatedType, length }) &&
        samePlacement(this.graphicSpec, id, { parent, before, after })
      ) return this;
      throw new Error(`Graphic "${id}" already exists with a different definition or placement.`);
    }
    if (
      validatedType === "canvas" &&
      parent === undefined &&
      this.graphicSpec.order.some(
        objectId => this.graphicSpec.objects[objectId]?.type === "canvas"
      )
    ) {
      throw new Error("graphicSpec supports exactly one ordered canvas.");
    }

    const objects = {
      ...this.graphicSpec.objects,
      [id]: createGraphicDefinition({ id, type: validatedType, length })
    };
    let order = this.graphicSpec.order;
    if (parent === undefined) {
      order = insertSibling(order, id, { before, after });
    } else {
      objects[parent] = freezeOwned({
        ...objects[parent],
        children: insertSibling(objects[parent].children ?? [], id, { before, after })
      });
    }
    return this._clone({
      graphicSpec: freezeOwned({
        objects: freezeOwned(objects),
        order
      })
    });
  }
);

export function registerCreateGraphicsAction(ProgramClass) {
  ProgramClass.prototype.createGraphics = createGraphics;
}
