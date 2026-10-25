import { resolveConcreteGraphicBounds, resolveGraphicParentOffset } from "../grammar/schemas/graphicBounds.js";
import { layoutCompositionLegend } from "../layout/compositionLegend.js";
import { sharedCompositionColorLegend } from "./compositionLegends.js";
import { translateGraphic } from "./graphicTranslation.js";
import { compositionTitleLayout, materializeCompositionTitle } from "./compositionTitle.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { resolveSharedCompositionChildren } from "./compositionScales.js";
import { resolvePlacedPlotBounds } from "../layout/composition.js";
import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import {
  requireSingleOrderedGraphicByType
} from "../grammar/schemas/graphicTree.js";
import {
  resolveCompositionLayout,
  resolveCompositionSnapshotPlacement
} from "../layout/composition.js";
import { namespaceGraphicSnapshot, namespaceGraphicId } from "./compositionSnapshot.js";

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

export function compositionPlotBounds(program) {
  if (!program.compositionSpec) return resolveGraphicBounds(program);
  if (program.compositionSpec.type === "facet") {
    // The retained facet already owns concrete child placements, including
    // header/legend reservations. Read those snapshots without re-entering its
    // materializer (which uses the shared snapshot attachment helpers below).
    const placements = program.compositionSpec.children.map(id => {
      const { id: canvas } = requireSingleOrderedGraphicByType(program.children[id].graphicSpec, "canvas");
      const root = program.graphicSpec.objects[namespaceGraphicId(`${program.compositionSpec.id}-${id}`, canvas)];
      if (!root) throw new Error("Plot alignment requires a materialized facet view.");
      return { id, x: root.properties.x, y: root.properties.y, width: root.properties.width, height: root.properties.height };
    });
    return resolvePlacedPlotBounds({ placements, plots: program.compositionSpec.children.map(id =>
      ({ id, ...resolveGraphicBounds(program.children[id]) })) });
  }
  const { children, layout } = prepareCompositionSnapshots(program);
  return resolvePlacedPlotBounds({ placements: layout.children,
    plots: layout.children.map(({ id }) => ({ id, ...compositionPlotBounds(children[id]) })) });
}

function resizeCompositionPlotExtent(program, dimension, size) {
  const current = compositionPlotBounds(program);
  if (Math.abs(current[dimension] - size) < 1e-6) return program;
  if (!program.compositionSpec) return program.editCanvas({ plot: {
    width: current.width, height: current.height, [dimension]: size } });
  const spec = program.compositionSpec;
  const delta = size - current[dimension];
  if (spec.type === "facet") {
    const plots = Object.values(program.children).map(resolveGraphicBounds);
    if (!plots.length || plots.some(plot => plot.width !== plots[0].width || plot.height !== plots[0].height)) {
      throw new Error("Plot-aligned facets require uniform source plot sizes.");
    }
    const tracks = dimension === "width" ? spec.columns : Math.ceil(spec.children.length / spec.columns);
    return program.editFacetSource({ action: { method: "editCanvas", options: { plot: {
      width: plots[0].width, height: plots[0].height, [dimension]: plots[0][dimension] + delta / tracks } } } });
  }
  const parallel = (dimension === "width") === (spec.direction === "horizontal");
  const increment = parallel ? delta / spec.children.length : delta;
  const children = Object.fromEntries(spec.children.map(id => [id,
    resizeCompositionPlotExtent(program.children[id], dimension, compositionPlotBounds(program.children[id])[dimension] + increment)]));
  return program._withCompositionState({ compositionSpec: spec, children }).materializeComposition();
}

const snapshotCache = new WeakMap();

// Measure the visible snapshots that remain after guide collection. Canvas
// margins and the removed legend's old lane are not occupied chart content.
function retainedCompositionBounds(program, children, layout, legend) {
  const removed = new Set(legend.remove), bounds = [];
  for (const cell of layout.children) {
    const child = resizeChildForSnapshot(children[cell.id], cell);
    const placement = resolveSnapshotPlacement(child, cell, layout);
    const namespace = `${program.compositionSpec.id}-${cell.id}`;
    const visit = id => {
      if (removed.has(namespaceGraphicId(namespace, id))) return;
      const object = child.graphicSpec.objects[id];
      if (object.type === "canvas") {
        for (const nested of object.children ?? []) visit(nested);
      } else {
        const value = resolveConcreteGraphicBounds(child.graphicSpec, id, child.materializationConfigs.textMetrics);
        if (value) bounds.push({ left: value.left + placement.x, right: value.right + placement.x,
          top: value.top + placement.y, bottom: value.bottom + placement.y });
      }
    };
    for (const id of child.graphicSpec.order) visit(id);
  }
  return bounds;
}

export function prepareCompositionSnapshots(program) {
  program._assertCompositionProgram("prepareCompositionSnapshots");
  const spec = program.compositionSpec;
  let bySpec = snapshotCache.get(program.children);
  const cached = bySpec?.get(spec);
  if (cached && cached.titleConfig === program.titleConfig && cached.semanticTitle === program.semanticSpec.title) return cached;
  let children = resolveSharedCompositionChildren(program.children, spec.share);
  if (spec.align === "plot") {
    const dimension = spec.direction === "horizontal" ? "height" : "width";
    const plots = Object.fromEntries(spec.children.map(id => [id, compositionPlotBounds(children[id])]));
    const size = Math.max(...Object.values(plots).map(plot => plot[dimension]));
    children = Object.fromEntries(spec.children.map(id => {
      const child = children[id];
      if (Math.abs(plots[id][dimension] - size) < 1e-6) return [id, child];
      return [id, resizeCompositionPlotExtent(child, dimension, size)];
    }));
  }
  const title = compositionTitleLayout(program);
  const padding = { top: 0, bottom: 0, left: 0, right: 0, ...spec.padding };
  if (title.config) padding[title.config.position] += title.reservation + 8;
  const baseLayout = resolveCompositionLayout({ direction: spec.direction,
    children: spec.children.map(id => ({ ...compositionChildDescriptor(id, children[id]),
      ...(spec.align === "plot" ? { plot: compositionPlotBounds(children[id]) } : {}) })),
    gap: spec.gap, align: spec.align, padding });
  const sharedLegend = sharedCompositionColorLegend(program, children);
  // Ordinary Canvas compositions also accept low-level graphical programs
  // with no semantic plot margins. Only collected, plot-anchored guides need
  // this data-region measurement; start/center/end layout uses child Canvases.
  const plot = sharedLegend ? resolvePlacedPlotBounds({ placements: baseLayout.children,
    plots: baseLayout.children.map(({ id }) => ({ id, ...compositionPlotBounds(children[id]) })) }) : undefined;
  const retained = sharedLegend ? retainedCompositionBounds(program, children, baseLayout, sharedLegend) : [];
  const { layout, frame: legendFrame } = layoutCompositionLegend(baseLayout, plot, sharedLegend, title, retained);
  const result = { children, layout, title, sharedLegend, legendFrame, titleConfig: program.titleConfig, semanticTitle: program.semanticSpec.title };
  if (!bySpec) { bySpec = new WeakMap(); snapshotCache.set(program.children, bySpec); }
  bySpec.set(spec, result);
  return result;
}

export function resolveCompositionProgramLayout(program) {
  return prepareCompositionSnapshots(program).layout;
}

function resizeChildForSnapshot(program, placement) {
  const canvas = requireSingleOrderedGraphicByType(program.graphicSpec, "canvas");
  const widthChanged = canvas.object.properties.width !== placement.width;
  const heightChanged = canvas.object.properties.height !== placement.height;
  if (!widthChanged && !heightChanged) return program;

  if (program.compositionSpec !== undefined) {
    return program;
  }
  if (typeof program.editCanvas !== "function") {
    throw new Error("Automatic composition sizing requires child editCanvas support.");
  }
  return program.editCanvas({
    ...(widthChanged ? { width: placement.width } : {}),
    ...(heightChanged ? { height: placement.height } : {})
  });
}

function resolveSnapshotPlacement(program, placement, layout) {
  if (program.compositionSpec === undefined || layout.align === "plot") return placement;
  const canvas = requireSingleOrderedGraphicByType(program.graphicSpec, "canvas");
  return resolveCompositionSnapshotPlacement({
    direction: layout.direction,
    align: layout.align,
    placement,
    width: canvas.object.properties.width,
    height: canvas.object.properties.height
  });
}

export function attachSnapshotObject(program, snapshot, id, parent) {
  // Snapshot input is already materialized by the child domain actions. The
  // enclosing materializeComposition/facet action owns this concrete transfer;
  // there is no second semantic compilation or per-property authoring replay.
  const objects = { ...program.graphicSpec.objects };
  const attach = key => {
    if (objects[key] !== undefined) throw new Error(`Graphic "${key}" already exists in the receiving snapshot.`);
    const object = snapshot.objects[key];
    if (!object) throw new Error(`Unknown snapshot graphic "${key}".`);
    objects[key] = cloneAndFreeze(object);
    for (const child of object.children ?? []) attach(child);
  };
  attach(id);
  const owner = objects[parent];
  if (!owner || !["canvas", "collection"].includes(owner.type)) throw new Error("Snapshot attachment requires a Canvas or collection parent.");
  objects[parent] = freezeOwned({ ...owner, children: freezeOwned([...(owner.children ?? []), id]) });
  return program._clone({ graphicSpec: freezeOwned({ ...program.graphicSpec, objects: freezeOwned(objects) }) });
}

export function clearCompositionChildren(program) {
  const canvas = program.graphicSpec.objects.canvas;
  return canvas?.children?.length ? program.editGraphics({ target: canvas.children, remove: true }) : program;
}

export function materializeCompositionGraphics(program) {
  program._assertCompositionProgram("materializeCompositionGraphics");
  const { layout, children, title, sharedLegend, legendFrame } = prepareCompositionSnapshots(program);
  // A uniform child surface also covers parent gaps and reserved guide lanes.
  // Mixed local backgrounds retain the composition's existing outer surface.
  const backgrounds = new Set(Object.values(children).map(child => child.graphicSpec.objects.canvas?.properties.background));
  const background = backgrounds.size === 1 && !backgrounds.has(undefined)
    ? [...backgrounds][0] : program.graphicSpec.objects.canvas?.properties.background ?? "white";
  let next = clearCompositionChildren(program);
  if (next.graphicSpec.objects.canvas === undefined) {
    next = next.createGraphics({ id: "canvas", type: "canvas" });
  }
  for (const [property, value] of Object.entries({
    width: layout.width,
    height: layout.height,
    background
  })) {
    next = next.editGraphics({ target: "canvas", property, value });
  }

  for (const placement of layout.children) {
    const source = children[placement.id];
    const child = resizeChildForSnapshot(source, placement);
    const snapshotPlacement = resolveSnapshotPlacement(child, placement, layout);
    const snapshot = namespaceGraphicSnapshot(child.graphicSpec, {
      namespace: `${program.compositionSpec.id}-${placement.id}`,
      x: snapshotPlacement.x,
      y: snapshotPlacement.y
    });
    next = attachSnapshotObject(next, snapshot, snapshot.order[0], "canvas");
  }

  if (sharedLegend) {
    for (const id of sharedLegend.remove) if (next.graphicSpec.objects[id]) next = next.editGraphics({ target: id, remove: true });
    const { source, roots, bounds } = sharedLegend;
    const id = `${program.compositionSpec.id}-shared-color-legend`;
    next = next.createGraphics({ id, type: "canvas", parent: "canvas" });
    for (const [property, value] of Object.entries({ ...legendFrame, background: "transparent" })) {
      next = next.editGraphics({ target: id, property, value });
    }
    const snapshot = namespaceGraphicSnapshot(source.graphicSpec, { namespace: id });
    for (const root of roots) {
      const key = namespaceGraphicId(id, root);
      next = attachSnapshotObject(next, snapshot, key, id);
      const [parentX, parentY] = resolveGraphicParentOffset(source.graphicSpec, root);
      next = translateGraphic(next, key, parentX - bounds.left, parentY - bounds.top);
    }
  }
  if (title.config) {
    const plot = resolvePlacedPlotBounds({ placements: layout.children,
      plots: layout.children.map(({ id }) => ({ id, ...compositionPlotBounds(children[id]) })) });
    next = materializeCompositionTitle(next, plot, title);
  }
  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
