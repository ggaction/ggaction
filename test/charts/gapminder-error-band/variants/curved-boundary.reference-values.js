import { createGapminderErrorBandReferenceValues } from
  "../reference-values.js";

export const CURVED_BOUNDARY_STYLE = Object.freeze({
  bandCurve: "cardinal",
  stroke: "#25364d",
  strokeWidth: 1.4,
  strokeDash: Object.freeze([6, 3]),
  opacity: 0.8
});

function freezeCommands(commands) {
  return Object.freeze(commands.map(command => Object.freeze(command)));
}

function requirePoints(points, label) {
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(point =>
      point !== null &&
      typeof point === "object" &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  ) {
    throw new TypeError(`${label} requires at least two finite points.`);
  }
  return points;
}

export function createCardinalReferenceCommands(points) {
  requirePoints(points, "Cardinal reference");
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];

  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    commands.push({
      op: "C",
      x1: current.x + (next.x - before.x) / 6,
      y1: current.y + (next.y - before.y) / 6,
      x2: next.x - (after.x - current.x) / 6,
      y2: next.y - (after.y - current.y) / 6,
      x: next.x,
      y: next.y
    });
  }

  return freezeCommands(commands);
}

export function createStepReferenceCommands(points) {
  requirePoints(points, "Step reference");
  const commands = [{ op: "M", x: points[0].x, y: points[0].y }];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midpoint = (previous.x + current.x) / 2;
    commands.push(
      { op: "L", x: midpoint, y: previous.y },
      { op: "L", x: midpoint, y: current.y },
      { op: "L", x: current.x, y: current.y }
    );
  }

  return freezeCommands(commands);
}

function closeBand(lower, upperReversed) {
  const lowerCommands = createCardinalReferenceCommands(lower);
  const upperCommands = createCardinalReferenceCommands(upperReversed);
  return freezeCommands([
    ...lowerCommands,
    {
      op: "L",
      x: upperCommands[0].x,
      y: upperCommands[0].y
    },
    ...upperCommands.slice(1),
    { op: "Z" }
  ]);
}

function boundaryCommands(points, curve) {
  if (curve === "cardinal") return createCardinalReferenceCommands(points);
  if (curve === "step") return createStepReferenceCommands(points);
  throw new Error(`Unsupported error-band boundary curve "${curve}".`);
}

export function createCurvedBoundaryReferenceValues(
  gapminder,
  { boundaryCurve = CURVED_BOUNDARY_STYLE.bandCurve } = {}
) {
  const baseline = createGapminderErrorBandReferenceValues(gapminder);
  const series = Object.freeze(baseline.series.map(item => {
    const count = item.values.length;
    const lower = item.points.slice(0, count);
    const upperReversed = item.points.slice(count);
    const upper = [...upperReversed].reverse();
    return Object.freeze({
      cluster: item.cluster,
      areaCommands: closeBand(lower, upperReversed),
      lowerCommands: boundaryCommands(lower, boundaryCurve),
      upperCommands: boundaryCommands(upper, boundaryCurve)
    });
  }));

  return Object.freeze({
    baseline,
    boundaryCurve,
    style: CURVED_BOUNDARY_STYLE,
    series
  });
}
