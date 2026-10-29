import { closedAction } from "../../core/action.js";
import { annotateError } from "../../core/diagnostics.js";
import { validateUserId } from "../../core/identifiers.js";
import { ownRecord } from "../../core/ownData.js";
import { CALENDAR_FIELDS } from "../../grammar/calendar/input.js";
import { createCalendarResource } from "../../materialization/calendar/resources.js";
import { resolveMaterializedDataset } from "../../selectors/datasets.js";
import { resolveInputReference, findStoredResource } from "../../selectors/resources.js";
import { preflightCalendarConsumers, materializeCalendarConsumers } from "./closure.js";

export const createCalendarLayout = /* @__PURE__ */ closedAction(
  { op: "createCalendarLayout", description: "Aggregate civil days and store their calendar cell layout." }, ["id", "data", ...CALENDAR_FIELDS], function (args = {}) {
    const { id = "calendarLayout", data, ...definition } = args;
    validateUserId(id, "Calendar layout id");
    if (findStoredResource(this, "layout", id)) throw annotateError(new Error("Layout already exists; specify another calendar layout id."), { code: "duplicate-id", resourceId: id });
    const resource = createCalendarResource({ id, dataset: resolveMaterializedDataset(this, data, "Calendar data"), definition });
    return this.editSemantic({ property: `resource[layout:${id}]`, value: resource });
  });

function writeCalendarResources(program, resources) {
  if (!resources.length) return program;
  const ids = preflightCalendarConsumers(program, resources);
  let next = program;
  for (const resource of resources) next = next.editSemantic({ property: `resource[layout:${resource.id}]`, value: resource });
  return materializeCalendarConsumers(next, ids);
}

export function editCalendarLayout(program, args, previous) {
  if (Object.hasOwn(args, "order")) throw new TypeError("Calendar order is fixed by civil dates.");
  ownRecord(args.options, "Calendar layout options");
  if (!Object.keys(args.options).length || Object.values(args.options).some(value => value === undefined)) throw new TypeError("Calendar layout edits require nonempty options without undefined.");
  const definition = { ...previous.options.fields, ...previous.options.options, ...args.options };
  if (args.options.aggregate === "count" && !Object.hasOwn(args.options, "value")) delete definition.value;
  return writeCalendarResources(program, [createCalendarResource({ id: previous.id, revision: previous.revision + 1,
    dataset: resolveInputReference(program, previous.inputs[0]), definition })]);
}

export function reviseCalendarInputs(program, replacements) {
  const resources = [];
  for (const resource of program.semanticSpec.resources) {
    if (resource.kind !== "layout" || resource.options.method !== "calendar") continue;
    const data = replacements.get(resource.inputs[0].id);
    if (data !== undefined) resources.push(createCalendarResource({ id: resource.id, revision: resource.revision + 1,
      dataset: resolveMaterializedDataset(program, data, "Calendar data"), definition: { ...resource.options.fields, ...resource.options.options } }));
  }
  return writeCalendarResources(program, resources);
}
export function registerCalendarResourceActions(ProgramClass) { Object.assign(ProgramClass.prototype, { createCalendarLayout }); }
