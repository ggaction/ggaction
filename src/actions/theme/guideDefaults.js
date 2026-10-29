import { CARTESIAN_AXIS_LINE_DEFAULTS } from "../guides/axes/lines.js";
import { CARTESIAN_AXIS_TICK_DEFAULTS } from "../guides/axes/ticks.js";
import { CARTESIAN_AXIS_LABEL_DEFAULTS, cartesianAxisLabelOffset } from "../guides/axes/labels.js";
import { CARTESIAN_AXIS_TITLE_DEFAULTS } from "../guides/axes/titles.js";
import { CARTESIAN_GRID_DEFAULTS } from "../guides/grids/resolve.js";
import { POLAR_AXIS_DEFAULTS, POLAR_GRID_DEFAULTS, polarGuideNames } from "../guides/polar/resolve.js";
import { defaultParallelAxis } from "../guides/axes/parallel/policy.js";
import { axisGraphicIds, cartesianAxisOwners, axisTargetArgs, PARALLEL_AXIS_PARTS } from "../../selectors/axes.js";
import { gridNames } from "../../selectors/grids.js";
import { legendResourcePolicy } from "../../materialization/guides/resources.js";
import { CONTINUOUS_LEGEND_TITLE_STYLE, ITEM_LEGEND_TITLE_STYLE, ITEM_LEGEND_LABELS, LEGEND_BORDER_DEFAULTS } from "../guides/legends/continuous/common.js";
import { DEFAULT_COLORS, nativeLegendItemGap } from "../../theme/defaults.js";

const CARTESIAN = Object.freeze({ line: CARTESIAN_AXIS_LINE_DEFAULTS, ticks: CARTESIAN_AXIS_TICK_DEFAULTS,
  labels: CARTESIAN_AXIS_LABEL_DEFAULTS, title: CARTESIAN_AXIS_TITLE_DEFAULTS });
const PARALLEL = defaultParallelAxis("");

export function guideNumericProperty(path, program) {
  if (path[0] !== "guides") return undefined;
  const family = path[2], property = path.at(-1);
  if (path[1] === "grid" && property === "lineWidth") return { token: "gridStrokeWidth",
    defaultValue: (["theta", "radial"].includes(family) ? POLAR_GRID_DEFAULTS : CARTESIAN_GRID_DEFAULTS).lineWidth };
  if (path[1] === "legend" && property === "itemGap" && path.length === 4) {
    const config = program.guideConfigs.legend[family];
    if (["gradient", "strokeGradient"].includes(family) && config.representation !== "symbols") return undefined;
    return { token: "legendItemGap", defaultValue: nativeLegendItemGap(config.representation === "symbols" ? "sampled" : family, config) };
  }
  if (path[1] !== "axis") return undefined;
  const component = family === "parallel" ? path.at(-2) : path[3];
  const defaults = family === "parallel" ? PARALLEL : ["theta", "radius"].includes(family) ? POLAR_AXIS_DEFAULTS : CARTESIAN;
  if (component === "line" && property === "lineWidth") return { token: "axisStrokeWidth", defaultValue: defaults.line.lineWidth };
  if (component === "ticks" && property === "lineWidth") return { token: "tickStrokeWidth", defaultValue: defaults.ticks.lineWidth };
  if (component === "ticks" && property === "length") return { token: "tickSize", defaultValue: family === "radius" ? defaults.ticks.radialLength : defaults.ticks.length };
  if (component === "labels" && property === "offset") {
    const channel = family === "x" || family === "y" ? family : program?.semanticSpec.guides.axis?.[family]?.channel;
    return { token: "axisLabelGap", defaultValue: family === "parallel" ? PARALLEL.labels.offset
      : family === "theta" ? POLAR_AXIS_DEFAULTS.labels.thetaOffset : family === "radius" ? POLAR_AXIS_DEFAULTS.labels.radiusOffset
        : cartesianAxisLabelOffset(channel) };
  }
  if (component === "title" && property === "offset" && ["parallel", "theta", "radius"].includes(family)) {
    return { token: "axisTitleGap", defaultValue: family === "parallel" ? PARALLEL.title.offset
      : family === "theta" ? POLAR_AXIS_DEFAULTS.title.thetaOffset : POLAR_AXIS_DEFAULTS.title.radiusOffset };
  }
  return undefined;
}

export function themeGuideGeometrySteps(program, previous, overrides, { titleGapChanged = false, typographyChanged = false } = {}) {
  const steps = [];
  const axes = [...cartesianAxisOwners(program).map(owner => ({ ...owner, prefix: owner.channel.toUpperCase() })),
    ...[{ id: "theta", channel: "theta", prefix: "Theta" }, { id: "radius", channel: "radius", prefix: "Radial" }]];
  for (const axis of axes) for (const [index, part] of ["line", "ticks", "labels", "title"].entries()) {
    const before = previous.guideConfigs.axis?.[axis.id]?.[part], after = program.guideConfigs.axis?.[axis.id]?.[part];
    if (!after || !program.graphicSpec.objects[axisGraphicIds(axis.channel, axis.id)[index]]) continue;
    const text = part === "labels" || part === "title";
    if (text && typographyChanged) continue;
    const inferredTitle = part === "title" && after.inferredOffset === true;
    const properties = part === "line" ? ["lineWidth"] : part === "ticks" ? ["lineWidth", "length"] : ["offset"];
    if (!(inferredTitle && titleGapChanged) && properties.every(key => before?.[key] === after[key])) continue;
    const id = axisGraphicIds(axis.channel, axis.id)[index];
    steps.push({ op: `edit${axis.prefix}Axis${part[0].toUpperCase() + part.slice(1)}`, args: {
      ...axisTargetArgs(axis.id, axis.channel), ...Object.fromEntries(properties.filter(key => !(key === "offset" && inferredTitle)).map(key => [key, after[key]])),
      ...(part === "line" ? { color: overrides.has(`g:${id}.stroke`) ? program.graphicSpec.objects[id].properties.stroke : after.color } : {})
    } });
  }
  for (const [role, prefix] of [["horizontal", "Horizontal"], ["vertical", "Vertical"], ["theta", "Theta"], ["radial", "Radial"]]) {
    const before = previous.guideConfigs.grid?.[role], after = program.guideConfigs.grid?.[role];
    if (after && before?.lineWidth !== after.lineWidth) steps.push({ op: `rematerialize${prefix}Grid` });
  }
  if (!typographyChanged && Object.entries(program.guideConfigs.legend ?? {}).some(([kind, config]) =>
    previous.guideConfigs.legend?.[kind]?.itemGap !== config.itemGap)) steps.push({ op: "rematerializeLegend" });
  return steps;
}

function legendTitleDefault(kind) {
  return ["size", "strokeWidth", "sampled"].includes(legendResourcePolicy(kind).family)
    ? ITEM_LEGEND_TITLE_STYLE.color : CONTINUOUS_LEGEND_TITLE_STYLE.color;
}

// The native family owns the defaults; theme removal does not substitute a
// light-theme token or save a second copy of prior appearance in the program.
export function guideConfigDefault(path) {
  if (path[0] !== "guides" || path.at(-1) !== "color") return undefined;
  const family = path[2];
  if (path[1] === "grid") return ["theta", "radial"].includes(family)
    ? POLAR_GRID_DEFAULTS.color : CARTESIAN_GRID_DEFAULTS.color;
  if (path[1] === "legend") {
    if (path.includes("titleStyle")) return legendTitleDefault(family);
    if (path.includes("labels")) return ITEM_LEGEND_LABELS.color;
    if (path.includes("border")) return LEGEND_BORDER_DEFAULTS.color;
    return undefined;
  }
  if (path[1] !== "axis") return undefined;
  const defaults = family === "parallel" ? PARALLEL : ["theta", "radius"].includes(family) ? POLAR_AXIS_DEFAULTS : CARTESIAN;
  return defaults[family === "parallel" ? path.at(-2) : path[3]]?.color;
}

export function guideGraphicDefaults(program) {
  const defaults = new Map();
  const axes = [
    ...cartesianAxisOwners(program).map(owner => ({ ...owner, defaults: CARTESIAN })),
    ...["theta", "radius", "parallel"].filter(channel => program.guideConfigs.axis?.[channel] !== undefined)
      .map(channel => ({ id: channel, channel, defaults: channel === "parallel" ? PARALLEL : POLAR_AXIS_DEFAULTS }))
  ];
  for (const axis of axes) axisGraphicIds(axis.channel, axis.id).forEach((id, index) => {
    defaults.set(id, { property: index < 2 ? "stroke" : "fill", value: axis.defaults[PARALLEL_AXIS_PARTS[index]].color });
  });
  for (const direction of Object.keys(program.guideConfigs.grid ?? {})) {
    const polar = ["theta", "radial"].includes(direction);
    const id = polar ? polarGuideNames(direction).grid : gridNames(direction).graphic;
    defaults.set(id, { property: "stroke", value: (polar ? POLAR_GRID_DEFAULTS : CARTESIAN_GRID_DEFAULTS).color });
  }
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    const inherited = kind === "size" && config.inheritAppearance === true && ["series", "color", "stroke"]
      .some(key => program.guideConfigs.legend[key]?.target === config.target);
    for (const id of legendResourcePolicy(kind).graphicIds) {
      if (id.endsWith("Title")) defaults.set(id, { property: "fill", role: "strongText", value: inherited ? CONTINUOUS_LEGEND_TITLE_STYLE.color : legendTitleDefault(kind) });
      if (id.endsWith("Labels")) defaults.set(id, { property: "fill", role: "text", value: ITEM_LEGEND_LABELS.color });
      if (id.endsWith("Background")) defaults.set(id, { property: "stroke", role: "border", value: LEGEND_BORDER_DEFAULTS.color });
    }
  }
  for (const [id, config] of Object.entries(program.markConfigs)) {
    if (!config.gradientPlot?.guides.legend) continue;
    defaults.set(`${id}DensityLegend`, { property: "stroke", role: "border", value: DEFAULT_COLORS.border });
    defaults.set(`${id}DensityLegendLabels`, { property: "fill", role: "mutedText", value: DEFAULT_COLORS.mutedText });
    defaults.set(`${id}DensityLegendTitle`, { property: "fill", role: "strongText", value: DEFAULT_COLORS.text });
  }
  return defaults;
}
