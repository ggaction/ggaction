import { compileTypeScript } from "../support/typescript.js";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { chart } from "../../src/index.js";
import { renderToPNGBuffer } from "../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../src/renderers/pdf.js";

test("polygon symbols exactly match independent concrete paths in PNG and export PDF", async () => {
  const vertices = [{ x: -1.5, y: -1.5 }, { x: 1.5, y: -1.5 }, { x: 0, y: 1.5 }];
  for (const normalization of ["area", "radius"]) {
    const canvas = () => chart().createCanvas({ width: 300, height: 200, margin: 50 });
    const p = canvas().createData({ values: [{ x: .5, y: .5 }] })
      .createPointMark({ shape: { polygon: vertices, normalization }, fill: "blue" })
      .encodeX({ field: "x", scale: { domain: [0, 1] } })
      .encodeY({ field: "y", scale: { domain: [0, 1] } }).encodePointRadius({ value: 2 });
    const factor = normalization === "area" ? Math.sqrt(4 * Math.PI / 4.5) : 2;
    const commands = [...vertices.map((v, i) => ({ op: i ? "L" : "M", x: 150 + factor * v.x, y: 100 + factor * v.y })), { op: "Z" }];
    const primitive = canvas().createGraphics({ id: "expected", type: "path" })
      .editGraphics({ target: "expected", property: "commands", value: commands })
      .editGraphics({ target: "expected", property: "fill", value: "blue" });
    assert.deepEqual((await renderToPNGBuffer(p)).buffer, (await renderToPNGBuffer(primitive)).buffer);
    const pdf = await renderToPDFBuffer(p);
    assert.equal(pdf.buffer.subarray(0, 4).toString(), "%PDF");
    assert(pdf.buffer.length > 100);
  }
});

test("Full and Basic declarations accept polygon policies and reject malformed point options", async () => {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-polygon-types-"));
  try {
    const file = path.join(directory, "polygon.mts");
    await writeFile(file, `
import type { ChartProgram, PointShape, PointPolygonShape } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram, PointPolygonShape as BasicPolygon } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const shape: PointPolygonShape = { polygon: [{x:0,y:0},{x:1,y:0},{x:0,y:1}], normalization: "radius" };
const basicShape: BasicPolygon = shape; const s: PointShape = shape;
p.createPointMark({shape}).editPointMark({shape});
basic.createPointMark({shape:basicShape});
p.encodeShape({field:"category",scale:{range:["circle",shape],unknown:shape}});
p.createScatterPlot({x:"x",y:"y",point:{shape}});
basic.createScatterPlot({x:"x",y:"y",point:{shape:basicShape}});
p.highlightMarks({shape});
// @ts-expect-error coordinates are numeric
p.editPointMark({shape:{polygon:[{x:"0",y:0}]}});
// @ts-expect-error polygon normalization is closed
p.editPointMark({shape:{polygon:[{x:0,y:0}],normalization:"auto"}});
// @ts-expect-error vertex keys are closed
p.editPointMark({shape:{polygon:[{x:0,y:0,z:0}]}});
// @ts-expect-error arbitrary SVG strings remain unsupported
p.editPointMark({shape:"M0,0L1,0L0,1Z"});
void s;
`);
    const result = compileTypeScript(["--strict", "--noEmit", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "--skipLibCheck", file], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});


test("compact point cards retain polygon normalization in generated authoring guidance", async () => {
  const cards = JSON.parse(await readFile(new URL("../../knowledge/action-cards.json", import.meta.url), "utf8")).cards;
  for (const name of ["createPointMark", "encodeShape"]) {
    const summary = cards.find(card => card.name === name).summary;
    assert.match(summary, /fourteen/);
    assert.match(summary, /polygon/);
    assert.match(summary, /normalization/);
    assert.doesNotMatch(summary, /12-value|one of 12/);
  }
  assert.match(cards.find(card => card.name === "encodeSize").summary, /reference-circle area/);
});
