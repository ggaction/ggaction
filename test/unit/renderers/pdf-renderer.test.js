import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inflateSync } from "node:zlib";

import { renderToPDF } from "../../../src/renderers/pdf.js";

function completeGraphicSpec() {
  return {
    objects: {
      canvas: {
        type: "canvas",
        properties: {
          width: 160,
          height: 120,
          background: "white"
        },
        children: ["plot", "panel"]
      },
      plot: {
        type: "collection",
        items: [
          {
            id: "plot:rect",
            type: "rect",
            properties: {
              x: 10,
              y: 12,
              width: 60,
              height: 36,
              fill: {
                type: "linear-gradient",
                from: { x: 0, y: 0.5 },
                to: { x: 1, y: 0.5 },
                stops: [
                  { offset: 0, color: "rgba(10, 20, 30, 0)" },
                  { offset: 1, color: "#123456" }
                ]
              },
              stroke: "#222222",
              strokeWidth: 1,
              opacity: 0.75
            }
          },
          {
            id: "plot:circle",
            type: "circle",
            properties: {
              x: 30,
              y: 40,
              radius: 5,
              fill: "orange"
            }
          },
          {
            id: "plot:line",
            type: "line",
            properties: {
              x1: 5,
              y1: 70,
              x2: 90,
              y2: 70,
              stroke: "purple",
              strokeWidth: 3,
              strokeDash: [4, 2]
            }
          },
          {
            id: "plot:path",
            type: "path",
            properties: {
              commands: [
                { op: "M", x: 80, y: 20 },
                { op: "C", x1: 90, y1: 10, x2: 100, y2: 30, x: 110, y: 20 },
                { op: "L", x: 110, y: 50 },
                { op: "Z" }
              ],
              fill: "#abcdef",
              stroke: "#123456",
              strokeWidth: 1
            }
          },
          {
            id: "plot:text",
            type: "text",
            properties: {
              x: 80,
              y: 90,
              text: "Selectable chart text",
              fill: "#111111",
              fontFamily: "Arial",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
              textBaseline: "middle",
              rotation: Math.PI / 4
            }
          }
        ]
      },
      panel: {
        type: "canvas",
        properties: {
          x: 120,
          y: 70,
          width: 30,
          height: 30,
          background: "#f8fafc"
        },
        children: ["panelPoint"]
      },
      panelPoint: {
        type: "circle",
        properties: {
          x: 15,
          y: 15,
          radius: 4,
          fill: "red"
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

test("writes one logical-size vector PDF page with metadata and text", async t => {
  const directory = await mkdtemp(join(tmpdir(), "ggaction-pdf-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, "nested", "chart.pdf");
  const metadata = {
    title: "Vector chart",
    author: "ggaction",
    subject: "PDF renderer",
    keywords: ["vector", "chart"]
  };

  const result = await renderToPDF(
    { graphicSpec: completeGraphicSpec() },
    { output, metadata }
  );
  const buffer = await readFile(output);
  const source = buffer.toString("latin1");
  const content = decodedPDFStreams(buffer);

  assert.deepEqual(result, {
    output,
    width: 160,
    height: 120,
    pages: 1,
    bytes: buffer.length
  });
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(metadata, {
    title: "Vector chart",
    author: "ggaction",
    subject: "PDF renderer",
    keywords: ["vector", "chart"]
  });
  assert.match(source, /^%PDF-/);
  assert.match(source, /\/MediaBox \[0 0 160 120\]/);
  assert.match(source, /\/Title \(Vector chart\)/);
  assert.match(source, /\/Author \(ggaction\)/);
  assert.match(source, /\/Subject \(PDF renderer\)/);
  assert.match(source, /\/Keywords \(vector, chart\)/);
  assert.doesNotMatch(source, /\/Subtype\s*\/Image/);
  assert.match(content, /\bBT\b/);
  assert.match(content, /\bT[Jj]\b/);
  assert.match(content, /\bm\b/);
  assert.match(content, /\bl\b/);
  assert.match(content, /\bc\b/);
});

test("rejects invalid options and metadata before writing output", async t => {
  const directory = await mkdtemp(join(tmpdir(), "ggaction-pdf-invalid-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, "chart.pdf");
  const program = { graphicSpec: completeGraphicSpec() };

  await assert.rejects(
    renderToPDF(program, null),
    /options must be a plain object/
  );
  await assert.rejects(
    renderToPDF(program, { output, pixelRatio: 2 }),
    /does not support option "pixelRatio"/
  );
  await assert.rejects(
    renderToPDF(program, {
      output,
      metadata: { title: "" }
    }),
    /title must be a non-empty string/
  );
  await assert.rejects(
    renderToPDF(program, {
      output,
      metadata: { keywords: ["vector", ""] }
    }),
    /keywords must be an array of non-empty strings/
  );

  await writeFile(output, "existing");
  const malformed = completeGraphicSpec();
  malformed.objects.plot.items.push({
    id: "plot:image",
    type: "image",
    properties: {}
  });
  await assert.rejects(
    renderToPDF({ graphicSpec: malformed }, { output }),
    /does not support "image" yet/
  );
  assert.equal(await readFile(output, "utf8"), "existing");
});
