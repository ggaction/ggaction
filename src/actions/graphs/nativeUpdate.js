import { editLayout, resolveLayoutRouteUpdate, prepareLayoutRouteUpdate } from "../layouts/index.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";

// Full binds this closed native owner; graph preparation imports no assembly.
export function resolveNativeRouteUpdate(program, edit) {
  ownRecord(edit, "Native route edit");
  rejectUnknownProperties(edit, ["action", "args"], "native route edit");
  if (edit.action !== "editLayout") throw new TypeError("Native route updates currently require editLayout.");
  ownRecord(edit.args, "Native route action arguments");
  if (program.editLayout !== editLayout) throw new TypeError("Native route action was replaced.");
  const previous = resolveLayoutRouteUpdate(program, edit.args);
  const routes = program.semanticSpec.resources.filter(resource => resource.kind === "edge-route" &&
    resource.inputs.some(ref => ref.kind === "layout" && ref.id === previous.id && ref.revision === previous.revision));
  const bounded = routes.filter(resource => Object.hasOwn(resource.options.options, "execution"));
  if (!bounded.length) throw new TypeError("This layout has no bounded edge route update; use editLayout directly.");
  return { native: editLayout, edit, routes, bounded };
}

export function* prepareNativeRouteUpdate(program, resolved, scope) {
  return yield* prepareLayoutRouteUpdate(program, resolved.edit.args, scope);
}
