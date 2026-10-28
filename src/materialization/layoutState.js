import { hierarchyLayoutResourceHandler } from "./hierarchy/state.js";
import { graphLayoutResourceHandler } from "./graph/layoutState.js";
import { flowLayoutResourceHandler } from "./flow/layoutState.js";

function handler(resource) {
  if (resource.inputs.length !== 1) throw new TypeError("A layout requires exactly one domain resource input.");
  if (resource.inputs[0].kind === "hierarchy") return hierarchyLayoutResourceHandler;
  if (resource.inputs[0].kind === "graph") return ["dag", "cyclic"].includes(resource.options.method) ? flowLayoutResourceHandler : graphLayoutResourceHandler;
  throw new TypeError("Layout input must be a hierarchy or graph resource.");
}
export const layoutResourceHandler = Object.freeze({
  validateStored: resource => handler(resource).validateStored(resource),
  validateBindings: (program, resource) => {
    for (const layer of program.semanticSpec.layers) {
      if (layer.graphBinding?.layout.id === resource.id && resource.inputs[0]?.kind !== "graph") throw new TypeError("Graph plots require a graph layout.");
      if (layer.hierarchyBinding?.layout.id === resource.id && resource.inputs[0]?.kind !== "hierarchy") throw new TypeError("Hierarchy plots require a hierarchy layout.");
    }
    return handler(resource).validateBindings(program, resource);
  }
});
