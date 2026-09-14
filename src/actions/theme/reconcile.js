import { themeTokens } from "../../theme/defaults.js";
import {
  normalizeThemeState,
  resolveEffectiveThemeTokens,
  setThemeStateOverrides
} from "./state.js";
import { findLayer } from "../../selectors/layers.js";

let rematerializeThemeHighlights = program => program;

export function registerThemeHighlightReconciler(reconciler) {
  if (typeof reconciler !== "function") {
    throw new TypeError("Theme highlight reconciler must be a function.");
  }
  rematerializeThemeHighlights = reconciler;
}

const THEME_STYLE_PROPERTIES = Object.freeze([
  "background",
  "fill",
  "stroke",
  "fontFamily"
]);
const COLOR_TOKENS = Object.freeze([
  "mark",
  "text",
  "strongText",
  "mutedText",
  "axis",
  "axisTitle",
  "grid",
  "border",
  "sizeSymbol",
  "regressionBand",
  "boxLine",
  "boxMedian",
  "referenceLine",
  "referenceBand",
  "gradientCenter"
]);

function tokenFor(value, sourceTokens, targetTokens) {
  const matches = COLOR_TOKENS.filter(token =>
    value === sourceTokens[token] || value === themeTokens("light")[token]
  );
  if (matches.length === 0) return undefined;
  const targets = new Set(matches.map(token => targetTokens[token]));
  if (targets.size !== 1) return undefined;
  for (const token of matches) {
    if (targetTokens[token] === targets.values().next().value) return token;
  }
  return undefined;
}

function roleValues(role, sourceTokens, legacy = []) {
  return new Set([
    sourceTokens[role],
    themeTokens("light")[role],
    ...legacy.map(token => themeTokens("light")[token] ?? token)
  ]);
}

function mapRoleValue(value, role, sourceTokens, targetTokens, legacy) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map(item => {
      const mapped = mapRoleValue(
        item,
        role,
        sourceTokens,
        targetTokens,
        legacy
      );
      changed ||= mapped.changed;
      return mapped.value;
    });
    return { changed, value: changed ? next : value };
  }
  if (!roleValues(role, sourceTokens, legacy).has(value)) {
    return { changed: false, value };
  }
  return { changed: value !== targetTokens[role], value: targetTokens[role] };
}

function mapColorValue(value, sourceTokens, targetTokens) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map(item => {
      const mapped = mapColorValue(item, sourceTokens, targetTokens);
      changed ||= mapped.changed;
      return mapped.value;
    });
    return { changed, value: changed ? next : value };
  }
  const token = tokenFor(value, sourceTokens, targetTokens);
  if (token === undefined) return { changed: false, value };
  const next = targetTokens[token];
  return { changed: next !== value, value: next };
}

function isFieldDrivenMark(program, id, property) {
  if (!(["fill", "stroke"].includes(property))) return false;
  const layer = findLayer(program, id);
  return property === "stroke"
    ? layer?.encoding?.stroke?.field !== undefined ||
      (layer?.mark?.type === "line" && layer.encoding?.color?.field !== undefined)
    : layer?.encoding?.color?.field !== undefined;
}

function isRegressionBand(program, id) {
  return Object.values(program.markConfigs).some(
    config => config.regression?.bandId === id
  );
}

function referenceRole(program, id, property) {
  let role;
  for (const node of program.trace.children) {
    const created = /^create(Point|Line|Area|Arc|Bar|Rect|Rule|Tick|Text)Mark$/u
      .exec(node.op);
    const createdId = created === null
      ? undefined
      : node.args.id ?? created[1].toLowerCase();
    if (createdId === id ||
        (node.op === "removeMark" && node.args.target === id)) {
      role = undefined;
    }
    if (node.op === "createReferenceLine" &&
        (node.args.id ?? "referenceLine") === id && property === "stroke") {
      role = "referenceLine";
    }
    if (node.op === "createReferenceBand" &&
        (node.args.id ?? "referenceBand") === id && property === "fill") {
      role = "referenceBand";
    }
  }
  return role;
}

function componentRole(program, id, property) {
  for (const [owner, config] of Object.entries(program.markConfigs)) {
    const box = config.boxPlot;
    if (box !== undefined) {
      if (id === box.medianId && property === "stroke") return "boxMedian";
      if (id === box.outlierId && ["fill", "stroke"].includes(property)) {
        return "boxLine";
      }
      if (id === box.whiskerId && property === "stroke") return "boxLine";
      const whisker = program.markConfigs[box.whiskerId]?.errorBar;
      if ([whisker?.lowerCapId, whisker?.upperCapId].includes(id) &&
          property === "stroke") return "boxLine";
    }
    if (config.gradientPlot !== undefined &&
        id === `${owner}Center` && property === "stroke") {
      return "gradientCenter";
    }
  }
  return referenceRole(program, id, property);
}

function graphicRole(program, id, property) {
  if (property === "fontFamily") return "fontFamily";
  if (id === "canvas" && property === "background") return "background";
  if (id === `${program.compositionSpec?.id}-headers` && property === "fill") {
    return "strongText";
  }
  const component = componentRole(program, id, property);
  if (component !== undefined) return component;
  const layer = findLayer(program, id);
  if (layer !== undefined && ["fill", "stroke"].includes(property)) {
    if (isFieldDrivenMark(program, id, property)) return undefined;
    if (property === "fill" && isRegressionBand(program, id)) {
      return "regressionBand";
    }
    return layer.mark?.type === "text" ? "text" : "mark";
  }
  if (/AxisLines?$/u.test(id) && property === "stroke") return "axis";
  if (/AxisTicks$/u.test(id) && property === "stroke") return "mutedText";
  if (/^parallelAxisLabels$/u.test(id) && property === "fill") return "axis";
  if (/AxisLabels$/u.test(id) && property === "fill") return "text";
  if (/AxisTitles?$/u.test(id) && property === "fill") return "axisTitle";
  if (/Grid(?:Lines|Circles)?$/u.test(id) && property === "stroke") return "grid";
  if (id === "chartTitle" && property === "fill") return "strongText";
  if (id === "chartSubtitle" && property === "fill") return "mutedText";
  if (/(?:Legend|Gradient)Labels$/u.test(id) && property === "fill") return "text";
  if (/(?:Legend|Gradient)Title$/u.test(id) && property === "fill") return "strongText";
  if (/(?:Legend|Gradient)Background$/u.test(id) && property === "stroke") return "border";
  if (/GradientTicks$/u.test(id) && property === "stroke") return "mutedText";
  if (/opacityLegendSymbols$/iu.test(id) && ["fill", "stroke"].includes(property)) {
    return "mark";
  }
  if (/sizeLegendSymbols$/iu.test(id) && ["fill", "stroke"].includes(property)) {
    return "sizeSymbol";
  }
  if (/strokeWidthLegendSymbols$/iu.test(id) && property === "stroke") {
    return "mark";
  }
  return undefined;
}

function roleLegacy(role) {
  if (role === "axis") return ["text"];
  if (role === "axisTitle") return ["text", "strongText"];
  if (role === "strongText") return ["text"];
  if (role === "grid") return ["#d7e0ea"];
  return [];
}

function isOverridden(overrides, key) {
  return overrides.has(key);
}

function isFieldDrivenLegendSymbol(id) {
  return /(?:color|series|stroke)(?:Legend|Gradient|Interval)(?:Symbol|Symbols|Strips|Swatches|Lines|Points)/iu
    .test(id);
}

function mapGraphicProperties(
  program,
  id,
  type,
  properties,
  sourceTokens,
  targetTokens,
  overrides,
  overrideId = id
) {
  let changed = false;
  const next = { ...properties };
  for (const property of THEME_STYLE_PROPERTIES) {
    if (!Object.hasOwn(properties, property)) continue;
    if (isOverridden(overrides, `g:${overrideId}.${property}`) ||
        isOverridden(overrides, `g:${id}.${property}`)) continue;
    const role = graphicRole(program, id, property);
    if (role === undefined || isFieldDrivenLegendSymbol(id) ||
        isFieldDrivenMark(program, id, property)) continue;
    const mapped = mapRoleValue(
      properties[property],
      role,
      sourceTokens,
      targetTokens,
      roleLegacy(role)
    );
    if (mapped.changed) {
      next[property] = mapped.value;
      changed = true;
    }
  }
  return { changed, properties: changed ? next : properties, type };
}

function recolorGraphic(
  program,
  id,
  graphic,
  sourceTokens,
  targetTokens,
  overrides
) {
  if (graphic.items === undefined) {
    const mapped = mapGraphicProperties(
      program,
      id,
      graphic.type,
      graphic.properties,
      sourceTokens,
      targetTokens,
      overrides,
      id
    );
    if (!mapped.changed) return program;
    let next = program;
    for (const property of THEME_STYLE_PROPERTIES) {
      if (mapped.properties[property] !== graphic.properties[property]) {
        next = next.editGraphics({
          target: id,
          property,
          value: mapped.properties[property]
        });
      }
    }
    return next;
  }

  let changed = false;
  const items = graphic.items.map(item => {
    const type = item.type ?? graphic.type;
    const mapped = mapGraphicProperties(
      program,
      id,
      type,
      item.properties,
      sourceTokens,
      targetTokens,
      overrides,
      item.id
    );
    changed ||= mapped.changed;
    return { type, properties: mapped.properties };
  });
  return changed
    ? program.editGraphics({ target: id, property: "items", value: items })
    : program;
}

function configRole(program, path) {
  const property = path.at(-1);
  if (property === "fontFamily") return "fontFamily";
  if (path[0] === "facets" && path.includes("headers") &&
      property === "color") {
    return path[path.indexOf("headers") + 1] === "row"
      ? "mutedText"
      : "strongText";
  }
  if (path[0] === "marks" && ["fill", "stroke"].includes(property)) {
    if (path.includes("boxPlot") && path.includes("median") &&
        property === "stroke") return "boxMedian";
    if (path.includes("gradientPlot") && path.includes("center") &&
        property === "stroke") return "gradientCenter";
    const component = componentRole(program, path[1], property);
    if (component !== undefined) return component;
    const layer = findLayer(program, path[1]);
    if (isFieldDrivenMark(program, path[1], property)) return undefined;
    if (property === "fill" && isRegressionBand(program, path[1])) {
      return "regressionBand";
    }
    return layer?.mark?.type === "text" ? "text" : "mark";
  }
  if (path[0] === "guides" && path[1] === "axis") {
    const component = path[3];
    if (property !== "color") return undefined;
    if (component === "line") return "axis";
    if (component === "ticks") return "mutedText";
    if (component === "labels") return "text";
    if (component === "title") return "axisTitle";
  }
  if (path[0] === "guides" && path[1] === "grid" && property === "color") {
    return "grid";
  }
  if (path[0] === "title" && property === "color") {
    if (path.includes("titleStyle")) return "strongText";
    if (path.includes("subtitleStyle")) return "mutedText";
  }
  return undefined;
}

function recolorConfig(
  program,
  value,
  sourceTokens,
  targetTokens,
  overrides,
  path = []
) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item, index) => {
      const mapped = recolorConfig(
        program,
        item,
        sourceTokens,
        targetTokens,
        overrides,
        [...path, index]
      );
      changed ||= mapped.changed;
      return mapped.value;
    });
    return { changed, value: changed ? next : value };
  }
  if (value === null || typeof value !== "object") {
    const property = path.at(-1);
    if (!["color", "fill", "stroke", "background", "fontFamily"]
      .includes(property)) {
      return { changed: false, value };
    }
    if (isOverridden(overrides, `c:${path.join(".")}`)) {
      return { changed: false, value };
    }
    if (property === "background" && value === "transparent") {
      return { changed: false, value };
    }
    const role = configRole(program, path);
    return role === undefined
      ? mapColorValue(value, sourceTokens, targetTokens)
      : mapRoleValue(
          value,
          role,
          sourceTokens,
          targetTokens,
          roleLegacy(role)
        );
  }
  if (["theme", "highlights", "selections"].includes(path[0])) {
    return { changed: false, value };
  }
  let changed = false;
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    const mapped = recolorConfig(
      program,
      item,
      sourceTokens,
      targetTokens,
      overrides,
      [...path, key]
    );
    changed ||= mapped.changed;
    next[key] = mapped.value;
  }
  return { changed, value: changed ? next : value };
}

function addMarkOverrides(overrides, program, op, args) {
  const match = /^(?:create|edit)(Point|Line|Area|Arc|Bar|Rect|Rule|Tick|Text)Mark$/u
    .exec(op);
  if (match === null) return;
  const type = match[1].toLowerCase();
  const candidates = program.semanticSpec.layers.filter(
    layer => layer.mark?.type === type
  );
  const id = args.target ?? args.id ??
    (op.startsWith("create") ? type : undefined) ??
    (candidates.length === 1 ? candidates[0].id : program.context.currentMark);
  if (typeof id !== "string") return;
  for (const property of ["fill", "stroke", "fontFamily"]) {
    if (!Object.hasOwn(args, property)) continue;
    overrides.add(`c:marks.${id}.${property}`);
    overrides.add(`g:${id}.${property}`);
  }
}

function addFacadeMarkOverrides(overrides, op, args) {
  const facades = {
    createScatterPlot: ["scatterPlot", "point", ["fill", "stroke"]],
    createLinePlot: ["linePlot", "line", ["stroke"]],
    createPolarScatterPlot: ["polarScatterPlot", "point", ["fill", "stroke"]],
    createPolarLinePlot: ["polarLinePlot", "line", ["stroke"]],
    createRadarPlot: ["radarPlot", "line", ["stroke"]],
    createRugPlot: ["rugPlot", "tick", ["stroke"]],
    createStripPlot: ["stripPlot", "point", ["fill", "stroke"]],
    createBeeswarmPlot: ["beeswarmPlot", "point", ["fill", "stroke"]],
    createBarPlot: ["barPlot", "bar", ["fill", "stroke"]],
    createAreaPlot: ["areaPlot", "area", ["fill", "stroke"]],
    createPiePlot: ["piePlot", "arc", ["fill", "stroke"]],
    createRosePlot: ["rosePlot", "arc", ["fill", "stroke"]],
    createRadialBarPlot: ["radialBarPlot", "arc", ["fill", "stroke"]],
    createDensityPlot: ["densityPlot", "area", ["fill", "stroke"]],
    createParallelCoordinates: ["parallelCoordinates", "line", ["stroke"]],
    createHistogram: ["histogram", "bar", ["fill", "stroke"]],
    createHeatmap: ["heatmap", "rect", ["stroke"]],
    createHorizonPlot: ["horizonPlot", "area", ["stroke"]],
    editHorizon: ["horizonPlot", "area", ["stroke"]],
    createViolinPlot: ["violinPlot", "area", ["fill", "stroke"]]
  };
  const facade = facades[op];
  if (facade === undefined) return;
  const [defaultId, option, properties] = facade;
  const id = args.id ?? defaultId;
  for (const property of properties) {
    if (!Object.hasOwn(args[option] ?? {}, property)) continue;
    overrides.add(`c:marks.${id}.${property}`);
    overrides.add(`g:${id}.${property}`);
  }
}

function findDescendant(node, op) {
  for (const child of node?.children ?? []) {
    if (child.op === op) return child;
    const nested = findDescendant(child, op);
    if (nested !== undefined) return nested;
  }
  return undefined;
}

function resolveConfiguredOwner(program, key, requested, defaultId) {
  if (typeof requested === "string" && program.markConfigs[requested]?.[key]) {
    return requested;
  }
  if (typeof defaultId === "string" && program.markConfigs[defaultId]?.[key]) {
    return defaultId;
  }
  const candidates = Object.entries(program.markConfigs)
    .filter(([, config]) => config[key] !== undefined)
    .map(([id]) => id);
  return candidates.length === 1 ? candidates[0] : undefined;
}

function addTextFacadeOverrides(overrides, node) {
  if (!["createAnnotation", "createMarkLabels"].includes(node.op)) return;
  const id = findDescendant(node, "createTextMark")?.args.id ?? node.args.id;
  if (typeof id !== "string") return;
  for (const property of ["fill", "fontFamily"]) {
    if (!Object.hasOwn(node.args, property)) continue;
    overrides.add(`c:marks.${id}.${property}`);
    overrides.add(`g:${id}.${property}`);
  }
}

function addErrorBarOverrides(overrides, program, node) {
  if (!["createErrorBar", "editErrorBar"].includes(node.op) ||
      !Object.hasOwn(node.args, "stroke")) return;
  const id = resolveConfiguredOwner(
    program,
    "errorBar",
    node.op === "createErrorBar" ? node.args.id : node.args.target,
    node.op === "createErrorBar" ? "errorBar" : undefined
  );
  if (id === undefined) return;
  const config = program.markConfigs[id].errorBar;
  for (const target of [id, config.lowerCapId, config.upperCapId]) {
    overrides.add(`c:marks.${target}.stroke`);
    overrides.add(`g:${target}.stroke`);
  }
}

function errorBandTargets(program, node) {
  const id = resolveConfiguredOwner(
    program,
    "errorBand",
    node.op === "createErrorBand" ? node.args.id : node.args.target,
    node.op === "createErrorBand" ? "errorBand" : undefined
  );
  if (id === undefined) return undefined;
  const config = program.markConfigs[id].errorBand;
  return {
    id,
    lower: config.lowerBoundaryId,
    upper: config.upperBoundaryId
  };
}

function addErrorBandOverrides(overrides, program, node) {
  if (!["createErrorBand", "editErrorBand", "editErrorBandBoundary"]
    .includes(node.op)) return;
  const targets = errorBandTargets(program, node);
  if (targets === undefined) return;
  if (Object.hasOwn(node.args, "fill") && node.args.fill !== false) {
    overrides.add(`c:marks.${targets.id}.fill`);
    overrides.add(`g:${targets.id}.fill`);
  }
  const boundary = node.op === "editErrorBandBoundary"
    ? node.args
    : node.args.boundaries;
  if (!Object.hasOwn(boundary ?? {}, "stroke")) return;
  const ids = node.op !== "editErrorBandBoundary" ||
      (node.args.boundary ?? "both") === "both"
    ? [targets.lower, targets.upper]
    : [(node.args.boundary === "lower" ? targets.lower : targets.upper)];
  for (const id of ids) {
    overrides.add(`c:marks.${id}.stroke`);
    overrides.add(`g:${id}.stroke`);
  }
}

function addBoxPlotOverrides(overrides, op, args) {
  if (!["createBoxPlot", "editBoxPlot"].includes(op)) return;
  const id = args.target ?? args.id ?? "boxPlot";
  for (const property of ["fill", "stroke"]) {
    if (!Object.hasOwn(args.box ?? {}, property)) continue;
    overrides.add(`c:marks.${id}.${property}`);
    overrides.add(`c:marks.${id}.boxPlot.box.${property}`);
    overrides.add(`g:${id}.${property}`);
  }
  if (Object.hasOwn(args.median ?? {}, "stroke")) {
    overrides.add(`c:marks.${id}.boxPlot.median.stroke`);
    overrides.add(`c:marks.${id}Median.stroke`);
    overrides.add(`g:${id}Median.stroke`);
  }
}

function addGradientPlotOverrides(overrides, op, args) {
  if (!["createGradientPlot", "editGradientPlot"].includes(op)) return;
  const id = args.target ?? args.id ?? "gradientPlot";
  if (Object.hasOwn(args.center ?? {}, "stroke")) {
    overrides.add(`c:marks.${id}.gradientPlot.center.stroke`);
    overrides.add(`g:${id}Center.stroke`);
  }
}

function addReferenceOverrides(overrides, op, args) {
  const definitions = {
    createReferenceLine: ["referenceLine", ["stroke"]],
    createReferenceBand: ["referenceBand", ["fill", "stroke"]]
  };
  const definition = definitions[op];
  if (definition === undefined) return;
  const [defaultId, properties] = definition;
  const id = args.id ?? defaultId;
  for (const property of properties) {
    if (!Object.hasOwn(args, property)) continue;
    overrides.add(`c:marks.${id}.${property}`);
    overrides.add(`g:${id}.${property}`);
  }
}

function addRegressionOverrides(overrides, node) {
  const style = node.op === "createRegression" || node.op === "editRegression"
    ? node.args.band
    : node.args;
  if (!["createRegression", "editRegression", "createRegressionBand",
    "editRegressionBand"].includes(node.op) || style === false) return;
  const child = findDescendant(
    node,
    node.op.startsWith("create") ? "createRegressionBand" : "editRegressionBand"
  );
  const id = node.op === "createRegressionBand"
    ? node.args.id
    : node.op === "editRegressionBand"
      ? node.args.target ?? child?.args.target
      : child?.args.id ?? child?.args.target;
  if (typeof id !== "string") return;
  if (Object.hasOwn(style ?? {}, "color")) {
    overrides.add(`c:marks.${id}.fill`);
    overrides.add(`g:${id}.fill`);
  }
  if (Object.hasOwn(style ?? {}, "stroke")) {
    overrides.add(`c:marks.${id}.stroke`);
    overrides.add(`g:${id}.stroke`);
  }
}

function clearPrefix(overrides, prefix) {
  for (const key of overrides) {
    if (key.startsWith(prefix)) overrides.delete(key);
  }
}

function visitTrace(node, visitor) {
  visitor(node);
  for (const child of node.children ?? []) visitTrace(child, visitor);
}

function clearRemovedResources(overrides, node) {
  visitTrace(node, current => {
    if (current.op === "editGraphics" && current.args.remove === true &&
        typeof current.args.target === "string") {
      clearPrefix(overrides, `g:${current.args.target}.`);
    }
    if (current.op !== "editSemantic" || current.args.remove !== true ||
        typeof current.args.property !== "string") return;
    const mark = /^layer\[([^\]]+)\]$/u.exec(current.args.property);
    if (mark !== null) {
      clearPrefix(overrides, `c:marks.${mark[1]}.`);
      clearPrefix(overrides, `g:${mark[1]}.`);
      return;
    }
    const axis = /^guide\.axis\.(x|y|theta|radius)$/u
      .exec(current.args.property);
    if (axis !== null) {
      const prefix = axis[1] === "radius" ? "radial" : axis[1];
      clearPrefix(overrides, `c:guides.axis.${axis[1]}.`);
      clearPrefix(overrides, `g:${prefix}Axis`);
      return;
    }
    const grid = /^guide\.grid\.([^\.]+)$/u.exec(current.args.property);
    if (grid !== null) {
      clearPrefix(overrides, `c:guides.grid.${grid[1]}.`);
      clearPrefix(overrides, `g:${grid[1]}Grid`);
      return;
    }
    const legend = /^guide\.legend\.([^\.]+)$/u.exec(current.args.property);
    if (legend !== null) {
      clearPrefix(overrides, `c:guides.legend.${legend[1]}.`);
    }
  });
}

function clearLocalResets(overrides, program, node) {
  if (node.op !== "editErrorBand") return;
  const targets = errorBandTargets(program, node);
  if (targets === undefined) return;
  if (node.args.fill === false) {
    overrides.delete(`c:marks.${targets.id}.fill`);
    overrides.delete(`g:${targets.id}.fill`);
  }
  if (node.args.boundaries === false) {
    for (const id of [targets.lower, targets.upper]) {
      clearPrefix(overrides, `c:marks.${id}.`);
      clearPrefix(overrides, `g:${id}.`);
    }
  }
}

function clearRecreatedOverrides(overrides, op, args) {
  const created = /^create(Point|Line|Area|Arc|Bar|Rect|Rule|Tick|Text)Mark$/u
    .exec(op);
  if (created !== null) {
    const id = args.id ?? created[1].toLowerCase();
    clearPrefix(overrides, `c:marks.${id}.`);
    clearPrefix(overrides, `g:${id}.`);
  }
  if (op === "removeMark" && typeof args.target === "string") {
    clearPrefix(overrides, `c:marks.${args.target}.`);
    clearPrefix(overrides, `g:${args.target}.`);
  }
  if (op === "createTitle") {
    clearPrefix(overrides, "c:title.");
    clearPrefix(overrides, "g:chartTitle.");
    clearPrefix(overrides, "g:chartSubtitle.");
  }
  if (op === "removeTitle") {
    clearPrefix(overrides, "c:title.");
    clearPrefix(overrides, "g:chartTitle.");
    clearPrefix(overrides, "g:chartSubtitle.");
  }
}

function addAxisOverrides(overrides, op, args) {
  const match = /^(?:create|edit)(X|Y|Theta|Radial)Axis(Line|Ticks|Labels|Title)$/u
    .exec(op);
  if (match === null) return;
  const channel = {
    X: "x",
    Y: "y",
    Theta: "theta",
    Radial: "radius"
  }[match[1]];
  const component = match[2].toLowerCase();
  const idPrefix = match[1] === "Radial" ? "radial" : channel;
  if (Object.hasOwn(args, "color")) {
    overrides.add(`c:guides.axis.${channel}.${component}.color`);
    overrides.add(
      `g:${idPrefix}Axis${match[2]}.${component === "line" || component === "ticks" ? "stroke" : "fill"}`
    );
  }
  if (["labels", "title"].includes(component) &&
      Object.hasOwn(args, "fontFamily")) {
    overrides.add(`c:guides.axis.${channel}.${component}.fontFamily`);
    overrides.add(`g:${idPrefix}Axis${match[2]}.fontFamily`);
  }
}

function addCompleteAxisOverride(overrides, name, args) {
  const channel = { X: "x", Y: "y", Theta: "theta", Radial: "radius" }[name];
  const idPrefix = name === "Radial" ? "radial" : channel;
  const components = {
    line: args.line,
    ticks: args.ticks,
    labels: args.labels,
    title: args.title
  };
  if (args.ticksAndLabels && typeof args.ticksAndLabels === "object") {
    components.ticks = args.ticksAndLabels.ticks;
    components.labels = args.ticksAndLabels.labels;
  }
  for (const [component, options] of Object.entries(components)) {
    const suffix = `${component[0].toUpperCase()}${component.slice(1)}`;
    if (Object.hasOwn(options ?? {}, "color")) {
      overrides.add(`c:guides.axis.${channel}.${component}.color`);
      overrides.add(
        `g:${idPrefix}Axis${suffix}.${component === "line" || component === "ticks" ? "stroke" : "fill"}`
      );
    }
    if (["labels", "title"].includes(component) &&
        Object.hasOwn(options ?? {}, "fontFamily")) {
      overrides.add(`c:guides.axis.${channel}.${component}.fontFamily`);
      overrides.add(`g:${idPrefix}Axis${suffix}.fontFamily`);
    }
  }
}

function addCompleteAxisOverrides(overrides, op, args) {
  const match = /^(?:create|edit)(X|Y|Theta|Radial)Axis$/u.exec(op);
  if (match !== null) addCompleteAxisOverride(overrides, match[1], args);
  const group = /^(?:create|edit)(X|Y)AxisTicksAndLabels$/u.exec(op);
  if (group !== null) {
    addCompleteAxisOverride(overrides, group[1], { ticksAndLabels: args });
  }
  if (op !== "createAxes") return;
  for (const [option, name] of [
    ["x", "X"],
    ["y", "Y"],
    ["theta", "Theta"],
    ["radius", "Radial"]
  ]) {
    if (args[option] && typeof args[option] === "object") {
      addCompleteAxisOverride(overrides, name, args[option]);
    }
  }
}

function addGridOverrides(overrides, op, args) {
  const match = /^(?:create|edit)(Horizontal|Vertical|Theta|Radial)Grid$/u.exec(op);
  if (match === null || !Object.hasOwn(args, "color")) return;
  const direction = match[1].toLowerCase();
  overrides.add(`c:guides.grid.${direction}.color`);
  overrides.add(`g:${direction}Grid.stroke`);
}

function addTitleOverrides(overrides, args) {
  for (const [option, id] of [
    ["titleStyle", "chartTitle"],
    ["subtitleStyle", "chartSubtitle"]
  ]) {
    if (Object.hasOwn(args[option] ?? {}, "color")) {
      overrides.add(`c:title.${option}.color`);
      overrides.add(`g:${id}.fill`);
    }
    if (Object.hasOwn(args[option] ?? {}, "fontFamily")) {
      overrides.add(`c:title.${option}.fontFamily`);
      overrides.add(`g:${id}.fontFamily`);
    }
  }
}

function addParallelOverrides(overrides, program, op, args) {
  if (!["createParallelAxis", "editParallelAxis"].includes(op)) return;
  const dimensions = program.guideConfigs.axis?.parallel?.axes?.dimensions;
  const index = dimensions?.findIndex(dimension => dimension.field === args.field);
  if (index === undefined || index < 0) return;
  const components = {
    line: args.line,
    ticks: args.ticks,
    labels: args.labels,
    title: args.title
  };
  if (args.ticksAndLabels && typeof args.ticksAndLabels === "object") {
    components.ticks = args.ticksAndLabels.ticks;
    components.labels = args.ticksAndLabels.labels;
  }
  for (const [component, options] of Object.entries(components)) {
    if (Object.hasOwn(options ?? {}, "color")) {
      overrides.add(
        `c:guides.axis.parallel.axes.dimensions.${index}.${component}.color`
      );
    }
    if (["labels", "title"].includes(component) &&
        Object.hasOwn(options ?? {}, "fontFamily")) {
      overrides.add(
        `c:guides.axis.parallel.axes.dimensions.${index}.${component}.fontFamily`
      );
    }
  }
}

function addLegendOverrides(overrides, program, args) {
  const legend = program.guideConfigs.legend ?? {};
  const prefixes = {
    series: "seriesLegend",
    color: "colorLegend",
    stroke: "strokeLegend",
    interval: "colorLegend",
    gradient: "colorGradient",
    strokeInterval: "strokeInterval",
    strokeGradient: "strokeGradient",
    size: "sizeLegend",
    strokeWidth: "strokeWidthLegend",
    opacity: "opacityLegend"
  };
  for (const kind of Object.keys(legend)) {
    if (Object.hasOwn(args.labels ?? {}, "color")) {
      overrides.add(`c:guides.legend.${kind}.labels.color`);
      if (prefixes[kind]) overrides.add(`g:${prefixes[kind]}Labels.fill`);
    }
    if (Object.hasOwn(args.labels ?? {}, "fontFamily")) {
      overrides.add(`c:guides.legend.${kind}.labels.fontFamily`);
      if (prefixes[kind]) overrides.add(`g:${prefixes[kind]}Labels.fontFamily`);
    }
    if (Object.hasOwn(args.titleStyle ?? {}, "color")) {
      overrides.add(`c:guides.legend.${kind}.titleStyle.color`);
      if (prefixes[kind]) overrides.add(`g:${prefixes[kind]}Title.fill`);
    }
    if (Object.hasOwn(args.titleStyle ?? {}, "fontFamily")) {
      overrides.add(`c:guides.legend.${kind}.titleStyle.fontFamily`);
      if (prefixes[kind]) overrides.add(`g:${prefixes[kind]}Title.fontFamily`);
    }
    if (Object.hasOwn(args.border ?? {}, "color")) {
      overrides.add(`c:guides.legend.${kind}.border.color`);
      if (prefixes[kind]) overrides.add(`g:${prefixes[kind]}Background.stroke`);
    }
  }
}

function legendPrefix(kind) {
  return {
    series: "seriesLegend",
    color: "colorLegend",
    stroke: "strokeLegend",
    interval: "colorLegend",
    gradient: "colorGradient",
    strokeInterval: "strokeInterval",
    strokeGradient: "strokeGradient",
    size: "sizeLegend",
    strokeWidth: "strokeWidthLegend",
    opacity: "opacityLegend"
  }[kind];
}

function addLegendBlockOverrides(overrides, program, args) {
  if (typeof args.target !== "string" || typeof args.channel !== "string") return;
  for (const [kind, config] of Object.entries(program.guideConfigs.legend ?? {})) {
    if (config.target !== args.target) continue;
    const key = Object.keys(config.blockOverrides ?? {}).find(value => {
      try {
        return JSON.parse(value).includes(args.channel);
      } catch {
        return false;
      }
    });
    if (key === undefined) continue;
    const prefix = `c:guides.legend.${kind}.blockOverrides.${key}`;
    const graphic = legendPrefix(kind);
    for (const [property, graphicProperty] of [
      ["color", "fill"],
      ["fontFamily", "fontFamily"]
    ]) {
      if (!Object.hasOwn(args.text ?? {}, property)) continue;
      overrides.add(`${prefix}.text.${property}`);
      if (graphic !== undefined) {
        overrides.add(`g:${graphic}Labels.${graphicProperty}`);
      }
    }
    for (const property of ["fill", "stroke"]) {
      if (!Object.hasOwn(args.symbol ?? {}, property)) continue;
      overrides.add(`${prefix}.symbol.${property}`);
      if (graphic !== undefined) {
        overrides.add(`g:${graphic}Symbols.${property}`);
      }
    }
  }
}

function addFacetOverrides(overrides, program, args) {
  const id = program.compositionSpec?.type === "facet"
    ? program.compositionSpec.id
    : undefined;
  if (id === undefined) return;
  const owner = args.role === undefined || args.role === "all"
    ? "common"
    : args.role;
  for (const [property, graphicProperty] of [
    ["color", "fill"],
    ["fontFamily", "fontFamily"]
  ]) {
    if (!Object.hasOwn(args, property)) continue;
    overrides.add(`c:facets.${id}.headers.${owner}.${property}`);
    overrides.add(`g:${id}-headers.${graphicProperty}`);
  }
}

function explicitOverrides(program, node) {
  const { op, args } = node;
  const overrides = new Set();
  if (op === "editGraphics" &&
      typeof args.target === "string" &&
      ["background", "fill", "stroke", "fontFamily"].includes(args.property)) {
    overrides.add(`g:${args.target}.${args.property}`);
  }
  if (["createCanvas", "editCanvas"].includes(op) &&
      Object.hasOwn(args, "background")) {
    overrides.add("g:canvas.background");
  }
  addMarkOverrides(overrides, program, op, args);
  addFacadeMarkOverrides(overrides, op, args);
  addTextFacadeOverrides(overrides, node);
  addBoxPlotOverrides(overrides, op, args);
  addGradientPlotOverrides(overrides, op, args);
  addReferenceOverrides(overrides, op, args);
  addErrorBarOverrides(overrides, program, node);
  addErrorBandOverrides(overrides, program, node);
  addRegressionOverrides(overrides, node);
  addAxisOverrides(overrides, op, args);
  addCompleteAxisOverrides(overrides, op, args);
  addGridOverrides(overrides, op, args);
  addParallelOverrides(overrides, program, op, args);
  if (["createTitle", "editTitle"].includes(op)) {
    addTitleOverrides(overrides, args);
  }
  if (["createLegend", "createCategoricalLegend", "editLegend"].includes(op)) {
    addLegendOverrides(overrides, program, args);
  }
  if (op === "editLegendLabels") {
    addLegendOverrides(overrides, program, { labels: args });
  }
  if (op === "editLegendTitle") {
    addLegendOverrides(overrides, program, { titleStyle: args });
  }
  if (op === "editLegendBorder") {
    addLegendOverrides(overrides, program, args);
  }
  if (op === "editLegendBlock") {
    addLegendBlockOverrides(overrides, program, args);
  }
  if (op === "editFacetHeaders") {
    addFacetOverrides(overrides, program, args);
  }
  return overrides;
}

function collectOverrides(program) {
  const overrides = new Set();
  for (const node of program.trace.children) {
    if (["applyTheme", "removeTheme"].includes(node.op)) continue;
    clearRecreatedOverrides(overrides, node.op, node.args);
    clearRemovedResources(overrides, node);
    clearLocalResets(overrides, program, node);
    for (const key of explicitOverrides(program, node)) {
      overrides.add(key);
    }
  }
  return overrides;
}

function callExisting(program, graphicId, operation) {
  return program.graphicSpec.objects[graphicId] !== undefined &&
    typeof program[operation] === "function"
    ? program[operation]()
    : program;
}

function rematerializeThemeTypography(program) {
  if (program.compositionSpec !== undefined) {
    return program.compositionSpec.type === "facet"
      ? program.materializeComposition()
      : program;
  }

  let next = program;
  for (const layer of next.semanticSpec.layers) {
    if (layer.mark?.type === "text" &&
        next.graphicSpec.objects[layer.id] !== undefined &&
        typeof next.rematerializeTextMark === "function") {
      next = next.rematerializeTextMark({ id: layer.id });
    }
  }
  for (const [id, operation] of [
    ["xAxisLabels", "editXAxisLabels"],
    ["yAxisLabels", "editYAxisLabels"],
    ["xAxisTitle", "editXAxisTitle"],
    ["yAxisTitle", "editYAxisTitle"],
    ["thetaAxisLabels", "editThetaAxisLabels"],
    ["radialAxisLabels", "editRadialAxisLabels"],
    ["thetaAxisTitle", "editThetaAxisTitle"],
    ["radialAxisTitle", "editRadialAxisTitle"]
  ]) {
    next = callExisting(next, id, operation);
  }
  if (Object.keys(next.guideConfigs.legend ?? {}).length > 0 &&
      typeof next.rematerializeLegend === "function") {
    next = next.rematerializeLegend();
  }
  next = callExisting(next, "chartTitle", "rematerializeTitle");
  return next;
}

export function reconcileProgramTheme(program, { source, metadata }) {
  const storedState = program.materializationConfigs.theme;
  if (storedState === undefined) return program;
  // Data/context/trace-only transitions cannot change authored appearance.
  // Preserve all visual identities instead of rescanning every existing mark.
  if (program.graphicSpec === source.graphicSpec &&
      program.materializationConfigs === source.materializationConfigs &&
      program.children === source.children &&
      program.compositionSpec === source.compositionSpec &&
      ["layers", "scales", "coordinates", "guides", "title"].every(
        key => program.semanticSpec[key] === source.semanticSpec[key]
      )) return program;
  const composition = program.compositionSpec !== undefined;
  const state = normalizeThemeState(storedState, { composition });
  const sourceState = normalizeThemeState(
    source.materializationConfigs.theme,
    { composition }
  );
  const sourceRootTokens = resolveEffectiveThemeTokens(sourceState);
  const targetRootTokens = resolveEffectiveThemeTokens(state);
  const contentState = current => composition
    ? { frames: current.frames.filter(frame => frame.scope === "descendants") }
    : current;
  const sourceTokens = resolveEffectiveThemeTokens(contentState(sourceState));
  const targetTokens = resolveEffectiveThemeTokens(contentState(state));
  const overrides = collectOverrides(program);

  let themed = program._withMaterializationConfig(
    ["theme"],
    setThemeStateOverrides(state, [...overrides])
  );

  const configs = recolorConfig(
    themed,
    themed.materializationConfigs,
    sourceTokens,
    targetTokens,
    overrides
  );
  let next = configs.changed
    ? themed
        ._withMaterializationConfig(["marks"], configs.value.marks)
        ._withMaterializationConfig(["guides"], configs.value.guides)
    : themed;
  if (configs.changed && configs.value.title !== undefined) {
    next = next._withMaterializationConfig(["title"], configs.value.title);
  }
  if (configs.changed && configs.value.facets !== undefined) {
    next = next._withMaterializationConfig(["facets"], configs.value.facets);
  }

  const facetsChanged = configs.value.facets !==
    themed.materializationConfigs.facets;
  if (facetsChanged && next.compositionSpec?.type === "facet") {
    next = next.materializeComposition();
  } else if (sourceTokens.fontFamily !== targetTokens.fontFamily) {
    next = rematerializeThemeTypography(next);
  }

  const parallelChanged = configs.value.guides.axis?.parallel !==
    themed.guideConfigs.axis?.parallel;
  if (parallelChanged && typeof next.rematerializeParallelAxes === "function") {
    next = next.rematerializeParallelAxes();
  }

  for (const [id, graphic] of Object.entries(next.graphicSpec.objects)) {
    if (parallelChanged && id.startsWith("parallelAxis")) continue;
    const graphicSourceTokens = id === "canvas"
      ? sourceRootTokens
      : sourceTokens;
    const graphicTargetTokens = id === "canvas"
      ? targetRootTokens
      : targetTokens;
    next = recolorGraphic(
      next,
      id,
      graphic,
      graphicSourceTokens,
      graphicTargetTokens,
      overrides
    );
  }

  if (sourceTokens.highlight !== targetTokens.highlight) {
    next = rematerializeThemeHighlights(next);
  }

  if (metadata.op === "removeTheme" && state.frames.length === 0 &&
      (state.descendantFrames?.length ?? 0) === 0) {
    next = next._withoutMaterializationConfig(["theme"]);
  }
  return next;
}
