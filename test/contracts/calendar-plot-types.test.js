import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("calendar declarations retain required civil policy and immutable result grain", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-calendar-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type CalendarLayoutResource, type CalendarDefinition } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const definition: CalendarDefinition = { date: "day", value: "value", aggregate: "sum", start: "2024-01-01", end: "2024-12-31", timeZone: "UTC", weekStartsOn: 1, missing: "empty" };
const p = chart().createCanvas().createData({ values: [{ day: "2024-02-29", value: 7 }] }).createCalendarLayout(definition).createCalendarPlot()
 .editLayout({ options: { aggregate: "count", weekStartsOn: 0, missing: "omit" } })
 .editCalendarPlot({ target: { childPath: ["left"], id: "calendar" }, color: false, cells: { fill: { type: "pattern", style: "dots", foreground: "black", background: "white", pitch: 8 }, gap: .2, outline: false },
  labels: { month: { fontSize: 14, shadow: false }, week: false }, monthBoundary: { strokeWidth: 2 } });
p.createCalendarLayout({ date: "day", aggregate: "count", start: "2024-01-01", end: "2024-12-31", timeZone: "America/New_York", weekStartsOn: 6, missing: "omit" });
p.editCalendarPlot({ color: { type: "quantize", domain: [0, 10], range: ["red", "blue"] }, labels: false });
const resource = p.semanticSpec.resources.find((value): value is CalendarLayoutResource => value.kind === "layout" && value.options.method === "calendar");
if (resource) { const nullable: number | null = resource.result.cells[0].value;
 // @ts-expect-error calendar rows are immutable
 resource.result.cells[0].sourceIndices.push(1);
}
// @ts-expect-error count has no value field
p.createCalendarLayout({ ...definition, aggregate: "count" });
// @ts-expect-error sum requires a value field
p.createCalendarLayout({ date: "day", aggregate: "sum", start: "2024-01-01", end: "2024-12-31", timeZone: "UTC", weekStartsOn: 1, missing: "empty" });
// @ts-expect-error civil policy requires a declared timezone
p.createCalendarLayout({ date: "day", aggregate: "count", start: "2024-01-01", end: "2024-12-31", weekStartsOn: 1, missing: "empty" });
// @ts-expect-error weekdays are bounded
p.createCalendarLayout({ ...definition, weekStartsOn: 7 });
// @ts-expect-error calendar color is an intrinsic quantitative value
p.createCalendarPlot({ color: { type: "ordinal" } });
// @ts-expect-error month outlines have no interior fill
p.createCalendarPlot({ monthBoundary: { fill: "red" } });
// @ts-expect-error label roles are closed
p.createCalendarPlot({ labels: { day: {} } });
// @ts-expect-error Basic does not register calendar layout resources
basicChart().createCalendarLayout(definition);
// @ts-expect-error explicit undefined does not edit a style
p.editCalendarPlot({ cells: undefined });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
