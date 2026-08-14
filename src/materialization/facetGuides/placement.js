import { isPlainObject } from "../../core/immutable.js";
import { resolveConcreteGraphicBounds } from
  "../../grammar/schemas/graphicBounds.js";
import { planFacetGuideOwnership } from "../../grammar/facets/guides.js";
import {
  axisGraphicIds,
  allLegendGraphicIds
} from "../guides/resources.js";
import { attachSnapshotObject } from "../composition.js";
import { namespaceGraphicId } from "../compositionSnapshot.js";
import {
  materializeLegacyCategoricalLegend
} from "./legacyCategorical.js";
import { legendKinds, prepareSharedFacetLegend } from "./preparation.js";

function copyLegendConfig(program, source) {
  let next = program;
  for (const [kind, config] of Object.entries(source.guideConfigs.legend ?? {})) {
    next = next._withLegendConfig(kind, config);
  }
  return next;
}

function removeNamespacedGraphics(program, namespace, ids) {
  let next = program;
  for (const id of ids) {
    const target = namespaceGraphicId(namespace, id);
    if (next.graphicSpec.objects[target] !== undefined) {
      next = next.editGraphics({ target, remove: true });
    }
  }
  return next;
}

function legendTranslation(prepared, plot, layout) {
  const strips = prepared.source.graphicSpec.objects.colorGradientStrips;
  if (strips?.items?.[0] !== undefined) {
    const properties = strips.items[0].properties;
    const length = prepared.source.guideConfigs.legend.gradient.gradient.length;
    return {
      x: layout.legend.x - properties.x,
      y: plot.y + (plot.height - length) / 2 - properties.y
    };
  }
  const height = prepared.bounds.bottom - prepared.bounds.top;
  return {
    x: layout.legend.x - prepared.bounds.left,
    y: plot.y + Math.max(0, (plot.height - height) / 2) - prepared.bounds.top
  };
}

function attachParentLegend(program, prepared, plot, layout) {
  const translation = legendTranslation(prepared, plot, layout);
  const canvas = prepared.source.graphicSpec.objects.canvas;
  const id = `${program.compositionSpec.id}-shared-legend`;
  let next = copyLegendConfig(program, prepared.source)
    .createGraphics({ id, type: "canvas", parent: "canvas" });
  for (const [property, value] of Object.entries({
    x: translation.x,
    y: translation.y,
    width: canvas.properties.width,
    height: canvas.properties.height,
    background: "transparent"
  })) {
    next = next.editGraphics({ target: id, property, value });
  }
  for (const root of prepared.roots) {
    next = attachSnapshotObject(next, prepared.source.graphicSpec, root, id);
  }
  return next;
}

function assertSharedLegendFits(program, id, layout, plot) {
  const bounds = resolveConcreteGraphicBounds(program.graphicSpec, id);
  if (bounds === undefined) {
    throw new Error("Facet shared legend requires measurable concrete bounds.");
  }
  const outside = bounds.left < 0 || bounds.right > layout.width ||
    bounds.top < 0 || bounds.bottom > layout.height;
  const overlapsPlot = Math.min(bounds.right, plot.x + plot.width) >
      Math.max(bounds.left, plot.x) &&
    Math.min(bounds.bottom, plot.y + plot.height) >
      Math.max(bounds.top, plot.y);
  if (outside || overlapsPlot) {
    throw new Error(
      "Facet shared legend requires more space than the composed Canvas provides."
    );
  }
  return program;
}

export function applyFacetGuideComposition(program, { layout, plot } = {}) {
  if (!isPlainObject(layout) || !Array.isArray(layout.children)) {
    throw new TypeError("Facet guide composition requires a resolved layout.");
  }
  if (!isPlainObject(plot)) {
    throw new TypeError("Facet guide composition requires resolved plot bounds.");
  }
  const prepared = prepareSharedFacetLegend(program);
  const children = layout.children.map(cell => {
    const child = program.children[cell.id];
    return {
      id: cell.id,
      axes: Object.keys(child.guideConfigs.axis ?? {})
        .filter(channel => ["x", "y"].includes(channel)),
      legendKinds: legendKinds(child)
    };
  });
  const ownership = planFacetGuideOwnership({
    placements: layout.children,
    children,
    axes: program.compositionSpec.facet.guides.axes,
    legend: program.compositionSpec.facet.guides.legend,
    ...(prepared === undefined ? {} : { sharedLegends: prepared.compatibility })
  });
  let next = program;
  for (const cell of layout.children) {
    const namespace = `${program.compositionSpec.id}-${cell.id}`;
    const childPlan = ownership.children[cell.id];
    for (const channel of childPlan.removeAxes) {
      next = removeNamespacedGraphics(next, namespace, axisGraphicIds(channel));
    }
    if (childPlan.removeLegends.length > 0) {
      next = removeNamespacedGraphics(
        next,
        namespace,
        allLegendGraphicIds(childPlan.removeLegends)
      );
    }
  }
  if (prepared === undefined) return next;
  let id;
  if (prepared.mode === "legacyCategorical") {
    id = `${program.compositionSpec.id}-legend`;
    next = materializeLegacyCategoricalLegend(next, prepared, layout);
  } else {
    id = `${program.compositionSpec.id}-shared-legend`;
    next = attachParentLegend(next, prepared, plot, layout);
  }
  return assertSharedLegendFits(next, id, layout, plot);
}
