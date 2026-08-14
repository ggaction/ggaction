import { chart } from "../../src/index.js";

const COUNTRIES = Object.freeze([
  "China",
  "India",
  "United States",
  "Indonesia",
  "Brazil",
  "Pakistan",
  "Bangladesh",
  "Nigeria"
]);

function baseProgram(gapminder, color) {
  return chart()
    .createCanvas({
      width: 680,
      height: 380,
      margin: { top: 58, right: 125, bottom: 72, left: 106 }
    })
    .createData({ id: "gapminder", values: gapminder })
    .filterData({
      id: "recent",
      field: "year",
      range: { min: 1995, max: 2005 }
    })
    .filterData({
      id: "focus",
      field: "country",
      oneOf: COUNTRIES
    })
    .createBarMark()
    .encodeX({
      field: "country",
      fieldType: "nominal",
      scale: { domain: COUNTRIES }
    })
    .encodeY({
      field: "pop",
      fieldType: "quantitative",
      aggregate: "sum",
      stack: null,
      scale: { domain: [0, 4_000_000_000] }
    })
    .encodeColor(color)
    .encodeBarWidth({ band: 0.72 });
}

function addGuides(program, legendTitle) {
  return program.createGuides({
    axes: {
      x: {
        ticksAndLabels: {
          ticks: { length: 4 },
          labels: { offset: 10, fontSize: 10 }
        },
        title: { text: "Country", offset: 56, fontSize: 12 }
      },
      y: {
        ticksAndLabels: {
          values: [0, 1e9, 2e9, 3e9, 4e9],
          ticks: { length: 4 },
          labels: { offset: 8, fontSize: 10 }
        },
        title: {
          text: "sum(pop), 1995–2005",
          offset: 90,
          fontSize: 12
        }
      }
    },
    grid: { horizontal: {}, vertical: false },
    legend: {
      title: legendTitle,
      position: "right",
      offset: 24,
      gradient: { length: 120, thickness: 10 },
      labels: { offset: 13, fontSize: 10 },
      titleStyle: { fontSize: 10 }
    }
  });
}

function addTitle(program, { text, subtitle }) {
  return program.createTitle({
    text,
    subtitle,
    offset: -6,
    gap: 4.8,
    titleStyle: { fontSize: 16, fontWeight: 700 },
    subtitleStyle: { fontSize: 10 }
  });
}

export function createMatchingPopulationColorBars(gapminder) {
  const program = baseProgram(gapminder, {
    field: "pop",
    fieldType: "quantitative",
    scale: { type: "sequential", palette: "viridis" }
  });
  return addTitle(addGuides(program, "sum(pop)"), {
    text: "Recent Population by Country",
    subtitle: "Bar height and color both use sum(pop), 1995–2005"
  });
}

export function createMeanLifeExpectancyColorBars(gapminder) {
  const program = baseProgram(gapminder, {
    field: "life_expect",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: { type: "sequential", palette: "viridis" }
  });
  return addTitle(addGuides(program, "mean(life_expect)"), {
    text: "Recent Population and Life Expectancy",
    subtitle: "Height uses sum(pop); color uses mean(life_expect), 1995–2005"
  });
}

export function createReversedLifeExpectancyColorBars(gapminder) {
  const program = addGuides(baseProgram(gapminder, {
    field: "life_expect",
    fieldType: "quantitative",
    aggregate: "mean",
    scale: { type: "sequential", palette: "viridis" }
  }), "mean(life_expect)").editScale({ id: "color", reverse: true });
  return addTitle(program, {
    text: "Recent Population and Life Expectancy · Reversed",
    subtitle: "Height uses sum(pop); color uses mean(life_expect), 1995–2005"
  });
}

export const GAPMINDER_CONTINUOUS_COLOR_BAR_BUILDERS = Object.freeze({
  "matching-population": createMatchingPopulationColorBars,
  "mean-life-expectancy": createMeanLifeExpectancyColorBars,
  "reversed-life-expectancy": createReversedLifeExpectancyColorBars
});
