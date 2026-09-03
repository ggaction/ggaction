import { resolveGraphicBounds } from "../layout/canvas.js";
import {
  formatVisibleText,
  resolveTextBounds,
  textBoundsIntersect
} from "../core/textMetrics.js";
import { resolvePlacedPlotBounds } from "../layout/composition.js";
import {
  alignedTextAnchor,
  buildTitleReadingBlock
} from "../layout/title.js";
import { resolveFacetLayout } from "../layout/facets.js";
import { namespaceGraphicSnapshot } from "./compositionSnapshot.js";
import { prepareSharedFacetLegend } from "./facetGuides/index.js";
import {
  attachSnapshotObject,
  clearCompositionChildren,
  compositionChildDescriptor
} from "./composition.js";

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

function collection(program, id, items) {
  return program
    .createGraphics({ id, type: "collection", parent: "canvas" })
    .editGraphics({ target: id, property: "items", value: items });
}

function assertFacetHeadersFit(items, layout, plotById) {
  const previous = [];
  for (let index = 0; index < items.length; index += 1) {
    const bounds = resolveTextBounds(items[index].properties);
    const cell = layout.children[index];
    const plot = plotById.get(cell.id);
    if (bounds.left < 0 || bounds.right > layout.width ||
      bounds.top < 0 || bounds.bottom > layout.height ||
      previous.some(item => textBoundsIntersect(item, bounds)) ||
      textBoundsIntersect(bounds, {
        left: cell.x + plot.x,
        right: cell.x + plot.x + plot.width,
        top: cell.y + plot.y,
        bottom: cell.y + plot.y + plot.height
      })) {
      throw new Error(
        "Facet headers require sufficient non-overlapping space above every child plot."
      );
    }
    previous.push(bounds);
  }
}

function materializeHeaders(program, layout, plots, config) {
  const plotById = new Map(plots.map(plot => [plot.id, plot]));
  const items = layout.children.map(cell => {
    const plot = plotById.get(cell.id);
    if (plot === undefined) {
      throw new Error(`Facet header requires plot bounds for "${cell.id}".`);
    }
    return {
      type: "text",
      properties: {
        x: cell.x + plot.x + plot.width / 2,
        y: cell.y + config.offset,
        text: formatVisibleText(cell.value),
        fill: config.color,
        fontSize: config.fontSize,
        fontFamily: config.fontFamily,
        fontWeight: config.fontWeight,
        textAlign: "center",
        textBaseline: "middle"
      }
    };
  });
  assertFacetHeadersFit(items, layout, plotById);
  return collection(program, `${program.compositionSpec.id}-headers`, items);
}

function materializeTitleComponent(program, id, lines, centers, style, plot, top) {
  if (lines.length === 0) return program;
  const x = alignedTextAnchor(plot.x, plot.width, program.titleConfig.align);
  const count = lines.length;
  let next = program.createGraphics({
    id,
    type: "text",
    ...(count > 1 ? { length: count } : {}),
    parent: "canvas"
  });
  for (const [property, value] of Object.entries({
    x,
    y: count === 1 ? top + centers[0] : centers.map(center => top + center),
    text: count === 1 ? lines[0] : lines,
    fill: style.color,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    textAlign: program.titleConfig.align,
    textBaseline: "middle"
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
    title.top
  );
  if (title.block.subtitleLines.length > 0) {
    next = materializeTitleComponent(
      next,
      "chartSubtitle",
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
  const title = titleLayout(program);
  const spec = program.compositionSpec;
  const layout = resolveFacetLayout({
    children: spec.children.map((id, index) => ({
      ...compositionChildDescriptor(id, program.children[id]),
      value: spec.facet.values[index]
    })),
    columns: spec.columns,
    gap: spec.gap,
    align: spec.align,
    padding: spec.padding,
    titleHeight: title.height,
    sharedLegend: spec.facet.guides.legend === "shared",
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
  const plot = resolvePlacedPlotBounds({
    placements: layout.children,
    plots
  });
  return { layout, title, plot, plots };
}

export function materializeFacetGraphics(program) {
  const preparedLegend = prepareSharedFacetLegend(program);
  const { layout, title, plot, plots } = resolveFacetProgramLayout(
    program,
    preparedLegend
  );
  const config = facetConfig(program);
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
    const child = program.children[placement.id];
    const snapshot = namespaceGraphicSnapshot(child.graphicSpec, {
      namespace: `${program.compositionSpec.id}-${placement.id}`,
      x: placement.x,
      y: placement.y
    });
    next = attachSnapshotObject(next, snapshot, snapshot.order[0], "canvas");
  }
  next = materializeHeaders(next, layout, plots, config.headers);
  next = next.composeFacetGuides({ layout, plot });
  if (title.height > 0) next = materializeTitle(next, plot, title);
  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
