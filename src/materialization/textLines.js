import { freezeOwned } from "../core/immutable.js";

// Reconcile optional derived line geometry without recreating its text graphic.
// The owning wrapped domain materializer records the transition.
export function materializeTextLines(program, id, lines) {
  if (lines !== undefined) return program.editGraphics({ target: id, property: "lines", value: lines });
  const graphic = program.graphicSpec.objects[id];
  if (!Object.hasOwn(graphic.properties, "lines")) return program;
  const { lines: _lines, ...properties } = graphic.properties;
  return program._clone({ graphicSpec: freezeOwned({ ...program.graphicSpec,
    objects: freezeOwned({ ...program.graphicSpec.objects,
      [id]: freezeOwned({ ...graphic, properties: freezeOwned(properties) })
    })
  }) });
}
