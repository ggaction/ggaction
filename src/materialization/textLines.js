import { materializeTextFont } from "./textFont.js";
import { resolveTextLines } from "../core/textMetrics.js";
import { freezeOwned } from "../core/immutable.js";

// Reconcile optional derived line geometry without recreating its text graphic.
// The owning wrapped domain materializer records the transition.
function writeTextLines(program, id, lines) {
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

// Labels retain one semantic item even when their text contains several lines.
function writeHardTextLines(program, id) {
  const graphic = program.graphicSpec.objects[id];
  if (!(graphic.items ?? [graphic]).some(item => /[\r\n]/u.test(item.properties.text) || item.properties.lines !== undefined)) return program;
  const update = object => {
    const p = object.properties;
    if (!/[\r\n]/u.test(p.text) && p.lines === undefined) return object;
    const { lines: ignored, ...properties } = p;
    const lines = resolveTextLines(p.text, { fontSize: p.fontSize,
      align: p.textAlign, baseline: p.textBaseline, blockAlign: "middle" });
    if (lines.length > 1) properties.lines = lines;
    return freezeOwned({ ...object, properties: freezeOwned(properties) });
  };
  const updated = graphic.items ? freezeOwned({ ...graphic, items: freezeOwned(graphic.items.map(update)) }) : update(graphic);
  if (updated === graphic) return program;
  return program._clone({ graphicSpec: freezeOwned({ ...program.graphicSpec,
    objects: freezeOwned({ ...program.graphicSpec.objects, [id]: updated }) }) });
}

export function materializeTextLines(program, id, lines) {
  return materializeTextFont(writeTextLines(program, id, lines), id);
}

export function materializeHardTextLines(program, id) {
  return materializeTextFont(writeHardTextLines(program, id), id);
}
