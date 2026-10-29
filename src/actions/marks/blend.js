import { validateRequestedMarkBlend } from "../../grammar/markBlend.js";
import { requireLayer } from "../../selectors/layers.js";

// Called explicitly by each owning domain action before its materialization.
// Semantic intent has one owner; normal removes the optional non-normal mode.
export function applyMarkBlend(program, id, options) {
  if (!Object.hasOwn(options, "blend")) return program;
  const layer = requireLayer(program, id);
  validateRequestedMarkBlend(options, layer.mark.type);
  if (options.blend === "normal") {
    return !Object.hasOwn(layer.mark, "blend") ? program : program.editSemantic({
      property: `layer[${id}].mark.blend`, remove: true
    });
  }
  return program.editSemantic({ property: `layer[${id}].mark.blend`, value: options.blend });
}
