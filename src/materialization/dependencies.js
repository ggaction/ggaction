function usesPositionalScale(program, id) {
  return program.semanticSpec.layers.some(layer =>
    ["x", "y", "xOffset"].some(
      channel => layer.encoding?.[channel]?.scale === id
    )
  );
}

function needsCanvasScaleRematerialization(program, scale) {
  return (
    (scale.range === "auto" ||
      program.semanticSpec.guides.axis?.x?.scale === scale.id ||
      program.semanticSpec.guides.axis?.y?.scale === scale.id ||
      program.semanticSpec.guides.grid?.horizontal?.scale === scale.id ||
      program.semanticSpec.guides.grid?.vertical?.scale === scale.id) &&
    program.resolvedScales[scale.id] !== undefined &&
    usesPositionalScale(program, scale.id)
  );
}

function isCompleteLine(layer) {
  return (
    layer.mark?.type === "line" &&
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined &&
    layer.encoding.y.aggregate === "mean"
  );
}

function isCompletePoint(layer) {
  return (
    layer.mark?.type === "point" &&
    layer.encoding?.x?.scale !== undefined &&
    layer.encoding?.y?.scale !== undefined
  );
}

function isCompleteBar(program, layer) {
  return (
    layer.mark?.type === "bar" &&
    ((layer.encoding?.x?.bin !== undefined &&
      layer.encoding?.y?.aggregate === "count" &&
      layer.encoding.y.stack === "zero") ||
      (layer.encoding?.x?.fieldType === "ordinal" &&
        layer.encoding?.y?.aggregate === "mean" &&
        layer.encoding.y.stack === null &&
        program.markConfigs[layer.id]?.barWidth !== undefined))
  );
}

function hasLegend(program) {
  return !(
    (program.semanticSpec.guides.legend?.series === undefined ||
      program.guideConfigs.legend?.series === undefined) &&
    (program.semanticSpec.guides.legend?.color === undefined ||
      program.guideConfigs.legend?.color === undefined)
  );
}

function hasTitle(program) {
  return (
    program.semanticSpec.title.text !== undefined &&
    program.titleConfig !== undefined
  );
}

export function planCanvasRematerialization(program) {
  const plan = [];
  for (const scale of program.semanticSpec.scales) {
    if (needsCanvasScaleRematerialization(program, scale)) {
      plan.push({ op: "rematerializeScale", args: { id: scale.id } });
    }
  }
  for (const layer of program.semanticSpec.layers) {
    if (isCompletePoint(layer)) {
      plan.push({ op: "rematerializePointMark", args: { id: layer.id } });
    }
  }
  for (const layer of program.semanticSpec.layers) {
    if (isCompleteLine(layer)) {
      plan.push({ op: "rematerializeLineMark", args: { id: layer.id } });
    }
  }
  for (const layer of program.semanticSpec.layers) {
    if (isCompleteBar(program, layer)) {
      plan.push({ op: "rematerializeBarMark", args: { id: layer.id } });
    }
  }
  if (hasLegend(program)) plan.push({ op: "rematerializeLegend" });
  if (hasTitle(program)) plan.push({ op: "rematerializeTitle" });
  return plan;
}

export function planScaleGuideRematerialization(program, id) {
  const plan = [];
  if (
    program.graphicSpec.objects.xAxisLine &&
    program.semanticSpec.guides.axis?.x?.scale === id
  ) {
    plan.push({ op: "editXAxisLine" });
  }
  if (
    program.graphicSpec.objects.yAxisLine &&
    program.semanticSpec.guides.axis?.y?.scale === id
  ) {
    plan.push({ op: "editYAxisLine" });
  }
  for (const channel of ["x", "y"]) {
    for (const component of ["ticks", "labels", "title"]) {
      if (program.guideConfigs.axis?.[channel]?.[component]?.scale === id) {
        const suffix = component[0].toUpperCase() + component.slice(1);
        plan.push({ op: `edit${channel.toUpperCase()}Axis${suffix}` });
      }
    }
  }
  if (program.guideConfigs.grid?.horizontal?.scale === id) {
    plan.push({ op: "rematerializeHorizontalGrid" });
  }
  if (program.guideConfigs.grid?.vertical?.scale === id) {
    plan.push({ op: "rematerializeVerticalGrid" });
  }
  return plan;
}

export function applyMaterializationPlan(program, plan) {
  let next = program;
  for (const step of plan) {
    next = step.args === undefined
      ? next[step.op]()
      : next[step.op](step.args);
  }
  return next;
}
