import assert from "node:assert/strict";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createTransitionScene } from "ggaction/scene";
import { createCanvas } from "@napi-rs/canvas";

export const cases = [{ id: "data-transforms/calendar-completion", async run() {
  const calendar = { unit: "day", start: "2024-11-02", end: "2024-11-04", timeZone: "America/New_York" };
  const p = chart().createCanvas({ width: 320, height: 240, margin: 40 })
    .createData({ id: "raw", values: [{ date: "2024-11-03T05:30:00Z", value: 2 }, { date: "2024-11-03T06:30:00Z", value: 3 }] })
    .createTimeUnitData({ id: "buckets", field: "date", unit: "day", timeZone: calendar.timeZone, as: "day" })
    .createSummaryData({ id: "totals", groupBy: "day", aggregates: [{ op: "sum", field: "value", as: "total" }] })
    .createCompleteData({ id: "days", key: "day", calendar, fill: { total: 0 } })
    .createPointMark({ id: "points" }).encodeX({ field: "day", fieldType: "temporal" }).encodeY({ field: "total" });
  const d = p.semanticSpec.datasets.find(data => data.id === "days");
  assert.deepEqual(d.values, [{ day: 1730520000000, total: 0 }, { day: 1730606400000, total: 5 }, { day: 1730696400000, total: 0 }]);
  const restored = deserializeProgram(serializeProgram(p)), edited = restored.editCompleteData({ target: "days", calendar: { ...calendar, end: "2024-11-05" } });
  assert.equal(edited.graphicSpec.objects.points.items.length, 4);
  assert.notEqual(renderToSVG(edited), renderToSVG(p));
  assert.deepEqual(restored.graphicSpec, p.graphicSpec);
  render(p, createCanvas(320, 240).getContext("2d"));
  assert.ok((await renderToPNGBuffer(p)).buffer.length > 100);
  assert.ok((await renderToPDFBuffer(p)).buffer.length > 100);
  assert.equal(createTransitionScene(p).nodes.filter(node => node.type === "circle").length, 3);
  const basic = basicChart().createData({ id: "raw", values: [{ day: 1730606400000 }] });
  assert.equal(basic.createCompleteData, undefined);
  assert.throws(() => basic.createDerivedData({ id: "days", source: "raw", transform: d.transform }), /Unsupported dataset transform/);
} }];
