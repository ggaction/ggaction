import {
  createCarsScatterplot,
  createContinuousColorCarsScatterplot,
  createDiamondCarsScatterplot,
  createEncodingReassignmentCarsScatterplot,
  createFieldOpacityCarsScatterplot,
  createMirroredAxesCarsScatterplot,
  createPaletteCarsScatterplot,
  createScaleReverseCarsScatterplot,
  createShapeVocabularyCarsScatterplot
} from "../../../../examples/cars-scatterplot/program.js";
import { loadCars } from "../../../support/data.js";
import { defineVisualVariant } from "../../../support/visual-variants.js";
import { createCarsScatterplotPrimitives } from "../primitive.program.js";
import {
  createCategoricalPalettePrimitives,
  createContinuousColorPrimitives,
  createEncodingReassignmentPrimitives,
  createFieldOpacityPrimitives,
  createMirroredAxesPrimitives,
  createPointShapeDiamondPrimitives,
  createScaleReversePrimitives,
  createShapeVocabularyPrimitives
} from "./primitive-programs.js";
import {
  createShapeVocabularyPrimitiveValues
} from "./reference-values.js";

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
  .createScatterPlot({
    id: "points",
    x: "Horsepower",
    y: "Miles_per_Gallon",
    color: "Origin",
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      }
    }
  });`
});

const scatterArtifacts = Object.freeze([
  Object.freeze({
    artifact: Object.freeze({
      roadmap: "roadmap2",
      chart: "cars-scatterplot",
      variant: "mirrored-axes-format",
      title: "Top X and Right Y Axes",
      userFacingCallChain: `chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 80, right: 90, bottom: 30, left: 30 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: {
        position: "top",
        ticksAndLabels: {
          labels: { offset: 12, format: ".1f" }
        },
        title: { text: "Horsepower", offset: 62 }
      },
      y: {
        position: "right",
        ticksAndLabels: {
          labels: { offset: 12, format: ".1f" }
        },
        title: { text: "Miles per Gallon", offset: 70 }
      }
    }
  });`
    }),
    primitive: () => createMirroredAxesPrimitives(cars),
    userFacing: () => createMirroredAxesCarsScatterplot(cars),
    width: 640,
    height: 400,
    colors: ["#4c78a8", "#f58518", "#e45756"]
  }),
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
  .createScatterPlot({
    id: "points",
    x: "Horsepower",
    y: "Miles_per_Gallon",
    color: "Origin",
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      }
    }
  })
  .editScale({ id: "x", reverse: true });`
    }),
    primitive: () => createScaleReversePrimitives(cars),
    userFacing: () => createScaleReverseCarsScatterplot(cars),
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
  .createScatterPlot({
    id: "points",
    x: "Horsepower",
    y: "Miles_per_Gallon",
    color: "Origin",
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per Gallon" } }
      }
    }
  })
  .editPointMark({ target: "points", shape: "diamond" });`
    }),
    primitive: () => createPointShapeDiamondPrimitives(cars),
    userFacing: () => createDiamondCarsScatterplot(cars),
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
    primitive: () => createShapeVocabularyPrimitives(cars),
    userFacing: () => createShapeVocabularyCarsScatterplot(shapeRows),
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
    primitive: () => createCategoricalPalettePrimitives(cars),
    userFacing: () => createPaletteCarsScatterplot(cars),
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
    primitive: () => createEncodingReassignmentPrimitives(cars),
    userFacing: () => createEncodingReassignmentCarsScatterplot(cars),
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
    primitive: () => createContinuousColorPrimitives(cars),
    userFacing: () => createContinuousColorCarsScatterplot(cars),
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
    primitive: () => createFieldOpacityPrimitives(cars),
    userFacing: () => createFieldOpacityCarsScatterplot(cars),
    width: 760,
    height: 400,
    colors: ["#4c78a8"]
  })
]);

const PLOT_REGION = Object.freeze([Object.freeze({
  name: "plot",
  x: 70,
  y: 30,
  width: 540,
  height: 310,
  minimumInkPixels: 50
})]);

const MIRRORED_REGIONS = Object.freeze([
  Object.freeze({
    name: "plot",
    x: 30,
    y: 80,
    width: 520,
    height: 290,
    minimumInkPixels: 50
  }),
  Object.freeze({
    name: "top-axis",
    x: 20,
    y: 5,
    width: 540,
    height: 75,
    minimumInkPixels: 20
  }),
  Object.freeze({
    name: "right-axis",
    x: 550,
    y: 60,
    width: 90,
    height: 310,
    minimumInkPixels: 20
  })
]);

function fromArtifact(entry) {
  return defineVisualVariant({
    chart: "cars-scatterplot",
    variant: entry.artifact.variant,
    title: entry.artifact.title,
    callChain: entry.artifact.userFacingCallChain,
    primitive: entry.primitive,
    userFacing: entry.userFacing,
    width: entry.width,
    height: entry.height,
    colors: entry.colors,
    regions: entry.artifact.variant === "mirrored-axes-format"
      ? MIRRORED_REGIONS
      : PLOT_REGION
  });
}

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "cars-scatterplot",
    variant: baselineArtifact.variant,
    title: baselineArtifact.title,
    callChain: baselineArtifact.userFacingCallChain,
    primitive: () => createCarsScatterplotPrimitives(cars),
    userFacing: () => createCarsScatterplot(cars),
    width: 640,
    height: 400,
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: PLOT_REGION
  }),
  ...scatterArtifacts.map(fromArtifact)
]);
