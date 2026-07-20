import { chart } from "../../src/index.js";

const ORIGIN_DOMAIN = Object.freeze(["USA", "Europe", "Japan"]);
const ORIGIN_COLORS = Object.freeze(["#4c78a8", "#f58518", "#54a24b"]);
const ERA_DOMAIN = Object.freeze(["1970–1976", "1977–1982"]);
const ERA_COLORS = Object.freeze(["#4c78a8", "#e45756"]);

const AXES = Object.freeze({
  x: Object.freeze({
    ticksAndLabels: Object.freeze({
      labels: Object.freeze({ fontSize: 13 })
    }),
    title: Object.freeze({ offset: 58, fontSize: 14 })
  }),
  y: Object.freeze({
    title: Object.freeze({ offset: 54, fontSize: 14 })
  })
});

const SPLIT_LEGEND = Object.freeze({
  position: "right",
  direction: "vertical",
  offset: 28,
  title: "Model era",
  symbol: Object.freeze({
    width: 16,
    height: 16,
    stroke: "white",
    strokeWidth: 0.75
  }),
  labels: Object.freeze({ offset: 10, fontSize: 13 }),
  titleStyle: Object.freeze({ fontSize: 14 }),
  itemGap: 42
});

const TITLE = Object.freeze({
  align: "center",
  offset: 4,
  gap: 11,
  titleStyle: Object.freeze({ fontSize: 24, fontWeight: 700 })
});

function carsWithEra(cars) {
  return cars.map(row => ({
    ...row,
    era: Number(String(row.Year).slice(0, 4)) <= 1976
      ? ERA_DOMAIN[0]
      : ERA_DOMAIN[1]
  }));
}

export function createCarsAccelerationViolins(cars, { split = false } = {}) {
  const values = split ? carsWithEra(cars) : cars;
  return chart()
    .createCanvas({
      width: split ? 760 : 720,
      height: 520,
      margin: split
        ? { top: 90, right: 165, bottom: 80, left: 80 }
        : { top: 90, right: 45, bottom: 80, left: 80 }
    })
    .createData({ values })
    .createViolinPlot({
      id: "violins",
      x: { field: "Origin", fieldType: "nominal" },
      y: { field: "Acceleration", fieldType: "quantitative" },
      ...(split
        ? {
            split: { field: "era", domain: ERA_DOMAIN },
            color: {
              field: "era",
              fieldType: "nominal",
              scale: { domain: ERA_DOMAIN, range: ERA_COLORS }
            }
          }
        : {
            color: {
              field: "Origin",
              fieldType: "nominal",
              scale: { domain: ORIGIN_DOMAIN, range: ORIGIN_COLORS }
            }
          }),
      density: {
        bandwidth: 0.65,
        extent: [8, 25],
        steps: 80,
        width: { band: 0.8, resolve: "shared" }
      },
      area: { opacity: 0.8, strokeWidth: 1.2 },
      guides: {
        axes: AXES,
        legend: split ? SPLIT_LEGEND : false
      }
    })
    .createTitle({
      text: "Acceleration Distribution by Origin",
      subtitle: split
        ? "Early models on the left, later models on the right"
        : "Kernel-density profiles for the Cars dataset",
      ...TITLE
    });
}
