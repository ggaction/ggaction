import { closedAction } from "../../core/action.js";
import { resolveLayoutResource } from "../../selectors/layouts.js";
import { editHierarchyLayout } from "../hierarchy/resources.js";
import { editGraphLayout } from "../graphs/layouts.js";

export const editLayout = /* @__PURE__ */ closedAction(
  { op: "editLayout", description: "Revise a stored layout and its consumers." }, ["target", "order", "options"], function (args = {}) {
    const previous = resolveLayoutResource(this, args.target);
    if (Object.keys(args).every(key => key === "target")) throw new TypeError("Layout edits require a nonempty patch.");
    if (Object.values(args).some(value => value === undefined)) throw new TypeError("Layout edits cannot contain undefined; omission preserves intent.");
    return previous.inputs[0].kind === "hierarchy" ? editHierarchyLayout(this, args, previous) : editGraphLayout(this, args, previous);
  });

export function registerLayoutActions(ProgramClass) {
  Object.assign(ProgramClass.prototype, { editLayout });
}
