import { cartesianAxisOwners } from "../selectors/axes.js";
import { axisGraphicIds } from "./guides/resources.js";
import {
  findGraphicParent,
  graphicSiblings
} from "../grammar/schemas/graphicTree.js";
import { findDataset } from "../selectors/datasets.js";
import { hasPlotUnderlays, firstOverlayGuide } from "./plotDrawOrder.js";

export const CANVAS_GRAPHIC_ID = "canvas";
export const PLOT_GRAPHIC_ID = "plot-main";

export function findCanvasGraphic(program) {
  const graphic = program.graphicSpec.objects[CANVAS_GRAPHIC_ID];
  return graphic?.type === "canvas" ? graphic : undefined;
}

export function findPlotGraphic(program) {
  const graphic = program.graphicSpec.objects[PLOT_GRAPHIC_ID];
  return graphic?.type === "collection" ? graphic : undefined;
}

export function assertCanvasHierarchyAvailable(program) {
  const canvasByType = Object.entries(program.graphicSpec.objects).find(
    ([, graphic]) => graphic.type === "canvas"
  );
  if (canvasByType !== undefined) {
    throw new Error("createCanvas requires a program without a canvas.");
  }
  for (const id of [CANVAS_GRAPHIC_ID, PLOT_GRAPHIC_ID]) {
    if (program.graphicSpec.objects[id] !== undefined) {
      throw new Error(`createCanvas requires the reserved graphic id "${id}".`);
    }
  }
}

export function resolvePlotGraphicPlacement(program, relative = {}) {
  const canvas = findCanvasGraphic(program);
  const plot = findPlotGraphic(program);

  if (canvas === undefined && plot === undefined) return relative;
  if (canvas?.type !== "canvas") {
    throw new Error("Ordinary mark attachment requires the canonical canvas.");
  }
  if (plot?.type !== "collection") {
    throw new Error("Ordinary mark attachment requires the canonical plot container.");
  }
  const parent = findGraphicParent(program.graphicSpec, PLOT_GRAPHIC_ID);
  if (parent?.kind !== "parent" || parent.id !== CANVAS_GRAPHIC_ID) {
    throw new Error("The canonical plot container must be attached to the canvas.");
  }
  return { parent: PLOT_GRAPHIC_ID, ...relative };
}

export function resolveMarkGraphicPlacement(program, { data, markType }) {
  const dataset = findDataset(program, data);
  const transform = dataset?.transform?.length === 1
    ? dataset.transform[0]
    : undefined;
  if (transform?.type !== "regression") {
    if (hasPlotUnderlays(program)) {
      const before = firstOverlayGuide(program);
      return resolvePlotGraphicPlacement(program, before === undefined ? {} : { before });
    }
    const named = new Set(cartesianAxisOwners(program).filter(owner => owner.named)
      .flatMap(owner => axisGraphicIds(owner.channel, owner.id)));
    const axis = program.graphicSpec.objects[PLOT_GRAPHIC_ID]?.children?.find(
      id => id === "plotBorder" || /^(x|y)Axis/.test(id) || named.has(id)
    );
    return resolvePlotGraphicPlacement(
      program,
      axis === undefined ? {} : { before: axis }
    );
  }
  const eligible = program.semanticSpec.layers.filter(layer =>
    layer.data === dataset.source &&
    program.graphicSpec.objects[layer.id] !== undefined
  );
  const namespaced = eligible.filter(layer =>
    `${layer.id}RegressionData` === dataset.id
  );
  const sources = namespaced.length === 1 ? namespaced : eligible;
  if (sources.length !== 1) {
    throw new Error(
      "Regression graphic placement requires one source mark layer."
    );
  }
  const anchor = sources[0].id;
  return resolvePlotGraphicPlacement(
    program,
    markType === "area" ? { before: anchor } : { after: anchor }
  );
}

export function resolveCanvasGraphicPlacement(program, relative = {}) {
  const canvas = findCanvasGraphic(program);
  if (canvas === undefined) {
    throw new Error("Canvas-owned graphics require the canonical canvas.");
  }
  return { parent: CANVAS_GRAPHIC_ID, ...relative };
}

export function resolveLegendGraphicPlacement(program, relative = {}) {
  const title = findCanvasGraphic(program)?.children?.find(
    id => id === "chartTitle" || id === "chartSubtitle"
  );
  const hasRelativeAnchor = relative.before !== undefined ||
    relative.after !== undefined;
  return resolveCanvasGraphicPlacement(program, {
    ...(title === undefined || hasRelativeAnchor ? {} : { before: title }),
    ...relative
  });
}

export function preserveGraphicPlacement(program, id) {
  const parent = findGraphicParent(program.graphicSpec, id);
  const siblings = graphicSiblings(program.graphicSpec, id);
  const next = siblings[siblings.indexOf(id) + 1];
  return {
    ...(parent?.kind === "parent" ? { parent: parent.id } : {}),
    ...(next === undefined ? {} : { before: next })
  };
}
