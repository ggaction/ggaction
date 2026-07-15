import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars } from "../../../support/data.js";
import {
  createEncodedLayerInferencePrimitives,
  createErrorBarBaselinePrimitives,
  createRuleGeometryPrimitives
} from "../primitive.program.js";
import {
  createExplicitIntervalPrimitives,
  createHorizontalErrorBarPrimitives,
  createStyledCapsPrimitives
} from "../gate-c.program.js";
import {
  createEncodedLayerInferenceProgram,
  createErrorBarProgram,
  createExplicitIntervalProgram,
  createHorizontalErrorBarProgram,
  createRuleGeometryProgram,
  createStyledCapsProgram
} from "../public.program.js";
import {
  ERROR_BAR_COLOR,
  ERROR_BAR_LAYOUT,
  RULE_GEOMETRY_COLORS,
  RULE_GEOMETRY_LAYOUT
} from "../reference-values.js";

const ruleGeometryCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 50, left: 80 }
  })
  .createData({ values: ruleRows })
  .createRuleMark({ id: "verticalSpan" })
  .encodeX({
    target: "verticalSpan",
    datum: 15,
    fieldType: "quantitative",
    scale: { domain: [0, 100] }
  })
  .encodeStroke({ target: "verticalSpan", value: "#4c78a8" })
  .encodeStrokeWidth({ target: "verticalSpan", value: 3 })
  .createRuleMark({ id: "horizontalSpan" })
  .encodeY({
    target: "horizontalSpan",
    datum: 82,
    fieldType: "quantitative",
    scale: { domain: [0, 100] }
  })
  .encodeStroke({ target: "horizontalSpan", value: "#f58518" })
  .encodeStrokeWidth({ target: "horizontalSpan", value: 3 })
  .createRuleMark({ id: "verticalInterval" })
  .encodeX({ target: "verticalInterval", datum: 38, fieldType: "quantitative" })
  .encodeY({ target: "verticalInterval", datum: 18, fieldType: "quantitative" })
  .encodeY2({ target: "verticalInterval", datum: 66, fieldType: "quantitative" })
  .encodeStroke({ target: "verticalInterval", value: "#54a24b" })
  .encodeStrokeWidth({ target: "verticalInterval", value: 3 })
  .createRuleMark({ id: "horizontalInterval" })
  .encodeY({ target: "horizontalInterval", datum: 38, fieldType: "quantitative" })
  .encodeX({ target: "horizontalInterval", datum: 52, fieldType: "quantitative" })
  .encodeX2({ target: "horizontalInterval", datum: 88, fieldType: "quantitative" })
  .encodeStroke({ target: "horizontalInterval", value: "#e45756" })
  .encodeStrokeWidth({ target: "horizontalInterval", value: 3 })
  .createRuleMark({ id: "diagonalInterval" })
  .encodeX({ target: "diagonalInterval", field: "xStart", fieldType: "quantitative" })
  .encodeY({ target: "diagonalInterval", field: "yStart", fieldType: "quantitative" })
  .encodeX2({ target: "diagonalInterval", field: "xEnd", fieldType: "quantitative" })
  .encodeY2({ target: "diagonalInterval", field: "yEnd", fieldType: "quantitative" })
  .encodeStroke({ target: "diagonalInterval", value: "#b279a2" })
  .encodeStrokeWidth({ target: "diagonalInterval", value: 3 })
  .createTitle({
    text: "Rule geometry primitives",
    subtitle: "Full-span, bounded, and diagonal endpoints"
  });`;

const baselineCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBar({
    x: {
      field: "Origin",
      fieldType: "nominal"
    },
    y: {
      field: "Acceleration"
    }
  })
  .createGuides()
  .createTitle({
    text: "Mean Acceleration by Origin",
    subtitle: "95% confidence intervals"
  });`;

const encodedLayerInferenceCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createPointMark()
  .encodeX({ field: "Origin", fieldType: "ordinal" })
  .encodeY({ field: "Acceleration" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .encodeOpacity({ value: 0.18 })
  .createErrorBar()
  .createGuides()
  .createTitle({
    text: "Acceleration by Origin",
    subtitle: "Observations and 95% mean confidence intervals"
  });`;

const horizontalCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBar({
    x: { field: "Horsepower" },
    y: { field: "Origin", fieldType: "nominal" }
  })
  .createGuides()
  .createTitle({
    text: "Mean Horsepower by Origin",
    subtitle: "95% confidence intervals"
  });`;

const explicitIntervalCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: originAccelerationIntervals })
  .createErrorBar({
    x: { field: "Origin", fieldType: "nominal" },
    y: {
      center: "meanAcceleration",
      lower: "lowerAcceleration",
      upper: "upperAcceleration"
    },
    caps: false
  })
  .createGuides()
  .createTitle({
    text: "Explicit Acceleration Intervals",
    subtitle: "Existing lower and upper fields; caps disabled"
  });`;

const styledCapsCallChain = `chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 90, right: 40, bottom: 70, left: 80 }
  })
  .createData({ values: cars })
  .createErrorBar({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" },
    capSize: 16,
    stroke: "#d9485f",
    strokeWidth: 3,
    strokeDash: [8, 4],
    opacity: 0.8
  })
  .createGuides()
  .createTitle({
    text: "Styled Acceleration Intervals",
    subtitle: "16px caps with custom rule appearance"
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "rule-geometry",
    title: "Rule Geometry",
    callChain: ruleGeometryCallChain,
    primitive: createRuleGeometryPrimitives(),
    userFacing: createRuleGeometryProgram(),
    width: RULE_GEOMETRY_LAYOUT.width,
    height: RULE_GEOMETRY_LAYOUT.height,
    colors: RULE_GEOMETRY_COLORS,
    regions: [
      { name: "plot", x: 80, y: 90, width: 600, height: 320 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "baseline",
    title: "Mean Acceleration Error Bars",
    callChain: baselineCallChain,
    primitive: createErrorBarBaselinePrimitives(loadCars()),
    userFacing: createErrorBarProgram(loadCars()),
    width: ERROR_BAR_LAYOUT.width,
    height: ERROR_BAR_LAYOUT.height,
    colors: [ERROR_BAR_COLOR],
    regions: [
      { name: "plot", x: 80, y: 90, width: 600, height: 300 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "encoded-layer-inference",
    title: "Encoded Layer Error-Bar Inference",
    callChain: encodedLayerInferenceCallChain,
    primitive: createEncodedLayerInferencePrimitives(loadCars()),
    userFacing: createEncodedLayerInferenceProgram(loadCars()),
    width: ERROR_BAR_LAYOUT.width,
    height: ERROR_BAR_LAYOUT.height,
    colors: [ERROR_BAR_COLOR],
    regions: [
      { name: "plot", x: 80, y: 90, width: 600, height: 300 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "horizontal",
    title: "Horizontal Horsepower Error Bars",
    callChain: horizontalCallChain,
    primitive: createHorizontalErrorBarPrimitives(loadCars()),
    userFacing: createHorizontalErrorBarProgram(loadCars()),
    width: ERROR_BAR_LAYOUT.width,
    height: ERROR_BAR_LAYOUT.height,
    colors: [ERROR_BAR_COLOR],
    regions: [
      { name: "plot", x: 80, y: 90, width: 600, height: 300 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "explicit-interval",
    title: "Explicit Error-Bar Intervals",
    callChain: explicitIntervalCallChain,
    primitive: createExplicitIntervalPrimitives(loadCars()),
    userFacing: createExplicitIntervalProgram(loadCars()),
    width: ERROR_BAR_LAYOUT.width,
    height: ERROR_BAR_LAYOUT.height,
    colors: [ERROR_BAR_COLOR],
    regions: [
      { name: "plot", x: 80, y: 90, width: 600, height: 300 }
    ]
  }),
  defineVisualVariant({
    chart: "cars-error-bar",
    variant: "styled-caps",
    title: "Styled Error-Bar Caps",
    callChain: styledCapsCallChain,
    primitive: createStyledCapsPrimitives(loadCars()),
    userFacing: createStyledCapsProgram(loadCars()),
    width: ERROR_BAR_LAYOUT.width,
    height: ERROR_BAR_LAYOUT.height,
    colors: ["#e16d7f"],
    regions: [
      { name: "plot", x: 80, y: 90, width: 600, height: 300 }
    ]
  })
]);
