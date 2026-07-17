import { createCarsStyledFactorPrimitives } from
  "../../charts/cars-box-plot/variants/options/primitive.program.js";
import { createStyledCapsPrimitives } from
  "../../charts/cars-error-bar/variants/error-bar-modes.primitive.program.js";
import { createCarsHistogramPrimitives } from
  "../../charts/cars-histogram/primitive.program.js";
import { createGroupReassignmentPrimitives } from
  "../../charts/cars-line-chart/variants/primitive-programs.js";
import {
  createLeftLegendPrimitives,
  createPolynomialRegressionPrimitives
} from "../../charts/cars-regression-scatterplot/variants/primitive-programs.js";
import {
  createCategoricalPalettePrimitives,
  createMirroredAxesPrimitives
} from "../../charts/cars-scatterplot/variants/primitive-programs.js";
import { createGapminderCurvedBoundaryPrimitives } from
  "../../charts/gapminder-error-band/variants/curved-boundary.primitive.program.js";
import { createGapminderBandPointPrimitives } from
  "../../charts/gapminder-temporal-discrete-scales/primitive.program.js";
import { createJobsGroupedBarPrimitives } from
  "../../charts/jobs-grouped-bar/primitive.program.js";

function repeated(length, value) {
  return Array.from({ length }, () => value);
}

function removeGraphics(program, targets) {
  return targets.reduce((next, target) => next.editGraphics({
    target,
    remove: true
  }), program);
}

function removeSemanticProperties(program, properties) {
  return properties.reduce((next, property) => next.editSemantic({
    property,
    remove: true
  }), program);
}

export function createPointScaleErgonomicsPrimitives(cars) {
  return createCategoricalPalettePrimitives(cars)
    .editSemantic({
      property: "guide.axis.y.title",
      value: "Miles_per_Gallon"
    })
    .editGraphics({
      target: "yAxisTitle",
      property: "text",
      value: "Miles_per_Gallon"
    })
    .editGraphics({ target: "points", property: "opacity", value: 0.48 })
    .editGraphics({ target: "points", property: "stroke", value: "white" })
    .editGraphics({ target: "points", property: "strokeWidth", value: 1.25 });
}

export function createBarErgonomicsPrimitives(jobs) {
  return createJobsGroupedBarPrimitives(jobs)
    .editGraphics({ target: "bars", property: "opacity", value: 0.78 })
    .editGraphics({ target: "bars", property: "stroke", value: "#0f172a" })
    .editGraphics({ target: "bars", property: "strokeWidth", value: 1.25 });
}

export function createLineErgonomicsPrimitives(cars) {
  return createGroupReassignmentPrimitives(cars)
    .editGraphics({ target: "trends", property: "stroke", value: "#7c3aed" })
    .editGraphics({ target: "trends", property: "opacity", value: 0.55 });
}

export function createFocusedLegendPrimitives(cars) {
  return createLeftLegendPrimitives(cars);
}

export function createCartesianGuideFacadePrimitives(cars) {
  const program = createMirroredAxesPrimitives(cars);
  const count = program.graphicSpec.objects.horizontalGridLines.items.length;
  return program
    .editGraphics({
      target: "horizontalGridLines",
      property: "stroke",
      value: "#cbd5e1"
    })
    .editGraphics({
      target: "horizontalGridLines",
      property: "strokeDash",
      value: repeated(count, [4, 4])
    });
}

export function createErrorBarEditPrimitives(cars) {
  return createStyledCapsPrimitives(cars);
}

export function createErrorBandEditPrimitives(gapminder) {
  return createGapminderCurvedBoundaryPrimitives(gapminder)
    .editGraphics({ target: "errorBand", property: "fill", value: "#7dd3fc" })
    .editGraphics({ target: "errorBand", property: "opacity", value: 0.34 })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "stroke",
      value: "#0369a1"
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "stroke",
      value: "#0369a1"
    })
    .editGraphics({
      target: "errorBandLowerBoundary",
      property: "strokeWidth",
      value: 2
    })
    .editGraphics({
      target: "errorBandUpperBoundary",
      property: "strokeWidth",
      value: 2
    });
}

export function createRegressionEditPrimitives(cars) {
  return createPolynomialRegressionPrimitives(cars)
    .editGraphics({
      target: "pointsRegressionBands",
      property: "fill",
      value: "#a78bfa"
    })
    .editGraphics({
      target: "pointsRegressionBands",
      property: "opacity",
      value: 0.16
    })
    .editGraphics({
      target: "pointsRegressionLines",
      property: "strokeWidth",
      value: 4
    });
}

export function createBoxPlotEditPrimitives(cars) {
  return createCarsStyledFactorPrimitives(cars);
}

export function createGuideRemovalPrimitives(cars) {
  let program = createCarsHistogramPrimitives(cars);
  program = removeSemanticProperties(program, [
    "guide.axis.x.scale",
    "guide.axis.x.coordinate",
    "guide.axis.x.title",
    "guide.axis.y.scale",
    "guide.axis.y.coordinate",
    "guide.axis.y.title",
    "guide.grid.horizontal.scale",
    "guide.grid.horizontal.coordinate",
    "guide.legend.color",
    "title.text",
    "title.subtitle"
  ]);
  program = removeGraphics(program, [
    "horizontalGridLines",
    "xAxisLine",
    "xAxisTicks",
    "xAxisLabels",
    "xAxisTitle",
    "yAxisLine",
    "yAxisTicks",
    "yAxisLabels",
    "yAxisTitle",
    "colorLegendSymbols",
    "colorLegendLabels",
    "colorLegendTitle",
    "chartTitle",
    "chartSubtitle"
  ]);
  return program._withoutMaterializationConfig(["title"]);
}

export function createMarkRemovalPrimitives(gapminder) {
  let program = createGapminderBandPointPrimitives(gapminder);
  const compactPopulationLabels = program.graphicSpec.objects.yAxisLabels.items.map(
    item => Number(item.properties.text).toExponential(2)
  );
  program = program.editGraphics({
    target: "yAxisLabels",
    property: "text",
    value: compactPopulationLabels
  });
  program = program.editGraphics({
    target: "yAxisTitle",
    property: "x",
    value: 12
  });
  program = removeSemanticProperties(program, [
    "layer[point].mark.type",
    "layer[point].data",
    "layer[point].coordinate",
    "layer[point].encoding.x.field",
    "layer[point].encoding.x.fieldType",
    "layer[point].encoding.x.scale",
    "layer[point].encoding.y.field",
    "layer[point].encoding.y.fieldType",
    "layer[point].encoding.y.scale"
  ]);
  return program.editGraphics({ target: "point", remove: true });
}
