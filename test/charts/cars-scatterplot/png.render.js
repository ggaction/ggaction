import test from "node:test";

import {
  createCarsScatterplot,
  createContinuousColorCarsScatterplot,
  createDiamondCarsScatterplot,
  createEncodingReassignmentCarsScatterplot,
  createFieldOpacityCarsScatterplot,
  createPaletteCarsScatterplot,
  createScaleReverseCarsScatterplot,
  createShapeVocabularyCarsScatterplot
} from "../../../examples/cars-scatterplot/program.js";
import { loadCars } from "../../support/data.js";
import { assertRenderedPNG } from "../../support/png.js";
import { createCarsScatterplotPrimitives } from "./primitive.program.js";
import {
  createCategoricalPalettePrimitives,
  createContinuousColorPrimitives,
  createEncodingReassignmentPrimitives,
  createFieldOpacityPrimitives,
  createPointShapeDiamondPrimitives,
  createScaleReversePrimitives,
  createShapeVocabularyPrimitives
} from "./variants/primitive-programs.js";
import {
  createShapeVocabularyPrimitiveValues
} from "./variants/reference-values.js";

const cars = loadCars();
const shapeRows = createShapeVocabularyPrimitiveValues(cars).rows;
const baselineArtifact = Object.freeze({
  roadmap: "roadmap2",
  chart: "cars-scatterplot",
  variant: "baseline",
  title: "Baseline",
  userFacingCallChain: `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  });`
});

const phase1Artifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "scale-reverse",
      title: "Reversed X Scale",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  })
  .editScale({ id: "x", reverse: true });`
    }),
    primitive: createScaleReversePrimitives(cars),
    userFacing: createScaleReverseCarsScatterplot(cars),
    width: 640,
    height: 400,
    colors: ["#4c78a8", "#f58518", "#e45756"]
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "point-shape-diamond",
      title: "Constant Diamond Points",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  })
  .editPointMark({ target: "points", shape: "diamond" });`
    }),
    primitive: createPointShapeDiamondPrimitives(cars),
    userFacing: createDiamondCarsScatterplot(cars),
    width: 640,
    height: 400,
    colors: ["#4c78a8", "#f58518", "#e45756"]
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "shape-vocabulary",
      title: "Twelve Point Shapes",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 860,
    height: 400,
    margin: { top: 30, right: 250, bottom: 60, left: 70 }
  })
  .createData({ id: "shapeCars", values: shapeRows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower", scale: { domain: [46, 230] } })
  .encodeY({ field: "Miles_per_Gallon", scale: { domain: [9, 46.6] } })
  .encodeRadius({ value: 7 })
  .encodeShape({
    field: "ShapeCategory",
    scale: { range: pointShapes }
  })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: {
      channels: ["shape"],
      title: "Shape",
      itemGap: 24,
      symbol: {
        layers: [
          {
            type: "point",
            size: 5,
            stroke: "white",
            strokeWidth: 0
          }
        ]
      }
    }
  });`
    }),
    primitive: createShapeVocabularyPrimitives(cars),
    userFacing: createShapeVocabularyCarsScatterplot(shapeRows),
    width: 860,
    height: 400,
    colors: ["#4c78a8"]
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "categorical-palette",
      title: "Set2 Categorical Palette",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 760,
    height: 400,
    margin: { top: 30, right: 150, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin", scale: { palette: "set2" } })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: { channels: ["color"] }
  });`
    }),
    primitive: createCategoricalPalettePrimitives(cars),
    userFacing: createPaletteCarsScatterplot(cars),
    width: 760,
    height: 400,
    colors: ["#66c2a5", "#fc8d62", "#8da0cb"]
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "encoding-reassignment",
      title: "Encoding Reassignment",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .createGuides({ axes: { x: {}, y: {} } })
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Acceleration" })
  .encodeColor({ field: "Cylinders", fieldType: "nominal" })
  .encodeSize({ field: "Weight_in_lbs" })
  .encodeShape({ field: "Origin" });`
    }),
    primitive: createEncodingReassignmentPrimitives(cars),
    userFacing: createEncodingReassignmentCarsScatterplot(cars),
    width: 640,
    height: 400,
    colors: ["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b"]
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "continuous-color-gradient",
      title: "Continuous Acceleration Color",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 760,
    height: 400,
    margin: { top: 30, right: 150, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Acceleration", fieldType: "quantitative" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: { channels: ["color"] }
  });`
    }),
    primitive: createContinuousColorPrimitives(cars),
    userFacing: createContinuousColorCarsScatterplot(cars),
    width: 760,
    height: 400,
    colors: ["#440154", "#fde725"]
  }),
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "field-opacity-legend",
      title: "Field-driven Acceleration Opacity",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 760,
    height: 400,
    margin: { top: 30, right: 150, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeRadius({ value: 4 })
  .encodeOpacity({ field: "Acceleration" })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: { channels: ["opacity"] }
  });`
    }),
    primitive: createFieldOpacityPrimitives(cars),
    userFacing: createFieldOpacityCarsScatterplot(cars),
    width: 760,
    height: 400,
    colors: ["#4c78a8"]
  })
]);

test("renders the public and primitive scatterplots with visible points", async () => {
  const programs = [
    [
      "cars-scatterplot",
      "user-facing",
      createCarsScatterplot(cars),
      ["#4c78a8", "#f58518", "#e45756"]
    ],
    [
      "cars-scatterplot-primitives",
      "primitive",
      createCarsScatterplotPrimitives(cars),
      ["#4c78a8", "#f58518", "#e45756"]
    ]
  ];

  for (const [name, , program, colors] of programs) {
    await assertRenderedPNG(program, {
      name,
      width: 640,
      height: 400,
      colors
    });
  }

  for (const [, kind, program, colors] of programs) {
    await assertRenderedPNG(program, {
      artifact: {
        ...baselineArtifact,
        kind
      },
      width: 640,
      height: 400,
      colors
    });
  }

  for (const { primitive, userFacing, ...options } of phase1Artifacts) {
    const programsByKind = [["primitive", primitive]];
    if (userFacing !== undefined) {
      programsByKind.push(["user-facing", userFacing]);
    }
    for (const [kind, program] of programsByKind) {
      await assertRenderedPNG(program, {
        ...options,
        artifact: { ...options.artifact, kind }
      });
    }
  }
});
