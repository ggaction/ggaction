import { chart } from "../../src/index.js";

export function createGapminderErrorBand(gapminder) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 90, right: 150, bottom: 70, left: 80 }
    })
    .createData({ values: gapminder })
    .createErrorBand({
      x: { field: "year", fieldType: "temporal" },
      y: { field: "life_expect" },
      groupBy: "cluster"
    })
    .encodeColor({
      target: "errorBand",
      field: "cluster",
      fieldType: "nominal",
      scale: { palette: "tableau10" }
    })
    .createGuides()
    .createTitle({
      text: "Life Expectancy by Cluster",
      subtitle: "Mean and 95% confidence interval"
    });
}

export function createCarsHorizontalErrorBand(cars) {
  return chart()
    .createCanvas({
      width: 760,
      height: 480,
      margin: { top: 90, right: 50, bottom: 70, left: 80 }
    })
    .createData({ values: cars })
    .createErrorBand({
      x: { field: "Acceleration", extent: "ci" },
      y: { field: "Year", fieldType: "temporal" },
      boundaries: { stroke: "#355f8a", strokeWidth: 1.5 }
    })
    .createGuides()
    .createTitle({
      text: "Acceleration over Time",
      subtitle: "Mean and 95% confidence interval across cars"
    });
}
