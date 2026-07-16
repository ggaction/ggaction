export const CONTINUOUS_BAR_COUNTRIES = Object.freeze([
  "China",
  "India",
  "United States",
  "Indonesia",
  "Brazil",
  "Pakistan",
  "Bangladesh",
  "Nigeria"
]);

export const CONTINUOUS_BAR_VARIANTS = Object.freeze([
  "matching-population",
  "mean-life-expectancy",
  "reversed-life-expectancy"
]);

export const CONTINUOUS_BAR_LAYOUT = Object.freeze({
  width: 680,
  height: 380,
  margin: Object.freeze({ top: 58, right: 125, bottom: 72, left: 72 })
});

const VIRIDIS = Object.freeze([
  "#440154", "#470e61", "#481a6c", "#482575", "#472f7d",
  "#443a83", "#414487", "#3d4e8a", "#39568c", "#35608d",
  "#31688e", "#2d708e", "#2a788e", "#27818e", "#23888e",
  "#21918d", "#1f988b", "#1fa088", "#22a884", "#2ab07f",
  "#35b779", "#43bf71", "#54c568", "#66cc5d", "#7ad151",
  "#8fd744", "#a5db36", "#bcdf27", "#d2e21b", "#e9e51a",
  "#fde725"
]);

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze({ ...row })));
}

function interpolate(left, right, amount) {
  const channel = (color, offset) => Number.parseInt(color.slice(offset, offset + 2), 16);
  return `#${[1, 3, 5].map(offset => Math.round(
    channel(left, offset) + (channel(right, offset) - channel(left, offset)) * amount
  ).toString(16).padStart(2, "0")).join("")}`;
}

function paletteColor(amount) {
  const bounded = Math.max(0, Math.min(1, amount));
  const position = bounded * (VIRIDIS.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(VIRIDIS.length - 1, lower + 1);
  return interpolate(VIRIDIS[lower], VIRIDIS[upper], position - lower);
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  return range[0] + (value - domain[0]) / (domain[1] - domain[0]) *
    (range[1] - range[0]);
}

function compactNumber(value) {
  if (Math.abs(value) >= 1e9) return `${+(value / 1e9).toPrecision(3)}B`;
  if (Math.abs(value) >= 1e6) return `${+(value / 1e6).toPrecision(3)}M`;
  return String(+value.toPrecision(3));
}

function aggregateRows(rows) {
  return freezeRows(CONTINUOUS_BAR_COUNTRIES.map(country => {
    const countryRows = rows.filter(row => row.country === country);
    const population = countryRows.reduce((sum, row) => sum + row.pop, 0);
    const lifeExpectancy = countryRows.reduce(
      (sum, row) => sum + row.life_expect,
      0
    ) / countryRows.length;
    return { country, population, lifeExpectancy, count: countryRows.length };
  }));
}

function titleFor(variant) {
  if (variant === "matching-population") {
    return Object.freeze({
      text: "Recent Population by Country",
      subtitle: "Bar height and color both use sum(pop), 1995–2005"
    });
  }
  return Object.freeze({
    text: variant === "reversed-life-expectancy"
      ? "Recent Population and Life Expectancy · Reversed"
      : "Recent Population and Life Expectancy",
    subtitle: "Height uses sum(pop); color uses mean(life_expect), 1995–2005"
  });
}

export function createContinuousColorBarReference(gapminder, variant) {
  if (!CONTINUOUS_BAR_VARIANTS.includes(variant)) {
    throw new Error(`Unknown continuous color bar variant "${variant}".`);
  }
  if (!Array.isArray(gapminder)) {
    throw new TypeError("gapminder must be an array.");
  }
  const rows = freezeRows(gapminder.filter(row =>
    row?.year >= 1995 && row.year <= 2005 &&
    CONTINUOUS_BAR_COUNTRIES.includes(row.country) &&
    Number.isFinite(row.pop) && Number.isFinite(row.life_expect)
  ));
  const aggregates = aggregateRows(rows);
  if (aggregates.some(row => row.count !== 3)) {
    throw new Error("Continuous color bar reference requires three rows per country.");
  }
  const { width, height, margin } = CONTINUOUS_BAR_LAYOUT;
  const bounds = Object.freeze({
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom
  });
  const xStep = (bounds.right - bounds.left) / aggregates.length;
  const barWidth = xStep * 0.72;
  const yDomain = Object.freeze([0, 4_000_000_000]);
  const yTicks = Object.freeze([0, 1e9, 2e9, 3e9, 4e9]);
  const colorField = variant === "matching-population"
    ? "population"
    : "lifeExpectancy";
  const colorValues = aggregates.map(row => row[colorField]);
  const colorDomain = Object.freeze([
    Math.min(...colorValues),
    Math.max(...colorValues)
  ]);
  const reverse = variant === "reversed-life-expectancy";
  const colorFor = value => paletteColor(reverse
    ? 1 - mapLinear(value, colorDomain, [0, 1])
    : mapLinear(value, colorDomain, [0, 1]));
  const bars = Object.freeze(aggregates.map((row, index) => {
    const center = bounds.left + xStep * (index + 0.5);
    const y = mapLinear(row.population, yDomain, [bounds.bottom, bounds.top]);
    return Object.freeze({
      x: center - barWidth / 2,
      y,
      width: barWidth,
      height: bounds.bottom - y,
      fill: colorFor(row[colorField])
    });
  }));
  const gradientRange = reverse ? [...VIRIDIS].reverse() : [...VIRIDIS];
  const gradientX = bounds.right + 24;
  const gradientY = bounds.top + 46;
  const gradientLength = 120;
  const gradientThickness = 10;
  const strips = Object.freeze(Array.from({ length: 60 }, (_, index) => {
    const fraction = (index + 0.5) / 60;
    return Object.freeze({
      x: gradientX,
      y: gradientY + index * gradientLength / 60,
      width: gradientThickness,
      height: gradientLength / 60,
      fill: paletteColor(reverse ? fraction : 1 - fraction)
    });
  }));
  const legendValues = Object.freeze(Array.from(
    { length: 5 },
    (_, index) => colorDomain[0] + index / 4 * (colorDomain[1] - colorDomain[0])
  ));

  return Object.freeze({
    rows,
    aggregates,
    bounds,
    xStep,
    barWidth,
    bars,
    domains: Object.freeze({
      x: Object.freeze([...CONTINUOUS_BAR_COUNTRIES]),
      y: yDomain,
      color: colorDomain
    }),
    axes: Object.freeze({
      x: Object.freeze({
        values: Object.freeze([...CONTINUOUS_BAR_COUNTRIES]),
        positions: Object.freeze(aggregates.map((_, index) =>
          bounds.left + xStep * (index + 0.5)
        )),
        labels: Object.freeze([...CONTINUOUS_BAR_COUNTRIES])
      }),
      y: Object.freeze({
        values: yTicks,
        positions: Object.freeze(yTicks.map(value =>
          mapLinear(value, yDomain, [bounds.bottom, bounds.top])
        )),
        labels: Object.freeze(yTicks.map(compactNumber))
      })
    }),
    color: Object.freeze({
      sourceField: variant === "matching-population" ? "pop" : "life_expect",
      aggregate: variant === "matching-population" ? "sum" : "mean",
      reverse,
      range: Object.freeze(gradientRange)
    }),
    legend: Object.freeze({
      strips,
      x: gradientX,
      y: gradientY,
      length: gradientLength,
      thickness: gradientThickness,
      values: legendValues,
      positions: Object.freeze(legendValues.map((_, index) =>
        gradientY + gradientLength * (1 - index / 4)
      )),
      labels: Object.freeze(legendValues.map(value =>
        colorField === "population" ? compactNumber(value) : String(+value.toPrecision(3))
      )),
      title: colorField === "population" ? "sum(pop)" : "mean(life_expect)"
    }),
    title: titleFor(variant)
  });
}
