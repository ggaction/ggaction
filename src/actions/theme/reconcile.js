import { themeTypographyValue } from "./typographyRoles.js";
import { guideConfigDefault, guideGraphicDefaults, guideNumericProperty, themeGuideGeometrySteps } from "./guideDefaults.js";
import { withGuideLayoutTransaction } from "../../materialization/guides/layout.js";
import { legendSampleFill } from "../../materialization/legends.js";
import { legendResourcePolicy } from "../../materialization/guides/resources.js";
import { resourcePlotThemeOwner, resourcePlotThemeProperty, addResourcePlotThemeOverrides, clearResourcePlotThemeOverrides } from "./resourcePlots.js";
import { applyMaterializationPlan, buildMaterializationPlan } from "../../materialization/planner.js";
import { synchronizeFacetLegendAppearance } from "../../materialization/facetGuides/owner.js";
import { rematerializeTypography } from "../../materialization/typography.js";
import { AXIS_LABEL_FONT_SIZES, AXIS_TITLE_FONT_SIZE, themeTokens } from "../../theme/defaults.js";
import {
  normalizeThemeState,
  resolveEffectiveThemeTokens,
  resolveEffectiveThemeFrame,
  setThemeStateOverrides
} from "./state.js";
import { isOwned } from "../../core/immutable.js";
import { findLayer } from "../../selectors/layers.js";
import { reconcileFollowingRegressions } from "../regression/follow.js";

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
  "fontFamily", "fontSize", "fontWeight"
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
  return matches[0];
}

function axisFamily(name) {
  return name.startsWith("parallel") ? "parallel"
    : /^(theta|radial|radius)/u.test(name) ? "polar" : "cartesian";
}

function axisTextRole(property, component) {
  if (!["labels", "title"].includes(component)) return undefined;
  const role = component === "labels" ? "axisLabel" : "axisTitle";
  if (property === "fontFamily") return `${role}FontFamily`;
  if (property === "fontSize") return `${role}FontSize`;
  if (["fill", "color"].includes(property)) return role;
  return undefined;
}

function roleToken(tokens, role, family = "cartesian") {
  if (tokens[role] !== undefined) return tokens[role];
  if (role === "axisLabel") return family === "parallel" ? tokens.axis : tokens.text;
  if (["axisLabelFontFamily", "axisTitleFontFamily"].includes(role)) return tokens.fontFamily;
  if (role === "axisLabelFontSize") return tokens.fontSize ?? AXIS_LABEL_FONT_SIZES[family];
  if (role === "axisTitleFontSize") return tokens.fontSize ?? AXIS_TITLE_FONT_SIZE;
  return undefined;
}

function roleValues(role, sourceTokens, legacy = [], family) {
  return new Set([
    roleToken(sourceTokens, role, family),
    roleToken(themeTokens("light"), role, family),
    ...legacy.map(token => themeTokens("light")[token] ?? token)
  ]);
}

function mapRoleValue(value, role, sourceTokens, targetTokens, legacy, family, nativeDefault, themeActive = true) {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map(item => {
      const mapped = mapRoleValue(
        item,
        role,
        sourceTokens,
        targetTokens,
        legacy, family, nativeDefault, themeActive
      );
      changed ||= mapped.changed;
      return mapped.value;
    });
    return { changed, value: changed ? next : value };
  }
  if ((nativeDefault === undefined || value !== nativeDefault) && !roleValues(role, sourceTokens, legacy, family).has(value)) {
    return { changed: false, value };
  }
  const target = !themeActive && nativeDefault !== undefined ? nativeDefault : roleToken(targetTokens, role, family);
  return { changed: value !== target, value: target };
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
  const axisPart = /(?:Axis|^axis_.+__)(Labels|Titles?)$/u.exec(id);
  const scoped = axisPart === null ? undefined : axisTextRole(property, axisPart[1] === "Labels" ? "labels" : "title");
  if (scoped !== undefined) return scoped;
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
  if (/(?:Axis|^axis_.+__)Lines?$/u.test(id) && property === "stroke") return "axis";
  if (/(?:Axis|^axis_.+__)Ticks$/u.test(id) && property === "stroke") return "mutedText";
  if (/^parallelAxisLabels$/u.test(id) && property === "fill") return "axis";
  if (/(?:Axis|^axis_.+__)Labels$/u.test(id) && property === "fill") return "text";
  if (/(?:Axis|^axis_.+__)Titles?$/u.test(id) && property === "fill") return "axisTitle";
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
  if (role === "axisLabel") return ["text", "axis"];
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
  nativeDefaults,
  themeActive,
  overrideId = id
) {
  let changed = false;
  const next = { ...properties };
  for (const property of THEME_STYLE_PROPERTIES) {
    if (!Object.hasOwn(properties, property)) continue;
    if (isOverridden(overrides, `g:${overrideId}.${property}`) ||
        isOverridden(overrides, `g:${id}.${property}`)) continue;
    const native = nativeDefaults.get(id);
    const role = (native?.property === property ? native.role : undefined) ?? graphicRole(program, id, property);
    if (role === undefined || isFieldDrivenLegendSymbol(id) ||
        isFieldDrivenMark(program, id, property)) continue;
    const mapped = mapRoleValue(
      properties[property],
      role,
      sourceTokens,
      targetTokens,
      roleLegacy(role), axisFamily(id),
      native?.property === property ? native.value : undefined, themeActive
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
  overrides,
  nativeDefaults,
  themeActive
) {
  if (program.compositionSpec !== undefined && !nativeDefaults.has(id) &&
      !["canvas", "chartTitle", "chartSubtitle", `${program.compositionSpec.id}-headers`].includes(id)) {
    // Child and collected-guide snapshots already carry their owning program's
    // resolved appearance, including local overrides and native family defaults.
    return program;
  }
  if (resourcePlotThemeOwner(findLayer(program, id)) !== undefined) return program;
  if (id === `${program.compositionSpec?.id}-headers`) {
    const headers = program.materializationConfigs.facets?.[program.compositionSpec.id]?.headers;
    if (headers?.column?.title !== undefined || headers?.row?.title !== undefined) {
      // Role titles and category labels have independently owned paint. Their
      // reconciled header configs already materialized the complete collection.
      return program;
    }
  }
  if (graphic.items === undefined) {
    const mapped = mapGraphicProperties(
      program,
      id,
      graphic.type,
      graphic.properties,
      sourceTokens,
      targetTokens,
      overrides,
      nativeDefaults,
      themeActive,
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
      nativeDefaults,
      themeActive,
      item.id
    );
    changed ||= mapped.changed;
    return { type, properties: mapped.properties,
      ...(item.identity === undefined ? {} : { identity: item.identity }) };
  });
  return changed
    ? program.editGraphics({ target: id, property: "items", value: items })
    : program;
}

function configRole(program, path) {
  const property = path.at(-1);
  if (path[0] === "guides" && path[1] === "axis") {
    const component = path[2] === "parallel" ? path.at(-2) : path[3];
    const scoped = axisTextRole(property, component);
    if (scoped !== undefined) return scoped;
  }
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
    const component = path[2] === "parallel" ? path.at(-2) : path[3];
    if (property !== "color") return undefined;
    if (component === "line") return "axis";
    if (component === "ticks") return "mutedText";
    if (component === "labels") return "text";
    if (component === "title") return "axisTitle";
  }
  if (path[0] === "guides" && path[1] === "grid" && property === "color") {
    return "grid";
  }
  if (path[0] === "guides" && path[1] === "legend" && property === "color") {
    if (path.includes("titleStyle")) return "strongText";
    if (path.includes("labels")) return "text";
    if (path.includes("border")) return "border";
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
  themeActive,
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
        themeActive,
        [...path, index]
      );
      changed ||= mapped.changed;
      return mapped.value;
    });
    return { changed, value: changed ? next : value };
  }
  if (value === null || typeof value !== "object") {
    const property = path.at(-1);
    if (!["color", "fill", "emptyFill", "stroke", "background", "fontFamily", "fontSize", "fontWeight", "lineWidth", "length"]
      .includes(property)) {
      return { changed: false, value };
    }
    if (isOverridden(overrides, `c:${path.join(".")}`)) {
      return { changed: false, value };
    }
    const numeric = guideNumericProperty(path);
    if (numeric !== undefined) {
      const target = themeActive ? targetTokens[numeric.token] ?? numeric.defaultValue : numeric.defaultValue;
      return { changed: value !== target, value: target };
    }
    if (property === "background" && value === "transparent") {
      return { changed: false, value };
    }
    const resource = resourcePlotThemeProperty(path, path[0] === "marks" && path[2] === "flowPlot" ? findLayer(program, path[1]) : undefined);
    if (resource?.explicit) return { changed: false, value };
    if (resource !== undefined) {
      const target = themeActive ? targetTokens[resource.token] ?? resource.defaultValue : resource.defaultValue;
      return { changed: value !== target, value: target };
    }
    const typography = themeTypographyValue(program, path, targetTokens, sourceTokens);
    if (typography !== undefined) return { changed: typography !== value, value: typography };
    const role = configRole(program, path);
    return role === undefined
      ? mapColorValue(value, sourceTokens, targetTokens)
      : mapRoleValue(
          value,
          role,
          sourceTokens,
          targetTokens,
          roleLegacy(role), axisFamily(String(path[2] ?? "")), guideConfigDefault(path), themeActive
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
      themeActive,
      [...path, key]
    );
    changed ||= mapped.changed;
    next[key] = mapped.value;
  }
  return { changed, value: changed ? next : value };
}

function addMarkPropertyOverrides(overrides, id, property) {
  overrides.add(`c:marks.${id}.${property}`);
  overrides.add(`g:${id}.${property}`);
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
  for (const property of ["fill", "stroke", "fontFamily", "fontSize", "fontWeight"]) {
    if (!Object.hasOwn(args, property)) continue;
    addMarkPropertyOverrides(overrides, id, property);
  }
}

function addFacadeMarkOverrides(overrides, op, args) {
  const facades = {
    createScatterPlot: ["point", true],
    createLinePlot: ["line", false],
    createPolarScatterPlot: ["point", true],
    createPolarLinePlot: ["line", false],
    createRadarPlot: ["line", false],
    createRugPlot: ["tick", false],
    createStripPlot: ["point", true],
    createBeeswarmPlot: ["point", true],
    createBarPlot: ["bar", true],
    createAreaPlot: ["area", true],
    createPiePlot: ["arc", true],
    createRosePlot: ["arc", true],
    createRadialBarPlot: ["arc", true],
    createDensityPlot: ["area", true],
    createParallelCoordinates: ["line", false],
    createHistogram: ["bar", true],
    createHeatmap: ["rect", false],
    createHorizonPlot: ["area", false],
    editHorizon: ["area", false],
    createViolinPlot: ["area", true]
  };
  const facade = facades[op];
  if (facade === undefined) return;
  const [option, includesFill] = facade;
  const subject = op === "editHorizon" ? "HorizonPlot" : op.slice(6);
  const defaultId = subject[0].toLowerCase() + subject.slice(1);
  const properties = includesFill ? ["fill", "stroke"] : ["stroke"];
  const id = args.id ?? defaultId;
  for (const property of properties) {
    if (!Object.hasOwn(args[option] ?? {}, property)) continue;
    addMarkPropertyOverrides(overrides, id, property);
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
  const style = ["createAnnotation", "createMarkLabels"].includes(node.op) ? node.args
    : node.op === "createTextPlot" ? node.args.style : node.args.labels;
  if (style === null || typeof style !== "object") return;
  const ids = new Set();
  visitTrace(node, child => {
    if (child.op === "createTextMark" && typeof child.args.id === "string") ids.add(child.args.id);
  });
  for (const id of ids) for (const property of ["fill", "fontFamily", "fontSize", "fontWeight"]) {
    if (Object.hasOwn(style, property)) addMarkPropertyOverrides(overrides, id, property);
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
    addMarkPropertyOverrides(overrides, target, "stroke");
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
    addMarkPropertyOverrides(overrides, targets.id, "fill");
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
    addMarkPropertyOverrides(overrides, id, "stroke");
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
    addMarkPropertyOverrides(overrides, id, property);
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
    addMarkPropertyOverrides(overrides, id, "fill");
  }
  if (Object.hasOwn(style ?? {}, "stroke")) {
    addMarkPropertyOverrides(overrides, id, "stroke");
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

// Completed immutable action branches never acquire new removals. Retain only
// their distinct reset prefixes so later themed edits do not rescan old facet
// materialization traces. Prefix deletion commutes; authored overrides are still
// applied in their original top-level action order.
const removedResources = new WeakMap();

function removedResourcePrefixes(node) {
  const cached = removedResources.get(node);
  if (cached !== undefined) return cached;
  const prefixes = new Set();
  visitTrace(node, current => {
    if (current.op === "editGraphics" && current.args.remove === true &&
        typeof current.args.target === "string") {
      prefixes.add(`g:${current.args.target}.`);
    }
    if (current.op !== "editSemantic" || current.args.remove !== true ||
        typeof current.args.property !== "string") return;
    const mark = /^layer\[([^\]]+)\]$/u.exec(current.args.property);
    if (mark !== null) {
      prefixes.add(`c:marks.${mark[1]}.`);
      prefixes.add(`g:${mark[1]}.`);
      return;
    }
    const axis = /^guide\.axis\.([A-Za-z0-9_-]+)$/u
      .exec(current.args.property);
    if (axis !== null) {
      const prefix = axis[1] === "radius" ? "radial" : axis[1];
      const graphicPrefix = ["x", "y", "theta", "radius"].includes(axis[1]) ? `${prefix}Axis` : `axis_${axis[1]}__`;
      prefixes.add(`c:guides.axis.${axis[1]}.`);
      prefixes.add(`g:${graphicPrefix}`);
      return;
    }
    const grid = /^guide\.grid\.([^\.]+)$/u.exec(current.args.property);
    if (grid !== null) {
      prefixes.add(`c:guides.grid.${grid[1]}.`);
      prefixes.add(`g:${grid[1]}Grid`);
      return;
    }
    const legend = /^guide\.legend\.([^\.]+)$/u.exec(current.args.property);
    if (legend !== null) {
      prefixes.add(`c:guides.legend.${legend[1]}.`);
    }
  });
  const result = [...prefixes];
  if (isOwned(node)) removedResources.set(node, result);
  return result;
}

function clearRemovedResources(overrides, node) {
  for (const prefix of removedResourcePrefixes(node)) clearPrefix(overrides, prefix);
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

function axisOverrideId(node, channel, args) {
  if (args.target !== undefined || args.id !== undefined) return args.target ?? args.id;
  const ids = new Set();
  const visit = entry => {
    if (["createGraphics", "editGraphics"].includes(entry.op)) {
      const id = entry.args.target ?? entry.args.id;
      const named = /^axis_(.+)__(Line|Ticks|Labels|Title)$/u.exec(id ?? "");
      if (named !== null) ids.add(named[1]);
      else if (new RegExp(`^${channel}Axis(?:Line|Ticks|Labels|Title)$`).test(id ?? "")) ids.add(channel);
    }
    entry.children?.forEach(visit);
  };
  if (node !== undefined) visit(node);
  return ids.size === 1 ? [...ids][0] : channel;
}

function addAxisOverrides(overrides, op, args, node) {
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
  const axisId = axisOverrideId(node, channel, args);
  const idPrefix = match[1] === "Radial" ? "radial" : channel;
  for (const property of ["lineWidth", "length"]) if (Object.hasOwn(args, property)) overrides.add(`c:guides.axis.${axisId}.${component}.${property}`);
  if (Object.hasOwn(args, "color")) {
    overrides.add(`c:guides.axis.${axisId}.${component}.color`);
    overrides.add(
      `g:${axisId === channel ? `${idPrefix}Axis` : `axis_${axisId}__`}${match[2]}.${component === "line" || component === "ticks" ? "stroke" : "fill"}`
    );
  }
  for (const property of ["fontFamily", "fontSize", "fontWeight"]) {
    if (["labels", "title"].includes(component) && Object.hasOwn(args, property)) {
      overrides.add(`c:guides.axis.${axisId}.${component}.${property}`);
      overrides.add(`g:${axisId === channel ? `${idPrefix}Axis` : `axis_${axisId}__`}${match[2]}.${property}`);
    }
  }
}

function addCompleteAxisOverride(overrides, name, args, node) {
  const channel = { X: "x", Y: "y", Theta: "theta", Radial: "radius" }[name];
  const axisId = axisOverrideId(node, channel, args);
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
    for (const property of ["lineWidth", "length"]) if (Object.hasOwn(options ?? {}, property)) overrides.add(`c:guides.axis.${axisId}.${component}.${property}`);
    const suffix = `${component[0].toUpperCase()}${component.slice(1)}`;
    if (Object.hasOwn(options ?? {}, "color")) {
      overrides.add(`c:guides.axis.${axisId}.${component}.color`);
      overrides.add(
        `g:${axisId === channel ? `${idPrefix}Axis` : `axis_${axisId}__`}${suffix}.${component === "line" || component === "ticks" ? "stroke" : "fill"}`
      );
    }
    for (const property of ["fontFamily", "fontSize", "fontWeight"]) {
      if (["labels", "title"].includes(component) && Object.hasOwn(options ?? {}, property)) {
        overrides.add(`c:guides.axis.${axisId}.${component}.${property}`);
        overrides.add(`g:${axisId === channel ? `${idPrefix}Axis` : `axis_${axisId}__`}${suffix}.${property}`);
      }
    }
  }
}

function addCompleteAxisOverrides(overrides, op, args, node) {
  if (args.guides?.axes !== null && typeof args.guides?.axes === "object") {
    addCompleteAxisOverrides(overrides, "createAxes", args.guides.axes);
  }
  if (op === "createGuides" && args.axes !== null && typeof args.axes === "object") {
    addCompleteAxisOverrides(overrides, "createAxes", args.axes);
  }
  const match = /^(?:create|edit)(X|Y|Theta|Radial)Axis$/u.exec(op);
  if (match !== null) addCompleteAxisOverride(overrides, match[1], args, node);
  const group = /^(?:create|edit)(X|Y)AxisTicksAndLabels$/u.exec(op);
  if (group !== null) {
    addCompleteAxisOverride(overrides, group[1], { target: args.target, ticksAndLabels: args }, node);
  }
  if (op !== "createAxes") return;
  for (const [option, name] of [
    ["x", "X"],
    ["y", "Y"],
    ["theta", "Theta"],
    ["radius", "Radial"]
  ]) {
    if (args[option] && typeof args[option] === "object") {
      for (const entry of Array.isArray(args[option]) ? args[option] : [args[option]]) addCompleteAxisOverride(overrides, name, entry);
    }
  }
}

function addGridOverrides(overrides, op, args) {
  const group = op === "createGrid" || op === "editGrid" ? args : op === "createGuides" ? args.grid : args.guides?.grid;
  if (group !== null && typeof group === "object") {
    for (const direction of ["horizontal", "vertical", "theta", "radial"]) {
      for (const property of ["color", "lineWidth"]) if (Object.hasOwn(group[direction] ?? {}, property)) {
        overrides.add(`c:guides.grid.${direction}.${property}`);
        if (property === "color") overrides.add(`g:${direction}Grid.stroke`);
      }
    }
  }
  const match = /^(?:create|edit)(Horizontal|Vertical|Theta|Radial)Grid$/u.exec(op);
  if (match === null) return;
  const direction = match[1].toLowerCase();
  if (Object.hasOwn(args, "lineWidth")) overrides.add(`c:guides.grid.${direction}.lineWidth`);
  if (Object.hasOwn(args, "color")) {
    overrides.add(`c:guides.grid.${direction}.color`);
    overrides.add(`g:${direction}Grid.stroke`);
  }
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
    for (const property of ["fontFamily", "fontSize", "fontWeight"]) {
      if (!Object.hasOwn(args[option] ?? {}, property)) continue;
      overrides.add(`c:title.${option}.${property}`);
      overrides.add(`g:${id}.${property}`);
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
    for (const property of ["lineWidth", "length"]) if (Object.hasOwn(options ?? {}, property)) overrides.add(`c:guides.axis.parallel.axes.dimensions.${index}.${component}.${property}`);
    if (Object.hasOwn(options ?? {}, "color")) {
      overrides.add(
        `c:guides.axis.parallel.axes.dimensions.${index}.${component}.color`
      );
    }
    for (const property of ["fontFamily", "fontSize", "fontWeight"]) {
      if (["labels", "title"].includes(component) && Object.hasOwn(options ?? {}, property)) {
        overrides.add(`c:guides.axis.parallel.axes.dimensions.${index}.${component}.${property}`);
      }
    }
  }
}

function addLegendOverrides(overrides, program, args) {
  for (const kind of Object.keys(program.guideConfigs.legend ?? {})) {
    const prefix = legendPrefix(kind);
    for (const [option, suffix, property, graphicProperty] of [
      ["labels", "Labels", "color", "fill"],
      ["labels", "Labels", "fontFamily", "fontFamily"],
      ["labels", "Labels", "fontSize", "fontSize"],
      ["labels", "Labels", "fontWeight", "fontWeight"],
      ["titleStyle", "Title", "color", "fill"],
      ["titleStyle", "Title", "fontFamily", "fontFamily"],
      ["titleStyle", "Title", "fontSize", "fontSize"],
      ["titleStyle", "Title", "fontWeight", "fontWeight"],
      ["border", "Background", "color", "stroke"]
    ]) {
      if (!Object.hasOwn(args[option] ?? {}, property)) continue;
      overrides.add(`c:guides.legend.${kind}.${option}.${property}`);
      if (prefix) overrides.add(`g:${prefix}${suffix}.${graphicProperty}`);
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
      ["fontFamily", "fontFamily"],
      ["fontSize", "fontSize"],
      ["fontWeight", "fontWeight"]
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
    ["fontFamily", "fontFamily"],
    ["fontSize", "fontSize"],
    ["fontWeight", "fontWeight"]
  ]) {
    if (Object.hasOwn(args.title ?? {}, property)) {
      overrides.add(`c:facets.${id}.headers.${owner}.title.${property}`);
    }
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
      ["background", "fill", "stroke", "fontFamily", "fontSize", "fontWeight"].includes(args.property)) {
    overrides.add(`g:${args.target}.${args.property}`);
  }
  if (["createCanvas", "editCanvas"].includes(op) &&
      Object.hasOwn(args, "background")) {
    overrides.add("g:canvas.background");
  }
  addResourcePlotThemeOverrides(overrides, node);
  addMarkOverrides(overrides, program, op, args);
  addFacadeMarkOverrides(overrides, op, args);
  addTextFacadeOverrides(overrides, node);
  addBoxPlotOverrides(overrides, op, args);
  addGradientPlotOverrides(overrides, op, args);
  addReferenceOverrides(overrides, op, args);
  addErrorBarOverrides(overrides, program, node);
  addErrorBandOverrides(overrides, program, node);
  addRegressionOverrides(overrides, node);
  addAxisOverrides(overrides, op, args, node);
  addCompleteAxisOverrides(overrides, op, args, node);
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
  const parentLegendOptions = ["createGuides", "editFacetGuides"].includes(op) ? args.legend : args.guides?.legend;
  if (parentLegendOptions !== null && typeof parentLegendOptions === "object") {
    addLegendOverrides(overrides, program, parentLegendOptions);
  }
  if (op === "editFacetHeaders") {
    addFacetOverrides(overrides, program, args);
  }
  if (["facet", "facetGrid", "repeatCharts"].includes(op) && args.headers !== undefined) {
    const { row, column, ...common } = args.headers;
    addFacetOverrides(overrides, program, common);
    for (const [role, patch] of [["row", row], ["column", column]]) {
      if (patch !== undefined) addFacetOverrides(overrides, program, { ...patch, role });
    }
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
    clearResourcePlotThemeOverrides(overrides, node);
    for (const key of explicitOverrides(program, node)) {
      overrides.add(key);
    }
  }
  return overrides;
}

function axisTypographyChanged(before, after) {
  if (before === after || after === null || typeof after !== "object") return false;
  return Object.entries(after).some(([key, value]) => ["fontFamily", "fontSize", "fontWeight"].includes(key)
    ? value !== before?.[key] : axisTypographyChanged(before?.[key], value));
}

export function reconcileProgramTheme(program, { source, metadata }) {
  program = reconcileFollowingRegressions(program);
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
  const themeActive = resolveEffectiveThemeFrame(contentState(state)) !== undefined;
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
    overrides,
    themeActive
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

  if (configs.changed) next = synchronizeFacetLegendAppearance(next);

  const facetsChanged = configs.value.facets !==
    themed.materializationConfigs.facets;
  const typographyChanged = ["fontFamily", "fontSize", "fontWeight"].some(key => sourceTokens[key] !== targetTokens[key]) ||
    axisTypographyChanged(themed.materializationConfigs, configs.value);
  if (facetsChanged && next.compositionSpec?.type === "facet") {
    next = next.materializeComposition();
  } else if (typographyChanged) {
    next = rematerializeTypography(next);
  }

  const resourceMarks = next.semanticSpec.layers.flatMap(layer => {
    const owner = resourcePlotThemeOwner(layer);
    if (owner === undefined || themed.markConfigs[layer.id]?.[owner.key] === next.markConfigs[layer.id]?.[owner.key]) return [];
    const textHandled = typographyChanged && layer.hierarchyLabels !== false && layer.graphLabels !== false && layer.flowLabels !== false;
    return textHandled ? [] : [{ op: owner.op, args: { id: layer.id } }];
  });
  if (resourceMarks.length > 0) next = applyMaterializationPlan(next, buildMaterializationPlan({ marks: resourceMarks }));

  const guideGeometry = themeGuideGeometrySteps(next, themed, overrides);
  if (guideGeometry.length > 0) next = withGuideLayoutTransaction(next,
    candidate => applyMaterializationPlan(candidate, buildMaterializationPlan({ guides: guideGeometry })));

  const parallelChanged = configs.value.guides.axis?.parallel !==
    themed.guideConfigs.axis?.parallel;
  if (parallelChanged && !typographyChanged && typeof next.rematerializeParallelAxes === "function") {
    next = next.rematerializeParallelAxes();
  }

  const nativeDefaults = guideGraphicDefaults(next);
  const beforeMarkColors = next;
  const markIds = new Set(next.semanticSpec.layers.map(layer => layer.id));
  for (const id of markIds) {
    const graphic = next.graphicSpec.objects[id];
    if (graphic !== undefined) next = recolorGraphic(next, id, graphic,
      sourceTokens, targetTokens, overrides, nativeDefaults, themeActive);
  }
  // Stroke legend samples retain the target's concrete fill as well as their
  // field-driven stroke. Refresh that dependency after mark colors, before
  // reconciling the new legend chrome through its own theme roles.
  for (const kind of ["strokeGradient", "strokeInterval"]) {
    const config = next.guideConfigs.legend?.[kind], target = config?.target;
    if (target !== undefined && beforeMarkColors.graphicSpec.objects[target] !== next.graphicSpec.objects[target]) {
      const fill = config.blockSymbol?.fill ?? legendSampleFill(next, target) ?? targetTokens.mark;
      for (const id of legendResourcePolicy(kind).graphicIds) {
        if (/(?:Strips|Symbols)$/u.test(id) && next.graphicSpec.objects[id] !== undefined) {
          next = next.editGraphics({ target: id, property: "fill", value: fill });
        }
      }
    }
  }
  for (const [id, graphic] of Object.entries(next.graphicSpec.objects)) {
    if (markIds.has(id)) continue;
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
      overrides,
      nativeDefaults,
      themeActive
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
