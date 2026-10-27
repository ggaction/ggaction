import { namespaceItemKey } from "../grammar/schemas/graphicIdentity.js";
import { cloneAndFreeze, freezeOwned, isOwned, isPlainObject } from "../core/immutable.js";
import { namespaceGraphicId } from "../selectors/graphicCapacity.js";
export { namespaceGraphicId } from "../selectors/graphicCapacity.js";
import {
  requireSingleOrderedGraphicByType,
  walkGraphicTreeEvents
} from "../grammar/schemas/graphicTree.js";

const snapshots = new WeakMap();

function placeSnapshot(snapshot, placement) {
  const root = snapshot.order[0], canvas = snapshot.objects[root];
  if (canvas.properties.x === placement.x && canvas.properties.y === placement.y) return snapshot;
  return freezeOwned({ order: snapshot.order, objects: freezeOwned({
    ...snapshot.objects,
    [root]: freezeOwned({ ...canvas, properties: freezeOwned({ ...canvas.properties, ...placement }) })
  }) });
}

function validateNamespace(namespace) {
  if (typeof namespace !== "string" || namespace.length === 0) {
    throw new TypeError("Graphic snapshot namespace must be a non-empty string.");
  }
  return namespace;
}

function validatePlacement(value, property) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Graphic snapshot ${property} must be a finite number.`);
  }
  return value;
}

function validateCanvas(canvas, id) {
  const { width, height } = canvas.properties ?? {};
  if (!Number.isFinite(width) || width <= 0) {
    throw new RangeError(`Child Canvas "${id}" width must be a positive finite number.`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new RangeError(`Child Canvas "${id}" height must be a positive finite number.`);
  }
}

function rewriteItem(item, namespace) {
  if (!isPlainObject(item) || typeof item.id !== "string" || item.id.length === 0) {
    throw new TypeError("Graphic snapshot items require non-empty string ids.");
  }
  return freezeOwned({
    ...cloneAndFreeze(item),
    id: namespaceGraphicId(namespace, item.id),
    ...(item.identity === undefined ? {} : { identity: cloneAndFreeze({
      ...item.identity, key: namespaceItemKey(item.identity.key, namespace)
    }) })
  });
}

function rewriteObject(object, namespace, rootCanvasId, placement, extraRoots) {
  const children = object.children ?? [];
  const rewritten = {
    ...cloneAndFreeze(object),
    ...(object.items === undefined
      ? {}
      : { items: freezeOwned(object.items.map(item => rewriteItem(item, namespace))) }),
    ...(children.length === 0 && rootCanvasId === undefined
      ? {}
      : {
          children: freezeOwned([
            ...children.map(id => namespaceGraphicId(namespace, id)),
            ...(rootCanvasId === undefined
              ? []
                : extraRoots.map(id => namespaceGraphicId(namespace, id)))
          ])
        })
  };
  if (rootCanvasId !== undefined) {
    rewritten.properties = freezeOwned({
      ...rewritten.properties,
      x: placement.x,
      y: placement.y
    });
  }
  return freezeOwned(rewritten);
}

export function namespaceGraphicSnapshot(
  graphicSpec,
  { namespace, x = 0, y = 0 } = {}
) {
  const resolvedNamespace = validateNamespace(namespace);
  const placement = {
    x: validatePlacement(x, "x"),
    y: validatePlacement(y, "y")
  };
  if (
    !isPlainObject(graphicSpec) ||
    !isPlainObject(graphicSpec.objects) ||
    !Array.isArray(graphicSpec.order)
  ) {
    throw new TypeError("Graphic snapshot requires objects and order.");
  }
  const cached = snapshots.get(graphicSpec)?.get(resolvedNamespace);
  if (cached) return placeSnapshot(cached, placement);
  walkGraphicTreeEvents(graphicSpec, {});
  const { id: canvasId, object: canvas } =
    requireSingleOrderedGraphicByType(graphicSpec, "canvas");
  validateCanvas(canvas, canvasId);
  const extraRoots = graphicSpec.order.filter(id => id !== canvasId);
  const objects = Object.fromEntries(Object.entries(graphicSpec.objects).map(
    ([id, object]) => [
      namespaceGraphicId(resolvedNamespace, id),
      rewriteObject(
        object,
        resolvedNamespace,
        id === canvasId ? canvasId : undefined,
        placement,
        id === canvasId ? extraRoots : []
      )
    ]
  ));
  const rootId = namespaceGraphicId(resolvedNamespace, canvasId);
  const snapshot = freezeOwned({
    objects: freezeOwned(objects),
    order: freezeOwned([rootId])
  });
  if (isOwned(graphicSpec)) {
    if (!snapshots.has(graphicSpec)) snapshots.set(graphicSpec, new Map());
    const cache = snapshots.get(graphicSpec);
    cache.set(resolvedNamespace, snapshot);
    if (cache.size > 16) cache.delete(cache.keys().next().value);
  }
  return snapshot;
}
