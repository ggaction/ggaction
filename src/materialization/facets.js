import { mapOrdinalValues } from "../grammar/scales.js";
import { buildTitleReadingBlock } from "../layout/title.js";
import { resolveFacetLayout } from "../layout/facets.js";
import { namespaceGraphicSnapshot } from "./compositionSnapshot.js";
import {
  attachSnapshotObject,
  clearCompositionChildren,
  compositionChildDescriptor
} from "./composition.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../theme/defaults.js";

const ZERO_MARGIN = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

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

function textItem(text, x, y, options = {}) {
  return {
    type: "text",
    properties: {
      x,
      y,
      text: String(text),
      fill: options.color ?? DEFAULT_COLORS.strongText,
      fontSize: options.fontSize ?? 12,
      fontFamily: options.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontWeight: options.fontWeight ?? "normal",
      textAlign: options.textAlign ?? "left",
      textBaseline: options.textBaseline ?? "middle"
    }
  };
}

function collection(program, id, items) {
  return program
    .createGraphics({ id, type: "collection", parent: "canvas" })
    .editGraphics({ target: id, property: "items", value: items });
}

function materializeHeaders(program, layout, config) {
  const items = layout.children.map(cell => textItem(
    cell.value,
    cell.x + cell.width / 2,
    cell.y + config.offset,
    {
      color: config.color,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight,
      textAlign: "center",
      textBaseline: "top"
    }
  ));
  return collection(program, `${program.compositionSpec.id}-headers`, items);
}

function resolveSharedLegend(program) {
  const encodings = program.semanticSpec.layers.flatMap(layer =>
    layer.encoding?.color === undefined
      ? []
      : [{ layer, encoding: layer.encoding.color }]
  );
  if (encodings.length === 0) {
    throw new Error("Shared facet legend requires a categorical color encoding.");
  }
  const fields = new Set(encodings.map(entry => entry.encoding.field));
  const scales = new Set(encodings.map(entry => entry.encoding.scale));
  const marks = new Set(encodings.map(entry => entry.layer.mark?.type));
  if (fields.size !== 1 || scales.size !== 1 || marks.size !== 1) {
    throw new Error(
      "Shared facet legend requires one compatible color field, scale, and mark recipe."
    );
  }
  if (encodings.some(entry =>
    !["nominal", "ordinal"].includes(entry.encoding.fieldType)
  )) {
    throw new Error("Shared facet legend currently requires categorical color.");
  }
  const child = program.children[program.compositionSpec.children[0]];
  const scaleId = encodings[0].encoding.scale;
  const scale = child.resolvedScales[scaleId];
  if (scale?.type !== "ordinal") {
    throw new Error("Shared facet legend requires a resolved ordinal color scale.");
  }
  return {
    field: encodings[0].encoding.field,
    mark: encodings[0].layer.mark.type,
    domain: scale.domain,
    colors: mapOrdinalValues(scale.domain, scale.domain, scale.range)
  };
}

function materializeLegend(program, layout) {
  const legend = resolveSharedLegend(program);
  const items = [textItem(legend.field, layout.legend.x, layout.legend.y, {
    fontSize: 12,
    fontWeight: 700,
    textBaseline: "top"
  })];
  legend.domain.forEach((value, index) => {
    const y = layout.legend.y + 29 + index * 26;
    items.push(legend.mark === "point"
      ? {
          type: "circle",
          properties: {
            x: layout.legend.x + 7,
            y,
            radius: 5.5,
            fill: legend.colors[index],
            stroke: "#ffffff",
            strokeWidth: 0.35,
            opacity: 1
          }
        }
      : {
          type: "rect",
          properties: {
            x: layout.legend.x + 1,
            y: y - 6,
            width: 12,
            height: 12,
            fill: legend.colors[index],
            stroke: "#ffffff",
            strokeWidth: 0.6,
            opacity: 1
          }
        });
    items.push(textItem(value, layout.legend.x + 22, y, {
      fontSize: 10.5
    }));
  });
  return collection(program, `${program.compositionSpec.id}-legend`, items);
}

function titleX(layout, align) {
  if (align === "left") return layout.padding.left;
  if (align === "right") return layout.gridWidth - layout.padding.right;
  return layout.gridWidth / 2;
}

function materializeTitleComponent(program, id, lines, centers, style, layout, top) {
  if (lines.length === 0) return program;
  const x = titleX(layout, program.titleConfig.align);
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

function materializeTitle(program, layout, title) {
  let next = materializeTitleComponent(
    program,
    "chartTitle",
    title.block.titleLines,
    title.block.titleCenters,
    title.config.titleStyle,
    layout,
    title.top
  );
  if (title.block.subtitleLines.length > 0) {
    next = materializeTitleComponent(
      next,
      "chartSubtitle",
      title.block.subtitleLines,
      title.block.subtitleCenters,
      title.config.subtitleStyle,
      layout,
      title.top
    );
  }
  return next;
}

export function resolveFacetProgramLayout(program) {
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
    sharedLegend: spec.facet.guides.legend === "shared"
  });
  return { layout, title };
}

export function materializeFacetGraphics(program) {
  const { layout, title } = resolveFacetProgramLayout(program);
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
  next = materializeHeaders(next, layout, config.headers);
  if (program.compositionSpec.facet.guides.legend === "shared") {
    next = materializeLegend(next, layout);
  }
  if (title.height > 0) next = materializeTitle(next, layout, title);
  return next._withCanvasConfig({
    margin: ZERO_MARGIN,
    size: { width: "auto", height: "auto" }
  });
}
