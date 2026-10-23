import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { measureFacetContentChildren } from "./facetContentBounds.js";
export { measureFacetContentChildren } from "./facetContentBounds.js";
import { resolveFacetContentFlow, resolveFacetContentFooters } from "../layout/facetContentFlow.js";
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
import { assertFacetTopLane } from "./facetTopLane.js";
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
  resolveFacetHeaderItems,
  prepareFacetHeaders,
  facetHeaderGraphicId,
  retainedFacetGuideIds
} from "./facetHeaders.js";

const ZERO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const TITLE_IDS = Object.freeze(["chartTitle", "chartSubtitle"]);


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
    TITLE_IDS[0],
    title.block.titleLines,
    title.block.titleCenters,
    title.config.titleStyle,
    plot,
    title
  );
  if (title.block.subtitleLines.length > 0) {
    next = materializeTitleComponent(
      next,
      TITLE_IDS[1],
      title.block.subtitleLines,
      title.block.subtitleCenters,
      title.config.subtitleStyle,
      plot,
      title
    );
  }
  return next;
}

function resolveContentLayout(program, options, preparedHeaders) {
  const spec = program.compositionSpec;
  const plots = options.plots;
  // Header anchors are child-local before packing. Role titles reserve one outer
  // lane; they must not be duplicated into every child measurement.
  const local = { spacing: "content", children: options.children.map((child, index) => ({
    ...child, x: 0, y: 0, row: Math.floor(index / spec.columns), column: index % spec.columns
  })) };
  const { records, items } = resolveFacetHeaderItems(local, plots, preparedHeaders);
  const headerItems = records.flatMap((record, index) => {
    const descriptor = record.descriptor;
    if (descriptor.topology === "role-title" || descriptor.ids?.length > 1) return [];
    return [{ ...items[index], ownerId: descriptor.id ?? descriptor.ids[0] }];
  });
  const measured = measureFacetContentChildren(program, { headerItems });
  const flow = resolveFacetContentFlow({ children: measured, columns: spec.columns, gap: spec.gap });
  const measuredById = new Map(measured.map(child => [child.id, child]));
  const lastByColumn = new Map(flow.children.map(child => [child.column, child]));
  const footers = resolveFacetContentFooters({ flow, footers: [...lastByColumn.values()]
    .filter(child => measuredById.get(child.id).footerBounds !== undefined)
    .map(child => ({ id: child.id, column: child.column })) });
  const footerById = new Map(footers.map(footer => [footer.ownerId, footer]));
  const bounds = { ...flow.bounds };
  for (const footer of footers) {
    const measured = measuredById.get(footer.ownerId), b = measured.footerBounds;
    const dy = footer.y - measured.plot.height;
    bounds.left = Math.min(bounds.left, footer.x + b.left);
    bounds.right = Math.max(bounds.right, footer.x + b.right);
    bounds.top = Math.min(bounds.top, dy + b.top);
    bounds.bottom = Math.max(bounds.bottom, dy + b.bottom);
  }
  const packed = resolveFacetLayout({ ...options, spacing: "canvas", topLane: undefined,
    children: [{ id: "packed", width: bounds.right - bounds.left, height: bounds.bottom - bounds.top }],
    columns: 1, gap: 0, headerLayout: { outer: preparedHeaders.headerLayout.outer }, plots: undefined });
  const dx = packed.children[0].x - bounds.left, dy = packed.children[0].y - bounds.top;
  return { ...packed, spacing: "content", columns: flow.columns,
    rows: Math.ceil(flow.children.length / flow.columns), gap: spec.gap,
    children: flow.children.map(cell => {
      const measured = measuredById.get(cell.id), child = program.children[cell.id];
      const canvas = child.graphicSpec.objects.canvas.properties;
      const footer = footerById.get(cell.id);
      return { id: cell.id, row: cell.row, column: cell.column,
        x: dx + cell.x - measured.plot.x, y: dy + cell.y - measured.plot.y,
        width: canvas.width, height: canvas.height,
        ...(footer === undefined ? {} : { footerShift: footer.y - cell.y - measured.plot.height }) };
    }) };
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
  const layoutOptions = {
    children: spec.children.map((id, index) => ({
      ...compositionChildDescriptor(id, program.children[id]),
      value: spec.facet.values[index],
      ...(gridCells.has(id) ? {
        row: gridCells.get(id).row,
        column: gridCells.get(id).column
      } : {})
    })),
    spacing: spec.spacing,
    topLane: spec.topLane,
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
  };
  let layout = spec.spacing === "content" ? resolveContentLayout(program, layoutOptions, preparedHeaders)
    : resolveFacetLayout(layoutOptions);
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
  const headers = program.graphicSpec.objects[facetHeaderGraphicId(program.compositionSpec.id)];
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

function assertFacetFieldTitles(program, prepared) {
  if (prepared.titles.length === 0) return;
  const id = facetHeaderGraphicId(program.compositionSpec.id);
  const profile = program.materializationConfigs.textMetrics;
  const titles = program.graphicSpec.objects[id].items.slice(prepared.descriptors.length)
    .map(item => resolveTextBounds(item.properties, profile));
  const collect = entry => {
    if ((entry.ownerId ?? entry.id) === id) return;
    const type = entry.object.type ?? entry.owner?.type;
    const properties = entry.object.properties;
    if (type !== "text" || properties?.text === "" || properties?.opacity === 0) return;
    const bounds = resolveConcreteGraphicBounds(program.graphicSpec, entry.id, profile);
    if (bounds !== undefined && titles.some(title => textBoundsIntersect(title, bounds))) {
      throw new Error("Facet field title overlaps retained chart text.");
    }
  };
  walkGraphicTreeEvents(program.graphicSpec, { enter: collect, item: collect });
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
    if (["plot", "content"].includes(layout.spacing)) {
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
  assertFacetFieldTitles(next, preparedHeaders);
  assertFacetTopLane(next, { layout, plots,
    headerId: facetHeaderGraphicId(program.compositionSpec.id), titleIds: TITLE_IDS });
  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
