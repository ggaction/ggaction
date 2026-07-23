import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { PUBLIC_CHARTS } from "../../examples/registry.js";
import { renderToPDF } from "../../src/renderers/pdf.js";
import { loadDataset } from "../support/data.js";

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

test("renders every public chart through the PDF concrete schema", async t => {
  const directory = await mkdtemp(join(tmpdir(), "ggaction-public-pdf-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  for (const chart of PUBLIC_CHARTS) {
    const program = chart.createProgram(chartData(chart.data));
    const output = join(directory, `${chart.id}.pdf`);
    const result = await renderToPDF(program, {
      output,
      metadata: { title: chart.id }
    });
    const buffer = await readFile(output);
    const source = buffer.toString("latin1");

    assert.deepEqual(
      {
        width: result.width,
        height: result.height,
        pages: result.pages
      },
      {
        width: chart.width,
        height: chart.height,
        pages: 1
      },
      chart.id
    );
    assert.equal(result.bytes, buffer.length, chart.id);
    assert.match(source, /^%PDF-/, chart.id);
    assert.match(
      source,
      new RegExp(
        `/MediaBox \\[0 0 ${chart.width} ${chart.height}\\]`
      ),
      chart.id
    );
    assert.doesNotMatch(source, /\/Subtype\s*\/Image/, chart.id);
  }
});
