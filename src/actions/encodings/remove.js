import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  getPositionChannelDefinition,
  POSITION_ENCODING_CHANNELS
} from "../../core/vocabulary.js";
import {
  resolveBarChannels,
  resolveBarColorLayout,
  resolveBarOffsetChannel
} from "../../grammar/bars/policy.js";
import {
  getMarkMaterializationStep,
  getSourceDependentMarkSteps
} from "../../materialization/marks/index.js";
import { findLayer } from "../../selectors/layers.js";
import { removeLegendKinds } from "../guides/legends/remove.js";

const OPTIONS = Object.freeze(["target", "channel"]);
const REMOVABLE_CHANNELS = Object.freeze([
  "x", "y", "x2", "y2", "xOffset", "yOffset", "theta", "radius",
  "color", "strokeDash", "strokeWidth", "size", "shape", "group",
  "opacity", "text"
]);
const REMOVE_AXIS = Object.freeze({
  x: "removeXAxis",
  y: "removeYAxis",
  theta: "removeThetaAxis",
  radius: "removeRadialAxis"
});
const SPECIALIZED_LEGEND_KIND = Object.freeze({
  color: Object.freeze(["gradient", "interval"]),
  size: Object.freeze(["size"]),
  opacity: Object.freeze(["opacity"]),
  strokeWidth: Object.freeze(["strokeWidth"])
});

function resolveTarget(program, requested, channel) {
  const candidates = program.semanticSpec.layers.filter(
    layer => layer.encoding?.[channel] !== undefined
  );
  if (requested !== undefined) {
    const id = validateUserId(requested, "Encoding target id");
    const layer = findLayer(program, id);
    if (layer === undefined) {
      throw new Error(`Unknown encoding target "${id}".`);
    }
    if (layer.encoding?.[channel] === undefined) {
      throw new Error(`Mark "${id}" has no ${channel} encoding.`);
    }
    return layer;
  }
  const current = candidates.find(
    layer => layer.id === program.context.currentMark
  );
  if (current !== undefined) return current;
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) {
    throw new Error(`removeEncoding requires an active ${channel} encoding.`);
  }
  throw new Error(`removeEncoding ${channel} target is ambiguous; provide target.`);
}

function activeCascade(layer, channel) {
  const channels = new Set([channel]);
  if (channel === "x") {
    channels.add("x2");
    channels.add("xOffset");
  }
  if (channel === "y") {
    channels.add("y2");
    channels.add("yOffset");
  }
  if (channel === "color" && layer.mark?.type === "bar") {
    if (resolveBarColorLayout(layer) === "group") {
      channels.add(resolveBarOffsetChannel(layer));
    }
  }
  if (
    channel === "group" &&
    layer.mark?.type === "area" &&
    layer.encoding?.color?.field !== undefined &&
    layer.encoding.color.field === layer.encoding.group?.field
  ) {
    channels.add("color");
  }
  return [...channels].filter(active => layer.encoding?.[active] !== undefined);
}

function assertSelectionCompatibility(program, target, channels) {
  for (const [id, selection] of Object.entries(
    program.materializationConfigs.selections ?? {}
  )) {
    if (
      selection.target === target &&
      channels.includes(selection.selector?.channel)
    ) {
      throw new Error(
        `Cannot remove ${selection.selector.channel} encoding while selection "${id}" references that channel.`
      );
    }
  }
}

function removeChannelConfigs(program, target, channels) {
  let next = program;
  for (const channel of channels) {
    if (["xOffset", "yOffset"].includes(channel)) {
      next = next._withoutMaterializationConfig(["marks", target, channel]);
    }
  }
  return next;
}

function restoreBarBaseline(program, layer, channels) {
  if (layer.mark?.type !== "bar" || !channels.includes("color")) {
    return program;
  }
  const measureChannel = resolveBarChannels(layer)?.measure;
  if (
    measureChannel === undefined ||
    layer.encoding?.[measureChannel]?.stack !== "normalize"
  ) {
    return program;
  }
  return program.editSemantic({
    property: `layer[${layer.id}].encoding.${measureChannel}.stack`,
    value: "zero"
  });
}

function hasPrimaryScaleConsumer(program, channel, scale) {
  return program.semanticSpec.layers.some(
    layer => layer.encoding?.[channel]?.scale === scale
  );
}

function cleanupPositionGuides(program, removed) {
  let next = program;
  for (const { channel, scale } of removed) {
    const definition = getPositionChannelDefinition(channel);
    if (
      definition?.guideChannel === undefined ||
      hasPrimaryScaleConsumer(next, channel, scale)
    ) {
      continue;
    }
    const axis = next.semanticSpec.guides.axis?.[definition.guideChannel];
    if (axis?.scale === scale) {
      next = next[REMOVE_AXIS[definition.guideChannel]]({
        scale,
        ...(axis.coordinate === undefined ? {} : { coordinate: axis.coordinate })
      });
    }
    const grid = next.semanticSpec.guides.grid?.[definition.gridDirection];
    if (grid?.scale === scale) {
      next = next.removeGrid({ [definition.gridDirection]: true });
    }
  }
  return next;
}

function reconcileCategoricalLegend(program, target, channels) {
  const entry = ["series", "color"]
    .map(kind => [kind, program.guideConfigs.legend?.[kind]])
    .find(([, config]) =>
      config?.target === target &&
      config.channels.some(channel => channels.includes(channel))
    );
  if (entry === undefined) return program;
  const [kind, config] = entry;
  const layer = findLayer(program, target);
  const remaining = config.channels.filter(
    channel => layer.encoding?.[channel]?.scale !== undefined
  );
  if (remaining.length === 0) {
    return removeLegendKinds(program, [kind]);
  }
  const next = removeLegendKinds(program, [kind]);
  return next.createLegend({
    target,
    channels: remaining,
    position: config.position,
    align: config.align,
    direction: config.direction,
    ...(config.columns === undefined ? {} : { columns: config.columns }),
    offset: config.offset,
    titlePosition: config.titlePosition,
    ...(config.inferredTitle ? {} : { title: config.title }),
    symbol: config.symbol,
    labels: config.labels,
    titleStyle: config.titleStyle,
    itemGap: config.itemGap,
    border: config.border
  });
}

function cleanupLegends(program, target, channels) {
  let next = reconcileCategoricalLegend(program, target, channels);
  const kinds = [...new Set(channels.flatMap(
    channel => SPECIALIZED_LEGEND_KIND[channel] ?? []
  ))].filter(kind => next.guideConfigs.legend?.[kind]?.target === target);
  return kinds.length === 0 ? next : removeLegendKinds(next, kinds);
}

function clearGraphic(program, target) {
  const graphic = program.graphicSpec.objects[target];
  if (graphic === undefined) return program;
  return graphic.type === "collection"
    ? program.editGraphics({ target, property: "items", value: [] })
    : program.editGraphics({ target, property: "length", value: 0 });
}

function rematerializeTarget(program, target) {
  const layer = findLayer(program, target);
  const step = getMarkMaterializationStep(program, layer);
  const baseline = clearGraphic(program, target);
  let next = step === undefined
    ? baseline
    : baseline[step.op](step.args);
  for (const dependent of getSourceDependentMarkSteps(next, target)) {
    next = next[dependent.op](dependent.args);
  }
  return next;
}

export const removeEncoding = action(
  {
    op: "removeEncoding",
    description: "Remove one semantic encoding and its owned materialized state."
  },
  function (args = {}) {
    validateOptionObject(args, OPTIONS, "removeEncoding");
    if (!REMOVABLE_CHANNELS.includes(args.channel)) {
      throw new Error(
        `Unsupported removable encoding channel "${args.channel}".`
      );
    }
    const layer = resolveTarget(this, args.target, args.channel);
    const channels = activeCascade(layer, args.channel);
    assertSelectionCompatibility(this, layer.id, channels);
    const removedPositions = channels
      .filter(channel => POSITION_ENCODING_CHANNELS.includes(channel))
      .map(channel => ({
        channel,
        scale: layer.encoding[channel].scale
      }))
      .filter(item => item.scale !== undefined);

    let next = this;
    for (const channel of channels) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.${channel}`,
        remove: true
      });
    }
    next = removeChannelConfigs(next, layer.id, channels);
    next = restoreBarBaseline(next, layer, channels);
    next = cleanupLegends(next, layer.id, channels);
    next = cleanupPositionGuides(next, removedPositions);
    return rematerializeTarget(next, layer.id);
  }
);

export function registerEncodingRemovalAction(ProgramClass) {
  ProgramClass.prototype.removeEncoding = removeEncoding;
}
