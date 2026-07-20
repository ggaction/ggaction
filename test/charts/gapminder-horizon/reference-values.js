import { calculateHorizon } from "../../oracles/horizon.js";
import { createMonotoneAreaReferenceCommands } from
  "../../oracles/monotone-area.js";
import { mapLinear } from "../../oracles/numeric.js";

export const HORIZON_LAYOUT = Object.freeze({
  width: 760,
  height: 300,
  margin: Object.freeze({ top: 78, right: 30, bottom: 58, left: 50 })
});

export const HORIZON_BASELINE = 55;
export const HORIZON_BANDS = 3;
export const HORIZON_X_TICKS = Object.freeze([
  1955, 1965, 1975, 1985, 1995, 2005
]);
export const HORIZON_COLORS = Object.freeze({
  negative: Object.freeze(["#fdc9b4", "#fa7051", "#970b13"]),
  positive: Object.freeze(["#cfe1f2", "#74b2d7", "#0a4a90"])
});

function plotBounds(layout) {
  return Object.freeze({
    left: layout.margin.left,
    right: layout.width - layout.margin.right,
    top: layout.margin.top,
    bottom: layout.height - layout.margin.bottom,
    width: layout.width - layout.margin.left - layout.margin.right,
    height: layout.height - layout.margin.top - layout.margin.bottom
  });
}

export function prepareKenyaRows(gapminder) {
  if (!Array.isArray(gapminder)) {
    throw new TypeError("Gapminder must be an array.");
  }
  const rows = gapminder.filter(row => row?.country === "Kenya");
  if (rows.length !== 11) {
    throw new Error(`Expected 11 Kenya rows, received ${rows.length}.`);
  }
  return Object.freeze(rows.map(row => Object.freeze({ ...row })));
}

function graphicalSeries(horizon, bounds) {
  const xDomain = [1955, 2005];
  return Object.freeze(horizon.series.map(series => {
    const upper = series.points.map(point => Object.freeze({
      x: mapLinear(point.x, xDomain, [bounds.left, bounds.right]),
      y: mapLinear(
        point.amplitude,
        [0, series.bandHeight],
        [bounds.bottom, bounds.top]
      )
    }));
    const lower = upper.map(point => Object.freeze({
      x: point.x,
      y: bounds.bottom
    }));
    return Object.freeze({
      ...series,
      commands: createMonotoneAreaReferenceCommands(lower, upper),
      fill: HORIZON_COLORS[series.sign][series.bandIndex],
      lower,
      upper: Object.freeze(upper)
    });
  }));
}

export function createGapminderHorizonValues(gapminder) {
  const rows = prepareKenyaRows(gapminder);
  const layout = HORIZON_LAYOUT;
  const bounds = plotBounds(layout);
  const horizon = calculateHorizon(rows, {
    xField: "year",
    yField: "life_expect",
    bands: HORIZON_BANDS,
    baseline: HORIZON_BASELINE
  });
  return Object.freeze({
    bounds,
    horizon,
    layout,
    rows,
    series: graphicalSeries(horizon, bounds),
    title: Object.freeze({
      x: bounds.left + bounds.width / 2,
      text: "Kenya Life Expectancy",
      subtitle: "Blue above, red below · three folded bands around 55 years"
    }),
    xTicks: Object.freeze(HORIZON_X_TICKS.map(value => Object.freeze({
      value,
      x: mapLinear(value, [1955, 2005], [bounds.left, bounds.right])
    })))
  });
}
