import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { finiteMidpoint } from "../../grammar/numeric.js";
import { conditionalLegendLayer } from "../legendEncodings.js";
import { localLegendPosition, retainsLegendSlot, legendGroup } from "../legendGroups.js";
import { isHorizontalEdgeLegend } from "../../layout/legendLane.js";
import { legendResourcePolicy } from "./resources.js";

const FAMILY_ORDER = Object.freeze({
  colorSize: 0,
  series: 0,
  color: 0,
  stroke: 0,
  gradient: 0,
  interval: 0,
  strokeGradient: 0,
  strokeInterval: 0,
  size: 1,
  opacity: 2,
  strokeWidth: 3
});

function categoricalFor(program, target) {
  return ["series", "color", "stroke"]
    .map(kind => program.guideConfigs.legend?.[kind])
    .find(config => config?.target === target);
}

function legendPosition(program, kind, config) {
  if (kind === "size" && config.inheritPosition !== false) {
    return categoricalFor(program, config.target)?.position ?? config.position;
  }
  return config.position;
}

function requestedOffset(config) {
  return config.offset;
}

export function existingIds(program, kind) {
  return legendResourcePolicy(kind).graphicIds.filter(
    id => program.graphicSpec.objects[id] !== undefined
  );
}

function componentIds(program, kind) {
  const ids = existingIds(program, kind);
  const titleId = ids.find(id => id.endsWith("Title"));
  const labelId = ids.find(id => id.endsWith("Labels"));
  const backgroundId = ids.find(id => id.endsWith("Background"));
  const symbolIds = ids.filter(id =>
    id !== titleId && id !== labelId && id !== backgroundId
  );
  return { titleId, labelId, backgroundId, symbolIds };
}

function legendGraphicBounds(program, id) {
  let bounds = resolveConcreteGraphicBounds(program.graphicSpec, id, program.materializationConfigs.textMetrics);
  const graphic = program.graphicSpec.objects[id];
  if (!id.includes("LegendSymbol") || graphic?.type !== "line") return bounds;
  const properties = graphic.items?.map(item => item.properties) ??
    [graphic.properties];
  for (const item of properties) {
    if (
      Object.hasOwn(item, "lineCap") ||
      typeof item.stroke !== "string" ||
      !(item.strokeWidth > 0)
    ) continue;
    const extent = item.strokeWidth / 2;
    bounds = {
      left: Math.min(bounds.left, Math.min(item.x1, item.x2) - extent),
      right: Math.max(bounds.right, Math.max(item.x1, item.x2) + extent),
      top: Math.min(bounds.top, Math.min(item.y1, item.y2) - extent),
      bottom: Math.max(bounds.bottom, Math.max(item.y1, item.y2) + extent)
    };
  }
  return bounds;
}

export function unionLegendBounds(program, ids) {
  return ids.map(id => legendGraphicBounds(program, id))
    .filter(bounds => bounds !== undefined)
    .reduce((result, bounds) => result === undefined
      ? bounds
      : {
          left: Math.min(result.left, bounds.left),
          right: Math.max(result.right, bounds.right),
          top: Math.min(result.top, bounds.top),
          bottom: Math.max(result.bottom, bounds.bottom)
        }, undefined);
}

function textAnchor(program, id) {
  const graphic = program.graphicSpec.objects[id];
  const properties = graphic.items?.[0]?.properties ?? graphic.properties;
  return properties.x;
}

export function blockDescriptor(program, kind, config) {
  const components = componentIds(program, kind);
  if (components.labelId === undefined || components.symbolIds.length === 0) {
    throw new Error(`Legend lane requires complete ${kind} graphics.`);
  }
  const foregroundIds = [
    ...components.symbolIds,
    components.labelId,
    ...(components.titleId === undefined ? [] : [components.titleId])
  ];
  const bounds = unionLegendBounds(program, foregroundIds);
  const symbolAnchorIds = ["gradient", "strokeGradient"].includes(kind) && config.representation !== "symbols"
    ? [kind === "gradient" ? "colorGradientStrips" : "strokeGradientStrips"]
    : components.symbolIds;
  const symbolAnchor = unionLegendBounds(program, symbolAnchorIds);
  const symbolBounds = unionLegendBounds(program, components.symbolIds);
  const labels = resolveConcreteGraphicBounds(
    program.graphicSpec,
    components.labelId
  , program.materializationConfigs.textMetrics);
  const emptyLabels = program.graphicSpec.objects[components.labelId].items?.length === 0;
  const title = components.titleId === undefined
    ? undefined
    : (() => {
        const graphic = program.graphicSpec.objects[components.titleId];
        const titleBounds = resolveConcreteGraphicBounds(
          program.graphicSpec,
          components.titleId
        , program.materializationConfigs.textMetrics);
        return {
          x: graphic.properties.x,
          y: graphic.properties.y,
          fontSize: graphic.properties.fontSize,
          width: titleBounds.right - titleBounds.left,
          bounds: titleBounds
        };
      })();
  if ([bounds, symbolAnchor, symbolBounds].includes(undefined) || (labels === undefined && !emptyLabels)) {
    throw new Error(`Legend lane could not measure ${kind} graphics.`);
  }
  const preserveGradientLayout = ["gradient", "strokeGradient"].includes(kind) &&
    config.representation !== "symbols" &&
    (config.gradientDirection === "horizontal" || config.titlePosition === "bottom");
  return {
    id: kind,
    kind,
    preserveAlignment: preserveGradientLayout,
    preserveLabelAlignment: config.labels.align !== undefined,
    preserveGrid: preserveGradientLayout || (["series", "color", "stroke"].includes(kind) || config.representation === "symbols") && (config.columns ?? 1) > 1,
    target: config.target,
    border: borderFor(kind, config),
    offset: requestedOffset(config),
    bounds,
    title,
    symbol: {
      centerX: finiteMidpoint(symbolAnchor.left, symbolAnchor.right),
      left: symbolBounds.left,
      right: symbolBounds.right,
      bounds: symbolAnchor
    },
    labels: {
      x: emptyLabels ? symbolBounds.right + config.labels.offset : (config.labels.align === undefined ? textAnchor(program, components.labelId) : labels.left),
      width: emptyLabels ? 0 : labels.right - labels.left
    },
    occupiedBounds: unionLegendBounds(program, [
      ...foregroundIds,
      ...(components.backgroundId === undefined ? [] : [components.backgroundId])
    ]),
    ...components,
    foregroundIds
  };
}

function borderFor(kind, config) {
  return [
    "series", "color", "stroke", "gradient", "strokeGradient", "opacity",
    "interval", "strokeInterval", "strokeWidth", "size", "colorSize"
  ].includes(kind)
    ? config.border
    : false;
}

export function groupBlocks(blocks, configs) {
  const groups = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const config = configs[block.kind];
    const next = blocks[index + 1];
    if (
      ["series", "color", "stroke"].includes(block.kind) &&
      next?.kind === "size" && next.target === block.target
    ) {
      groups.push({
        id: `${block.kind}+size`,
        blocks: [block, next.backgroundId === undefined ? next : { ...next,
          bounds: next.occupiedBounds, inset: next.border.padding + next.border.lineWidth / 2 }],
        border: borderFor(block.kind, config),
        backgroundId: block.backgroundId
      });
      index += 1;
      continue;
    }
    groups.push({
      id: block.kind,
      blocks: [block],
      border: borderFor(block.kind, config),
      backgroundId: block.backgroundId
    });
  }
  return groups;
}

export function edgeKinds(program, edge) {
  const configs = program.guideConfigs.legend ?? {};
  const layerOrder = new Map(program.semanticSpec.layers.map(layer => conditionalLegendLayer(layer)).map(
    (layer, index) => [layer.id, index]
  ));
  return Object.entries(configs)
    .filter(([kind, config]) => (localLegendPosition(config) === undefined || retainsLegendSlot(config) ||
      localLegendPosition(config) === edge) && legendGroup(program, config.target) === undefined && legendPosition(program, kind, config) === edge)
    .sort(([kindA, configA], [kindB, configB]) =>
      (layerOrder.get(configA.target) - layerOrder.get(configB.target)) ||
      (FAMILY_ORDER[kindA] - FAMILY_ORDER[kindB])
    );
}

export function hasSideLegendLane(program) {
  return ["right", "left"].some(side => edgeKinds(program, side).length > 0);
}

export function hasHorizontalLegendLane(program) {
  return ["top", "bottom"].some(edge => edgeKinds(program, edge).some(
    ([, config]) => isHorizontalEdgeLegend({ ...config, position: edge })
  ));
}

export function hasLegendLane(program) {
  return Object.values(program.guideConfigs.legend ?? {}).some(config => localLegendPosition(config) !== undefined) || hasSideLegendLane(program) ||
    hasHorizontalLegendLane(program);
}


export function horizontalGroups(program, groups) {
  return groups.map(group => {
    const representative = group.blocks[0];
    const config = program.guideConfigs.legend?.[representative.kind];
    const atomic = group.blocks.length > 1;
    const titleId = atomic ? undefined : representative.titleId;
    const contentIds = group.blocks.flatMap(block => block.foregroundIds)
      .filter(id => id !== titleId);
    if (atomic) contentIds.push(...group.blocks.slice(1).flatMap(block =>
      block.backgroundId === undefined ? [] : [block.backgroundId]));
    const content = unionLegendBounds(program, contentIds);
    const foreground = unionLegendBounds(
      program,
      [...contentIds, ...(titleId === undefined ? [] : [titleId])]
    );
    if (content === undefined || foreground === undefined) {
      throw new Error(`Legend lane could not measure ${group.id} content.`);
    }
    const border = group.border;
    const inset = border === false
      ? 0
      : border.padding + border.lineWidth / 2;
    return {
      id: group.id,
      atomic,
      titleId,
      contentIds,
      title: atomic ? undefined : representative.title,
      inline: config?.titlePosition === "left",
      element: atomic ? foreground : representative.symbol.bounds,
      content,
      horizontal: { left: foreground.left, right: foreground.right,
        top: foreground.top, bottom: foreground.bottom },
      inset,
      padding: border === false ? 0 : border.padding,
      backgroundId: group.backgroundId
    };
  });
}

export function legendGroupKinds(program, target) {
  const group = legendGroup(program, target);
  return Object.entries(program.guideConfigs.legend ?? {}).filter(([, config]) => config.target === target &&
    (localLegendPosition(config) === undefined || retainsLegendSlot(config, group.placement.position ?? null)))
    .sort(([a], [b]) => FAMILY_ORDER[a] - FAMILY_ORDER[b]);
}
