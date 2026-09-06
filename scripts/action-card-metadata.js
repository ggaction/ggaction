const ROLE_ORDER = Object.freeze(["H0", "H1", "H2", "H3", "H4"]);

const analysisChartNames = new Set([
  "createDotPlot",
  "createLollipopPlot",
  "createDumbbellPlot",
  "createECDFPlot",
  "createIntervalPlot",
  "createRegressionPlot",
  "createRaincloudPlot",
  "createHistogram",
  "createDensityPlot",
  "createHorizonPlot"
]);
const analysisChartEditorNames = new Set([
  "editEndpointPlot",
  "editECDFPlot",
  "editRaincloudPlot"
]);

const h0CompositionNames = new Set(["facet", "facetGrid", "repeatCharts"]);
const coreH3Names = new Set([
  "createCanvas",
  "editCanvas",
  "fitCanvas",
  "applyTheme",
  "removeTheme"
]);
const analyticMarkNames = new Set([
  "createReferenceLine",
  "createReferenceBand",
  "createMarkLabels",
  "createAnnotation"
]);

const explicitFacadeEditors = Object.freeze({
  createDotPlot: ["editEndpointPlot"],
  createLollipopPlot: ["editEndpointPlot"],
  createDumbbellPlot: ["editEndpointPlot"],
  createECDFPlot: ["editECDFPlot"],
  createRaincloudPlot: ["editRaincloudPlot"],
  facet: ["editFacetSource", "editFacetHeaders", "editFacetScales", "editFacetGuides", "editCompositionLayout"],
  facetGrid: ["editFacetSource", "editFacetHeaders", "editFacetScales", "editFacetGuides", "editCompositionLayout"],
  repeatCharts: ["editFacetSource", "editFacetHeaders", "editFacetScales", "editFacetGuides", "editCompositionLayout"]
});

const explicitLifecycleEditors = Object.freeze({
  applyTheme: ["applyTheme", "removeTheme"],
  removeTheme: ["applyTheme"],
  bindMarkData: ["bindMarkData"],
  layoutLabels: ["layoutLabels", "removeLabelLayout"],
  jitterPoints: ["jitterPoints", "removeJitter"],
  packPoints: ["packPoints", "removePointPacking"],
  filterMarks: ["removeMarkFilter"],
  selectMarks: ["editMarkSelection", "removeMarkSelection"],
  editMarkSelection: ["editMarkSelection", "removeMarkSelection"],
  highlightMarks: ["removeMarkHighlight"],
  encodePointRadius: ["removePointRadius"],
  encodePathOrder: ["removePathOrder"],
  orderCategories: ["removeCategoryOrder"],
  editEndpointPlot: ["editEndpointPlot"],
  editECDFPlot: ["editECDFPlot"],
  editRaincloudPlot: ["editRaincloudPlot"]
});

const selectorInputs = new Set([
  "target",
  "data",
  "source",
  "coordinate",
  "scale",
  "xScale",
  "yScale",
  "selection",
  "parent",
  "before",
  "after"
]);

const logicalPixelNames = new Set([
  "width",
  "height",
  "margin",
  "padding",
  "minPlotWidth",
  "minPlotHeight",
  "strokeWidth",
  "lineWidth",
  "fontSize",
  "offset",
  "maxWidth",
  "lineHeight",
  "capSize",
  "length",
  "radius"
]);

const countNames = new Set(["count", "columns", "bands", "steps", "maxBins", "precision"]);
const emptyResultActions = new Set([
  "createData",
  "createPointMark",
  "createTickMark",
  "createLineMark",
  "createBarMark",
  "createAreaMark",
  "createArcMark",
  "createRectMark",
  "createRuleMark",
  "createTextMark"
]);

function unique(values) {
  return [...new Set(values)];
}

function operation(name) {
  return name === "facet" || name === "facetGrid" || name === "repeatCharts"
    ? "compose"
    : name.match(/^[a-z]+/)?.[0] ?? "";
}

export function authoringRoles(action) {
  if (action.layer === "primitive") return ["H4"];
  const roles = [];
  if (action.domain === "charts") {
    if (action.name.startsWith("create")) roles.push("H0");
    if (analysisChartNames.has(action.name) || analysisChartEditorNames.has(action.name)) roles.push("H1");
    if (action.name.startsWith("edit")) roles.push("H3");
  } else if (action.domain === "composition") {
    roles.push(h0CompositionNames.has(action.name) ? "H0" : "H3");
  } else if (action.domain === "statistics") {
    roles.push("H1");
    if (action.name.startsWith("create") && action.name.endsWith("Plot")) roles.unshift("H0");
    if (action.name.startsWith("edit") || action.name.startsWith("remove")) roles.push("H3");
  } else if (action.domain === "marks") {
    if (analyticMarkNames.has(action.name)) roles.push("H1");
    roles.push(action.name.startsWith("create") ? "H2" : "H3");
  } else if (action.domain === "encodings") {
    roles.push("H2");
    if (action.name.startsWith("edit") || action.name.startsWith("remove")) roles.push("H3");
  } else if (action.domain === "core") {
    roles.push(coreH3Names.has(action.name) ? "H3" : "H2");
  } else if (["axes", "grid", "legend_and_title", "mark-selection"].includes(action.domain)) {
    roles.push("H3");
  } else {
    throw new Error(`Authoring role classification is missing for ${action.name}.`);
  }
  return ROLE_ORDER.filter(role => roles.includes(role));
}

function referencedUpdateActions(action, actionNames) {
  return [...action.update.matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)]
    .map(match => match[1])
    .filter(name => actionNames.has(name));
}

export function editableVia(action, actionNames) {
  if (explicitFacadeEditors[action.name]) return explicitFacadeEditors[action.name];
  if (explicitLifecycleEditors[action.name]) return explicitLifecycleEditors[action.name];
  if (action.domain === "charts") return [];
  const candidates = [];
  if (action.name.startsWith("edit")) candidates.push(action.name);
  if (action.name.startsWith("create")) {
    const conventional = `edit${action.name.slice("create".length)}`;
    if (actionNames.has(conventional)) candidates.push(conventional);
  }
  candidates.push(...referencedUpdateActions(action, actionNames));
  if (action.domain === "encodings" && action.name.startsWith("encode") && actionNames.has("removeEncoding")) {
    candidates.push("removeEncoding");
  }
  return unique(candidates);
}

export function supportedEntryPoints(action, basicActionNames) {
  return basicActionNames.has(action.name) ? ["default", "basic"] : ["default"];
}

function includesNumber(type) {
  return /(?:^|[^A-Za-z])number(?:$|[^A-Za-z])/.test(type);
}

export function optionUnits(action, options) {
  const units = [];
  for (const option of options) {
    let unit;
    if (option.name === "temporalUnit") unit = "temporal-input";
    else if (action.name === "createTimeUnitData" && option.name === "unit") unit = "calendar-unit";
    else if (option.name === "rotation" && option.type.includes("RotationInput")) unit = "angle";
    else if ((option.name === "angle" || option.name === "padAngle") && includesNumber(option.type)) unit = "degree";
    else if (option.name === "innerRadius" && includesNumber(option.type)) unit = "ratio";
    else if (["createBoxPlot", "editBoxPlot", "createGradientPlot", "editGradientPlot"].includes(action.name) && option.name === "width") {
      unit = "band-fraction";
    } else if (action.name === "createBarPlot" && option.name === "width") {
      units.push({ path: option.name, unit: "logical-pixel" });
      unit = "band-fraction";
    } else if (["paddingInner", "paddingOuter"].includes(option.name) && includesNumber(option.type)) unit = "band-fraction";
    else if (option.name === "opacity" && includesNumber(option.type)) unit = "probability";
    else if (option.name === "bandwidth" && includesNumber(option.type)) unit = "data-value";
    else if ((countNames.has(option.name) || (action.name === "createGraphics" && option.name === "length")) && includesNumber(option.type)) unit = "count";
    else if (logicalPixelNames.has(option.name) && includesNumber(option.type)) {
      unit = ["createScale", "editScale"].includes(action.name) && option.name === "padding"
        ? "band-fraction"
        : "logical-pixel";
    }
    if (unit) units.push({ path: option.name, unit });
  }
  return units;
}

export function optionInference(action, options) {
  const inference = [];
  for (const option of options) {
    if (["parent", "before", "after"].includes(option.name)) {
      inference.push({ input: option.name, strategy: "explicit" });
    } else if (selectorInputs.has(option.name)) {
      inference.push({
        input: option.name,
        strategy: option.required ? "explicit" : "explicit-current-unique-or-error"
      });
    }
    if (option.type.includes('"auto"')) {
      inference.push({ input: option.name, strategy: "documented-auto" });
    }
  }
  if (
    ["create", "compose"].includes(operation(action.name)) &&
    options.some(option => !option.required && !selectorInputs.has(option.name))
  ) {
    inference.push({ input: "omitted optional options", strategy: "documented-default" });
  }
  return unique(inference.map(entry => JSON.stringify(entry))).map(JSON.parse);
}

export function completionRequirements(action, prerequisites) {
  let state = "contextual";
  if (action.layer === "primitive") state = "not-applicable";
  else if (["createBoxPlot", "createGradientPlot"].includes(action.name)) state = "deferred";
  else if (authoringRoles(action).includes("H0")) state = "complete";
  return {
    state,
    requires: state === "not-applicable" ? [] : prerequisites,
    allowsEmpty: emptyResultActions.has(action.name)
  };
}
