import {
  resolveSharedFacetLegends
} from "../../grammar/facets/guides.js";
import { formatVisibleText } from "../../core/textMetrics.js";
import { mapOrdinalValues } from "../../grammar/scales/index.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../../theme/defaults.js";

function textItem(text, x, y, options = {}) {
  return {
    type: "text",
    properties: {
      x,
      y,
      text: formatVisibleText(text),
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

export function resolveLegacyCategoricalLegend(program) {
  const encodings = program.semanticSpec.layers.flatMap(layer =>
    layer.encoding?.color === undefined
      ? []
      : [{ layer, encoding: layer.encoding.color }]
  );
  if (encodings.length === 0) return undefined;
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
    return undefined;
  }
  const firstId = program.compositionSpec.children[0];
  const scaleId = encodings[0].encoding.scale;
  const scale = program.children[firstId].resolvedScales[scaleId];
  if (scale?.type !== "ordinal") return undefined;
  const config = {
    kind: "color",
    target: encodings[0].layer.id,
    field: encodings[0].encoding.field,
    scale: scaleId,
    title: encodings[0].encoding.field
  };
  const compatibility = resolveSharedFacetLegends(
    program.compositionSpec.children.map(id => ({
      id,
      guideConfigs: { legend: { color: config } },
      resolvedScales: program.children[id].resolvedScales
    }))
  );
  return {
    mode: "legacyCategorical",
    compatibility,
    reservation: {
      position: "right",
      align: "center",
      gap: 18,
      width: 132,
      height: 0
    },
    legend: {
      field: config.field,
      mark: encodings[0].layer.mark.type,
      domain: scale.domain,
      colors: mapOrdinalValues(scale.domain, scale.domain, scale.range)
    }
  };
}

export function materializeLegacyCategoricalLegend(program, prepared, layout) {
  const legend = prepared.legend;
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
  return collection(
    program,
    `${program.compositionSpec.id}-legend`,
    items
  );
}
