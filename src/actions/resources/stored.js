import { closedAction } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { STORED_RESOURCE_KINDS } from "../../core/resourceReference.js";
import { requireStoredResource } from "../../selectors/resources.js";
import { orderResourceDependencies, planStoredResourceRemoval } from "../../materialization/resourceState.js";

export const removeResource = /* @__PURE__ */ closedAction(
  { op: "removeResource", description: "Remove an unreferenced stored resource.", scope: "any" }, ["kind", "id", "cascade"], function (args = {}) {
    if (!STORED_RESOURCE_KINDS.includes(args.kind)) throw new TypeError("Unsupported stored resource kind.");
    if (args.kind !== "font") this._assertUnitProgram("removeResource");
    validateUserId(args.id, "Resource id");
    if (Object.hasOwn(args, "cascade") && typeof args.cascade !== "boolean") throw new TypeError("Resource cascade must be boolean.");
    const resource = requireStoredResource(this, args);
    const apply = program => {
      let next = program;
      if (resource.kind === "font" && args.cascade === true &&
          program.materializationConfigs.textMetrics?.schemaVersion === 2 &&
          program.materializationConfigs.textMetrics.fonts.some(binding => binding.resource.id === resource.id)) {
        next = next.removeTextMetrics();
      }
      if (resource.kind === "image" && args.cascade === true) {
        for (const layer of program.semanticSpec.layers) if (layer.image?.id === resource.id && layer.image.kind === "image") {
          next = next.removeMark({ target: layer.id });
        }
      }
      const plan = planStoredResourceRemoval(next, resource, { cascade: args.cascade });
      for (const entry of orderResourceDependencies(plan).reverse()) next = next.editSemantic({ property: `resource[${entry.kind}:${entry.id}]`, remove: true });
      return next;
    };
    apply(this);
    return apply(this);
  });
