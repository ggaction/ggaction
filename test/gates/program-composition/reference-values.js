import { resolveCompositionLayout } from
  "../../../src/layout/composition.js";

const COLORS = Object.freeze({
  USA: "#4c78a8",
  Europe: "#f58518",
  Japan: "#e45756",
  men: "#4c78a8",
  women: "#f58518",
  China: "#e45756",
  India: "#54a24b",
  "United States": "#4c78a8"
});

const FONT = "Arial, sans-serif";

function mapLinear(value, domain, range) {
  return range[0] + (value - domain[0]) / (domain[1] - domain[0]) *
    (range[1] - range[0]);
}

function text(text, x, y, options = {}) {
  return {
    type: "text",
    properties: {
      x,
      y,
      text,
      fill: options.fill ?? "#334155",
      fontSize: options.fontSize ?? 10,
      fontFamily: FONT,
      fontWeight: options.fontWeight ?? "normal",
      textAlign: options.textAlign ?? "left",
      textBaseline: options.textBaseline ?? "alphabetic",
      opacity: options.opacity ?? 1
    }
  };
}

function line(x1, y1, x2, y2, options = {}) {
  return {
    type: "line",
    properties: {
      x1,
      y1,
      x2,
      y2,
      stroke: options.stroke ?? "#94a3b8",
      strokeWidth: options.strokeWidth ?? 1,
      strokeDash: options.strokeDash ?? [],
      opacity: options.opacity ?? 1
    }
  };
}

function createScatterItems(cars) {
  const rows = cars.filter(row =>
    Number.isFinite(row.Horsepower) &&
    Number.isFinite(row.Miles_per_Gallon) &&
    COLORS[row.Origin] !== undefined
  ).filter((_, index) => index % 7 === 0).slice(0, 48);
  const items = [
    text("Cars: efficiency vs horsepower", 20, 18, {
      fontSize: 15,
      fontWeight: 700,
      textBaseline: "top"
    }),
    line(50, 270, 420, 270, { stroke: "#64748b", strokeWidth: 1.25 }),
    line(50, 45, 50, 270, { stroke: "#64748b", strokeWidth: 1.25 }),
    text("Horsepower", 235, 300, { textAlign: "center", fontSize: 11 }),
    text("MPG", 16, 155, { textAlign: "center", fontSize: 11 })
  ];
  for (const row of rows) {
    items.push({
      type: "circle",
      properties: {
        x: mapLinear(row.Horsepower, [46, 230], [58, 412]),
        y: mapLinear(row.Miles_per_Gallon, [9, 46.6], [262, 54]),
        radius: 3.25,
        fill: COLORS[row.Origin],
        stroke: "white",
        strokeWidth: 0.45,
        opacity: 0.88
      }
    });
  }
  return items;
}

function createBarItems(jobs) {
  const years = [1940, 1960, 1980, 2000];
  const rows = jobs.filter(row =>
    row.job === "Accountant / Auditor" &&
    years.includes(row.year) &&
    (row.sex === "men" || row.sex === "women") &&
    Number.isFinite(row.perc)
  );
  const maximum = Math.max(...rows.map(row => row.perc));
  const baseline = 194;
  const top = 48;
  const centers = new Map(years.map((year, index) => [year, 62 + index * 66]));
  const items = [
    text("Jobs: accountant share", 16, 16, {
      fontSize: 14,
      fontWeight: 700,
      textBaseline: "top"
    }),
    line(36, baseline, 282, baseline, { stroke: "#64748b", strokeWidth: 1.2 }),
    line(36, top, 36, baseline, { stroke: "#64748b", strokeWidth: 1.2 }),
    text("men", 176, 30, { fill: COLORS.men }),
    text("women", 222, 30, { fill: COLORS.women })
  ];
  for (const row of rows) {
    const height = mapLinear(row.perc, [0, maximum], [0, baseline - top]);
    const x = centers.get(row.year) + (row.sex === "men" ? -17 : 1);
    items.push({
      type: "rect",
      properties: {
        x,
        y: baseline - height,
        width: 15,
        height,
        fill: COLORS[row.sex],
        stroke: "white",
        strokeWidth: 0.5,
        opacity: 0.95
      }
    });
  }
  for (const year of years) {
    items.push(text(String(year), centers.get(year), 213, {
      textAlign: "center",
      fontSize: 9
    }));
  }
  return items;
}

function createTrendItems(gapminder) {
  const countries = ["China", "India", "United States"];
  const rows = gapminder.filter(row =>
    countries.includes(row.country) &&
    Number.isFinite(row.year) &&
    Number.isFinite(row.life_expect)
  );
  const items = [
    text("Gapminder: life expectancy", 18, 14, {
      fontSize: 14,
      fontWeight: 700,
      textBaseline: "top"
    }),
    line(48, 176, 580, 176, { stroke: "#64748b", strokeWidth: 1.2 }),
    line(48, 38, 48, 176, { stroke: "#64748b", strokeWidth: 1.2 })
  ];
  for (const country of countries) {
    const series = rows.filter(row => row.country === country)
      .sort((left, right) => left.year - right.year);
    const commands = series.map((row, index) => ({
      op: index === 0 ? "M" : "L",
      x: mapLinear(row.year, [1955, 2005], [52, 574]),
      y: mapLinear(row.life_expect, [25, 82], [170, 44])
    }));
    items.push({
      type: "path",
      properties: {
        commands,
        stroke: COLORS[country],
        strokeWidth: 2.2,
        strokeDash: [],
        opacity: 0.95
      }
    });
  }
  countries.forEach((country, index) => {
    items.push(text(country, 310 + index * 88, 28, {
      fill: COLORS[country],
      fontSize: 9
    }));
  });
  return items;
}

function polarPoint(center, theta, radius) {
  const radians = theta * Math.PI / 180;
  return {
    x: center.x + radius * Math.sin(radians),
    y: center.y - radius * Math.cos(radians)
  };
}

function cubicArc(center, radius, startTheta, endTheta) {
  const count = Math.ceil(Math.abs(endTheta - startTheta) / 90);
  const delta = (endTheta - startTheta) / count;
  const commands = [];
  for (let index = 0; index < count; index += 1) {
    const start = startTheta + delta * index;
    const end = start + delta;
    const startRadians = start * Math.PI / 180;
    const endRadians = end * Math.PI / 180;
    const control = 4 / 3 * Math.tan((endRadians - startRadians) / 4);
    const to = polarPoint(center, end, radius);
    commands.push({
      op: "C",
      x1: polarPoint(center, start, radius).x +
        control * radius * Math.cos(startRadians),
      y1: polarPoint(center, start, radius).y +
        control * radius * Math.sin(startRadians),
      x2: to.x - control * radius * Math.cos(endRadians),
      y2: to.y - control * radius * Math.sin(endRadians),
      x: to.x,
      y: to.y
    });
  }
  return commands;
}

function sectorCommands(center, startTheta, endTheta, innerRadius, outerRadius) {
  const outerStart = polarPoint(center, startTheta, outerRadius);
  const innerEnd = polarPoint(center, endTheta, innerRadius);
  return [
    { op: "M", x: outerStart.x, y: outerStart.y },
    ...cubicArc(center, outerRadius, startTheta, endTheta),
    { op: "L", x: innerEnd.x, y: innerEnd.y },
    ...cubicArc(center, innerRadius, endTheta, startTheta),
    { op: "Z" }
  ];
}

function createDonutItems(cars) {
  const order = ["USA", "Europe", "Japan"];
  const counts = new Map(order.map(origin => [origin, 0]));
  for (const row of cars) {
    if (counts.has(row.Origin)) counts.set(row.Origin, counts.get(row.Origin) + 1);
  }
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  const center = { x: 104, y: 146 };
  let cursor = 0;
  const items = [
    text("Cars by origin", 16, 16, {
      fontSize: 14,
      fontWeight: 700,
      textBaseline: "top"
    })
  ];
  order.forEach((origin, index) => {
    const end = cursor + counts.get(origin) / total * 360;
    items.push({
      type: "path",
      properties: {
        commands: sectorCommands(center, cursor, end, 43, 82),
        fill: COLORS[origin],
        stroke: "white",
        strokeWidth: 1,
        strokeDash: [],
        opacity: 0.96
      }
    });
    items.push(text(origin, 203, 104 + index * 25, {
      fill: COLORS[origin],
      fontSize: 10
    }));
    cursor = end;
  });
  return items;
}

export function createCompositionGateValues({ cars, jobs, gapminder }) {
  const overview = resolveCompositionLayout({
    direction: "horizontal",
    children: [
      { id: "main", width: 440, height: 320 },
      { id: "detail", width: 300, height: 240 }
    ],
    gap: 20,
    align: "start",
    padding: 16
  });
  const nested = resolveCompositionLayout({
    direction: "vertical",
    children: [
      { id: "overview", width: overview.width, height: overview.height },
      { id: "trend", width: 600, height: 220 }
    ],
    gap: 18,
    align: "center",
    padding: 14
  });
  const replacement = resolveCompositionLayout({
    direction: "horizontal",
    children: [
      { id: "main", width: 440, height: 320 },
      { id: "detail", width: 280, height: 280 }
    ],
    gap: 28,
    align: "start",
    padding: 12
  });
  return Object.freeze({
    overview,
    nested,
    replacement,
    scatterItems: createScatterItems(cars),
    barItems: createBarItems(jobs),
    trendItems: createTrendItems(gapminder),
    donutItems: createDonutItems(cars)
  });
}
