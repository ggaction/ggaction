import { isPlainObject } from "../../core/immutable.js";
import { isGraphicContainerType } from "./graphic.js";

export function resolveGraphicChildOrder(graphicSpec, target, value) {
  const found = requireGraphic(graphicSpec, target);
  if (found.kind !== "object" || !isGraphicContainerType(found.object.type)) {
    throw new Error("Graphic children order requires a named Canvas or collection.");
  }
  const children = found.object.children ?? [];
  const existing = new Set(children);
  if (!Array.isArray(value) || value.length !== children.length ||
      new Set(value).size !== children.length ||
      value.some(id => typeof id !== "string" || !existing.has(id))) {
    throw new Error("Graphic children order must be an exact permutation of existing direct children.");
  }
  return [...value];
}

function requireGraphicSpec(graphicSpec) {
  if (
    !isPlainObject(graphicSpec) ||
    !isPlainObject(graphicSpec.objects) ||
    !Array.isArray(graphicSpec.order)
  ) {
    throw new TypeError("A graphic tree requires objects and order.");
  }
  return graphicSpec;
}

export function findGraphic(graphicSpec, target) {
  requireGraphicSpec(graphicSpec);
  const object = graphicSpec.objects[target];
  if (object !== undefined) {
    return { id: target, object, kind: "object" };
  }
  for (const [ownerId, owner] of Object.entries(graphicSpec.objects)) {
    const itemIndex = owner.items?.findIndex(item => item.id === target);
    if (itemIndex !== undefined && itemIndex !== -1) {
      return {
        id: target,
        object: owner.items[itemIndex],
        kind: "item",
        ownerId,
        owner,
        itemIndex
      };
    }
  }
  return undefined;
}

export function requireGraphic(graphicSpec, target) {
  const found = findGraphic(graphicSpec, target);
  if (found === undefined) {
    throw new Error(`Unknown graphic target "${target}".`);
  }
  return found;
}

export function findGraphicParent(graphicSpec, target) {
  requireGraphicSpec(graphicSpec);
  const found = findGraphic(graphicSpec, target);
  if (found?.kind === "item") {
    return {
      id: found.ownerId,
      object: found.owner,
      kind: "itemOwner",
      index: found.itemIndex
    };
  }
  for (const [id, candidate] of Object.entries(graphicSpec.objects)) {
    const index = candidate.children?.indexOf(target);
    if (index !== undefined && index !== -1) {
      return { id, object: candidate, kind: "parent", index };
    }
  }
  return undefined;
}

export function graphicSiblings(graphicSpec, target) {
  const parent = findGraphicParent(graphicSpec, target);
  if (parent?.kind === "parent") return parent.object.children;
  if (parent?.kind === "itemOwner") {
    return parent.object.items.map(item => item.id);
  }
  return graphicSpec.order;
}

function visitNamed(graphicSpec, id, visitors, path, visited) {
  if (path.includes(id)) {
    throw new Error(`Graphic attachment cycle includes "${id}".`);
  }
  const object = graphicSpec.objects[id];
  if (object === undefined) {
    throw new Error(`Unknown attached graphic "${id}".`);
  }
  if (visited.has(id)) {
    throw new Error(`Graphic "${id}" is attached more than once.`);
  }
  visited.add(id);
  const entry = { id, object, kind: "object", depth: path.length };
  visitors.enter?.(entry);
  for (const item of object.items ?? []) {
    visitors.item?.({
      id: item.id,
      object: item,
      kind: "item",
      ownerId: id,
      owner: object,
      depth: path.length + 1
    });
  }
  for (const childId of object.children ?? []) {
    visitNamed(graphicSpec, childId, visitors, [...path, id], visited);
  }
  visitors.exit?.(entry);
}

export function walkGraphicTreeEvents(graphicSpec, visitors) {
  requireGraphicSpec(graphicSpec);
  if (!isPlainObject(visitors)) {
    throw new TypeError("walkGraphicTreeEvents requires visitor callbacks.");
  }
  for (const name of ["enter", "item", "exit"]) {
    if (visitors[name] !== undefined && typeof visitors[name] !== "function") {
      throw new TypeError(`walkGraphicTreeEvents ${name} must be a function.`);
    }
  }
  const visited = new Set();
  for (const id of graphicSpec.order) {
    visitNamed(graphicSpec, id, visitors, [], visited);
  }
  const orphan = Object.keys(graphicSpec.objects).find(id => !visited.has(id));
  if (orphan !== undefined) {
    throw new Error(`Graphic "${orphan}" is not attached to the graphic tree.`);
  }
}

export function walkGraphicTree(graphicSpec, visitor) {
  if (typeof visitor !== "function") {
    throw new TypeError("walkGraphicTree requires a visitor function.");
  }
  walkGraphicTreeEvents(graphicSpec, {
    enter: visitor,
    item: visitor
  });
}

export function walkGraphicDrawOrder(graphicSpec, visitor) {
  walkGraphicTreeEvents(graphicSpec, { enter: visitor });
}

export function findOrderedGraphicsByType(graphicSpec, type) {
  requireGraphicSpec(graphicSpec);
  return graphicSpec.order.flatMap(id => {
    const object = graphicSpec.objects[id];
    return object?.type === type ? [{ id, object }] : [];
  });
}

export function requireSingleOrderedGraphicByType(graphicSpec, type) {
  const matches = findOrderedGraphicsByType(graphicSpec, type);
  if (matches.length !== 1) {
    throw new Error(
      `graphicSpec must contain exactly one ordered ${type}.`
    );
  }
  return matches[0];
}

export function collectGraphicSubtreeIds(graphicSpec, target) {
  const found = requireGraphic(graphicSpec, target);
  if (found.kind === "item") {
    throw new Error("Generated graphic items do not own named subtrees.");
  }
  const ids = [];
  const visit = id => {
    ids.push(id);
    for (const childId of graphicSpec.objects[id].children ?? []) visit(childId);
  };
  visit(target);
  return ids;
}
