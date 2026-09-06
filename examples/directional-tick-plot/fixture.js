export const DIRECTION_LAYOUT = Object.freeze({
  panelWidth: 340,
  panelHeight: 360,
  gap: 20,
  padding: 6,
  center: Object.freeze({ x: 170, y: 210 }),
  anchorRadius: 80,
  labelRadius: 120,
  tickLength: 26,
  triangleRadius: 12
});

export const DIRECTIONAL_TRIANGLE_AREA = 3 * Math.sqrt(3) / 4 *
  DIRECTION_LAYOUT.triangleRadius ** 2;

export const DIRECTIONS = Object.freeze([
  Object.freeze({ label: "N · 0°", direction: 0 }),
  Object.freeze({ label: "NE · 45°", direction: 45 }),
  Object.freeze({ label: "E · 90°", direction: 90 }),
  Object.freeze({ label: "SE · 135°", direction: 135 }),
  Object.freeze({ label: "S · 180°", direction: 180 }),
  Object.freeze({ label: "SW · 225°", direction: 225 }),
  Object.freeze({ label: "W · 270°", direction: 270 }),
  Object.freeze({ label: "NW · 315°", direction: 315 })
]);

function pointAt(direction, radius) {
  const radians = direction * Math.PI / 180;
  return Object.freeze({
    x: DIRECTION_LAYOUT.center.x + Math.sin(radians) * radius,
    y: DIRECTION_LAYOUT.center.y - Math.cos(radians) * radius
  });
}

function mapDirectionPosition(value, channel) {
  const [rangeStart, rangeEnd] = channel === "x"
    ? [90, 250]
    : [290, 130];
  const proportion = (value - -1) / 2;
  return rangeStart + proportion * (rangeEnd - rangeStart);
}

export const DIRECTION_ROWS = Object.freeze(DIRECTIONS.map(item => {
  const x = Math.sin(item.direction * Math.PI / 180);
  const y = Math.cos(item.direction * Math.PI / 180);
  return Object.freeze({ ...item, x, y });
}));

export const ANCHORS = Object.freeze(DIRECTION_ROWS.map(row => Object.freeze({
  x: mapDirectionPosition(row.x, "x"),
  y: mapDirectionPosition(row.y, "y")
})));

export const LABELS = Object.freeze(DIRECTIONS.map(item => Object.freeze({
  ...pointAt(item.direction, DIRECTION_LAYOUT.labelRadius),
  text: item.label
})));

const CIRCLE_KAPPA = 0.5522847498307936;
const { x: CENTER_X, y: CENTER_Y } = DIRECTION_LAYOUT.center;
const RADIUS = DIRECTION_LAYOUT.anchorRadius;
const CONTROL = RADIUS * CIRCLE_KAPPA;

export const COMPASS_RING = Object.freeze([
  Object.freeze({ op: "M", x: CENTER_X, y: CENTER_Y - RADIUS }),
  Object.freeze({
    op: "C",
    x1: CENTER_X + CONTROL,
    y1: CENTER_Y - RADIUS,
    x2: CENTER_X + RADIUS,
    y2: CENTER_Y - CONTROL,
    x: CENTER_X + RADIUS,
    y: CENTER_Y
  }),
  Object.freeze({
    op: "C",
    x1: CENTER_X + RADIUS,
    y1: CENTER_Y + CONTROL,
    x2: CENTER_X + CONTROL,
    y2: CENTER_Y + RADIUS,
    x: CENTER_X,
    y: CENTER_Y + RADIUS
  }),
  Object.freeze({
    op: "C",
    x1: CENTER_X - CONTROL,
    y1: CENTER_Y + RADIUS,
    x2: CENTER_X - RADIUS,
    y2: CENTER_Y + CONTROL,
    x: CENTER_X - RADIUS,
    y: CENTER_Y
  }),
  Object.freeze({
    op: "C",
    x1: CENTER_X - RADIUS,
    y1: CENTER_Y - CONTROL,
    x2: CENTER_X - CONTROL,
    y2: CENTER_Y - RADIUS,
    x: CENTER_X,
    y: CENTER_Y - RADIUS
  }),
  Object.freeze({ op: "Z" })
]);

export const RUG_LAYOUT = Object.freeze({
  width: 800,
  height: 240,
  left: 60,
  right: 760,
  rugY: 150,
  axisY: 150,
  tickLength: 28,
  domain: Object.freeze([40, 240]),
  axisValues: Object.freeze([50, 100, 150, 200])
});

function mapHorsepower(horsepower) {
  const [domainStart, domainEnd] = RUG_LAYOUT.domain;
  return RUG_LAYOUT.left +
    (horsepower - domainStart) / (domainEnd - domainStart) *
    (RUG_LAYOUT.right - RUG_LAYOUT.left);
}

export function prepareHorsepowerRug(cars) {
  if (!Array.isArray(cars)) throw new TypeError("cars must be an array.");
  const rows = cars
    .filter(car => Number.isFinite(car?.Horsepower))
    .map((car, index) => Object.freeze({
      id: index,
      Horsepower: car.Horsepower
    }));
  return Object.freeze({
    rows: Object.freeze(rows),
    axisX: Object.freeze(RUG_LAYOUT.axisValues.map(mapHorsepower)),
    labels: Object.freeze(RUG_LAYOUT.axisValues.map(String))
  });
}
