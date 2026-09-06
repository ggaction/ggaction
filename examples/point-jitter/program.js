import { chart } from "../../src/index.js";

function carsJitterRows(cars) {
  const limits = new Map([["USA", 26], ["Europe", 26], ["Japan", 26]]);
  const counts = new Map([...limits.keys()].map(key => [key, 0]));
  const names = new Set();
  const rows = [];
  for (const row of cars) {
    if (
      !limits.has(row?.Origin) ||
      typeof row?.Name !== "string" ||
      names.has(row.Name) ||
      !Number.isFinite(row?.Acceleration) ||
      counts.get(row.Origin) >= limits.get(row.Origin)
    ) continue;
    rows.push(row);
    names.add(row.Name);
    counts.set(row.Origin, counts.get(row.Origin) + 1);
  }
  return rows;
}

function gapminderJitterRows(gapminder) {
  return gapminder.filter(row =>
    row?.year === 2005 &&
    typeof row?.country === "string" &&
    Number.isFinite(row?.cluster) &&
    Number.isFinite(row?.life_expect)
  );
}

export function createCarsOriginJitter(cars) {
  const rows = carsJitterRows(cars);
  return chart()
    .createCanvas({
      width: 640,
      height: 440,
      margin: { top: 40, right: 30, bottom: 70, left: 70 }
    })
    .createData({ id: "cars-jitter", values: rows })
    .createStripPlot({
      id: "observations",
      data: "cars-jitter",
      x: {
        field: "Origin",
        fieldType: "nominal",
        scale: { domain: ["USA", "Europe", "Japan"] }
      },
      y: {
        field: "Acceleration",
        fieldType: "quantitative",
        scale: { domain: [7, 25], zero: false }
      },
      point: { radius: 3.4, fill: "#4c78a8", opacity: 0.58 },
      jitter: {
        maxOffset: { band: 0.168 },
        seed: "cars-origin-strip",
        key: "Name"
      },
      guides: {
        axes: {
          x: { title: { text: "Origin" } },
          y: { title: { text: "Acceleration" } }
        },
        grid: { horizontal: true, vertical: false },
        legend: false
      }
    });
}

export function createGapminderClusterJitter(gapminder) {
  const rows = gapminderJitterRows(gapminder);
  return chart()
    .createCanvas({
      width: 680,
      height: 460,
      margin: { top: 40, right: 30, bottom: 70, left: 80 }
    })
    .createData({ id: "gapminder-jitter", values: rows })
    .createStripPlot({
      id: "observations",
      data: "gapminder-jitter",
      x: {
        field: "life_expect",
        fieldType: "quantitative",
        scale: { domain: [45, 85], zero: false }
      },
      y: {
        field: "cluster",
        fieldType: "nominal",
        scale: { domain: [0, 1, 2, 3, 4, 5] }
      },
      point: { radius: 3.4, fill: "#e45756", opacity: 0.62 },
      jitter: {
        maxOffset: { band: 0.16 },
        seed: "gapminder-cluster-strip",
        key: "country"
      },
      guides: {
        axes: {
          x: { title: { text: "Life expectancy" } },
          y: { title: { text: "Cluster" } }
        },
        grid: { horizontal: false, vertical: true },
        legend: false
      }
    });
}
