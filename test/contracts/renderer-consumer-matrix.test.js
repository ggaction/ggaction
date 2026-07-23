import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inflateSync } from "node:zlib";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import { render } from "../../src/renderers/canvas/index.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { renderToPNG } from "../../src/renderers/png.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { createMockCanvasContext } from "../support/canvas.js";
import { loadDataset } from "../support/data.js";

const RENDERERS = Object.freeze(["canvas", "png", "svg", "pdf"]);
const CONCRETE_TYPES = Object.freeze([
  "canvas",
  "collection",
  "circle",
  "rect",
  "line",
  "text",
  "path"
]);
const PATH_OPERATIONS = Object.freeze(["M", "L", "C", "Z"]);
const SHARED_BEHAVIORS = Object.freeze([
  "authored-order",
  "nested-canvas-clip",
  "solid-fill",
  "linear-gradient-fill",
  "stroke",
  "stroke-dash",
  "opacity",
  "text"
]);

function chartData(definition) {
  if (definition === undefined) return undefined;
  if (typeof definition === "string") return loadDataset(definition);
  return Object.fromEntries(
    Object.entries(definition).map(([key, dataset]) => [
      key,
      loadDataset(dataset)
    ])
  );
}

function inspectGraphic(graphic, inventory, ownerType) {
  const type = graphic.type ?? ownerType;
  inventory.types.add(type);
  const properties = graphic.properties ?? {};
  for (const command of properties.commands ?? []) {
    inventory.pathOperations.add(command.op);
  }
  if (properties.fill?.type === "linear-gradient") {
    inventory.behaviors.add("linear-gradient-fill");
  } else if (typeof properties.fill === "string") {
    inventory.behaviors.add("solid-fill");
  }
  if (properties.stroke !== undefined) inventory.behaviors.add("stroke");
  if ((properties.strokeDash?.length ?? 0) > 0) {
    inventory.behaviors.add("stroke-dash");
  }
  if (properties.opacity !== undefined) inventory.behaviors.add("opacity");
  if (type === "text") inventory.behaviors.add("text");
  for (const item of graphic.items ?? []) {
    inspectGraphic(item, inventory, type);
  }
}

function publicChartInventory() {
  const inventory = {
    behaviors: new Set(["authored-order"]),
    pathOperations: new Set(),
    types: new Set()
  };
  for (const chart of PUBLIC_CHARTS) {
    const program = chart.createProgram(chartData(chart.data));
    const rootCanvas = program.graphicSpec.order.find(id =>
      program.graphicSpec.objects[id]?.type === "canvas"
    );
    for (const [id, graphic] of Object.entries(
      program.graphicSpec.objects
    )) {
      inspectGraphic(graphic, inventory);
      if (graphic.type === "canvas" && id !== rootCanvas) {
        inventory.behaviors.add("nested-canvas-clip");
      }
    }
  }
  return inventory;
}

function matrixGraphicSpec() {
  return {
    objects: {
      canvas: {
        type: "canvas",
        properties: {
          width: 180,
          height: 140,
          background: "white"
        },
        children: ["matrix", "panel"]
      },
      matrix: {
        type: "collection",
        items: [
          {
            id: "matrix:circle",
            type: "circle",
            properties: {
              x: 20,
              y: 24,
              radius: 6,
              fill: "#4c78a8",
              opacity: 0.6
            }
          },
          {
            id: "matrix:rect",
            type: "rect",
            properties: {
              x: 38,
              y: 12,
              width: 42,
              height: 24,
              fill: {
                type: "linear-gradient",
                from: { x: 0, y: 0.5 },
                to: { x: 1, y: 0.5 },
                stops: [
                  { offset: 0, color: "rgba(245, 133, 24, 0)" },
                  { offset: 1, color: "#f58518" }
                ]
              },
              stroke: "#f58518",
              strokeWidth: 1
            }
          },
          {
            id: "matrix:line",
            type: "line",
            properties: {
              x1: 10,
              y1: 52,
              x2: 100,
              y2: 52,
              stroke: "#111111",
              strokeWidth: 2,
              strokeDash: [5, 3],
              opacity: 0.8
            }
          },
          {
            id: "matrix:path",
            type: "path",
            properties: {
              commands: [
                { op: "M", x: 12, y: 72 },
                { op: "C", x1: 30, y1: 58, x2: 55, y2: 86, x: 76, y: 72 },
                { op: "L", x: 92, y: 90 },
                { op: "Z" }
              ],
              fill: "#dbeafe",
              stroke: "#2563eb",
              strokeWidth: 1,
              opacity: 0.9
            }
          },
          {
            id: "matrix:text",
            type: "text",
            properties: {
              x: 100,
              y: 112,
              text: "Renderer matrix",
              fill: "#111827",
              fontSize: 12,
              fontFamily: "Arial",
              fontWeight: 650,
              textAlign: "center",
              textBaseline: "middle",
              rotation: Math.PI / 12
            }
          }
        ]
      },
      panel: {
        type: "canvas",
        properties: {
          x: 130,
          y: 18,
          width: 36,
          height: 36,
          background: "#f8fafc"
        },
        children: ["panelPoint"]
      },
      panelPoint: {
        type: "circle",
        properties: {
          x: 18,
          y: 18,
          radius: 5,
          fill: "#7c3aed"
        }
      }
    },
    order: ["canvas"]
  };
}

function decodedPDFStreams(buffer) {
  const source = buffer.toString("latin1");
  const decoded = [];
  for (const match of source.matchAll(
    /stream\r?\n([\s\S]*?)\r?\nendstream/g
  )) {
    const raw = Buffer.from(match[1], "latin1");
    try {
      decoded.push(inflateSync(raw).toString("latin1"));
    } catch {
      decoded.push(raw.toString("latin1"));
    }
  }
  return decoded.join("\n");
}

test("keeps the public chart corpus complete for the renderer matrix", () => {
  const inventory = publicChartInventory();

  assert.deepEqual([...inventory.types].sort(), [...CONCRETE_TYPES].sort());
  assert.deepEqual(
    [...inventory.pathOperations].sort(),
    [...PATH_OPERATIONS].sort()
  );
  assert.deepEqual(
    [...inventory.behaviors].sort(),
    [...SHARED_BEHAVIORS].sort()
  );
  assert.deepEqual(RENDERERS, ["canvas", "png", "svg", "pdf"]);
});

test("consumes one complete concrete matrix through every renderer", async t => {
  const directory = await mkdtemp(join(tmpdir(), "ggaction-renderer-matrix-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const program = { graphicSpec: matrixGraphicSpec() };

  const context = createMockCanvasContext();
  render(program, context, { pixelRatio: 2 });
  assert.deepEqual(
    {
      width: context.canvas.width,
      height: context.canvas.height
    },
    { width: 360, height: 280 }
  );
  for (const operation of [
    "arc",
    "fillRect",
    "moveTo",
    "lineTo",
    "bezierCurveTo",
    "fillText",
    "clip",
    "createLinearGradient",
    "setLineDash",
    "translate",
    "rotate"
  ]) {
    assert.equal(
      context.calls.some(call => call.op === operation),
      true,
      `Canvas ${operation}`
    );
  }

  const svg = renderToSVG(program, { title: "Renderer matrix" });
  assert.match(svg, /viewBox="0 0 180 140"/);
  assert.match(svg, /<linearGradient /);
  assert.match(svg, /<clipPath /);
  assert.match(svg, /<circle /);
  assert.match(svg, /<rect /);
  assert.match(svg, /<line /);
  assert.match(svg, /<path /);
  assert.match(svg, /<text /);
  assert.match(svg, /stroke-dasharray="5 3"/);
  assert.match(svg, /font-weight="700"/);

  const pngOutput = join(directory, "chart.png");
  const png = await renderToPNG(program, {
    output: pngOutput,
    pixelRatio: 2
  });
  const pngBytes = await readFile(pngOutput);
  assert.deepEqual(
    { width: png.width, height: png.height, pixelRatio: png.pixelRatio },
    { width: 360, height: 280, pixelRatio: 2 }
  );
  assert.deepEqual(
    [...pngBytes.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10]
  );

  const pdfOutput = join(directory, "chart.pdf");
  const pdf = await renderToPDF(program, {
    output: pdfOutput,
    metadata: { title: "Renderer matrix" }
  });
  const pdfBytes = await readFile(pdfOutput);
  const pdfSource = pdfBytes.toString("latin1");
  const pdfContent = decodedPDFStreams(pdfBytes);
  assert.deepEqual(
    { width: pdf.width, height: pdf.height, pages: pdf.pages },
    { width: 180, height: 140, pages: 1 }
  );
  assert.match(pdfSource, /\/MediaBox \[0 0 180 140\]/);
  assert.doesNotMatch(pdfSource, /\/Subtype\s*\/Image/);
  for (const operation of [/\bBT\b/, /\bT[Jj]\b/, /\bm\b/, /\bl\b/, /\bc\b/]) {
    assert.match(pdfContent, operation);
  }
});
