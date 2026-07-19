import { isPlainObject } from "../core/immutable.js";
import { unionConcreteGraphicBounds } from
  "../grammar/schemas/graphicBounds.js";
import {
  planFacetGuideOwnership,
  resolveSharedFacetLegends
} from "../grammar/facets/guides.js";
import { mapOrdinalValues } from "../grammar/scales/index.js";
import { findLayer } from "../selectors/layers.js";
import { findSemanticScale } from "../selectors/scales.js";
import { axisGraphicIds, allLegendGraphicIds } from
  "./guides/resources.js";
import { attachSnapshotObject } from "./composition.js";
import { namespaceGraphicId } from "./compositionSnapshot.js";
import { DEFAULT_COLORS, DEFAULT_FONT_FAMILY } from "../theme/defaults.js";

const LEGEND_SOURCE_CANVAS = Object.freeze({
  width: 640,
  height: 400,
  margin: Object.freeze({ top: 40, right: 170, bottom: 60, left: 70 })
});

function legendKinds(program) {
  return Object.keys(program.guideConfigs.legend ?? {});
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

function resolveLegacyCategoricalLegend(program) {
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
    reservation: { gap: 18, width: 132 },
    legend: {
      field: config.field,
      mark: encodings[0].layer.mark.type,
      domain: scale.domain,
      colors: mapOrdinalValues(scale.domain, scale.domain, scale.range)
    }
  };
}

function materializeLegacyCategoricalLegend(program, prepared, layout) {
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

function legendCandidates(program) {
  const layers = program.semanticSpec.layers;
  const color = layers.filter(layer => {
    const encoding = layer.encoding?.color;
    return encoding?.scale !== undefined &&
      findSemanticScale(program, encoding.scale) !== undefined;
  });
  if (color.length === 1) {
    const layer = color[0];
    return {
      target: layer.id,
      channels: ["color", "shape", "strokeDash"].filter(
        channel => layer.encoding?.[channel]?.scale !== undefined
      )
    };
  }
  if (color.length > 1) {
    throw new Error(
      "Shared facet legend requires one unambiguous color legend target."
    );
  }
  for (const channel of ["shape", "strokeDash", "size", "opacity"]) {
    const candidates = layers.filter(
      layer => layer.encoding?.[channel]?.scale !== undefined
    );
    if (candidates.length === 1) {
      return { target: candidates[0].id, channels: [channel] };
    }
    if (candidates.length > 1) {
      throw new Error(
        `Shared facet legend requires one unambiguous ${channel} legend target.`
      );
    }
  }
  throw new Error("Shared facet legend requires one eligible encoded scale.");
}

function compactNumber(value) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${+(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)}K`;
  }
  return String(+value.toPrecision(3));
}

function continuousValues(domain, count) {
  return Array.from(
    { length: count },
    (_, index) => domain[0] + index / (count - 1) * (domain[1] - domain[0])
  );
}

function prepareAutoLegendSource(child) {
  const request = legendCandidates(child);
  const canvas = child.graphicSpec.objects.canvas;
  let source = child
    ._withCanvasConfig({
      margin: LEGEND_SOURCE_CANVAS.margin,
      size: { width: "explicit", height: "explicit" }
    })
    .editGraphics({
      target: "canvas",
      property: "width",
      value: LEGEND_SOURCE_CANVAS.width
    })
    .editGraphics({
      target: "canvas",
      property: "height",
      value: LEGEND_SOURCE_CANVAS.height
    });
  if (canvas?.properties.background !== undefined) {
    source = source.editGraphics({
      target: "canvas",
      property: "background",
      value: canvas.properties.background
    });
  }
  const scale = findSemanticScale(
    source,
    findLayer(source, request.target)?.encoding?.color?.scale
  );
  const gradient = scale?.type === "sequential";
  source = source.createLegend({
    target: request.target,
    channels: request.channels,
    ...(gradient ? {
      count: 5,
      gradient: { length: 180, thickness: 12 },
      labels: { offset: 9, fontSize: 10 },
      titleStyle: { color: DEFAULT_COLORS.strongText, fontSize: 11 }
    } : {})
  });
  if (gradient) {
    const resolved = source.resolvedScales[scale.id];
    source = source
      .editGraphics({
        target: "colorGradientLabels",
        property: "text",
        value: continuousValues(resolved.domain, 5).map(compactNumber)
      })
      .editGraphics({
        target: "colorGradientTitle",
        property: "y",
        value: source.graphicSpec.objects.colorGradientTitle.properties.y + 8
      });
  }
  return source;
}

function compatibleLegendChildren(program, source, inferred) {
  return program.compositionSpec.children.map(id => {
    const child = program.children[id];
    return {
      id,
      guideConfigs: inferred ? source.guideConfigs : child.guideConfigs,
      resolvedScales: child.resolvedScales
    };
  });
}

export function prepareSharedFacetLegend(program) {
  if (program.compositionSpec.facet.guides.legend !== "shared") {
    return undefined;
  }
  const firstId = program.compositionSpec.children[0];
  const first = program.children[firstId];
  const inferred = legendKinds(first).length === 0;
  if (inferred) {
    const legacy = resolveLegacyCategoricalLegend(program);
    if (legacy !== undefined) return legacy;
  }
  const source = inferred ? prepareAutoLegendSource(first) : first;
  const kinds = legendKinds(source);
  const compatibility = resolveSharedFacetLegends(
    compatibleLegendChildren(program, source, inferred)
  );
  const roots = allLegendGraphicIds(kinds).filter(
    id => source.graphicSpec.objects[id] !== undefined
  );
  if (roots.length === 0) {
    throw new Error("Shared facet legend has no concrete guide graphics.");
  }
  const bounds = unionConcreteGraphicBounds(source.graphicSpec, roots);
  if (bounds === undefined) {
    throw new Error("Shared facet legend has no measurable concrete bounds.");
  }
  const gradient = kinds.includes("gradient");
  return {
    mode: "promoted",
    source,
    inferred,
    kinds,
    roots,
    bounds,
    compatibility,
    reservation: {
      gap: gradient ? 24 : 18,
      width: gradient ? 112 : Math.max(132, Math.ceil(bounds.right - bounds.left))
    }
  };
}

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

function gradientAnchor(prepared, plot, layout) {
  const strips = prepared.source.graphicSpec.objects.colorGradientStrips;
  if (strips?.items?.[0] === undefined) return undefined;
  const properties = strips.items[0].properties;
  const length = prepared.source.guideConfigs.legend.gradient.gradient.length;
  return {
    sourceX: properties.x,
    sourceY: properties.y,
    targetX: layout.legend.x,
    targetY: plot.y + (plot.height - length) / 2
  };
}

function legendTranslation(prepared, plot, layout) {
  const gradient = gradientAnchor(prepared, plot, layout);
  if (gradient !== undefined) {
    return {
      x: gradient.targetX - gradient.sourceX,
      y: gradient.targetY - gradient.sourceY
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
  if (prepared.mode === "legacyCategorical") {
    return materializeLegacyCategoricalLegend(next, prepared, layout);
  }
  return attachParentLegend(next, prepared, plot, layout);
}
