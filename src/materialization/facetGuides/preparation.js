import {
  unionConcreteGraphicBounds
} from "../../grammar/schemas/graphicBounds.js";
import {
  resolveSharedFacetLegends
} from "../../grammar/facets/guides.js";
import { findLayer } from "../../selectors/layers.js";
import { findSemanticScale } from "../../selectors/scales.js";
import { allLegendGraphicIds } from "../guides/resources.js";
import { DEFAULT_COLORS } from "../../theme/defaults.js";
import { resolveLegacyCategoricalLegend } from "./legacyCategorical.js";
import {
  formatDistinctNumericSamples,
  sampleNumericRange
} from "../../grammar/numeric.js";

const LEGEND_SOURCE_CANVAS = Object.freeze({
  width: 640,
  height: 400,
  margin: Object.freeze({ top: 40, right: 170, bottom: 60, left: 70 })
});

export function legendKinds(program) {
  return Object.keys(program.guideConfigs.legend ?? {});
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
  return sampleNumericRange(domain[0], domain[1], count, "Facet legend domain");
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
        value: formatDistinctNumericSamples(
          continuousValues(resolved.domain, 5),
          compactNumber
        )
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
