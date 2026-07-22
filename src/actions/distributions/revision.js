import { DEFAULT_TICK_COUNT } from "../guides/tickValues.js";
import { findLayer } from "../../selectors/layers.js";

const POSITION_CHANNELS = Object.freeze(["x", "y", "x2", "y2"]);

function axisMethods(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return {
    ticks: `edit${prefix}AxisTicks`,
    labels: `edit${prefix}AxisLabels`,
    title: `edit${prefix}AxisTitle`
  };
}

function isDiscretePosition(scale) {
  return ["ordinal", "band", "point"].includes(scale?.type);
}

function normalizeTickConfig(config, scale) {
  if (config === undefined) return undefined;
  if (isDiscretePosition(scale)) {
    if (config.mode === "count" || config.inferredValues === true) {
      const next = {
        ...config,
        mode: "values",
        values: scale.domain,
        inferredValues: true
      };
      delete next.count;
      return next;
    }
    return config;
  }
  if (config.mode === "values" && config.inferredValues === true) {
    const next = {
      ...config,
      mode: "count",
      count: DEFAULT_TICK_COUNT,
      inferredValues: true
    };
    delete next.values;
    return next;
  }
  return config;
}

function outsideConsumer(program, owned, channel, scale) {
  return program.semanticSpec.layers.some(layer =>
    !owned.has(layer.id) && layer.encoding?.[channel]?.scale === scale
  );
}

export function assertDistributionScaleHandoff(program, {
  owned,
  oldXScale,
  oldYScale,
  newXScale,
  newYScale
}) {
  const ids = new Set(owned);
  for (const [channel, previous, next] of [
    ["x", oldXScale, newXScale],
    ["y", oldYScale, newYScale]
  ]) {
    if (
      previous !== next &&
      outsideConsumer(program, ids, channel, previous)
    ) {
      throw new Error(
        `Cannot hand off ${channel} scale "${previous}" while unrelated consumers remain.`
      );
    }
  }
}

export function clearCartesianPositions(program, id) {
  const layer = findLayer(program, id);
  if (layer === undefined) return program;
  let next = program;
  for (const channel of POSITION_CHANNELS) {
    if (layer.encoding?.[channel] === undefined) continue;
    next = next.editSemantic({
      property: `layer[${id}].encoding.${channel}`,
      remove: true
    });
  }
  return next;
}

function rebindAxis(program, channel, {
  previousScale,
  nextScale,
  previousTitle,
  nextTitle
}) {
  const semantic = program.semanticSpec.guides.axis?.[channel];
  if (semantic?.scale !== previousScale) return program;
  let next = program.editSemantic({
    property: `guide.axis.${channel}.scale`,
    value: nextScale
  });
  if (semantic.title === previousTitle) {
    next = next.editSemantic({
      property: `guide.axis.${channel}.title`,
      value: nextTitle
    });
  }
  const scale = next.resolvedScales[nextScale];
  const ticks = normalizeTickConfig(
    next.guideConfigs.axis?.[channel]?.ticks,
    scale
  );
  if (ticks !== undefined) {
    next = next._withGuideConfig(channel, "ticks", {
      ...ticks,
      scale: nextScale
    });
  }
  const labels = next.guideConfigs.axis?.[channel]?.labels;
  if (labels !== undefined) {
    const tickConfig = next.guideConfigs.axis[channel].ticks;
    next = next._withGuideConfig(channel, "labels", {
      ...labels,
      scale: nextScale,
      mode: tickConfig.mode,
      inferredValues: tickConfig.inferredValues,
      ...(tickConfig.mode === "values"
        ? { values: tickConfig.values }
        : { count: tickConfig.count })
    });
    if (tickConfig.mode === "values") {
      const config = next.guideConfigs.axis[channel].labels;
      if (Object.hasOwn(config, "count")) {
        const { count: _count, ...withoutCount } = config;
        next = next._withGuideConfig(channel, "labels", withoutCount);
      }
    } else {
      const config = next.guideConfigs.axis[channel].labels;
      if (Object.hasOwn(config, "values")) {
        const { values: _values, ...withoutValues } = config;
        next = next._withGuideConfig(channel, "labels", withoutValues);
      }
    }
  }
  const title = next.guideConfigs.axis?.[channel]?.title;
  if (title !== undefined) {
    next = next._withGuideConfig(channel, "title", {
      ...title,
      scale: nextScale
    });
  }
  const methods = axisMethods(channel);
  if (ticks !== undefined) next = next[methods.ticks]();
  if (labels !== undefined) next = next[methods.labels]();
  if (title !== undefined) next = next[methods.title]();
  return next;
}

function gridDirection(channel) {
  return channel === "x" ? "vertical" : "horizontal";
}

function rebindGrid(program, {
  previousMeasureChannel,
  nextMeasureChannel,
  previousScale,
  nextScale
}) {
  const previousDirection = gridDirection(previousMeasureChannel);
  const nextDirection = gridDirection(nextMeasureChannel);
  const stored = program.guideConfigs.grid?.[previousDirection];
  const semantic = program.semanticSpec.guides.grid?.[previousDirection];
  if (stored === undefined || semantic?.scale !== previousScale) return program;
  if (previousDirection === nextDirection) {
    return program
      .editSemantic({
        property: `guide.grid.${previousDirection}.scale`,
        value: nextScale
      })
      ._withGridConfig(previousDirection, {
        ...stored,
        scale: nextScale
      })[`rematerialize${previousDirection === "horizontal" ? "Horizontal" : "Vertical"}Grid`]();
  }
  if (program.semanticSpec.guides.grid?.[nextDirection] !== undefined) {
    throw new Error(
      `Cannot hand off the ${previousDirection} grid because a ${nextDirection} grid already exists.`
    );
  }
  const options = {
    scale: nextScale,
    coordinate: stored.coordinate,
    color: stored.color,
    lineWidth: stored.lineWidth,
    strokeDash: stored.strokeDash,
    ...(stored.inferredValues === true
      ? {}
      : stored.mode === "values"
        ? { values: stored.values }
        : { count: stored.count })
  };
  return program
    .removeGrid({ [previousDirection]: true })
    [`create${nextDirection === "horizontal" ? "Horizontal" : "Vertical"}Grid`](options);
}

export function rebindDistributionGuides(program, {
  oldXScale,
  oldYScale,
  newXScale,
  newYScale,
  oldXTitle,
  oldYTitle,
  newXTitle,
  newYTitle,
  oldMeasureChannel,
  newMeasureChannel
}) {
  let next = rebindAxis(program, "x", {
    previousScale: oldXScale,
    nextScale: newXScale,
    previousTitle: oldXTitle,
    nextTitle: newXTitle
  });
  next = rebindAxis(next, "y", {
    previousScale: oldYScale,
    nextScale: newYScale,
    previousTitle: oldYTitle,
    nextTitle: newYTitle
  });
  return rebindGrid(next, {
    previousMeasureChannel: oldMeasureChannel,
    nextMeasureChannel: newMeasureChannel,
    previousScale: oldMeasureChannel === "x" ? oldXScale : oldYScale,
    nextScale: newMeasureChannel === "x" ? newXScale : newYScale
  });
}
