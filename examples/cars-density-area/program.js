import { chart } from "../../src/index.js";

export function createCarsDensityArea(cars) {
  return chart()
    .createCanvas({
      width: 720,
      height: 500,
      margin: { top: 130, right: 40, bottom: 70, left: 80 }
    })
    .createData({ id: "cars", values: cars })
    .createAreaMark({ id: "densities", opacity: 0.5 })
    .encodeDensity({
      field: "Acceleration",
      groupBy: "Origin",
      bandwidth: 0.6
    })
    .encodeColor({
      field: "Origin",
      scale: { palette: "tableau10" }
    })
    .createGuides({
      grid: { horizontal: {}, vertical: {} },
      legend: {
        position: "top",
        direction: "vertical",
        columns: 3,
        titlePosition: "left",
        offset: 8
      }
    })
    .createTitle({
      text: "Distribution of Acceleration",
      subtitle: "By Origin (cars dataset)"
    });
}

export function createAreaOutlineEditCarsDensityArea(cars) {
  return createCarsDensityArea(cars)
    .editAreaMark({
      target: "densities",
      opacity: 0.35,
      stroke: "#334155",
      strokeWidth: 1.5
    });
}
