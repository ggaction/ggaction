import { freezeOwned } from "../core/immutable.js";
import { resolveLegendTitleText } from "../layout/legendText.js";

export function materializeLegendTitleLines(program, id, text, style) {
  const { lines } = resolveLegendTitleText(text, style, program.materializationConfigs.textMetrics);
  if (lines !== undefined) return program.editGraphics({ target: id, property: "lines", value: lines });
  const graphic = program.graphicSpec.objects[id];
  if (!Object.hasOwn(graphic.properties, "lines")) return program;
  // Reconcile this derived optional property without recreating/reordering the
  // title graphic. The owning wrapped materializer records the transition.
  const { lines: _lines, ...properties } = graphic.properties;
  return program._clone({ graphicSpec: freezeOwned({ ...program.graphicSpec,
    objects: freezeOwned({ ...program.graphicSpec.objects,
      [id]: freezeOwned({ ...graphic, properties: freezeOwned(properties) })
    })
  }) });
}
