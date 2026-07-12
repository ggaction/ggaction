import { action } from "../../core/action.js";
import {
  isDrawableGraphicType,
  validateGraphicType
} from "../../grammar/schemas/graphic.js";
import { validateUserId } from "../../core/identifiers.js";
import { freezeOwned } from "../../core/immutable.js";

const GRAPHIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

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
  function ({ id, type, length, before, after } = {}) {
    if (typeof id !== "string" || !GRAPHIC_ID_PATTERN.test(id)) {
      throw new TypeError(
        "createGraphics requires an id containing only letters, numbers, _ or -."
      );
    }

    const validatedType = validateGraphicType(type);

    if (before !== undefined && after !== undefined) {
      throw new Error("createGraphics cannot use before and after together.");
    }
    const placement = before ?? after;
    if (placement !== undefined) {
      validateUserId(placement, "Graphic placement target");
      if (placement === id) {
        throw new Error("createGraphics cannot place a graphic relative to itself.");
      }
      if (this.graphicSpec.objects[placement] === undefined) {
        throw new Error(`Unknown graphic placement target "${placement}".`);
      }
      if (before === "canvas") {
        throw new Error("createGraphics cannot place a graphic before the canvas.");
      }
      if (validatedType === "canvas") {
        throw new Error("Canvas graphics do not accept before or after placement.");
      }
    }

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
        const existingIndex = this.graphicSpec.order.indexOf(id);
        const placementIndex = placement === undefined
          ? undefined
          : this.graphicSpec.order.indexOf(placement);
        const satisfiesPlacement =
          placement === undefined ||
          (before !== undefined && existingIndex < placementIndex) ||
          (after !== undefined && existingIndex > placementIndex);

        if (!satisfiesPlacement) {
          throw new Error(
            `Graphic "${id}" already exists with a conflicting placement.`
          );
        }
        return this;
      }

      throw new Error(`Graphic "${id}" already exists with a different definition.`);
    }

    const order = [...this.graphicSpec.order];
    if (before !== undefined) {
      order.splice(order.indexOf(before), 0, id);
    } else if (after !== undefined) {
      order.splice(order.indexOf(after) + 1, 0, id);
    } else {
      order.push(id);
    }

    const graphicSpec = freezeOwned({
      objects: freezeOwned({
        ...this.graphicSpec.objects,
        [id]: createGraphicDefinition({ id, type: validatedType, length })
      }),
      order: freezeOwned(order)
    });

    return this._clone({ graphicSpec });
  }
);

export function registerCreateGraphicsAction(ProgramClass) {
  ProgramClass.prototype.createGraphics = createGraphics;
}
