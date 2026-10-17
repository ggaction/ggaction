import {translateGraphic}from"../../../materialization/graphicTranslation.js";
import { editLegendBorderBounds } from "../../../materialization/legendBorder.js";
import { resolveLegendAxisOffset, effectiveLegendOffsetConfig } from "../../../materialization/guides/resources.js";
import { resolveLegendGroupPlacement } from "../../../layout/legendGroup.js";
import { localLegendPosition, localLegendPlacement, legendGroup } from "../../../materialization/legendGroups.js";
import { editLegendBackground, resolveLegendBackgroundFromBounds } from "./continuous/common.js";
import { action } from "../../../core/action.js";
import { noOptions } from "../../../core/validation.js";
import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from "../../../grammar/schemas/graphicBounds.js";
import { finiteMidpoint } from "../../../grammar/numeric.js";
import { resolveGraphicBounds } from "../../../layout/canvas.js";
import {
  resolveHorizontalLegendLane,
  resolveHorizontalLegendGroup,
  resolveSingleHorizontalLegendPlacement,
  isHorizontalEdgeLegend,
  resolveSideLegendLane,
  resolveSingleSideLegendPlacement
} from "../../../layout/legendLane.js";
import { findCanvasGraphic } from
  "../../../materialization/graphicHierarchy.js";
import { legendResourcePolicy } from
  "../../../materialization/guides/resources.js";

const FAMILY_ORDER = Object.freeze({
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

function existingIds(program, kind) {
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

function unionLegendBounds(program, ids) {
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

function blockDescriptor(program, kind, config) {
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
      x: emptyLabels ? symbolBounds.right + config.labels.offset : textAnchor(program, components.labelId),
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
    "interval", "strokeInterval", "strokeWidth", "size"
  ].includes(kind)
    ? config.border
    : false;
}

function groupBlocks(blocks, configs) {
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

function edgeKinds(program, edge) {
  const configs = program.guideConfigs.legend ?? {};
  const layerOrder = new Map(program.semanticSpec.layers.map(
    (layer, index) => [layer.id, index]
  ));
  return Object.entries(configs)
    .filter(([kind, config]) => localLegendPosition(config) === undefined && legendGroup(program, config.target) === undefined && legendPosition(program, kind, config) === edge)
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


// Use the declared text-box top as the renderer anchor. A middle SVG baseline
// depends on the font's x-height and otherwise protrudes above that box.
function alignLegendTextBoxes(program, ids) {
  const normalize = properties => properties.textBaseline === "middle"
    ? { ...properties, y: properties.y - properties.fontSize / 2, textBaseline: "top" }
    : properties;
  let next = program;
  for (const id of ids) {
    const graphic = next.graphicSpec.objects[id];
    if (graphic.type !== "text") continue;
    if (graphic.items !== undefined) {
      if (!graphic.items.some(item => item.properties.textBaseline === "middle")) continue;
      next = next.editGraphics({ target: id, property: "items", value: graphic.items.map(item => ({
        type: item.type ?? graphic.type, properties: normalize(item.properties)
      })) });
    } else if (graphic.properties.textBaseline === "middle") {
      next = next.editGraphics({ target: id, property: "y", value: normalize(graphic.properties).y })
        .editGraphics({ target: id, property: "textBaseline", value: "top" });
    }
  }
  return next;
}

function horizontalGroups(program, groups) {
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

function applyHorizontalPlan(program, groups, plan) {
  let next = program;
  const byId = new Map(groups.map(group => [group.id, group]));
  for (const placement of plan.placements) {
    const group = byId.get(placement.id);
    if (group.titleId !== undefined) {
      next = translateGraphic(next, group.titleId, placement.dx, placement.titleDy);
    }
    for (const id of group.contentIds) {
      next = translateGraphic(next, id, placement.dx, placement.contentDy);
    }
    if (placement.background !== undefined) {
      next = editLegendBorderBounds(next, placement.background.id, placement.background);
    }
  }
  if (plan.background !== undefined) {
    next = editLegendBorderBounds(next, plan.background.id, plan.background);
  }
  return next;
}

export const rematerializeSideLegendLane = /* @__PURE__ */ action(
  {
    op: "rematerializeSideLegendLane",
    description: "Align and stack every right or left legend block."
  },
  function (args = {}) {
    noOptions(args, "rematerializeSideLegendLane");
    const plot = resolveGraphicBounds(this);
    const canvas = findCanvasGraphic(this)?.properties;
    if (plot === undefined || canvas === undefined) {
      throw new Error("Legend lane requires resolved Canvas and plot bounds.");
    }
    const configs = this.guideConfigs.legend ?? {};
    const plans = ["right", "left"].flatMap(side => {
      const entries = edgeKinds(this, side);
      if (entries.length === 0) return [];
      if (entries.length === 1) return [{ side, entries }];
      const blocks = entries.map(([kind, config]) =>
        blockDescriptor(this, kind, config)
      );
      const plan = resolveSideLegendLane({
        side,
        plot,
        canvas,
        groups: groupBlocks(blocks, configs)
      });
      return [{ plan, blocks, side, entries }];
    });
    let next = this;
    for (const { plan, blocks, side, entries } of plans) {
      if (plan === undefined) continue;
      const byId = new Map(blocks.map(block => [block.id, block]));
      for (const placement of plan.placements) {
        const block = byId.get(placement.id);
        if (block.titleId !== undefined) {
          next = translateGraphic(
            next,
            block.titleId,
            placement.titleDx,
            placement.dy
          );
          if (!block.preserveAlignment) next = next.editGraphics({
            target: block.titleId, property: "textAlign", value: "left"
          });
        }
        for (const id of block.symbolIds) {
          next = translateGraphic(
            next,
            id,
            placement.symbolDx,
            placement.dy
          );
        }
        next = translateGraphic(
          next,
          block.labelId,
          placement.labelDx,
          placement.dy
        );
        if (!block.preserveAlignment) next = next.editGraphics({
          target: block.labelId, property: "textAlign", value: "left"
        });
      }
      for (const block of blocks) {
        if (block.backgroundId === undefined || plan.backgrounds.some(item => item.id === block.backgroundId)) continue;
        const bounds = unionLegendBounds(next, block.foregroundIds);
        const background = resolveLegendBackgroundFromBounds([bounds], block.border, canvas, "Legend");
        next = editLegendBackground(next, block.backgroundId, background, block.border);
      }
      for (const background of plan.backgrounds) {
        next = editLegendBorderBounds(next, background.id, background);
      }
    }
    for (const { side, entries } of plans) {
      const ids = entries.flatMap(([kind]) => existingIds(next, kind));
      next = alignLegendTextBoxes(next, ids);
      const bounds = unionLegendBounds(next, ids);
      const { dy } = resolveSingleSideLegendPlacement({ side, plot, canvas, bounds });
      for (const id of ids) next = translateGraphic(next, id, 0, dy);
    }
    return next;
  }
);

export const rematerializeHorizontalLegendLane = /* @__PURE__ */ action(
  {
    op: "rematerializeHorizontalLegendLane",
    description: "Pack and align every top or bottom legend block."
  },
  function (args = {}) {
    noOptions(args, "rematerializeHorizontalLegendLane");
    const plot = resolveGraphicBounds(this);
    const canvas = findCanvasGraphic(this)?.properties;
    if (plot === undefined || canvas === undefined) {
      throw new Error("Legend lane requires resolved Canvas and plot bounds.");
    }
    const configs = this.guideConfigs.legend ?? {};
    let next = this;
    for (const edge of ["top", "bottom"]) {
      const entries = edgeKinds(next, edge).filter(
        ([, config]) => isHorizontalEdgeLegend({ ...config, position: edge })
      ).map(([kind, config]) => [kind, effectiveLegendOffsetConfig(next, kind, config)]);
      if (entries.length === 0) continue;
      if (entries.length === 1) {
        const [kind, config] = entries[0];
        const ids = existingIds(next, kind);
        const bounds = unionConcreteGraphicBounds(next.graphicSpec, ids, next.materializationConfigs.textMetrics);
        const { dx, dy } = resolveSingleHorizontalLegendPlacement({
          plot, canvas, config: { ...config, offset: resolveLegendAxisOffset(next, config, plot) }, bounds
        });
        for (const id of ids) next = translateGraphic(next, id, dx, dy);
        continue;
      }
      for (const [kind, config] of entries) {
        if (config.inferredOffset !== true || resolveLegendAxisOffset(next, config, plot) === config.offset) continue;
        const ids = existingIds(next, kind);
        const bounds = unionConcreteGraphicBounds(next.graphicSpec, ids, next.materializationConfigs.textMetrics);
        const { dx, dy } = resolveSingleHorizontalLegendPlacement({ plot, canvas,
          config: { ...config, offset: resolveLegendAxisOffset(next, config, plot) }, bounds });
        for (const id of ids) next = translateGraphic(next, id, dx, dy);
      }
      let groups = groupBlocks(entries.map(([kind, config]) =>
        blockDescriptor(next, kind, config)), configs);
      for (const group of groups.filter(group => group.blocks.length > 1)) {
        const config = configs[group.blocks[0].kind];
        const children = horizontalGroups(next, group.blocks.map((block, index) => ({
          id: block.id, blocks: [block], border: index === 0 ? false : block.border,
          backgroundId: index === 0 ? undefined : block.backgroundId
        }))).map(child => ({ ...child, element: child.content }));
        const plan = resolveHorizontalLegendGroup({ edge, plot, canvas, groups: children,
          allowOverflow: next.materializationConfigs.canvas?.plot !== undefined,
          align: config.align, offset: resolveLegendAxisOffset(next, config, plot), border: group.border,
          backgroundId: group.backgroundId });
        next = applyHorizontalPlan(next, children, plan);
      }
      if (groups.length < 2) continue;
      groups = groupBlocks(entries.map(([kind, config]) =>
        blockDescriptor(next, kind, config)), configs);
      const horizontal = horizontalGroups(next, groups);
      const plan = resolveHorizontalLegendLane({
        edge,
        plot,
        canvas,
        groups: horizontal,
        allowOverflow: next.materializationConfigs.canvas?.plot !== undefined
      });
      next = applyHorizontalPlan(next, horizontal, plan);
    }
    return next;
  }
);

export const rematerializeLegendGroups = /* @__PURE__ */ action(
  { op: "rematerializeLegendGroups", description: "Place each opted-in target legend group from occupied bounds." },
  function (args = {}) {
    noOptions(args, "rematerializeLegendGroups");
    let next = this;
    const plot = resolveGraphicBounds(next);
    const canvas = findCanvasGraphic(next)?.properties;
    for (const [target, group] of Object.entries(next.guideConfigs.legendGroups ?? {})) {
      const entries = Object.entries(next.guideConfigs.legend ?? {}).filter(([, config]) => config.target === target && localLegendPosition(config) === undefined)
        .sort(([a], [b]) => FAMILY_ORDER[a] - FAMILY_ORDER[b]);
      next = alignLegendTextBoxes(next, entries.flatMap(([kind]) => existingIds(next, kind)));
      const blocks = entries.map(([kind]) => ({ id: kind, ids: existingIds(next, kind),
        bounds: unionLegendBounds(next, existingIds(next, kind)) }));
      const effectiveGroup = group.placement.at !== undefined ? group : { ...group, placement: { ...group.placement,
        offset: resolveLegendAxisOffset(next, { ...group.placement, inferredOffset: group.inferredOffset }, plot) } };
      const placements = resolveLegendGroupPlacement({ blocks, group: effectiveGroup, plot, canvas,
        allowOverflow: next.materializationConfigs.canvas?.plot !== undefined });
      for (const placement of placements) {
        const block = blocks.find(item => item.id === placement.id);
        for (const id of block.ids) next = translateGraphic(next, id, placement.dx, placement.dy);
      }
    }
    for (const [kind, config] of Object.entries(next.guideConfigs.legend ?? {})) {
      const placement = localLegendPlacement(config);
      if (placement === undefined) continue;
      const ids = existingIds(next, kind);
      next = alignLegendTextBoxes(next, ids);
      const group = {placement: {...placement, offset: resolveLegendAxisOffset(next, placement, plot)}, blockLayout: "column"};
      const [shift] = resolveLegendGroupPlacement({blocks: [{id: kind, bounds: unionLegendBounds(next, ids)}], group, plot, canvas,
        allowOverflow: next.materializationConfigs.canvas?.plot !== undefined});
      for (const id of ids) next = translateGraphic(next, id, shift.dx, shift.dy);
    }
    return next;
  }
);
