import { cartesianAxisOwners } from "../selectors/axes.js";
import { resolveConcreteGraphicBounds, resolvePrimitiveGraphicBounds, resolveGraphicParentOffset,
  resolveGraphicClipBounds } from "../grammar/schemas/graphicBounds.js";
import { intersectClipBounds } from "../grammar/schemas/graphicClip.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { textBoundsFitCanvas, textBoundsIntersect, resolveTextBounds, requireFiniteBounds } from "../core/textMetrics.js";
import { axisGraphicIds, allLegendGraphicIds } from "./guides/resources.js";
import { resolveGraphicBounds } from "../layout/canvas.js";
import { resolvePlacedPlotBounds } from "../layout/composition.js";
import {
  alignedTextAnchor,
  buildTitleReadingBlock,
  paintedTitleComponent,
  resolveTitleComponentBounds,
  titleTextProperties
} from "../layout/title.js";
import { resolveFacetLayout } from "../layout/facets.js";
import { assertFacetTopLane } from "./facetTopLane.js";
import { namespaceGraphicId, namespaceGraphicSnapshot } from "./compositionSnapshot.js";
import { prepareSharedFacetLegend } from "./facetGuides/index.js";
import { prepareFacetGuideOwnership } from "./facetGuides/placement.js";
import { resolvePromotedFacetLegendLayout } from "./facetGuides/layout.js";
import {
  attachSnapshotObject,
  clearCompositionChildren,
  compositionChildDescriptor
} from "./composition.js";
import {
  materializeFacetHeaders,
  prepareFacetHeaders,
  facetHeaderGraphicId
} from "./facetHeaders.js";

const ZERO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };
const TITLE_IDS = Object.freeze(["chartTitle", "chartSubtitle"]);

function includeBounds(union, bounds) {
  if (bounds === undefined) return union;
  if (union === undefined) return { ...bounds };
  return { left: Math.min(union.left, bounds.left), right: Math.max(union.right, bounds.right),
    top: Math.min(union.top, bounds.top), bottom: Math.max(union.bottom, bounds.bottom) };
}

// Internal preparation only: no new public spacing policy or persisted state.
// Header entries are concrete child-local text, never caller-supplied bounds.
export function measureFacetContentChildren(program, { headerItems = [] } = {}) {
  if (program?.compositionSpec?.type !== "facet") {
    throw new Error("Facet content measurement requires a facet composition.");
  }
  const spec = program.compositionSpec, grid = new Map((spec.facet.grid?.cells ?? []).map(cell => [cell.id, cell]));
  const placements = spec.children.map((id, index) => ({ id,
    row: grid.get(id)?.row ?? Math.floor(index / spec.columns),
    column: grid.get(id)?.column ?? index % spec.columns }));
  const prepared = prepareSharedFacetLegend(program);
  const ownership = prepareFacetGuideOwnership(program, placements, prepared);
  const childIds = new Set(spec.children), headersByOwner = new Map();
  if (!Array.isArray(headerItems) || headerItems.some(item =>
    !childIds.has(item?.ownerId) || item.type !== "text" || !isPlainObject(item.properties))) {
    throw new TypeError("Facet content headers require concrete text with one observed child owner.");
  }
  for (const header of headerItems) {
    if (!headersByOwner.has(header.ownerId)) headersByOwner.set(header.ownerId, []);
    headersByOwner.get(header.ownerId).push(header);
  }
  const components = ["line", "ticks", "labels", "title"];
  return cloneAndFreeze(placements.map(cell => {
    const child = program.children[cell.id], graphic = child.graphicSpec;
    const profile = child.materializationConfigs.textMetrics;
    const plot = resolveGraphicBounds(child);
    const plan = ownership.children[cell.id], roles = new Map();
    for (const owner of cartesianAxisOwners(child)) {
      const roots = axisGraphicIds(owner.channel, owner.id);
      for (const [index, component] of components.entries()) {
        const removed = plan.removeAxes.includes(owner.id) || plan.removeAxisComponents?.[owner.id]?.includes(component);
        if (removed) roles.set(roots[index], "removed");
        else if (spec.facet.guides.axes === "outer" && owner.channel === "x" && owner.config?.[component]?.position === "bottom") {
          roles.set(roots[index], "footer");
        }
      }
    }
    for (const id of allLegendGraphicIds(plan.removeLegends)) roles.set(id, "removed");
    const groups = new Map(), stack = [], frames = new Map();
    const include = entry => {
      const role = stack.at(-1);
      if (role === "removed") return;
      const type = entry.object.type ?? entry.owner?.type, p = entry.object.properties;
      if (!p || type === "canvas" || p.opacity === 0 || type === "text" && (p.text === "" || p.fill === "none" || p.fill === "transparent")) return;
      const ownerId = entry.ownerId ?? entry.id;
      if (!frames.has(ownerId)) frames.set(ownerId, {
        offset: resolveGraphicParentOffset(graphic, ownerId),
        clip: resolveGraphicClipBounds(graphic, ownerId, { rootViewport: true })
      });
      const { offset: [x, y], clip } = frames.get(ownerId);
      let bounds = resolvePrimitiveGraphicBounds(type, p, profile);
      if (bounds === undefined) return;
      bounds = requireFiniteBounds({ left: bounds.left + x, right: bounds.right + x,
        top: bounds.top + y, bottom: bounds.bottom + y });
      if (clip !== undefined) bounds = intersectClipBounds(bounds, clip);
      if (bounds.left > bounds.right || bounds.top > bounds.bottom) return;
      const key = role ?? "body";
      groups.set(key, includeBounds(groups.get(key), bounds));
    };
    walkGraphicTreeEvents(graphic, {
      enter(entry) {
        stack.push(stack.at(-1) === "removed" ? "removed" : roles.get(entry.id) ?? stack.at(-1));
        if (entry.object.items === undefined && !(entry.object.children?.length)) include(entry);
      },
      item: include,
      exit() { stack.pop(); }
    });
    let body = includeBounds({ left: plot.x, right: plot.x + plot.width, top: plot.y, bottom: plot.y + plot.height }, groups.get("body"));
    for (const header of headersByOwner.get(cell.id) ?? []) {
      const p = header.properties;
      if (p.text !== "" && p.opacity !== 0 && p.fill !== "none" && p.fill !== "transparent") body = includeBounds(body, resolveTextBounds(p, profile));
    }
    const relative = bounds => bounds === undefined ? undefined : ({ left: bounds.left - plot.x, right: bounds.right - plot.x,
      top: bounds.top - plot.y, bottom: bounds.bottom - plot.y });
    return { ...cell, plot, bounds: relative(body),
      ...(groups.has("footer") ? { footerBounds: relative(groups.get("footer")) } : {}) };
  }));
}

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
  if (config.position !== "top") {
    throw new Error("Facet parent title currently supports only top position.");
  }
  const block = buildTitleReadingBlock({
    text: program.semanticSpec.title.text,
    subtitle: program.semanticSpec.title.subtitle
  }, config);
  const top = 8 + config.offset;
  if (top < 0) {
    throw new Error("Facet parent title offset places text outside the Canvas.");
  }
  return { config, block, top, height: Math.ceil(top + block.height) };
}

function materializeTitleComponent(program, id, lines, centers, style, plot, top) {
  if (lines.length === 0) return program;
  const x = alignedTextAnchor(plot.x, plot.width, program.titleConfig.align) +
    (program.titleConfig.alongOffset ?? 0);
  const component = paintedTitleComponent({
    x, y: centers.map(center => top + center), lines,
    textAlign: program.titleConfig.align
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
  for (const [property, value] of Object.entries(titleTextProperties(component, style))) {
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
    title.top
  );
  if (title.block.subtitleLines.length > 0) {
    next = materializeTitleComponent(
      next,
      TITLE_IDS[1],
      title.block.subtitleLines,
      title.block.subtitleCenters,
      title.config.subtitleStyle,
      plot,
      title.top
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
    topLane: spec.topLane,
    plots: spec.children.map(id => ({ id, ...resolveGraphicBounds(program.children[id]) })),
    columns: spec.columns,
    gap: spec.gap,
    align: spec.align,
    padding: spec.padding,
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
    const child = program.children[cell.id];
    const ids = [
      ...cartesianAxisOwners(child).flatMap(owner => axisGraphicIds(owner.channel, owner.id).slice(2)),
      ...allLegendGraphicIds(Object.keys(child.guideConfigs.legend ?? {}))
    ];
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
  if (title.height > 0) next = materializeTitle(next, plot, title);
  assertFacetFieldTitles(next, preparedHeaders);
  assertFacetTopLane(next, { layout, plots,
    headerId: facetHeaderGraphicId(program.compositionSpec.id), titleIds: TITLE_IDS });
  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
