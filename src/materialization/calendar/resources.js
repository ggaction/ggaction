import { cloneAndFreeze } from "../../core/immutable.js";
import { layoutCalendarDays } from "../../grammar/calendar/layout.js";
import { normalizeCalendarDefinition, calendarSourcePoints } from "../../grammar/calendar/input.js";
import { dataInputReference } from "../../selectors/resources.js";

export function calendarRowReferences(dataset) {
  return dataset.rowKeys.map(rowKey => ({ data: dataset.id, logicalDataId: dataset.logicalId,
    revision: dataset.revision, rowKey, role: "calendar-day" }));
}

export function calendarResult(dataset, definition) {
  const { options: _options, ...result } = layoutCalendarDays(calendarSourcePoints(dataset.values, definition.fields), definition.options);
  return result;
}

export function createCalendarResource({ id, revision = 0, dataset, definition }) {
  const normalized = normalizeCalendarDefinition(definition);
  return cloneAndFreeze({ kind: "layout", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [dataInputReference(dataset)], options: { method: "calendar", ...normalized }, result: calendarResult(dataset, normalized),
    provenance: { origin: "inferred", sourceRows: calendarRowReferences(dataset) } });
}
