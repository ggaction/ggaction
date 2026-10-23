import { resolveConcreteGraphicBounds } from "../grammar/schemas/graphicBounds.js";
import { textBoundsFitCanvas, textBoundsIntersect, resolveTextBounds } from "../core/textMetrics.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { resolvePlacedPlotBounds } from "../layout/composition.js";
import {
  alignedTextAnchor,
  alignedTitleAnchor,
  buildTitleReadingBlock,
  paintedTitleComponent,
  resolveTitleComponentBounds,
  titleTextProperties
} from "../layout/title.js";
import { resolveFacetLayout } from "../layout/facets.js";
import { namespaceGraphicId, namespaceGraphicSnapshot } from "./compositionSnapshot.js";
import { prepareSharedFacetLegend } from "./facetGuides/index.js";
import { resolvePromotedFacetLegendLayout } from "./facetGuides/layout.js";
import {
  attachSnapshotObject,
  clearCompositionChildren,
  compositionChildDescriptor
} from "./composition.js";
import {
  materializeFacetHeaders,
  prepareFacetHeaders,
  retainedFacetGuideIds
} from "./facetHeaders.js";

const ZERO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };

function facetConfig(program) {
  const config = program.materializationConfigs.facets?.[program.compositionSpec.id];
  if (config === undefined) {
    throw new Error(`Facet "${program.compositionSpec.id}" requires materialization config.`);
  }
  return config;
}

function titleLayout(program) {
  if (program.semanticSpec.title.text === undefined) {
    return { height: 0 };
  }
  const config = program.titleConfig;
  if (config === undefined) {
    throw new Error("Facet title requires chart title configuration.");
  }
  const block = buildTitleReadingBlock({
    text: program.semanticSpec.title.text,
    subtitle: program.semanticSpec.title.subtitle
  }, config, program.materializationConfigs.textMetrics);
  const top = 8 + config.offset;
  if (top < 0) {
    throw new Error("Facet parent title offset places text outside the Canvas.");
  }
  const reservation = Math.ceil(top + block.height);
  return { config, block, top, reservation, height: config.position === "top" ? reservation : 0 };
}

function materializeTitleComponent(program, id, lines, centers, style, plot, title) {
  if (lines.length === 0) return program;
  const { config, block, top } = title;
  const canvas = program.graphicSpec.objects.canvas.properties;
  const horizontal = ["top", "bottom"].includes(config.position);
  const component = paintedTitleComponent(horizontal ? {
    x: alignedTextAnchor(plot.x, plot.width, config.align) + (config.alongOffset ?? 0),
    y: centers.map(center => (config.position === "top" ? top : canvas.height - top - block.height) + center),
    lines, textAlign: config.align,
    ...(config.position === "bottom" ? { rotation: 0, explicitRotation: true } : {})
  } : {
    x: centers.map(center => config.position === "left" ? top + center : canvas.width - top - center),
    y: alignedTitleAnchor(plot.y, plot.height, block.width, config.align) + (config.alongOffset ?? 0),
    lines, textAlign: "center", rotation: config.position === "left" ? -Math.PI / 2 : Math.PI / 2,
    explicitRotation: true
  });
  const bounds = resolveTitleComponentBounds(component, style, program.materializationConfigs.textMetrics);
  if (!textBoundsFitCanvas(bounds, program.graphicSpec.objects.canvas.properties)) {
    throw new Error("Facet parent title places text outside the Canvas.");
  }
  const count = component.lines.length;
  let next = program.createGraphics({
    id,
    type: "text",
    ...(count > 1 ? { length: count } : {}),
    parent: "canvas"
  });
  for (const [property, value] of Object.entries({ ...titleTextProperties(component, style),
    ...(component.explicitRotation ? { rotation: component.rotation } : {})
  })) {
    next = next.editGraphics({ target: id, property, value });
  }
  return next;
}

function materializeTitle(program, plot, title) {
  let next = materializeTitleComponent(
    program,
    "chartTitle",
    title.block.titleLines,
    title.block.titleCenters,
    title.config.titleStyle,
    plot,
    title
  );
  if (title.block.subtitleLines.length > 0) {
    next = materializeTitleComponent(
      next,
      "chartSubtitle",
      title.block.subtitleLines,
      title.block.subtitleCenters,
      title.config.subtitleStyle,
      plot,
      title
    );
  }
  return next;
}

export function resolveFacetProgramLayout(program, preparedLegend) {
  program._assertCompositionProgram("resolveFacetProgramLayout");
  if (program.compositionSpec.type !== "facet") {
    throw new Error("resolveFacetProgramLayout requires a facet composition.");
  }
  preparedLegend ??= prepareSharedFacetLegend(program);
  const title = titleLayout(program);
  const spec = program.compositionSpec;
  const preparedHeaders = prepareFacetHeaders(
    program,
    facetConfig(program).headers
  );
  const gridCells = new Map(
    (spec.facet.grid?.cells ?? []).map(cell => [cell.id, cell])
  );
  // Reserve the outer title lane before placing children and shared legends.
  // Only the inferred layout uses this padding; the authored facet is unchanged.
  const padding = { ...spec.padding };
  if (title.config && title.config.position !== "top") {
    padding[title.config.position] += title.reservation;
  }
  let layout = resolveFacetLayout({
    children: spec.children.map((id, index) => ({
      ...compositionChildDescriptor(id, program.children[id]),
      value: spec.facet.values[index],
      ...(gridCells.has(id) ? {
        row: gridCells.get(id).row,
        column: gridCells.get(id).column
      } : {})
    })),
    spacing: spec.spacing,
    plots: spec.children.map(id => ({ id, ...resolveGraphicBounds(program.children[id]) })),
    columns: spec.columns,
    gap: spec.gap,
    align: spec.align,
    padding,
    titleHeight: title.height,
    headerLayout: preparedHeaders.headerLayout,
    sharedLegend: spec.facet.guides.legend === "shared" && preparedLegend?.mode !== "promoted",
    ...(preparedLegend === undefined ? {} : {
      sharedLegendGap: preparedLegend.reservation.gap,
      sharedLegendWidth: preparedLegend.reservation.width,
      sharedLegendHeight: preparedLegend.reservation.height,
      sharedLegendPosition: preparedLegend.reservation.position
    })
  });
  const plots = spec.children.map(id => ({
    id,
    ...resolveGraphicBounds(program.children[id])
  }));
  let plot = resolvePlacedPlotBounds({
    placements: layout.children,
    plots
  });
  ({ layout, plot } = resolvePromotedFacetLegendLayout(
    program, { layout, plot, plots, title, preparedHeaders, prepared: preparedLegend }
  ));
  return { layout, title, plot, plots, preparedHeaders };
}

function assertPlotSpacingGuides(program, layout, plots) {
  const occupied = [];
  const regions = layout.children.map((cell, index) => ({ id: cell.id,
    left: cell.x + plots[index].x, right: cell.x + plots[index].x + plots[index].width,
    top: cell.y + plots[index].y, bottom: cell.y + plots[index].y + plots[index].height
  }));
  for (const cell of layout.children) {
    const ids = retainedFacetGuideIds(program, cell.id);
    for (const id of ids) {
      const target = namespaceGraphicId(`${program.compositionSpec.id}-${cell.id}`, id);
      if (program.graphicSpec.objects[target] === undefined) continue;
      const bounds = resolveConcreteGraphicBounds(program.graphicSpec, target, program.materializationConfigs.textMetrics);
      if (bounds !== undefined) occupied.push({ owner: cell.id, bounds });
    }
  }
  const headers = program.graphicSpec.objects[`${program.compositionSpec.id}-headers`];
  for (const item of headers?.items ?? []) {
    if (item.properties.text !== "") occupied.push({ owner: "headers", bounds: resolveTextBounds(item.properties, program.materializationConfigs.textMetrics) });
  }
  for (let index = 0; index < occupied.length; index += 1) {
    const item = occupied[index];
    if (regions.some(region => region.id !== item.owner && textBoundsIntersect(item.bounds, region)) ||
      occupied.slice(0, index).some(other => other.owner !== item.owner && textBoundsIntersect(item.bounds, other.bounds))) {
      throw new Error("Plot spacing gap is too small for the retained facet guides or headers.");
    }
  }
}

export function materializeFacetGraphics(program) {
  const preparedLegend = prepareSharedFacetLegend(program);
  const { layout, title, plot, plots, preparedHeaders } = resolveFacetProgramLayout(
    program,
    preparedLegend
  );
  const background = program.graphicSpec.objects.canvas?.properties
    ?.background ?? "white";
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
    const child = program.children[placement.id];
    const snapshot = namespaceGraphicSnapshot(child.graphicSpec, {
      namespace: `${program.compositionSpec.id}-${placement.id}`,
      x: placement.x,
      y: placement.y
    });
    next = attachSnapshotObject(next, snapshot, snapshot.order[0], "canvas");
    if (layout.spacing === "plot") {
      const root = snapshot.order[0];
      const id = namespaceGraphicId(`${program.compositionSpec.id}-${placement.id}`, "plot-background");
      const bounds = resolveGraphicBounds(child);
      const first = next.graphicSpec.objects[root].children?.[0];
      next = next.editGraphics({ target: root, property: "background", value: "transparent" })
        .createGraphics({ id, type: "rect", parent: root, ...(first === undefined ? {} : { before: first }) });
      for (const [property, value] of Object.entries({ ...bounds, stroke: "none", strokeWidth: 0,
        fill: child.graphicSpec.objects.canvas.properties.background ?? "transparent"
      })) next = next.editGraphics({ target: id, property, value });
    }
  }
  next = materializeFacetHeaders(next, layout, plots, preparedHeaders);
  next = next.composeFacetGuides({ layout, plot });
  if (layout.spacing === "plot") assertPlotSpacingGuides(next, layout, plots);
  if (title.config) next = materializeTitle(next, plot, title);
  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
