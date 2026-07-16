export const BOX_PLOT_LAYOUT = Object.freeze({
  width: 360,
  height: 460,
  margin: Object.freeze({ top: 140, right: 40, bottom: 70, left: 80 })
});

export const HORIZONTAL_MINMAX_LAYOUT = Object.freeze({
  width: 560,
  height: 340,
  margin: Object.freeze({ top: 90, right: 40, bottom: 65, left: 80 })
});

export const BOX_PLOT_FIELDS = Object.freeze({
  q1: "__boxPlot_q1",
  median: "__boxPlot_median",
  q3: "__boxPlot_q3",
  lowerWhisker: "__boxPlot_lowerWhisker",
  upperWhisker: "__boxPlot_upperWhisker",
  lowerFence: "__boxPlot_lowerFence",
  upperFence: "__boxPlot_upperFence",
  count: "__boxPlot_count"
});

export const BOX_PLOT_STYLE = Object.freeze({
  boxFill: "#4c78a8",
  boxOpacity: 1,
  boxStroke: "#4c78a8",
  boxStrokeWidth: 1.5,
  medianStroke: "#1f2937",
  medianStrokeWidth: 1.5,
  whiskerStroke: "#111111",
  whiskerStrokeWidth: 1.5,
  outlierFill: "#111111",
  outlierShape: "diamond",
  outlierRadius: 3,
  outlierOpacity: 0.75,
  capSize: 8,
  band: 0.7
});

export const BOX_PLOT_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756"
]);

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function stableNumber(value) {
  return Number(value.toFixed(12));
}

function quantile(sorted, probability) {
  if (sorted.length === 0) {
    throw new Error("Box-plot quantile requires at least one value.");
  }
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  const fraction = position - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
}

function niceStep(span, count = 5) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 3 ? 3
    : fraction <= 5 ? 5 : 10;
  return factor * power;
}

function niceDomain(values) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  if (minimum === maximum) return [minimum, maximum];
  const step = niceStep(maximum - minimum);
  return [
    Number((Math.floor(minimum / step) * step).toPrecision(12)),
    Number((Math.ceil(maximum / step) * step).toPrecision(12))
  ];
}

function ticks(domain, count = 5) {
  if (domain[0] === domain[1]) return [domain[0]];
  const step = niceStep(domain[1] - domain[0], count);
  const tolerance = step * 1e-10;
  const start = Math.ceil((domain[0] - tolerance) / step) * step;
  const stop = Math.floor((domain[1] + tolerance) / step) * step;
  const values = [];
  for (let value = start; value <= stop + tolerance; value += step) {
    values.push(Number(value.toPrecision(12)));
  }
  return values;
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function normalizeCars(cars, measureField = "Miles_per_Gallon") {
  if (!Array.isArray(cars)) {
    throw new TypeError("Cars must be an array.");
  }
  const valid = [];
  for (const [sourceIndex, row] of cars.entries()) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) continue;
    const category = row.Origin;
    const measure = row[measureField];
    if (category === undefined || category === null || category === "") continue;
    if (measure === undefined || measure === null) continue;
    if (typeof category !== "string") {
      throw new TypeError("Cars box plot requires string Origin values.");
    }
    if (!Number.isFinite(measure)) {
      throw new TypeError(`Cars box plot requires finite ${measureField} values.`);
    }
    valid.push({ sourceIndex, row: structuredClone(row), category, measure });
  }
  if (valid.length === 0) {
    throw new Error("Cars box plot requires at least one valid row.");
  }
  return valid;
}

export function createCarsHorizontalMinmaxReferenceValues(cars, {
  width = HORIZONTAL_MINMAX_LAYOUT.width,
  height = HORIZONTAL_MINMAX_LAYOUT.height,
  margin = HORIZONTAL_MINMAX_LAYOUT.margin
} = {}) {
  const measureField = "Horsepower";
  const valid = normalizeCars(cars, measureField);
  const bounds = Object.freeze({
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  });
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("Horizontal box-plot layout requires a positive plot region.");
  }

  const groups = [];
  const byCategory = new Map();
  for (const item of valid) {
    if (!byCategory.has(item.category)) {
      const group = { category: item.category, items: [] };
      byCategory.set(item.category, group);
      groups.push(group);
    }
    byCategory.get(item.category).items.push(item);
  }

  const summaries = groups.map(group => {
    const sorted = group.items.map(item => item.measure).sort((a, b) => a - b);
    const minimum = sorted[0];
    const maximum = sorted.at(-1);
    return {
      Origin: group.category,
      [BOX_PLOT_FIELDS.q1]: stableNumber(quantile(sorted, 0.25)),
      [BOX_PLOT_FIELDS.median]: stableNumber(quantile(sorted, 0.5)),
      [BOX_PLOT_FIELDS.q3]: stableNumber(quantile(sorted, 0.75)),
      [BOX_PLOT_FIELDS.lowerWhisker]: minimum,
      [BOX_PLOT_FIELDS.upperWhisker]: maximum,
      [BOX_PLOT_FIELDS.lowerFence]: minimum,
      [BOX_PLOT_FIELDS.upperFence]: maximum,
      [BOX_PLOT_FIELDS.count]: sorted.length
    };
  });
  const categories = groups.map(group => group.category);
  const xDomain = niceDomain(valid.map(item => item.measure));
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y, bounds.y + bounds.height];
  const step = bounds.height / categories.length;
  const boxHeight = step * BOX_PLOT_STYLE.band;
  const center = index => bounds.y + step * (index + 0.5);
  const x = value => mapLinear(value, xDomain, xRange);
  const boxes = summaries.map((row, index) => ({
    x: x(row[BOX_PLOT_FIELDS.q1]),
    y: center(index) - boxHeight / 2,
    width: x(row[BOX_PLOT_FIELDS.q3]) - x(row[BOX_PLOT_FIELDS.q1]),
    height: boxHeight
  }));
  const whiskers = summaries.map((row, index) => ({
    x1: x(row[BOX_PLOT_FIELDS.lowerWhisker]),
    y1: center(index),
    x2: x(row[BOX_PLOT_FIELDS.upperWhisker]),
    y2: center(index)
  }));
  const lowerCaps = whiskers.map(rule => ({
    x1: rule.x1,
    y1: rule.y1 - BOX_PLOT_STYLE.capSize / 2,
    x2: rule.x1,
    y2: rule.y1 + BOX_PLOT_STYLE.capSize / 2
  }));
  const upperCaps = whiskers.map(rule => ({
    x1: rule.x2,
    y1: rule.y2 - BOX_PLOT_STYLE.capSize / 2,
    x2: rule.x2,
    y2: rule.y2 + BOX_PLOT_STYLE.capSize / 2
  }));
  const medians = summaries.map((row, index) => ({
    x1: x(row[BOX_PLOT_FIELDS.median]),
    y1: boxes[index].y,
    x2: x(row[BOX_PLOT_FIELDS.median]),
    y2: boxes[index].y + boxes[index].height
  }));
  const xTicks = ticks(xDomain).map(value => ({
    value,
    position: x(value),
    label: String(value)
  }));

  return Object.freeze({
    validCars: freezeRows(valid.map(item => structuredClone(item.row))),
    summaries: freezeRows(summaries),
    categories: Object.freeze(categories),
    boxColors: Object.freeze(BOX_PLOT_COLORS.slice(0, categories.length)),
    bounds,
    scales: Object.freeze({
      x: Object.freeze({ domain: Object.freeze(xDomain), range: Object.freeze(xRange) }),
      y: Object.freeze({ domain: Object.freeze(categories), range: Object.freeze(yRange), step })
    }),
    boxes: freezeRows(boxes),
    whiskers: freezeRows(whiskers),
    lowerCaps: freezeRows(lowerCaps),
    upperCaps: freezeRows(upperCaps),
    medians: freezeRows(medians),
    axes: Object.freeze({
      x: Object.freeze({
        line: Object.freeze({
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x + bounds.width,
          y2: bounds.y + bounds.height
        }),
        ticks: freezeRows(xTicks),
        title: Object.freeze({
          x: bounds.x + bounds.width / 2,
          y: height - 23,
          text: measureField
        })
      }),
      y: Object.freeze({
        line: Object.freeze({
          x1: bounds.x,
          y1: bounds.y,
          x2: bounds.x,
          y2: bounds.y + bounds.height
        }),
        ticks: freezeRows(categories.map((value, index) => ({
          value,
          position: center(index),
          label: value
        }))),
        title: Object.freeze({
          x: 28,
          y: bounds.y + bounds.height / 2,
          text: "Origin",
          rotation: -Math.PI / 2
        })
      })
    }),
    verticalGrid: freezeRows(xTicks.map(tick => ({
      x1: tick.position,
      y1: bounds.y,
      x2: tick.position,
      y2: bounds.y + bounds.height
    }))),
    title: Object.freeze({
      x: bounds.x,
      titleY: 27,
      subtitleY: 53,
      text: "Horsepower Range by Origin",
      subtitle: "Min–max whiskers with no outlier layer"
    })
  });
}

export function createCarsBoxPlotReferenceValues(cars, {
  width = BOX_PLOT_LAYOUT.width,
  height = BOX_PLOT_LAYOUT.height,
  margin = BOX_PLOT_LAYOUT.margin,
  factor = 1.5
} = {}) {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new RangeError("Box-plot factor must be a positive finite number.");
  }
  const valid = normalizeCars(cars);
  const bounds = Object.freeze({
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  });
  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("Box-plot layout requires a positive plot region.");
  }

  const groups = [];
  const byCategory = new Map();
  for (const item of valid) {
    if (!byCategory.has(item.category)) {
      const group = { category: item.category, items: [] };
      byCategory.set(item.category, group);
      groups.push(group);
    }
    byCategory.get(item.category).items.push(item);
  }

  const outlierIndex = new Set();
  const summaries = groups.map(group => {
    const sorted = group.items.map(item => item.measure).sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const median = quantile(sorted, 0.5);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lowerFence = q1 - factor * iqr;
    const upperFence = q3 + factor * iqr;
    const inliers = sorted.filter(value => value >= lowerFence && value <= upperFence);
    const lowerWhisker = inliers[0];
    const upperWhisker = inliers.at(-1);
    for (const item of group.items) {
      if (item.measure < lowerWhisker || item.measure > upperWhisker) {
        outlierIndex.add(item.sourceIndex);
      }
    }
    return {
      Origin: group.category,
      [BOX_PLOT_FIELDS.q1]: stableNumber(q1),
      [BOX_PLOT_FIELDS.median]: stableNumber(median),
      [BOX_PLOT_FIELDS.q3]: stableNumber(q3),
      [BOX_PLOT_FIELDS.lowerWhisker]: stableNumber(lowerWhisker),
      [BOX_PLOT_FIELDS.upperWhisker]: stableNumber(upperWhisker),
      [BOX_PLOT_FIELDS.lowerFence]: stableNumber(lowerFence),
      [BOX_PLOT_FIELDS.upperFence]: stableNumber(upperFence),
      [BOX_PLOT_FIELDS.count]: sorted.length
    };
  });
  const outlierItems = valid.filter(item => outlierIndex.has(item.sourceIndex));
  const outliers = outlierItems.map(item => structuredClone(item.row));
  const categories = groups.map(group => group.category);
  const yDomain = niceDomain(valid.map(item => item.measure));
  const xRange = [bounds.x, bounds.x + bounds.width];
  const yRange = [bounds.y + bounds.height, bounds.y];
  const step = bounds.width / categories.length;
  const boxWidth = step * BOX_PLOT_STYLE.band;
  const center = index => bounds.x + step * (index + 0.5);
  const y = value => mapLinear(value, yDomain, yRange);
  const boxes = summaries.map((row, index) => ({
    x: center(index) - boxWidth / 2,
    y: y(row[BOX_PLOT_FIELDS.q3]),
    width: boxWidth,
    height: y(row[BOX_PLOT_FIELDS.q1]) - y(row[BOX_PLOT_FIELDS.q3])
  }));
  const whiskers = summaries.map((row, index) => ({
    x1: center(index),
    y1: y(row[BOX_PLOT_FIELDS.lowerWhisker]),
    x2: center(index),
    y2: y(row[BOX_PLOT_FIELDS.upperWhisker])
  }));
  const lowerCaps = whiskers.map(rule => ({
    x1: rule.x1 - BOX_PLOT_STYLE.capSize / 2,
    y1: rule.y1,
    x2: rule.x1 + BOX_PLOT_STYLE.capSize / 2,
    y2: rule.y1
  }));
  const upperCaps = whiskers.map(rule => ({
    x1: rule.x2 - BOX_PLOT_STYLE.capSize / 2,
    y1: rule.y2,
    x2: rule.x2 + BOX_PLOT_STYLE.capSize / 2,
    y2: rule.y2
  }));
  const medians = summaries.map((row, index) => ({
    x1: boxes[index].x,
    y1: y(row[BOX_PLOT_FIELDS.median]),
    x2: boxes[index].x + boxes[index].width,
    y2: y(row[BOX_PLOT_FIELDS.median])
  }));
  const categoryIndex = new Map(categories.map((value, index) => [value, index]));
  const outlierPoints = outlierItems.map(item => ({
    x: center(categoryIndex.get(item.category)),
    y: y(item.measure),
    sourceIndex: item.sourceIndex,
    value: item.measure,
    category: item.category
  }));
  const diamondHalfDiagonal = Math.sqrt(
    Math.PI * BOX_PLOT_STYLE.outlierRadius ** 2 / 2
  );
  const outlierGraphics = outlierPoints.map(point => Object.freeze({
    type: "path",
    properties: Object.freeze({
      commands: Object.freeze([
        Object.freeze({ op: "M", x: point.x, y: point.y - diamondHalfDiagonal }),
        Object.freeze({ op: "L", x: point.x + diamondHalfDiagonal, y: point.y }),
        Object.freeze({ op: "L", x: point.x, y: point.y + diamondHalfDiagonal }),
        Object.freeze({ op: "L", x: point.x - diamondHalfDiagonal, y: point.y }),
        Object.freeze({ op: "Z" })
      ]),
      fill: BOX_PLOT_STYLE.outlierFill,
      opacity: BOX_PLOT_STYLE.outlierOpacity
    })
  }));
  const yTicks = ticks(yDomain).map(value => ({
    value,
    position: y(value),
    label: String(value)
  }));

  return Object.freeze({
    validCars: freezeRows(valid.map(item => structuredClone(item.row))),
    summaries: freezeRows(summaries),
    outliers: freezeRows(outliers),
    outlierSourceIndices: Object.freeze(outlierItems.map(item => item.sourceIndex)),
    categories: Object.freeze(categories),
    boxColors: Object.freeze(BOX_PLOT_COLORS.slice(0, categories.length)),
    bounds,
    scales: Object.freeze({
      x: Object.freeze({ domain: Object.freeze(categories), range: Object.freeze(xRange), step }),
      y: Object.freeze({ domain: Object.freeze(yDomain), range: Object.freeze(yRange) })
    }),
    boxes: freezeRows(boxes),
    whiskers: freezeRows(whiskers),
    lowerCaps: freezeRows(lowerCaps),
    upperCaps: freezeRows(upperCaps),
    medians: freezeRows(medians),
    outlierPoints: freezeRows(outlierPoints),
    outlierGraphics: Object.freeze(outlierGraphics),
    axes: Object.freeze({
      x: Object.freeze({
        line: Object.freeze({
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x + bounds.width,
          y2: bounds.y + bounds.height
        }),
        ticks: freezeRows(categories.map((value, index) => ({
          value,
          position: center(index),
          label: value
        }))),
        title: Object.freeze({
          x: bounds.x + bounds.width / 2,
          y: height - 28,
          text: "Origin"
        })
      }),
      y: Object.freeze({
        line: Object.freeze({
          x1: bounds.x,
          y1: bounds.y + bounds.height,
          x2: bounds.x,
          y2: bounds.y
        }),
        ticks: freezeRows(yTicks),
        title: Object.freeze({
          x: 28,
          y: bounds.y + bounds.height / 2,
          text: "Miles_per_Gallon",
          rotation: -Math.PI / 2
        })
      })
    }),
    horizontalGrid: freezeRows(yTicks.map(tick => ({
      x1: bounds.x,
      y1: tick.position,
      x2: bounds.x + bounds.width,
      y2: tick.position
    }))),
    title: Object.freeze({
      x: bounds.x,
      titleY: 27,
      subtitleY: 53,
      text: "Fuel Economy Distribution by Origin",
      subtitle: "Tukey box plot with 1.5× IQR whiskers"
    })
  });
}
