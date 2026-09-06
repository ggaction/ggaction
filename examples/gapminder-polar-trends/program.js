import { chart } from "../../src/index.js";

const COUNTRIES = Object.freeze(["India", "Japan", "South Africa"]);

export function createGapminderPolarTrendRows(gapminder) {
  if (!Array.isArray(gapminder)) {
    throw new TypeError("Gapminder Polar trends require rows.");
  }
  return gapminder.filter(row =>
    COUNTRIES.includes(row?.country) &&
    Number.isFinite(row?.year) &&
    row.year >= 1955 &&
    row.year <= 2005 &&
    Number.isFinite(row?.life_expect)
  );
}

export function createGapminderPolarTrends(gapminder) {
  const trendRows = createGapminderPolarTrendRows(gapminder);
  return chart()
    .createCanvas({
      width: 760,
      height: 620,
      margin: { top: 70, right: 190, bottom: 70, left: 70 }
    })
    .createData({ values: trendRows })
    .createPolarLinePlot({
      id: "line",
      theta: {
        field: "year",
        scale: { domain: [1955, 2005], range: [0, 330] }
      },
      radius: {
        field: "life_expect",
        scale: { domain: [25, 85], zero: false }
      },
      groupBy: "country",
      color: { field: "country", palette: "tableau10" },
      line: { strokeWidth: 2.5, opacity: 0.88 },
      guides: {
        axes: {
          theta: {
            ticksAndLabels: {
              values: [1955, 1965, 1975, 1985, 1995, 2005]
            },
            title: { text: "Year" }
          },
          radius: {
            ticksAndLabels: { values: [30, 40, 50, 60, 70, 80] },
            title: { text: "Life expectancy" }
          }
        },
        grid: {
          theta: { values: [1955, 1965, 1975, 1985, 1995, 2005] },
          radial: { values: [30, 40, 50, 60, 70, 80] }
        },
        legend: { position: "right" }
      }
    });
}
