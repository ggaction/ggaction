import { contourResourceHandler } from "./contour/state.js";
import { geographicResourceHandler } from "./geo/state.js";

function handler(resource) {
  if (resource.options.method === "contour") return contourResourceHandler;
  if (resource.options.method === "geo") return geographicResourceHandler;
  throw new TypeError("Unsupported geometry resource method.");
}
export const geometryResourceHandler = Object.freeze({
  validateStored: resource => handler(resource).validateStored(resource),
  validateBindings: (program, resource) => {
    for (const layer of program.semanticSpec.layers) {
      if (resource.options.method !== "contour" && layer.contourBinding?.geometry.id === resource.id) {
        throw new TypeError("Contour marks require contour geometry.");
      }
    }
    return handler(resource).validateBindings(program, resource);
  }
});
