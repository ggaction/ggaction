const TABLEAU10 = Object.freeze([
  "#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b",
  "#eeca3b", "#b279a2", "#ff9da6", "#9d755d", "#bab0ac"
]);

function finitePair(value, label) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every(Number.isFinite) ||
    value[0] === value[1]
  ) {
    throw new TypeError(`${label} must be two distinct finite numbers.`);
  }
  return value;
}

function normalizeMargin(margin) {
  if (Number.isFinite(margin) && margin >= 0) {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  const value = margin ?? {};
  const resolved = {
    top: value.top ?? 0,
    right: value.right ?? 0,
    bottom: value.bottom ?? 0,
    left: value.left ?? 0
  };
  if (!Object.values(resolved).every(item => Number.isFinite(item) && item >= 0)) {
    throw new RangeError("Polar margin must contain non-negative finite values.");
  }
  return resolved;
}

function extent(values, label) {
  if (values.length === 0 || !values.every(Number.isFinite)) {
    throw new TypeError(`${label} requires finite values.`);
  }
  return [Math.min(...values), Math.max(...values)];
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  return range[0] + (value - domain[0]) / (domain[1] - domain[0]) *
    (range[1] - range[0]);
}

function firstAppearance(values) {
  return [...new Set(values)];
}

export function resolvePolarFrame({ width, height, margin }) {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError("Polar frame requires positive finite dimensions.");
  }
  const resolved = normalizeMargin(margin);
  const plot = {
    left: resolved.left,
    right: width - resolved.right,
    top: resolved.top,
    bottom: height - resolved.bottom
  };
  plot.width = plot.right - plot.left;
  plot.height = plot.bottom - plot.top;
  if (plot.width <= 0 || plot.height <= 0) {
    throw new RangeError("Polar margin must leave positive plot bounds.");
  }
  return Object.freeze({
    plot: Object.freeze(plot),
    center: Object.freeze({
      x: plot.left + plot.width / 2,
      y: plot.top + plot.height / 2
    }),
    availableRadius: Math.min(plot.width, plot.height) / 2
  });
}

export function polarToCartesian({ center, theta, radius }) {
  if (![center.x, center.y, theta, radius].every(Number.isFinite) || radius < 0) {
    throw new RangeError("Polar coordinates require finite values and non-negative radius.");
  }
  const radians = theta * Math.PI / 180;
  return Object.freeze({
    x: center.x + Math.sin(radians) * radius,
    y: center.y - Math.cos(radians) * radius
  });
}

export function createPolarPointPrimitiveValues(rows, {
  thetaField,
  radiusField,
  colorField,
  width,
  height,
  margin,
  thetaRange = [0, 360],
  radiusRange,
  pointRadius,
  opacity = 1
}) {
  if (!Array.isArray(rows)) throw new TypeError("Polar rows must be an array.");
  const validRows = rows.filter(row =>
    Number.isFinite(row?.[thetaField]) &&
    Number.isFinite(row?.[radiusField]) &&
    typeof row?.[colorField] === "string" &&
    row[colorField].length > 0
  );
  const frame = resolvePolarFrame({ width, height, margin });
  const validatedThetaRange = finitePair(thetaRange, "Theta range");
  if (Math.abs(validatedThetaRange[1] - validatedThetaRange[0]) > 360) {
    throw new RangeError("Theta range span must not exceed 360 degrees.");
  }
  const validatedRadiusRange = radiusRange === undefined
    ? [0, frame.availableRadius]
    : finitePair(radiusRange, "Radius range");
  if (
    validatedRadiusRange.some(value => value < 0) ||
    validatedRadiusRange.some(value => value > frame.availableRadius)
  ) {
    throw new RangeError("Radius range must fit the available Polar radius.");
  }
  if (!Number.isFinite(pointRadius) || pointRadius <= 0) {
    throw new RangeError("Point radius must be positive and finite.");
  }
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new RangeError("Point opacity must be between 0 and 1.");
  }

  const thetaValues = validRows.map(row => row[thetaField]);
  const radiusValues = validRows.map(row => row[radiusField]);
  const thetaDomain = extent(thetaValues, "Theta domain");
  const radiusDomain = extent(radiusValues, "Radius domain");
  const theta = thetaValues.map(value => mapLinear(
    value,
    thetaDomain,
    validatedThetaRange
  ));
  const radius = radiusValues.map(value => mapLinear(
    value,
    radiusDomain,
    validatedRadiusRange
  ));
  const positions = theta.map((value, index) => polarToCartesian({
    center: frame.center,
    theta: value,
    radius: radius[index]
  }));
  const colorDomain = firstAppearance(validRows.map(row => row[colorField]));
  const colorByValue = new Map(colorDomain.map((value, index) => [
    value,
    TABLEAU10[index % TABLEAU10.length]
  ]));

  return Object.freeze({
    validRows,
    frame,
    thetaDomain: Object.freeze(thetaDomain),
    radiusDomain: Object.freeze(radiusDomain),
    thetaRange: Object.freeze([...validatedThetaRange]),
    radiusRange: Object.freeze([...validatedRadiusRange]),
    colorDomain: Object.freeze(colorDomain),
    x: Object.freeze(positions.map(position => position.x)),
    y: Object.freeze(positions.map(position => position.y)),
    theta: Object.freeze(theta),
    radius: Object.freeze(radius),
    fill: Object.freeze(validRows.map(row => colorByValue.get(row[colorField]))),
    pointRadius,
    opacity
  });
}

export const POLAR_COLORS = TABLEAU10;
