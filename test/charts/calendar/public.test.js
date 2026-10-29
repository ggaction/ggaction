import assert from "node:assert/strict";
import test from "node:test";
import { createCalendar } from "../../../examples/calendar/program.js";
import { createCalendarPrimitive } from "./primitive.program.js";
import { variants } from "./reference-values.js";
const flatten = (p, ids) => ids.flatMap(id => { const g = p.graphicSpec.objects[id]; return (g.items ?? [g]).map(item => ({ type: item.type ?? g.type, properties: item.properties })); });
for (const variant of variants) test(`calendar ${variant.id} matches independent civil cells and month strip geometry`, () => {
  const p = createCalendar(variant.id), primitive = createCalendarPrimitive(variant.id);
  assert.deepEqual(flatten(p, ["calendar", "chartTitle", "chartSubtitle"]), flatten(primitive, ["days", "heading"]));
  const items = p.graphicSpec.objects.calendar.items;
  assert.equal(new Set(items.map(item => JSON.stringify([item.identity.key, item.identity.role]))).size, items.length);
});
