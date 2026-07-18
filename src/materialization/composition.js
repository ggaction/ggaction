import { freezeOwned } from "../core/immutable.js";
import {
  requireSingleOrderedGraphicByType
} from "../grammar/schemas/graphicTree.js";
import { resolveCompositionLayout } from "../layout/composition.js";
import { namespaceGraphicSnapshot } from "./compositionSnapshot.js";

const ZERO_MARGIN = freezeOwned({ top: 0, right: 0, bottom: 0, left: 0 });

export function requireChildCanvas(program, id) {
  const { object } = requireSingleOrderedGraphicByType(program.graphicSpec, "canvas");
  const { width, height } = object.properties ?? {};
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error(`Composition child "${id}" requires a complete positive Canvas size.`);
  }
  return object;
}

export function compositionChildDescriptor(id, program) {
  const canvas = requireChildCanvas(program, id);
  const size = program.materializationConfigs.canvas?.size ?? {
    width: "explicit",
    height: "explicit"
  };
  return {
    id,
    width: canvas.properties.width,
    height: canvas.properties.height,
    widthMode: size.width,
    heightMode: size.height
  };
}

export function resolveCompositionProgramLayout(program) {
  program._assertCompositionProgram("resolveCompositionProgramLayout");
  const spec = program.compositionSpec;
  return resolveCompositionLayout({
    direction: spec.direction,
    children: spec.children.map(id => compositionChildDescriptor(id, program.children[id])),
    gap: spec.gap,
    align: spec.align,
    padding: spec.padding
  });
}

function resizeChildForSnapshot(program, placement) {
  const canvas = requireSingleOrderedGraphicByType(program.graphicSpec, "canvas");
  const widthChanged = canvas.object.properties.width !== placement.width;
  const heightChanged = canvas.object.properties.height !== placement.height;
  if (!widthChanged && !heightChanged) return program;

  if (program.compositionSpec === undefined) {
    if (typeof program.editCanvas !== "function") {
      throw new Error("Automatic composition sizing requires child editCanvas support.");
    }
    return program.editCanvas({
      ...(widthChanged ? { width: placement.width } : {}),
      ...(heightChanged ? { height: placement.height } : {})
    });
  }

  let resized = program;
  if (widthChanged) {
    resized = resized.editGraphics({
      target: canvas.id,
      property: "width",
      value: placement.width
    });
  }
  if (heightChanged) {
    resized = resized.editGraphics({
      target: canvas.id,
      property: "height",
      value: placement.height
    });
  }
  return resized;
}

function itemDefinitions(object) {
  return object.items.map(item => ({
    type: item.type ?? object.type,
    properties: item.properties
  }));
}

export function attachSnapshotObject(program, snapshot, id, parent) {
  const object = snapshot.objects[id];
  let next = program.createGraphics({
    id,
    type: object.type,
    parent,
    ...(object.items !== undefined && object.type !== "collection"
      ? { length: object.items.length }
      : {})
  });
  for (const [property, value] of Object.entries(object.properties ?? {})) {
    next = next.editGraphics({ target: id, property, value });
  }
  if (object.items !== undefined) {
    next = next.editGraphics({
      target: id,
      property: "items",
      value: itemDefinitions(object)
    });
  }
  for (const childId of object.children ?? []) {
    next = attachSnapshotObject(next, snapshot, childId, id);
  }
  return next;
}

export function clearCompositionChildren(program) {
  const canvas = program.graphicSpec.objects.canvas;
  let next = program;
  for (const id of canvas?.children ?? []) {
    next = next.editGraphics({ target: id, remove: true });
  }
  return next;
}

export function materializeCompositionGraphics(program) {
  program._assertCompositionProgram("materializeCompositionGraphics");
  const layout = resolveCompositionProgramLayout(program);
  let next = clearCompositionChildren(program);
  if (next.graphicSpec.objects.canvas === undefined) {
    next = next.createGraphics({ id: "canvas", type: "canvas" });
  }
  for (const [property, value] of Object.entries({
    width: layout.width,
    height: layout.height,
    background: "white"
  })) {
    next = next.editGraphics({ target: "canvas", property, value });
  }

  for (const placement of layout.children) {
    const child = resizeChildForSnapshot(program.children[placement.id], placement);
    const snapshot = namespaceGraphicSnapshot(child.graphicSpec, {
      namespace: `${program.compositionSpec.id}-${placement.id}`,
      x: placement.x,
      y: placement.y
    });
    next = attachSnapshotObject(next, snapshot, snapshot.order[0], "canvas");
  }

  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
