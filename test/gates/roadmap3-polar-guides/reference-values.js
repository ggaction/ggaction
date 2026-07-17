const KAPPA = 0.5522847498307936;

export const POLAR_GUIDE_TARGET = Object.freeze({
  width: 620,
  height: 620,
  margin: 78,
  thetaCount: 6,
  radiusCount: 5,
  radialAxisAngle: 90,
  thetaTicks: Object.freeze([9, 12, 15, 18, 21, 24]),
  radiusTicks: Object.freeze([0, 50, 100, 150, 200])
});

function finiteExtent(values, label) {
  if (!Array.isArray(values) || values.length === 0 || !values.every(Number.isFinite)) {
    throw new TypeError(`${label} requires finite values.`);
  }
  return [Math.min(...values), Math.max(...values)];
}

function mapLinear(value, domain, range) {
  if (domain[0] === domain[1]) return (range[0] + range[1]) / 2;
  const ratio = (value - domain[0]) / (domain[1] - domain[0]);
  return range[0] + ratio * (range[1] - range[0]);
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

export function createCarsPolarGuideReference(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError("Cars Polar guide reference requires rows.");
  }
  const validRows = rows.filter(row =>
    Number.isFinite(row?.Acceleration) &&
    Number.isFinite(row?.Horsepower) &&
    typeof row?.Origin === "string" &&
    row.Origin.length > 0
  );
  if (validRows.length === 0) {
    throw new Error("Cars Polar guide reference requires valid rows.");
  }

  const thetaDomain = finiteExtent(
    validRows.map(row => row.Acceleration),
    "Theta domain"
  );
  const radiusExtent = finiteExtent(
    validRows.map(row => row.Horsepower),
    "Radius domain"
  );
  const radiusDomain = [0, radiusExtent[1]];
  const frame = {
    cx: POLAR_GUIDE_TARGET.width / 2,
    cy: POLAR_GUIDE_TARGET.height / 2,
    radius: (
      Math.min(POLAR_GUIDE_TARGET.width, POLAR_GUIDE_TARGET.height) -
      POLAR_GUIDE_TARGET.margin * 2
    ) / 2
  };

  const theta = POLAR_GUIDE_TARGET.thetaTicks.map(value =>
    mapLinear(value, thetaDomain, [0, 360])
  );
  const radialPositions = POLAR_GUIDE_TARGET.radiusTicks.map(value =>
    mapLinear(value, radiusDomain, [0, frame.radius])
  );
  const thetaGrid = theta.map(value => ({
    start: polarPoint(value, 0, frame),
    end: polarPoint(value, frame.radius, frame)
  }));
  const radialGridRadii = radialPositions.filter(radius => radius > 0);
  const thetaTicks = theta.map(value => ({
    start: polarPoint(value, frame.radius, frame),
    end: polarPoint(value, frame.radius + 6, frame)
  }));
  const thetaLabels = theta.map((value, index) => ({
    ...polarPoint(value, frame.radius + 18, frame),
    text: String(POLAR_GUIDE_TARGET.thetaTicks[index]),
    ...perimeterTextStyle(value)
  }));
  const radialAxisStart = polarPoint(POLAR_GUIDE_TARGET.radialAxisAngle, 0, frame);
  const radialAxisEnd = polarPoint(
    POLAR_GUIDE_TARGET.radialAxisAngle,
    frame.radius,
    frame
  );
  const radialTicks = radialPositions.map(radius => {
    const center = polarPoint(POLAR_GUIDE_TARGET.radialAxisAngle, radius, frame);
    return {
      start: { x: center.x, y: center.y - 4 },
      end: { x: center.x, y: center.y + 4 }
    };
  });
  const radialLabels = radialPositions.map((radius, index) => {
    const center = polarPoint(POLAR_GUIDE_TARGET.radialAxisAngle, radius, frame);
    return {
      x: center.x,
      y: center.y - 10,
      text: String(POLAR_GUIDE_TARGET.radiusTicks[index]),
      textAlign: "center",
      textBaseline: "bottom"
    };
  });

  return {
    validRows,
    frame,
    thetaDomain,
    radiusDomain,
    theta,
    radialPositions,
    thetaGrid,
    radialGridRadii,
    radialGridCommands: radialGridRadii.map(radius =>
      circleCommands(frame, radius)
    ),
    thetaAxisCommands: circleCommands(frame, frame.radius),
    thetaTicks,
    thetaLabels,
    radialAxis: { start: radialAxisStart, end: radialAxisEnd },
    radialTicks,
    radialLabels,
    thetaTitle: {
      x: frame.cx,
      y: frame.cy + frame.radius + 58,
      text: "Acceleration"
    },
    radialTitle: {
      x: frame.cx + frame.radius / 2,
      y: frame.cy + 28,
      text: "Horsepower"
    }
  };
}
