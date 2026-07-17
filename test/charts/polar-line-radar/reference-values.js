const KAPPA = 0.5522847498307936;

export const POLAR_LINE_COLORS = Object.freeze([
  "#4c78a8",
  "#f58518",
  "#e45756"
]);

export const GAPMINDER_POLAR_TARGET = Object.freeze({
  width: 760,
  height: 620,
  margin: Object.freeze({ top: 70, right: 190, bottom: 70, left: 70 }),
  countries: Object.freeze(["India", "Japan", "South Africa"]),
  thetaDomain: Object.freeze([1955, 2005]),
  thetaRange: Object.freeze([0, 330]),
  thetaTicks: Object.freeze([1955, 1965, 1975, 1985, 1995, 2005]),
  radiusDomain: Object.freeze([25, 85]),
  radiusTicks: Object.freeze([30, 40, 50, 60, 70, 80])
});

export const JOBS_RADAR_ROLES = Object.freeze([
  "Accounting",
  "Architecture",
  "Engineering",
  "Law",
  "Management",
  "Nursing",
  "Secretarial",
  "Teaching"
]);

export const JOBS_RADAR_TARGET = Object.freeze({
  width: 820,
  height: 650,
  margin: Object.freeze({ top: 90, right: 190, bottom: 90, left: 90 }),
  year: 2000,
  roles: JOBS_RADAR_ROLES,
  radiusDomain: Object.freeze([0, 1]),
  radiusTicks: Object.freeze([0, 0.25, 0.5, 0.75, 1]),
  sexes: Object.freeze(["men", "women"])
});

const JOB_ROLE_BY_LABEL = Object.freeze({
  Accounting: "Accountant / Auditor",
  Architecture: "Architect",
  Engineering: "Engineer",
  Law: "Lawyer / Judge",
  Management: "Manager / Owner",
  Nursing: "Nurse",
  Secretarial: "Secretary",
  Teaching: "Teacher"
});

function mapLinear(value, domain, range) {
  if (![...domain, ...range, value].every(Number.isFinite)) {
    throw new TypeError("Linear mapping requires finite values.");
  }
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
}

function createFrame(target) {
  const plotWidth = target.width - target.margin.left - target.margin.right;
  const plotHeight = target.height - target.margin.top - target.margin.bottom;
  return {
    cx: target.margin.left + plotWidth / 2,
    cy: target.margin.top + plotHeight / 2,
    radius: Math.min(plotWidth, plotHeight) / 2
  };
}

function polarPoint(theta, radius, frame) {
  const radians = theta * Math.PI / 180;
  return {
    x: frame.cx + radius * Math.sin(radians),
    y: frame.cy - radius * Math.cos(radians)
  };
}

function circleCommands(frame, radius) {
  const control = radius * KAPPA;
  const { cx, cy } = frame;
  return [
    { op: "M", x: cx, y: cy - radius },
    {
      op: "C",
      x1: cx + control,
      y1: cy - radius,
      x2: cx + radius,
      y2: cy - control,
      x: cx + radius,
      y: cy
    },
    {
      op: "C",
      x1: cx + radius,
      y1: cy + control,
      x2: cx + control,
      y2: cy + radius,
      x: cx,
      y: cy + radius
    },
    {
      op: "C",
      x1: cx - control,
      y1: cy + radius,
      x2: cx - radius,
      y2: cy + control,
      x: cx - radius,
      y: cy
    },
    {
      op: "C",
      x1: cx - radius,
      y1: cy - control,
      x2: cx - control,
      y2: cy - radius,
      x: cx,
      y: cy - radius
    },
    { op: "Z" }
  ];
}

function perimeterTextStyle(theta) {
  const radians = theta * Math.PI / 180;
  const horizontal = Math.sin(radians);
  const vertical = Math.cos(radians);
  return {
    textAlign: horizontal > 0.25 ? "left" : horizontal < -0.25 ? "right" : "center",
    textBaseline: vertical > 0.25 ? "bottom" : vertical < -0.25 ? "top" : "middle"
  };
}

function categoricalAngles(domain) {
  if (!Array.isArray(domain) || domain.length === 0) {
    throw new TypeError("Categorical theta requires a non-empty domain.");
  }
  const step = 360 / domain.length;
  return domain.map((_, index) => step / 2 + index * step);
}

function resolveTheta(value, theta) {
  if (theta.type === "continuous") {
    return mapLinear(value, theta.domain, theta.range);
  }
  const index = theta.domain.indexOf(value);
  if (index < 0) throw new Error(`Unknown theta value "${value}".`);
  return categoricalAngles(theta.domain)[index];
}

export function buildPolarSeriesCommands({
  rows,
  groupField,
  thetaField,
  radiusField,
  theta,
  radiusDomain,
  frame,
  closed = false
}) {
  if (!Array.isArray(rows)) throw new TypeError("Polar series requires rows.");
  if (rows.length === 0) return [];
  if (typeof groupField !== "string" || typeof thetaField !== "string" ||
      typeof radiusField !== "string") {
    throw new TypeError("Polar series requires group, theta, and radius fields.");
  }
  if (theta?.type === "continuous") {
    if (!Array.isArray(theta.domain) || !Array.isArray(theta.range)) {
      throw new TypeError("Continuous theta requires domain and range.");
    }
  } else if (theta?.type !== "categorical" || !Array.isArray(theta.domain)) {
    throw new TypeError("Polar series requires continuous or categorical theta.");
  }
  if (!Array.isArray(radiusDomain) || radiusDomain.length !== 2) {
    throw new TypeError("Polar series requires a radius domain.");
  }
  if (![frame?.cx, frame?.cy, frame?.radius].every(Number.isFinite)) {
    throw new TypeError("Polar series requires a finite frame.");
  }

  const groups = new Map();
  rows.forEach((row, sourceIndex) => {
    const key = row?.[groupField];
    const thetaValue = row?.[thetaField];
    const radiusValue = row?.[radiusField];
    if ((typeof key !== "string" && typeof key !== "number") ||
        !Number.isFinite(radiusValue) ||
        (theta.type === "continuous" && !Number.isFinite(thetaValue))) {
      throw new TypeError("Polar series rows require valid group and position values.");
    }
    resolveTheta(thetaValue, theta);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, sourceIndex, thetaValue, radiusValue });
  });

  return Array.from(groups, ([key, values]) => {
    const sorted = values.slice().sort((left, right) => {
      const leftTheta = resolveTheta(left.thetaValue, theta);
      const rightTheta = resolveTheta(right.thetaValue, theta);
      return leftTheta - rightTheta || left.sourceIndex - right.sourceIndex;
    });
    const points = sorted.map(value => polarPoint(
      resolveTheta(value.thetaValue, theta),
      mapLinear(value.radiusValue, radiusDomain, [0, frame.radius]),
      frame
    ));
    const commands = points.map((point, index) => ({
      op: index === 0 ? "M" : "L",
      ...point
    }));
    if (closed && commands.length > 1) commands.push({ op: "Z" });
    return {
      key,
      rows: sorted.map(value => value.row),
      points,
      commands
    };
  });
}

function buildGuides({
  frame,
  thetaValues,
  thetaAngles,
  radiusValues,
  radiusDomain,
  thetaTitle,
  radialTitle
}) {
  const radialPositions = radiusValues.map(value =>
    mapLinear(value, radiusDomain, [0, frame.radius])
  );
  const thetaGrid = thetaAngles.map(angle => ({
    start: polarPoint(angle, 0, frame),
    end: polarPoint(angle, frame.radius, frame)
  }));
  const thetaTicks = thetaAngles.map(angle => ({
    start: polarPoint(angle, frame.radius, frame),
    end: polarPoint(angle, frame.radius + 6, frame)
  }));
  const thetaLabels = thetaAngles.map((angle, index) => ({
    ...polarPoint(angle, frame.radius + 18, frame),
    text: String(thetaValues[index]),
    ...perimeterTextStyle(angle)
  }));
  const radialAxisAngle = 90;
  const radialAxis = {
    start: polarPoint(radialAxisAngle, 0, frame),
    end: polarPoint(radialAxisAngle, frame.radius, frame)
  };
  const radialTicks = radialPositions.map(position => {
    const center = polarPoint(radialAxisAngle, position, frame);
    return {
      start: { x: center.x, y: center.y - 4 },
      end: { x: center.x, y: center.y + 4 }
    };
  });
  const radialLabels = radialPositions.map((position, index) => {
    const center = polarPoint(radialAxisAngle, position, frame);
    return {
      x: center.x,
      y: center.y - 10,
      text: String(radiusValues[index]),
      textAlign: "center",
      textBaseline: "bottom"
    };
  });
  return {
    thetaGrid,
    radialGridCommands: radialPositions
      .filter(position => position > 0)
      .map(position => circleCommands(frame, position)),
    thetaAxisCommands: circleCommands(frame, frame.radius),
    thetaTicks,
    thetaLabels,
    thetaTitle: {
      x: frame.cx,
      y: frame.cy + frame.radius + 42,
      text: thetaTitle
    },
    radialAxis,
    radialTicks,
    radialLabels,
    radialTitle: {
      x: frame.cx + frame.radius / 2,
      y: frame.cy + 8,
      text: radialTitle
    }
  };
}

function buildLegend(target, domain, title, colors) {
  const plotRight = target.width - target.margin.right;
  const x = plotRight + 30;
  return {
    domain,
    title,
    strokes: colors.slice(0, domain.length),
    x1: domain.map(() => x),
    x2: domain.map(() => x + 32),
    labelX: domain.map(() => x + 42),
    itemY: domain.map((_, index) => target.margin.top + 52 + index * 28),
    titleX: x,
    titleY: target.margin.top + 20
  };
}

export function createGapminderPolarLineReference(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Gapminder Polar line reference requires rows.");
  }
  const validRows = rows.filter(row =>
    GAPMINDER_POLAR_TARGET.countries.includes(row?.country) &&
    Number.isFinite(row?.year) &&
    row.year >= GAPMINDER_POLAR_TARGET.thetaDomain[0] &&
    row.year <= GAPMINDER_POLAR_TARGET.thetaDomain[1] &&
    Number.isFinite(row?.life_expect)
  );
  validRows.sort((left, right) =>
    GAPMINDER_POLAR_TARGET.countries.indexOf(left.country) -
      GAPMINDER_POLAR_TARGET.countries.indexOf(right.country) ||
    left.year - right.year
  );
  if (validRows.length !== 33) {
    throw new Error("Gapminder Polar line reference requires 33 selected rows.");
  }
  const frame = createFrame(GAPMINDER_POLAR_TARGET);
  const theta = {
    type: "continuous",
    domain: GAPMINDER_POLAR_TARGET.thetaDomain,
    range: GAPMINDER_POLAR_TARGET.thetaRange
  };
  const series = buildPolarSeriesCommands({
    rows: validRows,
    groupField: "country",
    thetaField: "year",
    radiusField: "life_expect",
    theta,
    radiusDomain: GAPMINDER_POLAR_TARGET.radiusDomain,
    frame
  }).map((value, index) => ({ ...value, stroke: POLAR_LINE_COLORS[index] }));
  const thetaAngles = GAPMINDER_POLAR_TARGET.thetaTicks.map(value =>
    mapLinear(
      value,
      GAPMINDER_POLAR_TARGET.thetaDomain,
      GAPMINDER_POLAR_TARGET.thetaRange
    )
  );
  return {
    validRows,
    frame,
    series,
    ...buildGuides({
      frame,
      thetaValues: GAPMINDER_POLAR_TARGET.thetaTicks,
      thetaAngles,
      radiusValues: GAPMINDER_POLAR_TARGET.radiusTicks,
      radiusDomain: GAPMINDER_POLAR_TARGET.radiusDomain,
      thetaTitle: "Year",
      radialTitle: "Life expectancy"
    }),
    legend: buildLegend(
      GAPMINDER_POLAR_TARGET,
      GAPMINDER_POLAR_TARGET.countries,
      "country",
      POLAR_LINE_COLORS
    )
  };
}

export function createJobsRadarReference(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Jobs radar reference requires rows.");
  }
  const radarRows = JOBS_RADAR_TARGET.roles.flatMap(role => {
    const sourceJob = JOB_ROLE_BY_LABEL[role];
    const source = rows.filter(row =>
      row?.year === JOBS_RADAR_TARGET.year && row?.job === sourceJob &&
      JOBS_RADAR_TARGET.sexes.includes(row?.sex) && Number.isFinite(row?.count)
    );
    if (source.length !== 2) {
      throw new Error(`Jobs radar reference requires two rows for "${sourceJob}".`);
    }
    const total = source.reduce((sum, row) => sum + row.count, 0);
    if (!(total > 0)) {
      throw new Error(`Jobs radar reference requires positive counts for "${sourceJob}".`);
    }
    return JOBS_RADAR_TARGET.sexes.map(sex => {
      const count = source.find(row => row.sex === sex)?.count;
      if (!Number.isFinite(count)) {
        throw new Error(`Jobs radar reference requires "${sex}" for "${sourceJob}".`);
      }
      return { role, sex, share: count / total };
    });
  });
  const frame = createFrame(JOBS_RADAR_TARGET);
  const theta = {
    type: "categorical",
    domain: JOBS_RADAR_TARGET.roles
  };
  const thetaAngles = categoricalAngles(JOBS_RADAR_TARGET.roles);
  const series = buildPolarSeriesCommands({
    rows: radarRows,
    groupField: "sex",
    thetaField: "role",
    radiusField: "share",
    theta,
    radiusDomain: JOBS_RADAR_TARGET.radiusDomain,
    frame,
    closed: true
  }).map((value, index) => ({ ...value, stroke: POLAR_LINE_COLORS[index] }));
  return {
    radarRows,
    frame,
    series,
    ...buildGuides({
      frame,
      thetaValues: JOBS_RADAR_TARGET.roles,
      thetaAngles,
      radiusValues: JOBS_RADAR_TARGET.radiusTicks,
      radiusDomain: JOBS_RADAR_TARGET.radiusDomain,
      thetaTitle: "Occupation",
      radialTitle: "Share"
    }),
    legend: buildLegend(
      JOBS_RADAR_TARGET,
      JOBS_RADAR_TARGET.sexes,
      "Sex",
      POLAR_LINE_COLORS
    )
  };
}
