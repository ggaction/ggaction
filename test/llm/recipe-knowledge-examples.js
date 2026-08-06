import { hconcat, vconcat } from "../../src/index.js";
import { action } from "../../src/extension.js";

import { actionExamples } from "./action-knowledge-examples.js";

const focusedGroups = Object.freeze({
  "cartesian-guide-lifecycle": Object.freeze([
    "createAxes", "createXAxis", "createXAxisLabels", "createXAxisLine", "createXAxisTicks",
    "createXAxisTicksAndLabels", "createXAxisTitle", "createYAxis", "createYAxisLabels",
    "createYAxisLine", "createYAxisTicks", "createYAxisTicksAndLabels", "createYAxisTitle",
    "editXAxis", "editXAxisLabels", "editXAxisLine", "editXAxisTicks", "editXAxisTicksAndLabels",
    "editXAxisTitle", "editYAxis", "editYAxisLabels", "editYAxisLine", "editYAxisTicks",
    "editYAxisTicksAndLabels", "editYAxisTitle", "removeXAxis", "removeYAxis"
  ]),
  "polar-guide-lifecycle": Object.freeze([
    "createThetaAxis", "createRadialAxis", "editThetaAxis", "editThetaAxisLabels",
    "editThetaAxisLine", "editThetaAxisTicks", "editThetaAxisTitle", "editRadialAxis",
    "editRadialAxisLabels", "editRadialAxisLine", "editRadialAxisTicks", "editRadialAxisTitle",
    "removeThetaAxis", "removeRadialAxis"
  ]),
  "grid-lifecycle": Object.freeze([
    "createGrid", "createHorizontalGrid", "createVerticalGrid", "createThetaGrid", "createRadialGrid",
    "editGrid", "editHorizontalGrid", "editVerticalGrid", "editThetaGrid", "editRadialGrid", "removeGrid"
  ]),
  "legend-title-lifecycle": Object.freeze([
    "editLegend", "editLegendBorder", "editLegendLabels", "editLegendLayout", "editLegendSymbols",
    "editLegendTitle", "removeLegend", "editTitle", "removeTitle"
  ]),
  "derived-data-workflows": Object.freeze([
    "createDerivedData", "createDensityData", "createRegressionData", "createIntervalData",
    "createBin2DData", "editBin2DData"
  ]),
  "resource-and-facet-policies": Object.freeze([
    "createCoordinate", "createScale", "editCanvas", "editFacetGuides", "editFacetScales"
  ]),
  "ranged-and-specialized-encodings": Object.freeze([
    "encodeParallelCoordinates", "encodeXRange", "encodeYRange", "encodeYOffset", "removeEncoding",
    "removePathOrder", "removePointRadius", "editHorizon"
  ]),
  "mark-lifecycle": Object.freeze([
    "createRectMark", "editArcMark", "editRectMark", "editTextMark", "editTickMark", "removeJitter",
    "removeLabelLayout", "removeMark"
  ]),
  "selection-lifecycle": Object.freeze([
    "selectMarks", "editMarkSelection", "removeMarkHighlight", "removeMarkSelection"
  ]),
  "statistical-owner-revisions": Object.freeze([
    "createRegressionLine", "createRegressionBand", "editRegression", "editErrorBar", "editErrorBand",
    "editErrorBandBoundary", "editBoxPlot", "editGradientPlot"
  ])
});

const extensionActions = Object.freeze(["editSemantic", "createGraphics", "editGraphics"]);

const addExtensionBadge = action(
  {
    op: "addExtensionBadge",
    description: "Add one extension-owned semantic assignment and badge graphic."
  },
  function () {
    return this
      .editSemantic({
        property: "layer[points].encoding.opacity.field",
        value: "value"
      })
      .createGraphics({ id: "extensionBadge", parent: "canvas", type: "text" })
      .editGraphics({ target: "extensionBadge", property: "x", value: 16 })
      .editGraphics({ target: "extensionBadge", property: "y", value: 20 })
      .editGraphics({ target: "extensionBadge", property: "text", value: "Extension-owned" })
      .editGraphics({ target: "extensionBadge", property: "fill", value: "#334155" });
  }
);

function extensionDomainAction() {
  const base = actionExamples.selectMarks();
  return addExtensionBadge.call(base);
}

function actionGallery(recipeId, names) {
  const rows = [];
  for (let index = 0; index < names.length; index += 4) {
    const programs = names.slice(index, index + 4).map(name => ({
        id: `${recipeId}-${name}`,
        program: actionExamples[name]()
      }));
    rows.push(programs.length === 1
      ? programs[0].program
      : hconcat({ programs, gap: 8, padding: 8 }));
  }
  return rows.length === 1
    ? rows[0]
    : vconcat({
        programs: rows.map((program, index) => ({ id: `${recipeId}-row-${index + 1}`, program })),
        gap: 8,
        padding: 8
      });
}

export const focusedRecipeActions = Object.freeze({
  ...focusedGroups,
  "extension-domain-action": extensionActions
});

export const recipeExamples = Object.freeze({
  ...Object.fromEntries(
    Object.entries(focusedGroups).map(([id, names]) => [id, () => actionGallery(id, names)])
  ),
  "extension-domain-action": extensionDomainAction
});
