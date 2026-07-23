import {
  chart,
  render
} from "https://cdn.jsdelivr.net/npm/ggaction@0.0.7/+esm";

export const GGActionVersion = "0.0.7";

export const chartDescription =
  "Scatterplot of horsepower versus miles per gallon for ten illustrative " +
  "vehicles, colored by origin. Higher-horsepower vehicles generally have " +
  "lower fuel economy.";

export const cars = Object.freeze([
  Object.freeze({ horsepower: 52, mpg: 44, origin: "Japan" }),
  Object.freeze({ horsepower: 65, mpg: 36, origin: "Europe" }),
  Object.freeze({ horsepower: 70, mpg: 38, origin: "Japan" }),
  Object.freeze({ horsepower: 88, mpg: 27, origin: "USA" }),
  Object.freeze({ horsepower: 95, mpg: 31, origin: "Europe" }),
  Object.freeze({ horsepower: 105, mpg: 26, origin: "USA" }),
  Object.freeze({ horsepower: 110, mpg: 24, origin: "Europe" }),
  Object.freeze({ horsepower: 130, mpg: 21, origin: "USA" }),
  Object.freeze({ horsepower: 150, mpg: 18, origin: "USA" }),
  Object.freeze({ horsepower: 180, mpg: 15, origin: "USA" })
]);

export function normalizeChartWidth(availableWidth) {
  if (!Number.isFinite(availableWidth)) {
    throw new TypeError("availableWidth must be finite.");
  }

  return Math.max(280, Math.min(760, Math.floor(availableWidth)));
}

export function buildProgram(availableWidth) {
  const width = normalizeChartWidth(availableWidth);
  const height = Math.max(340, Math.min(440, Math.round(width * 0.61)));

  return chart()
    .createCanvas({
      width,
      height,
      margin: { top: 104, right: 94, bottom: 62, left: 66 },
      background: "#fffdfa"
    })
    .createData({
      id: "cars",
      values: cars
    })
    .createScatterPlot({
      id: "cars-points",
      x: "horsepower",
      y: "mpg",
      color: "origin",
      guides: false
    })
    .createGuides({
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per gallon" } }
      },
      legend: {
        channels: ["color"],
        title: "Origin"
      }
    })
    .createTitle({
      text: "Power and fuel economy",
      subtitle: "Ten illustrative vehicles",
      maxWidth: Math.max(140, Math.min(360, width - 100)),
      wrap: "word"
    });
}

export function flattenTrace(node, depth = 0, entries = []) {
  entries.push(Object.freeze({
    depth,
    op: node.op,
    description: node.description,
    args: node.args,
    childCount: node.children.length
  }));

  for (const child of node.children) {
    flattenTrace(child, depth + 1, entries);
  }

  return entries;
}

function element(name, properties = {}, text) {
  const node = document.createElement(name);

  for (const [property, value] of Object.entries(properties)) {
    if (property === "className") {
      node.className = value;
    } else {
      node.setAttribute(property, value);
    }
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function createDataTable() {
  const details = element("details", { className: "ggaction-data-fallback" });
  details.append(element("summary", {}, "View the chart data as a table"));

  const table = element("table");
  const caption = element(
    "caption",
    {},
    "Horsepower, fuel economy, and origin values shown in the chart"
  );
  const head = element("thead");
  const headRow = element("tr");

  for (const label of ["Horsepower", "Miles per gallon", "Origin"]) {
    headRow.append(element("th", { scope: "col" }, label));
  }

  head.append(headRow);
  table.append(caption, head);

  const body = element("tbody");
  for (const row of cars) {
    const bodyRow = element("tr");
    bodyRow.append(
      element("td", {}, String(row.horsepower)),
      element("td", {}, String(row.mpg)),
      element("td", {}, row.origin)
    );
    body.append(bodyRow);
  }

  table.append(body);
  details.append(table);
  return details;
}

export function createChartFigure(program) {
  const figure = element("figure", {
    className: "ggaction-chart",
    "aria-labelledby": "ggaction-chart-caption"
  });
  const canvas = element("canvas", {
    role: "img",
    "aria-label": chartDescription
  }, chartDescription);
  const caption = element(
    "figcaption",
    { id: "ggaction-chart-caption" },
    "A responsive Browser Canvas rendering produced by ggaction 0.0.7."
  );

  figure.append(canvas, caption, createDataTable());

  const context = canvas.getContext("2d");
  if (context === null) {
    canvas.replaceWith(element(
      "p",
      { role: "status", className: "ggaction-render-fallback" },
      chartDescription
    ));
    return figure;
  }

  const pixelRatio = Math.min(globalThis.devicePixelRatio ?? 1, 2);
  render(program, context, { pixelRatio });
  return figure;
}

function createTraceBranch(node, isRoot = false) {
  const item = element("li");
  const branch = element("details");
  branch.open = isRoot;

  const summary = element("summary");
  summary.append(element("code", {}, node.op));
  if (node.description) {
    summary.append(document.createTextNode(` — ${node.description}`));
  }
  branch.append(summary);

  const argumentsText = JSON.stringify(node.args);
  if (argumentsText !== "{}") {
    branch.append(element(
      "pre",
      { className: "ggaction-trace-args" },
      argumentsText
    ));
  }

  if (node.children.length > 0) {
    const children = element("ol");
    for (const child of node.children) {
      children.append(createTraceBranch(child));
    }
    branch.append(children);
  }

  item.append(branch);
  return item;
}

export function createTraceInspector(program) {
  const entries = flattenTrace(program.trace);
  const inspector = element("section", {
    className: "ggaction-trace",
    "aria-labelledby": "ggaction-trace-title"
  });
  inspector.append(
    element("h3", { id: "ggaction-trace-title" }, "Action trace"),
    element(
      "p",
      {},
      `${program.trace.children.length} authored actions expand to ` +
        `${entries.length - 1} trace nodes.`
    )
  );

  const tree = element("ol", { className: "ggaction-trace-tree" });
  tree.append(createTraceBranch(program.trace, true));
  inspector.append(tree);
  return inspector;
}
