import { chart } from "../../src/index.js";

export function createCarsParallelCoordinates(cars) {
  return chart()
    .createCanvas({
      width: 860,
      height: 500,
      margin: { top: 110, right: 160, bottom: 65, left: 78 }
    })
    .createData({ values: cars })
    .filterData({
      id: "cars1970",
      field: "Year",
      oneOf: ["1970-01-01"]
    })
    .createParallelCoordinates({
      dimensions: [
        {
          field: "Miles_per_Gallon",
          title: "MPG",
          scale: { nice: true, zero: false }
        },
        { field: "Horsepower", scale: { nice: true, zero: false } },
        {
          field: "Weight_in_lbs",
          title: "Weight (lb)",
          scale: { nice: true, zero: false }
        },
        { field: "Acceleration", scale: { nice: true, zero: false } }
      ],
      key: "Name",
      color: {
        field: "Origin",
        fieldType: "nominal",
        scale: { palette: "tableau10" }
      },
      line: { strokeWidth: 1.25, opacity: 0.48 },
      guides: {
        legend: {
          offset: 42,
          symbol: { length: 24, lineWidth: 3 },
          titleStyle: { color: "#1e293b" }
        }
      }
    })
    .createTitle({
      text: "Cars of 1970",
      subtitle: "Each path connects one car across four measurements",
      align: "center",
      offset: 1,
      gap: 9.5,
      titleStyle: { fontWeight: 700 },
      subtitleStyle: { fontSize: 13 }
    });
}
