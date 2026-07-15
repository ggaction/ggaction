import {
  createMeanConfidenceIntervalReference
} from "../../support/interval-reference.js";

export const RULE_GEOMETRY_LAYOUT = Object.freeze({
  width: 720,
  height: 460,
  margin: Object.freeze({ top: 90, right: 40, bottom: 50, left: 80 }),
  domain: Object.freeze([0, 100])
});

export const RULE_GEOMETRY_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#54a24b",
  "#e45756",
  "#b279a2"
]);

function map(value, [domainStart, domainEnd], [rangeStart, rangeEnd]) {
  const ratio = (value - domainStart) / (domainEnd - domainStart);
  return rangeStart + ratio * (rangeEnd - rangeStart);
}

export function createRuleGeometryReferenceValues() {
  const { width, height, margin, domain } = RULE_GEOMETRY_LAYOUT;
  const bounds = Object.freeze({
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom
  });
  const x = value => map(value, domain, [bounds.left, bounds.right]);
  const y = value => map(value, domain, [bounds.bottom, bounds.top]);
  const rows = Object.freeze([
    Object.freeze({ xStart: 60, yStart: 92, xEnd: 92, yEnd: 58 })
  ]);
  const rules = Object.freeze([
    Object.freeze({
      id: "verticalSpan",
      channels: Object.freeze({ x: 15 }),
      x1: x(15),
      y1: bounds.top,
      x2: x(15),
      y2: bounds.bottom,
      stroke: RULE_GEOMETRY_COLORS[0]
    }),
    Object.freeze({
      id: "horizontalSpan",
      channels: Object.freeze({ y: 82 }),
      x1: bounds.left,
      y1: y(82),
      x2: bounds.right,
      y2: y(82),
      stroke: RULE_GEOMETRY_COLORS[1]
    }),
    Object.freeze({
      id: "verticalInterval",
      channels: Object.freeze({ x: 38, y: 18, y2: 66 }),
      x1: x(38),
      y1: y(18),
      x2: x(38),
      y2: y(66),
      stroke: RULE_GEOMETRY_COLORS[2]
    }),
    Object.freeze({
      id: "horizontalInterval",
      channels: Object.freeze({ y: 38, x: 52, x2: 88 }),
      x1: x(52),
      y1: y(38),
      x2: x(88),
      y2: y(38),
      stroke: RULE_GEOMETRY_COLORS[3]
    }),
    Object.freeze({
      id: "diagonalInterval",
      channels: Object.freeze({
        x: rows[0].xStart,
        y: rows[0].yStart,
        x2: rows[0].xEnd,
        y2: rows[0].yEnd
      }),
      x1: x(rows[0].xStart),
      y1: y(rows[0].yStart),
      x2: x(rows[0].xEnd),
      y2: y(rows[0].yEnd),
      stroke: RULE_GEOMETRY_COLORS[4]
    })
  ]);

  return Object.freeze({ bounds, rows, rules });
}

export const ERROR_BAR_LAYOUT = Object.freeze({
  width: 720,
  height: 460,
  margin: Object.freeze({ top: 90, right: 40, bottom: 70, left: 80 }),
  capSize: 8
});

export const ERROR_BAR_FIELDS = Object.freeze({
  center: "__errorBar_center",
  lower: "__errorBar_lower",
  upper: "__errorBar_upper"
});

export const ERROR_BAR_COLOR = "#4c78a8";
export const ENCODED_LAYER_POINT_RADIUS = 3;
export const ENCODED_LAYER_POINT_OPACITY = 0.18;

const T_975 = new Map([
  [70, 1.994437111771186],
  [253, 1.9693848042198945],
  [72, 1.9934635666618716],
  [78, 1.9908470688116904],
  [249, 1.9695368676395824]
]);

function tCritical(degreesOfFreedom, confidence) {
  if (confidence !== 0.95 || !T_975.has(degreesOfFreedom)) {
    throw new Error(
      `Missing 95% Student-t critical value for df=${degreesOfFreedom}.`
    );
  }
  return T_975.get(degreesOfFreedom);
}

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function stableNumber(value) {
  return Number(value.toFixed(12));
}

export function createErrorBarReferenceValues(cars) {
  const statistics = freezeRows(createMeanConfidenceIntervalReference(cars, {
    field: "Acceleration",
    groupBy: "Origin",
    confidence: 0.95,
    criticalValue: tCritical
  }));
  const rows = freezeRows(statistics.map(row => ({
    Origin: row.Origin,
    [ERROR_BAR_FIELDS.center]: stableNumber(row.mean),
    [ERROR_BAR_FIELDS.lower]: stableNumber(row.lower),
    [ERROR_BAR_FIELDS.upper]: stableNumber(row.upper)
  })));
  const transform = Object.freeze({
    type: "interval",
    field: "Acceleration",
    groupBy: Object.freeze(["Origin"]),
    center: "mean",
    extent: "ci",
    level: 0.95,
    as: ERROR_BAR_FIELDS
  });
  const { width, height, margin, capSize } = ERROR_BAR_LAYOUT;
  const bounds = Object.freeze({
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom
  });
  const xDomain = Object.freeze(rows.map(row => row.Origin));
  const yDomain = Object.freeze([
    Math.floor(Math.min(...statistics.map(row => row.lower))),
    Math.ceil(Math.max(...statistics.map(row => row.upper)))
  ]);
  const xStep = (bounds.right - bounds.left) / xDomain.length;
  const xPositions = Object.freeze(xDomain.map(
    (_, index) => bounds.left + xStep * (index + 0.5)
  ));
  const y = value => map(
    value,
    yDomain,
    [bounds.bottom, bounds.top]
  );
  const yTickValues = Object.freeze(Array.from(
    { length: yDomain[1] - yDomain[0] + 1 },
    (_, index) => yDomain[0] + index
  ));
  const yTickPositions = Object.freeze(yTickValues.map(y));
  const mainRules = freezeRows(rows.map((row, index) => ({
    x1: xPositions[index],
    y1: y(row[ERROR_BAR_FIELDS.lower]),
    x2: xPositions[index],
    y2: y(row[ERROR_BAR_FIELDS.upper])
  })));
  const lowerCaps = freezeRows(mainRules.map(rule => ({
    x1: rule.x1 - capSize / 2,
    y1: rule.y1,
    x2: rule.x1 + capSize / 2,
    y2: rule.y1
  })));
  const upperCaps = freezeRows(mainRules.map(rule => ({
    x1: rule.x2 - capSize / 2,
    y1: rule.y2,
    x2: rule.x2 + capSize / 2,
    y2: rule.y2
  })));
  const axes = Object.freeze({
    x: Object.freeze({
      line: Object.freeze({
        x1: bounds.left,
        y1: bounds.bottom,
        x2: bounds.right,
        y2: bounds.bottom
      }),
      values: xDomain,
      positions: xPositions,
      title: Object.freeze({ x: (bounds.left + bounds.right) / 2, y: 432 })
    }),
    y: Object.freeze({
      line: Object.freeze({
        x1: bounds.left,
        y1: bounds.bottom,
        x2: bounds.left,
        y2: bounds.top
      }),
      values: yTickValues,
      positions: yTickPositions,
      title: Object.freeze({ x: 28, y: (bounds.top + bounds.bottom) / 2 })
    })
  });
  const horizontalGrid = freezeRows(yTickPositions.map(position => ({
    x1: bounds.left,
    y1: position,
    x2: bounds.right,
    y2: position
  })));

  return Object.freeze({
    statistics,
    rows,
    transform,
    bounds,
    xDomain,
    yDomain,
    mainRules,
    lowerCaps,
    upperCaps,
    axes,
    horizontalGrid
  });
}

export function createEncodedLayerInferenceReferenceValues(cars) {
  const interval = createErrorBarReferenceValues(cars);
  const acceleration = cars.map(row => row.Acceleration);
  if (!acceleration.every(Number.isFinite)) {
    throw new TypeError("Encoded-layer reference requires finite Acceleration values.");
  }
  const origins = cars.map(row => row.Origin);
  if (!origins.every(value => typeof value === "string" && value.length > 0)) {
    throw new TypeError("Encoded-layer reference requires non-empty Origin values.");
  }
  const xDomain = Object.freeze([...new Set(origins)]);
  const yDomain = Object.freeze([
    Math.min(...acceleration),
    Math.max(...acceleration)
  ]);
  const xStep = (interval.bounds.right - interval.bounds.left) / xDomain.length;
  const xByOrigin = new Map(xDomain.map((origin, index) => [
    origin,
    interval.bounds.left + xStep * (index + 0.5)
  ]));
  const y = value => map(
    value,
    yDomain,
    [interval.bounds.bottom, interval.bounds.top]
  );
  const pointX = Object.freeze(origins.map(origin => xByOrigin.get(origin)));
  const pointY = Object.freeze(acceleration.map(y));
  const mainRules = freezeRows(interval.rows.map(row => ({
    x1: xByOrigin.get(row.Origin),
    y1: y(row[ERROR_BAR_FIELDS.lower]),
    x2: xByOrigin.get(row.Origin),
    y2: y(row[ERROR_BAR_FIELDS.upper])
  })));
  const lowerCaps = freezeRows(mainRules.map(rule => ({
    x1: rule.x1 - ERROR_BAR_LAYOUT.capSize / 2,
    y1: rule.y1,
    x2: rule.x1 + ERROR_BAR_LAYOUT.capSize / 2,
    y2: rule.y1
  })));
  const upperCaps = freezeRows(mainRules.map(rule => ({
    x1: rule.x2 - ERROR_BAR_LAYOUT.capSize / 2,
    y1: rule.y2,
    x2: rule.x2 + ERROR_BAR_LAYOUT.capSize / 2,
    y2: rule.y2
  })));

  return Object.freeze({
    ...interval,
    xDomain,
    yDomain,
    pointX,
    pointY,
    mainRules,
    lowerCaps,
    upperCaps
  });
}

export const ERROR_BAR_VARIANT_STYLE = Object.freeze({
  stroke: "#d9485f",
  strokeWidth: 3,
  strokeDash: Object.freeze([8, 4]),
  opacity: 0.8,
  capSize: 16
});

function createHorizontalAxes(bounds, categories, domain) {
  const tickValues = Object.freeze([70, 80, 90, 100, 110, 120, 130]);
  const categoryStep = (bounds.bottom - bounds.top) / categories.length;
  const categoryPositions = Object.freeze(categories.map(
    (_, index) => bounds.top + categoryStep * (index + 0.5)
  ));
  const quantitativePositions = Object.freeze(tickValues.map(value =>
    map(value, domain, [bounds.left, bounds.right])
  ));
  return Object.freeze({
    x: Object.freeze({
      line: Object.freeze({
        x1: bounds.left,
        y1: bounds.bottom,
        x2: bounds.right,
        y2: bounds.bottom
      }),
      values: tickValues,
      positions: quantitativePositions,
      title: Object.freeze({ x: (bounds.left + bounds.right) / 2, y: 432 })
    }),
    y: Object.freeze({
      line: Object.freeze({
        x1: bounds.left,
        y1: bounds.bottom,
        x2: bounds.left,
        y2: bounds.top
      }),
      values: categories,
      positions: categoryPositions,
      title: Object.freeze({ x: 28, y: (bounds.top + bounds.bottom) / 2 })
    })
  });
}

export function createHorizontalErrorBarReferenceValues(cars) {
  const statistics = freezeRows(createMeanConfidenceIntervalReference(cars, {
    field: "Horsepower",
    groupBy: "Origin",
    confidence: 0.95,
    criticalValue: tCritical
  }));
  const rows = freezeRows(statistics.map(row => ({
    Origin: row.Origin,
    [ERROR_BAR_FIELDS.center]: stableNumber(row.mean),
    [ERROR_BAR_FIELDS.lower]: stableNumber(row.lower),
    [ERROR_BAR_FIELDS.upper]: stableNumber(row.upper)
  })));
  const bounds = Object.freeze({
    left: ERROR_BAR_LAYOUT.margin.left,
    right: ERROR_BAR_LAYOUT.width - ERROR_BAR_LAYOUT.margin.right,
    top: ERROR_BAR_LAYOUT.margin.top,
    bottom: ERROR_BAR_LAYOUT.height - ERROR_BAR_LAYOUT.margin.bottom
  });
  const yDomain = Object.freeze(rows.map(row => row.Origin));
  const xDomain = Object.freeze([70, 130]);
  const axes = createHorizontalAxes(bounds, yDomain, xDomain);
  const x = value => map(value, xDomain, [bounds.left, bounds.right]);
  const mainRules = freezeRows(rows.map((row, index) => ({
    x1: x(row[ERROR_BAR_FIELDS.lower]),
    y1: axes.y.positions[index],
    x2: x(row[ERROR_BAR_FIELDS.upper]),
    y2: axes.y.positions[index]
  })));
  const lowerCaps = freezeRows(mainRules.map(rule => ({
    x1: rule.x1,
    y1: rule.y1 - ERROR_BAR_LAYOUT.capSize / 2,
    x2: rule.x1,
    y2: rule.y1 + ERROR_BAR_LAYOUT.capSize / 2
  })));
  const upperCaps = freezeRows(mainRules.map(rule => ({
    x1: rule.x2,
    y1: rule.y2 - ERROR_BAR_LAYOUT.capSize / 2,
    x2: rule.x2,
    y2: rule.y2 + ERROR_BAR_LAYOUT.capSize / 2
  })));
  const grid = freezeRows(axes.x.positions.map(position => ({
    x1: position,
    y1: bounds.top,
    x2: position,
    y2: bounds.bottom
  })));

  return Object.freeze({
    statistics,
    rows,
    transform: Object.freeze({
      type: "interval",
      field: "Horsepower",
      groupBy: Object.freeze(["Origin"]),
      center: "mean",
      extent: "ci",
      level: 0.95,
      as: ERROR_BAR_FIELDS
    }),
    bounds,
    xDomain,
    yDomain,
    axes,
    grid,
    mainRules,
    lowerCaps,
    upperCaps
  });
}

export function createExplicitIntervalReferenceValues(cars) {
  const baseline = createErrorBarReferenceValues(cars);
  const rows = freezeRows(baseline.rows.map(row => ({
    Origin: row.Origin,
    meanAcceleration: row[ERROR_BAR_FIELDS.center],
    lowerAcceleration: row[ERROR_BAR_FIELDS.lower],
    upperAcceleration: row[ERROR_BAR_FIELDS.upper]
  })));

  return Object.freeze({
    ...baseline,
    sourceRows: rows,
    rows,
    fields: Object.freeze({
      center: "meanAcceleration",
      lower: "lowerAcceleration",
      upper: "upperAcceleration"
    }),
    lowerCaps: Object.freeze([]),
    upperCaps: Object.freeze([])
  });
}

export function createStyledErrorBarReferenceValues(cars) {
  const baseline = createErrorBarReferenceValues(cars);
  const { capSize } = ERROR_BAR_VARIANT_STYLE;
  return Object.freeze({
    ...baseline,
    lowerCaps: freezeRows(baseline.mainRules.map(rule => ({
      x1: rule.x1 - capSize / 2,
      y1: rule.y1,
      x2: rule.x1 + capSize / 2,
      y2: rule.y1
    }))),
    upperCaps: freezeRows(baseline.mainRules.map(rule => ({
      x1: rule.x2 - capSize / 2,
      y1: rule.y2,
      x2: rule.x2 + capSize / 2,
      y2: rule.y2
    })))
  });
}
