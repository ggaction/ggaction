import { translateGraphic } from "../graphicTranslation.js";
import { cartesianAxisOwners } from "../../selectors/axes.js";
import { resolveLegendGroupPlacement } from "../../layout/legendGroup.js";
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
  for (const [target, group] of Object.entries(source.guideConfigs.legendGroups ?? {})) {
    next = next._withMaterializationConfig(["guides", "legendGroups", target], group);
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
  if (layout.legend?.translation !== undefined) return layout.legend.translation;
  if (prepared.occupiedGroup !== undefined) {
    const [placement] = resolveLegendGroupPlacement({ blocks: [{ id: "shared", bounds: prepared.bounds }],
      group: prepared.occupiedGroup, plot, canvas: layout });
    return { x: placement.dx, y: placement.dy };
  }
  const position = prepared.reservation.position;
  if (["top", "bottom"].includes(position)) {
    const width = prepared.bounds.right - prepared.bounds.left;
    const left = prepared.reservation.align === "left"
      ? plot.x
      : prepared.reservation.align === "right"
        ? plot.x + plot.width - width
        : plot.x + (plot.width - width) / 2;
    return {
      x: left - prepared.bounds.left,
      y: layout.legend.y - prepared.bounds.top
    };
  }
  const gradientKind = prepared.kinds?.find(kind =>
    ["gradient", "strokeGradient"].includes(kind)
  );
  const prefix = gradientKind === "strokeGradient"
    ? "strokeGradient"
    : "colorGradient";
  const strips = prepared.source.graphicSpec.objects[`${prefix}Strips`];
  if (strips?.items?.[0] !== undefined) {
    const properties = strips.items[0].properties;
    return {
      x: layout.legend.x - (position === "left"
        ? prepared.bounds.left
        : properties.x),
      y: plot.y - prepared.bounds.top
    };
  }
  return {
    x: layout.legend.x - prepared.bounds.left,
    y: plot.y - prepared.bounds.top
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

function assertSharedLegendFits(program, id, layout, plot, occupiedGroup) {
  const bounds = resolveConcreteGraphicBounds(program.graphicSpec, id, program.materializationConfigs.textMetrics);
  if (bounds === undefined) {
    throw new Error("Facet shared legend requires measurable concrete bounds.");
  }
  const outside = bounds.left < 0 || bounds.right > layout.width ||
    bounds.top < 0 || bounds.bottom > layout.height;
  const overlapsPlot = Math.min(bounds.right, plot.x + plot.width) >
      Math.max(bounds.left, plot.x) &&
    Math.min(bounds.bottom, plot.y + plot.height) >
      Math.max(bounds.top, plot.y);
  if (outside || overlapsPlot && occupiedGroup === undefined) {
    throw new Error(
      "Facet shared legend requires more space than the composed Canvas provides."
    );
  }
  return program;
}

function attachAuthoredParentLegend(program, prepared, layout, synchronizeColorSizeMeaning) {
  const meaning = prepared.source.semanticSpec.guides.legend?.colorSize;
  if (meaning !== undefined || program.semanticSpec.guides.legend?.colorSize !== undefined) {
    program = synchronizeColorSizeMeaning(program, meaning);
  }
  const id = `${program.compositionSpec.id}-shared-legend`;
  let next = program._withoutMaterializationConfig(["guides", "legend"])
    ._withoutMaterializationConfig(["guides", "legendGroups"]);
  next = copyLegendConfig(next, prepared.source).createGraphics({ id, type: "canvas", parent: "canvas" });
  for (const [property, value] of Object.entries({ x: 0, y: 0, width: layout.width, height: layout.height, background: "transparent" })) {
    next = next.editGraphics({ target: id, property, value });
  }
  for (const block of prepared.blocks) {
    const placement = layout.parentLegendPlacements.find(item => item.kind === block.kind);
    for (const root of block.roots) {
      next = attachSnapshotObject(next, prepared.source.graphicSpec, root, id);
      next = translateGraphic(next, root, placement.dx, placement.dy);
    }
  }
  if (prepared.keepShared === true) return next;
  const spec = next.compositionSpec;
  return next._withCompositionState({ children: next.children,
    compositionSpec: { ...spec, facet: { ...spec.facet, guides: { ...spec.facet.guides, legend: prepared.intent } } } });
}

export function prepareFacetGuideOwnership(program, placements, prepared) {
  const children = placements.map(cell => {
    const child = program.children[cell.id];
    return {
      id: cell.id,
      axes: cartesianAxisOwners(child).map(owner => owner.id),
      axisOwners: cartesianAxisOwners(child).map(owner => ({ id: owner.id, channel: owner.channel,
        components: Object.fromEntries(["line", "ticks", "labels", "title"].flatMap(component =>
          owner.config?.[component] === undefined ? [] : [[component, owner.config[component].position]])) })),
      legendKinds: legendKinds(child)
    };
  });
  return planFacetGuideOwnership({
    placements,
    children,
    axes: program.compositionSpec.facet.guides.axes,
    legend: program.compositionSpec.facet.guides.legend,
    ...(prepared === undefined ? {} : { sharedLegends: prepared.compatibility })
  });
}

export function applyFacetGuideComposition(program, { layout, plot, synchronizeColorSizeMeaning } = {}) {
  if (!isPlainObject(layout) || !Array.isArray(layout.children)) {
    throw new TypeError("Facet guide composition requires a resolved layout.");
  }
  if (!isPlainObject(plot)) {
    throw new TypeError("Facet guide composition requires resolved plot bounds.");
  }
  const prepared = prepareSharedFacetLegend(program);
  const ownership = prepareFacetGuideOwnership(program, layout.children, prepared);
  let next = program;
  for (const cell of layout.children) {
    const namespace = `${program.compositionSpec.id}-${cell.id}`;
    const childPlan = ownership.children[cell.id];
    // Density guides belong to the gradient owner rather than a color channel.
    // Facets currently support no shared density guide; the parent's legend
    // policy still removes each local copy while retaining hue legends.
    for (const [owner, config] of Object.entries(program.children[cell.id].markConfigs)) {
      if (!config.gradientPlot) continue;
      next = removeNamespacedGraphics(next, namespace,
        ["DensityLegend", "DensityLegendLabels", "DensityLegendTitle"].map(suffix => `${owner}${suffix}`));
    }
    const axisOwners = cartesianAxisOwners(program.children[cell.id]);
    for (const axisId of childPlan.removeAxes) {
      const owner = axisOwners.find(owner => owner.id === axisId);
      next = removeNamespacedGraphics(next, namespace, axisGraphicIds(owner.channel, axisId));
    }
    for (const [axisId, components] of Object.entries(childPlan.removeAxisComponents ?? {})) {
      const owner = axisOwners.find(owner => owner.id === axisId);
      const ids = axisGraphicIds(owner.channel, axisId);
      next = removeNamespacedGraphics(next, namespace, components.map(component => ids[["line", "ticks", "labels", "title"].indexOf(component)]));
    }
    if (cell.footerShift !== undefined) {
      for (const owner of axisOwners.filter(owner => owner.channel === "x")) {
        for (const [index, component] of ["line", "ticks", "labels", "title"].entries()) {
          if (owner.config?.[component]?.position !== "bottom") continue;
          const id = namespaceGraphicId(namespace, axisGraphicIds(owner.channel, owner.id)[index]);
          if (next.graphicSpec.objects[id] !== undefined) {
            // Footer guides belong to the parent viewport: moving them within
            // the child Canvas would clip ragged-row owners at its old edge.
            const snapshot = next.graphicSpec;
            next = next.editGraphics({ target: id, remove: true });
            next = attachSnapshotObject(next, snapshot, id, "canvas");
            next = translateGraphic(next, id, cell.x, cell.y + cell.footerShift);
          }
        }
      }
    }
    if (childPlan.removeLegends.length > 0) {
      next = removeNamespacedGraphics(
        next,
        namespace,
        allLegendGraphicIds(childPlan.removeLegends)
      );
    }
  }
  if (prepared === undefined) {
    if (next.semanticSpec.guides.legend?.colorSize !== undefined) {
      next = synchronizeColorSizeMeaning(next, undefined);
    }
    return next._withoutMaterializationConfig(["guides", "legend"])
      ._withoutMaterializationConfig(["guides", "legendGroups"]);
  }
  if (prepared.mode === "authored") {
    next = attachAuthoredParentLegend(next, prepared, layout, synchronizeColorSizeMeaning);
    return assertSharedLegendFits(next, `${program.compositionSpec.id}-shared-legend`, layout, plot, {});
  }
  let id;
  if (prepared.mode === "legacyCategorical") {
    id = `${program.compositionSpec.id}-legend`;
    next = materializeLegacyCategoricalLegend(next, prepared, {
      ...layout,
      legend: { ...layout.legend, y: plot.y }
    });
  } else {
    id = `${program.compositionSpec.id}-shared-legend`;
    next = attachParentLegend(next, prepared, plot, layout);
  }
  return assertSharedLegendFits(next, id, layout, plot, prepared.occupiedGroup);
}
