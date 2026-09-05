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
  resolveSideLegendLane
} from "../../../layout/legendLane.js";
import { findCanvasGraphic } from
  "../../../materialization/graphicHierarchy.js";
import { legendResourcePolicy } from
  "../../../materialization/guides/resources.js";

const FAMILY_ORDER = Object.freeze({
  series: 0,
  color: 0,
  gradient: 0,
  interval: 0,
  size: 1,
  opacity: 2,
  strokeWidth: 3
});

function categoricalFor(program, target) {
  return ["series", "color"]
    .map(kind => program.guideConfigs.legend?.[kind])
    .find(config => config?.target === target);
}

function legendPosition(program, kind, config) {
  if (kind === "size") {
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
  const bounds = unionConcreteGraphicBounds(program.graphicSpec, foregroundIds);
  const symbolAnchorIds = kind === "gradient"
    ? ["colorGradientStrips"]
    : components.symbolIds;
  const symbolAnchor = unionConcreteGraphicBounds(
    program.graphicSpec,
    symbolAnchorIds
  );
  const symbolBounds = unionConcreteGraphicBounds(
    program.graphicSpec,
    components.symbolIds
  );
  const labels = resolveConcreteGraphicBounds(
    program.graphicSpec,
    components.labelId
  );
  const title = components.titleId === undefined
    ? undefined
    : (() => {
        const graphic = program.graphicSpec.objects[components.titleId];
        const titleBounds = resolveConcreteGraphicBounds(
          program.graphicSpec,
          components.titleId
        );
        return {
          x: graphic.properties.x,
          y: graphic.properties.y,
          fontSize: graphic.properties.fontSize,
          width: titleBounds.right - titleBounds.left,
          bounds: titleBounds
        };
      })();
  if ([bounds, symbolAnchor, symbolBounds, labels].includes(undefined)) {
    throw new Error(`Legend lane could not measure ${kind} graphics.`);
  }
  return {
    id: kind,
    kind,
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
      x: textAnchor(program, components.labelId),
      width: labels.right - labels.left
    },
    occupiedBounds: unionConcreteGraphicBounds(program.graphicSpec, [
      ...foregroundIds,
      ...(components.backgroundId === undefined ? [] : [components.backgroundId])
    ]),
    ...components,
    foregroundIds
  };
}

function borderFor(kind, config) {
  return ["series", "color", "gradient", "opacity", "interval", "strokeWidth", "size"].includes(kind)
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
      ["series", "color"].includes(block.kind) &&
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
    .filter(([kind, config]) => legendPosition(program, kind, config) === edge)
    .sort(([kindA, configA], [kindB, configB]) =>
      (layerOrder.get(configA.target) - layerOrder.get(configB.target)) ||
      (FAMILY_ORDER[kindA] - FAMILY_ORDER[kindB])
    );
}

export function hasMultiSideLegendLane(program) {
  return ["right", "left"].some(side => edgeKinds(program, side).length > 1);
}

export function hasHorizontalLegendLane(program) {
  return ["top", "bottom"].some(edge => edgeKinds(program, edge).some(
    ([, config]) => isHorizontalEdgeLegend({ ...config, position: edge })
  ));
}

export function hasLegendLane(program) {
  return hasMultiSideLegendLane(program) ||
    hasHorizontalLegendLane(program);
}

function translateCommands(commands, dx, dy) {
  return commands.map(command => {
    if (command.op === "Z") return { ...command };
    const next = {
      ...command,
      x: command.x + dx,
      y: command.y + dy
    };
    if (command.op === "C") {
      next.x1 = command.x1 + dx;
      next.y1 = command.y1 + dy;
      next.x2 = command.x2 + dx;
      next.y2 = command.y2 + dy;
    }
    return next;
  });
}

function translatedProperties(type, properties, dx, dy) {
  const next = { ...properties };
  if (["circle", "rect", "text"].includes(type)) {
    next.x += dx;
    next.y += dy;
  } else if (type === "line") {
    next.x1 += dx;
    next.x2 += dx;
    next.y1 += dy;
    next.y2 += dy;
  } else if (type === "path") {
    next.commands = translateCommands(next.commands, dx, dy);
  }
  return next;
}

function translateGraphic(program, id, dx, dy) {
  const graphic = program.graphicSpec.objects[id];
  if (dx === 0 && dy === 0) return program;
  if (graphic.items !== undefined) {
    return program.editGraphics({
      target: id,
      property: "items",
      value: graphic.items.map(item => ({
        type: item.type ?? graphic.type,
        properties: translatedProperties(
          item.type ?? graphic.type,
          item.properties,
          dx,
          dy
        )
      }))
    });
  }
  let next = program;
  const properties = translatedProperties(
    graphic.type,
    graphic.properties,
    dx,
    dy
  );
  for (const [property, value] of Object.entries(properties)) {
    if (value !== graphic.properties[property]) {
      next = next.editGraphics({ target: id, property, value });
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
    const content = unionConcreteGraphicBounds(program.graphicSpec, contentIds);
    const foreground = unionConcreteGraphicBounds(
      program.graphicSpec,
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
      for (const property of ["x", "y", "width", "height"]) {
        next = next.editGraphics({ target: placement.background.id, property,
          value: placement.background[property] });
      }
    }
  }
  if (plan.background !== undefined) {
    for (const property of ["x", "y", "width", "height"]) {
      next = next.editGraphics({ target: plan.background.id, property,
        value: plan.background[property] });
    }
  }
  return next;
}

export const rematerializeSideLegendLane = action(
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
      if (entries.length < 2) return [];
      const blocks = entries.map(([kind, config]) =>
        blockDescriptor(this, kind, config)
      );
      const plan = resolveSideLegendLane({
        side,
        plot,
        canvas,
        groups: groupBlocks(blocks, configs)
      });
      return [{ plan, blocks }];
    });
    let next = this;
    for (const { plan, blocks } of plans) {
      const byId = new Map(blocks.map(block => [block.id, block]));
      for (const placement of plan.placements) {
        const block = byId.get(placement.id);
        if (block.titleId !== undefined) {
          next = translateGraphic(
            next,
            block.titleId,
            placement.titleDx,
            placement.dy
          ).editGraphics({
            target: block.titleId,
            property: "textAlign",
            value: "left"
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
        ).editGraphics({
          target: block.labelId,
          property: "textAlign",
          value: "left"
        });
      }
      for (const block of blocks) {
        if (block.backgroundId === undefined || plan.backgrounds.some(item => item.id === block.backgroundId)) continue;
        const bounds = unionConcreteGraphicBounds(next.graphicSpec, block.foregroundIds);
        const background = resolveLegendBackgroundFromBounds([bounds], block.border, canvas, "Legend");
        next = editLegendBackground(next, block.backgroundId, background, block.border);
      }
      for (const background of plan.backgrounds) {
        for (const property of ["x", "y", "width", "height"]) {
          next = next.editGraphics({
            target: background.id,
            property,
            value: background[property]
          });
        }
      }
    }
    return next;
  }
);

export const rematerializeHorizontalLegendLane = action(
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
      );
      if (entries.length === 0) continue;
      if (entries.length === 1) {
        const [kind, config] = entries[0];
        const ids = existingIds(next, kind);
        const bounds = unionConcreteGraphicBounds(next.graphicSpec, ids);
        const { dx, dy } = resolveSingleHorizontalLegendPlacement({
          plot, canvas, config, bounds
        });
        for (const id of ids) next = translateGraphic(next, id, dx, dy);
        continue;
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
          align: config.align, offset: config.offset, border: group.border,
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
        groups: horizontal
      });
      next = applyHorizontalPlan(next, horizontal, plan);
    }
    return next;
  }
);
