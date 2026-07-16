const BAR_COUNTRIES = Object.freeze([
  "Chile", "Cuba", "Egypt", "Japan", "Kenya", "Peru"
]);
const LINE_COUNTRIES = Object.freeze([
  "Afghanistan", "China", "United States"
]);
const LINE_COLORS = Object.freeze(["#4c78a8", "#f58518", "#e45756"]);

export const BAND_POINT_LAYOUT = Object.freeze({
  width: 456,
  height: 312,
  margin: Object.freeze({ top: 58, right: 22, bottom: 54, left: 70 })
});

export const TIME_LAYOUT = Object.freeze({
  width: 456,
  height: 312,
  margin: Object.freeze({ top: 58, right: 126, bottom: 54, left: 50 })
});

function bounds(layout) {
  return Object.freeze({
    left: layout.margin.left,
    right: layout.width - layout.margin.right,
    top: layout.margin.top,
    bottom: layout.height - layout.margin.bottom
  });
}

function mapLinear(value, domain, range) {
  return range[0] + (value - domain[0]) /
    (domain[1] - domain[0]) * (range[1] - range[0]);
}

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze({ ...row })));
}

export function normalizeUtcTemporalReference(value) {
  if (Number.isInteger(value) && value >= 1000 && value <= 9999) {
    return Date.UTC(value, 0, 1);
  }
  if (typeof value === "string") {
    const calendar = value.match(
      /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T ].*)?$/
    );
    if (calendar) {
      const [, year, month, day] = calendar;
      return Date.UTC(Number(year), Number(month) - 1, Number(day));
    }
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.getTime();
  }
  if (Number.isFinite(value)) return value;
  throw new TypeError("Temporal reference value must resolve to a UTC timestamp.");
}

export function createBandPointReference(gapminder) {
  const rows2005 = gapminder.filter(row => row.year === 2005);
  const rows = freezeRows(rows2005.filter(row => BAR_COUNTRIES.includes(row.country)));
  const plot = bounds(BAND_POINT_LAYOUT);
  const domain = BAR_COUNTRIES;
  const span = plot.right - plot.left;
  const paddingInner = 0.2;
  const paddingOuter = 0.1;
  const step = span / (domain.length - paddingInner + paddingOuter * 2);
  const bandwidth = step * (1 - paddingInner);
  const start = plot.left + step * paddingOuter;
  const pointPadding = 0.5;
  const pointStep = step;
  const pointStart = start + bandwidth / 2;
  const centers = domain.map((_, index) =>
    start + index * step + bandwidth / 2
  );
  const yDomain = Object.freeze([0, 150_000_000]);
  const yTicks = Object.freeze([0, 30_000_000, 60_000_000, 90_000_000, 120_000_000, 150_000_000]);
  const yPositions = yTicks.map(value =>
    mapLinear(value, yDomain, [plot.bottom, plot.top])
  );
  const barWidth = bandwidth * 0.72;
  const bars = rows.map((row, index) => {
    const y = mapLinear(row.pop, yDomain, [plot.bottom, plot.top]);
    return Object.freeze({
      x: centers[index] - barWidth / 2,
      y,
      width: barWidth,
      height: plot.bottom - y
    });
  });

  return Object.freeze({
    rows2005: freezeRows(rows2005),
    rows,
    plot,
    domain,
    band: Object.freeze({ step, bandwidth, start, paddingInner, paddingOuter }),
    point: Object.freeze({
      step: pointStep,
      bandwidth: 0,
      start: pointStart,
      padding: pointPadding,
      align: 0.5
    }),
    centers: Object.freeze(centers),
    yDomain,
    yTicks,
    yPositions: Object.freeze(yPositions),
    bars: Object.freeze(bars)
  });
}

export function createTimeReference(gapminder) {
  const rows = freezeRows(gapminder.filter(row =>
    LINE_COUNTRIES.includes(row.country)
  ));
  const plot = bounds(TIME_LAYOUT);
  const xDomain = Object.freeze([
    normalizeUtcTemporalReference(1955),
    normalizeUtcTemporalReference(2005)
  ]);
  const xTickYears = Object.freeze([1960, 1970, 1980, 1990, 2000]);
  const xTicks = Object.freeze(
    xTickYears.map(normalizeUtcTemporalReference)
  );
  const yDomain = Object.freeze([20, 80]);
  const yTicks = Object.freeze([20, 40, 60, 80]);
  const xPositions = Object.freeze(xTicks.map(value =>
    mapLinear(value, xDomain, [plot.left, plot.right])
  ));
  const yPositions = Object.freeze(yTicks.map(value =>
    mapLinear(value, yDomain, [plot.bottom, plot.top])
  ));
  const series = Object.freeze(LINE_COUNTRIES.map((country, index) => {
    const countryRows = rows.filter(row => row.country === country);
    return Object.freeze({
      country,
      color: LINE_COLORS[index],
      commands: Object.freeze(countryRows.flatMap((row, rowIndex) => [{
        op: rowIndex === 0 ? "M" : "L",
        x: mapLinear(
          normalizeUtcTemporalReference(row.year),
          xDomain,
          [plot.left, plot.right]
        ),
        y: mapLinear(row.life_expect, yDomain, [plot.bottom, plot.top])
      }]))
    });
  }));

  return Object.freeze({
    rows,
    plot,
    countries: LINE_COUNTRIES,
    colors: LINE_COLORS,
    xDomain,
    xTickYears,
    xTicks,
    xPositions,
    yDomain,
    yTicks,
    yPositions,
    series
  });
}
