const MAX_ARC_SWEEP = 90;
const KAPPA = 0.5522847498307936;

export const MONTH_ORDER = Object.freeze([
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March"
]);

export const CAUSE_ORDER = Object.freeze([
  "Zymotic Diseases",
  "Other Causes",
  "Wounds & Injuries"
]);

export const NIGHTINGALE_COLORS = Object.freeze([
  "#599ad3",
  "#727272",
  "#f1595f"
]);

export const ORIGIN_ORDER = Object.freeze(["USA", "Europe", "Japan"]);
export const ORIGIN_COLORS = Object.freeze(["#4c78a8", "#f58518", "#e45756"]);

export const RADIAL_COUNTRY_ORDER = Object.freeze([
  "Afghanistan",
  "India",
  "France",
  "Germany",
  "South Africa",
  "Nigeria",
  "Argentina",
  "Canada",
  "China",
  "Japan",
  "Egypt",
  "Israel"
]);

export const CLUSTER_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756",
  "#72b7b2",
  "#54a24b",
  "#eeca3b"
]);

export const CARS_DONUT_TARGET = Object.freeze({
  width: 640,
  height: 500,
  margin: Object.freeze({ top: 55, right: 190, bottom: 55, left: 55 }),
  innerRadius: 0.56,
  padAngle: 1.5
});

export const NIGHTINGALE_TARGET = Object.freeze({
  width: 780,
  height: 640,
  margin: Object.freeze({ top: 80, right: 210, bottom: 80, left: 80 }),
  radiusDomain: Object.freeze([0, 6.5]),
  radiusTicks: Object.freeze([2, 4, 6]),
  padAngle: 1
});

export const GAPMINDER_RADIAL_TARGET = Object.freeze({
  width: 780,
  height: 640,
  margin: Object.freeze({ top: 75, right: 190, bottom: 75, left: 75 }),
  year: 2005,
  radiusDomain: Object.freeze([45, 85]),
  radiusTicks: Object.freeze([50, 60, 70, 80]),
  innerRadius: 0.18,
  padAngle: 2
});

function finite(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  return value;
}

function frameFor(target) {
  const plotWidth = target.width - target.margin.left - target.margin.right;
  const plotHeight = target.height - target.margin.top - target.margin.bottom;
  return Object.freeze({
    centerX: target.margin.left + plotWidth / 2,
    centerY: target.margin.top + plotHeight / 2,
    availableRadius: Math.min(plotWidth, plotHeight) / 2
  });
}

function mapLinear(value, domain, range) {
  finite(value, "Mapped value");
  if (![...domain, ...range].every(Number.isFinite) || domain[0] === domain[1]) {
    throw new TypeError("Linear mapping requires finite non-degenerate domains and ranges.");
  }
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

export function referencePolarPoint(frame, theta, radius) {
  const radians = theta * Math.PI / 180;
  return Object.freeze({
    x: frame.centerX + radius * Math.sin(radians),
    y: frame.centerY - radius * Math.cos(radians)
  });
}

function referenceArcCommands(frame, radius, startTheta, endTheta) {
  const sweep = endTheta - startTheta;
  const segmentCount = Math.ceil(Math.abs(sweep) / MAX_ARC_SWEEP);
  const delta = sweep / segmentCount;
  return Array.from({ length: segmentCount }, (_, index) => {
    const start = startTheta + delta * index;
    const end = start + delta;
    const startRadians = start * Math.PI / 180;
    const endRadians = end * Math.PI / 180;
    const control = 4 / 3 * Math.tan((endRadians - startRadians) / 4);
    const from = referencePolarPoint(frame, start, radius);
    const to = referencePolarPoint(frame, end, radius);
    return Object.freeze({
      op: "C",
      x1: from.x + control * radius * Math.cos(startRadians),
      y1: from.y + control * radius * Math.sin(startRadians),
      x2: to.x - control * radius * Math.cos(endRadians),
      y2: to.y - control * radius * Math.sin(endRadians),
      x: to.x,
      y: to.y
    });
  });
}

export function buildReferenceAnnularSectorCommands({
  frame,
  startTheta,
  endTheta,
  innerRadius = 0,
  outerRadius,
  padAngle = 0
}) {
  if (
    frame === null ||
    typeof frame !== "object" ||
    ![frame.centerX, frame.centerY, frame.availableRadius].every(Number.isFinite) ||
    frame.availableRadius < 0
  ) {
    throw new TypeError("Reference sector requires a finite Polar frame.");
  }
  if (![startTheta, endTheta, innerRadius, outerRadius, padAngle].every(Number.isFinite)) {
    throw new TypeError("Reference sector requires finite geometry values.");
  }
  const sweep = endTheta - startTheta;
  if (
    sweep === 0 ||
    Math.abs(sweep) > 360 ||
    innerRadius < 0 ||
    outerRadius <= innerRadius ||
    outerRadius > frame.availableRadius ||
    padAngle < 0 ||
    padAngle >= Math.abs(sweep)
  ) {
    throw new RangeError("Reference sector geometry is outside its valid range.");
  }
  const direction = Math.sign(sweep);
  const start = startTheta + direction * padAngle / 2;
  const end = endTheta - direction * padAngle / 2;
  const commands = [
    Object.freeze({ op: "M", ...referencePolarPoint(frame, start, outerRadius) }),
    ...referenceArcCommands(frame, outerRadius, start, end)
  ];
  if (innerRadius === 0) {
    commands.push(Object.freeze({ op: "L", x: frame.centerX, y: frame.centerY }));
  } else {
    commands.push(Object.freeze({
      op: "L",
      ...referencePolarPoint(frame, end, innerRadius)
    }));
    commands.push(...referenceArcCommands(frame, innerRadius, end, start));
  }
  commands.push(Object.freeze({ op: "Z" }));
  return Object.freeze(commands);
}

export function buildReferenceCircleCommands(frame, radius) {
  const { centerX: x, centerY: y } = frame;
  const control = radius * KAPPA;
  return Object.freeze([
    Object.freeze({ op: "M", x, y: y - radius }),
    Object.freeze({ op: "C", x1: x + control, y1: y - radius, x2: x + radius, y2: y - control, x: x + radius, y }),
    Object.freeze({ op: "C", x1: x + radius, y1: y + control, x2: x + control, y2: y + radius, x, y: y + radius }),
    Object.freeze({ op: "C", x1: x - control, y1: y + radius, x2: x - radius, y2: y + control, x: x - radius, y }),
    Object.freeze({ op: "C", x1: x - radius, y1: y - control, x2: x - control, y2: y - radius, x, y: y - radius }),
    Object.freeze({ op: "Z" })
  ]);
}

function perimeterLabel(frame, theta, radius, text) {
  const point = referencePolarPoint(frame, theta, radius);
  const radians = theta * Math.PI / 180;
  const horizontal = Math.sin(radians);
  const vertical = Math.cos(radians);
  return Object.freeze({
    ...point,
    text,
    textAlign: horizontal > 0.25 ? "left" : horizontal < -0.25 ? "right" : "center",
    textBaseline: vertical > 0.25 ? "bottom" : vertical < -0.25 ? "top" : "middle"
  });
}

function legendLayout(target, domain, colors, title) {
  const symbolX = target.width - target.margin.right + 42;
  const titleY = target.margin.top + 56;
  const itemY = domain.map((_, index) => titleY + 32 + index * 28);
  return Object.freeze({
    domain,
    colors,
    title,
    symbolX: domain.map(() => symbolX),
    symbolY: itemY.map(value => value - 7),
    symbolWidth: domain.map(() => 14),
    symbolHeight: domain.map(() => 14),
    labelX: domain.map(() => symbolX + 24),
    itemY: Object.freeze(itemY),
    titleX: symbolX,
    titleY
  });
}

function radialGuide(frame, ticks, domain, range) {
  const positions = ticks.map(value => mapLinear(value, domain, range));
  const startRadius = range[0];
  return Object.freeze({
    axis: Object.freeze({
      start: referencePolarPoint(frame, 90, startRadius),
      end: referencePolarPoint(frame, 90, frame.availableRadius)
    }),
    ticks: Object.freeze(positions.map(position => {
      const point = referencePolarPoint(frame, 90, position);
      return Object.freeze({
        start: Object.freeze({ x: point.x, y: point.y - 4 }),
        end: Object.freeze({ x: point.x, y: point.y + 4 })
      });
    })),
    labels: Object.freeze(positions.map((position, index) => {
      const point = referencePolarPoint(frame, 90, position);
      return Object.freeze({ x: point.x, y: point.y - 9, text: String(ticks[index]) });
    }))
  });
}

function categoricalBand(domain, value) {
  const index = domain.indexOf(value);
  if (index < 0) throw new Error(`Unknown categorical theta value "${value}".`);
  const step = 360 / domain.length;
  const center = index * step;
  return Object.freeze({ center, start: center - step / 2, end: center + step / 2 });
}

function requireRows(rows, label) {
  if (!Array.isArray(rows)) throw new TypeError(`${label} requires rows.`);
  return rows;
}

export function createCarsDonutReference(rows) {
  requireRows(rows, "Cars donut");
  const frame = frameFor(CARS_DONUT_TARGET);
  const counts = new Map(ORIGIN_ORDER.map(value => [value, 0]));
  for (const row of rows) {
    if (!counts.has(row?.Origin)) throw new Error("Cars donut found an unknown Origin.");
    counts.set(row.Origin, counts.get(row.Origin) + 1);
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  let startTheta = 0;
  const innerRadius = frame.availableRadius * CARS_DONUT_TARGET.innerRadius;
  const sectors = ORIGIN_ORDER.map((origin, index) => {
    const count = counts.get(origin);
    const endTheta = startTheta + count / total * 360;
    const sector = Object.freeze({
      key: origin,
      count,
      startTheta,
      endTheta,
      innerRadius,
      outerRadius: frame.availableRadius,
      fill: ORIGIN_COLORS[index],
      commands: buildReferenceAnnularSectorCommands({
        frame,
        startTheta,
        endTheta,
        innerRadius,
        outerRadius: frame.availableRadius,
        padAngle: CARS_DONUT_TARGET.padAngle
      })
    });
    startTheta = endTheta;
    return sector;
  });
  return Object.freeze({
    frame,
    rows,
    total,
    sectors: Object.freeze(sectors),
    legend: legendLayout(
      CARS_DONUT_TARGET,
      ORIGIN_ORDER,
      ORIGIN_COLORS,
      "Origin"
    )
  });
}

export function createNightingaleRoseReference(rows) {
  requireRows(rows, "Nightingale rose");
  const frame = frameFor(NIGHTINGALE_TARGET);
  const byKey = new Map(rows.map(row => [`${row.month}\u0000${row.cause}`, row]));
  if (byKey.size !== MONTH_ORDER.length * CAUSE_ORDER.length) {
    throw new Error("Nightingale rose requires one row per month and cause.");
  }
  const sectors = [];
  const orderedRows = [];
  for (const month of MONTH_ORDER) {
    const band = categoricalBand(MONTH_ORDER, month);
    const monthSectors = CAUSE_ORDER.map((cause, causeIndex) => {
      const row = byKey.get(`${month}\u0000${cause}`);
      if (row === undefined || !Number.isFinite(row.value) || row.value < 0) {
        throw new TypeError("Nightingale rose values must be non-negative finite numbers.");
      }
      const outerRadius = mapLinear(
        row.value,
        NIGHTINGALE_TARGET.radiusDomain,
        [0, frame.availableRadius]
      );
      orderedRows.push(row);
      return {
        key: `${month}:${cause}`,
        month,
        cause,
        causeIndex,
        value: row.value,
        startTheta: band.start,
        endTheta: band.end,
        innerRadius: 0,
        outerRadius,
        fill: NIGHTINGALE_COLORS[causeIndex]
      };
    }).filter(sector => sector.outerRadius > 0)
      .sort((left, right) => right.outerRadius - left.outerRadius || left.causeIndex - right.causeIndex);
    sectors.push(...monthSectors.map(sector => Object.freeze({
      ...sector,
      commands: buildReferenceAnnularSectorCommands({
        frame,
        startTheta: sector.startTheta,
        endTheta: sector.endTheta,
        outerRadius: sector.outerRadius,
        padAngle: NIGHTINGALE_TARGET.padAngle
      })
    })));
  }
  const radialGridCommands = NIGHTINGALE_TARGET.radiusTicks.map(value =>
    buildReferenceCircleCommands(frame, mapLinear(
      value,
      NIGHTINGALE_TARGET.radiusDomain,
      [0, frame.availableRadius]
    ))
  );
  const thetaLabels = MONTH_ORDER.map(month => {
    const band = categoricalBand(MONTH_ORDER, month);
    return perimeterLabel(frame, band.center, frame.availableRadius + 22, month);
  });
  const radialGuideValues = radialGuide(
    frame,
    NIGHTINGALE_TARGET.radiusTicks,
    NIGHTINGALE_TARGET.radiusDomain,
    [0, frame.availableRadius]
  );
  return Object.freeze({
    frame,
    rows: Object.freeze(orderedRows),
    sectors: Object.freeze(sectors),
    radialGridCommands: Object.freeze(radialGridCommands),
    thetaLabels: Object.freeze(thetaLabels),
    thetaAxisCommands: buildReferenceCircleCommands(frame, frame.availableRadius),
    radialAxis: radialGuideValues.axis,
    radialTicks: radialGuideValues.ticks,
    radialLabels: radialGuideValues.labels,
    legend: legendLayout(
      NIGHTINGALE_TARGET,
      CAUSE_ORDER,
      NIGHTINGALE_COLORS,
      "Cause"
    )
  });
}

export function createGapminderRadialBarReference(rows) {
  requireRows(rows, "Gapminder radial bars");
  const frame = frameFor(GAPMINDER_RADIAL_TARGET);
  const source = rows.filter(row =>
    row.year === GAPMINDER_RADIAL_TARGET.year && RADIAL_COUNTRY_ORDER.includes(row.country)
  );
  const byCountry = new Map(source.map(row => [row.country, row]));
  if (byCountry.size !== RADIAL_COUNTRY_ORDER.length) {
    throw new Error("Gapminder radial bars require every selected 2005 country.");
  }
  const innerRadius = frame.availableRadius * GAPMINDER_RADIAL_TARGET.innerRadius;
  const selectedRows = RADIAL_COUNTRY_ORDER.map(country => byCountry.get(country));
  const sectors = RADIAL_COUNTRY_ORDER.map(country => {
    const row = byCountry.get(country);
    if (!Number.isFinite(row.life_expect) || !Number.isInteger(row.cluster)) {
      throw new TypeError("Gapminder radial rows require finite values and integer clusters.");
    }
    const band = categoricalBand(RADIAL_COUNTRY_ORDER, country);
    const outerRadius = mapLinear(
      row.life_expect,
      GAPMINDER_RADIAL_TARGET.radiusDomain,
      [innerRadius, frame.availableRadius]
    );
    return Object.freeze({
      key: country,
      country,
      cluster: row.cluster,
      value: row.life_expect,
      startTheta: band.start,
      endTheta: band.end,
      innerRadius,
      outerRadius,
      fill: CLUSTER_COLORS[row.cluster],
      commands: buildReferenceAnnularSectorCommands({
        frame,
        startTheta: band.start,
        endTheta: band.end,
        innerRadius,
        outerRadius,
        padAngle: GAPMINDER_RADIAL_TARGET.padAngle
      })
    });
  });
  const radialGridCommands = GAPMINDER_RADIAL_TARGET.radiusTicks.map(value =>
    buildReferenceCircleCommands(frame, mapLinear(
      value,
      GAPMINDER_RADIAL_TARGET.radiusDomain,
      [innerRadius, frame.availableRadius]
    ))
  );
  const thetaLabels = RADIAL_COUNTRY_ORDER.map(country => {
    const band = categoricalBand(RADIAL_COUNTRY_ORDER, country);
    return perimeterLabel(frame, band.center, frame.availableRadius + 22, country);
  });
  const radialGuideValues = radialGuide(
    frame,
    GAPMINDER_RADIAL_TARGET.radiusTicks,
    GAPMINDER_RADIAL_TARGET.radiusDomain,
    [innerRadius, frame.availableRadius]
  );
  return Object.freeze({
    frame,
    rows: Object.freeze(selectedRows),
    sectors: Object.freeze(sectors),
    radialGridCommands: Object.freeze(radialGridCommands),
    thetaLabels: Object.freeze(thetaLabels),
    thetaAxisCommands: buildReferenceCircleCommands(frame, frame.availableRadius),
    radialAxis: radialGuideValues.axis,
    radialTicks: radialGuideValues.ticks,
    radialLabels: radialGuideValues.labels,
    thetaTitle: Object.freeze({
      x: frame.centerX,
      y: frame.centerY + frame.availableRadius + 54,
      text: "Country"
    }),
    radialTitle: Object.freeze({
      x: frame.centerX + frame.availableRadius + 12,
      y: frame.centerY + 24,
      text: "Life expectancy"
    }),
    legend: legendLayout(
      GAPMINDER_RADIAL_TARGET,
      Object.freeze(["0", "1", "2", "3", "4", "5"]),
      CLUSTER_COLORS,
      "Cluster"
    )
  });
}
