import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";
import { readPreparedFonts } from "./fontRendering.js";

// One exact-input check for ink measurement and actual glyph rasterization.
export function preparedTextGlyphInput(program, text, fonts) {
  const graphicSpec = program?.graphicSpec;
  const fontAliases = readPreparedFonts(graphicSpec, fonts);
  let found = false;
  walkGraphicTreeEvents(graphicSpec, {
    enter({ object }) { if (object === text && object.type === "text" && !object.items) found = true; },
    item({ object, owner }) { if (object === text && (object.type ?? owner.type) === "text") found = true; }
  });
  if (!found || text.properties.font === undefined) throw new TypeError("Glyph preparation requires one exact font-bound concrete Text from the prepared program.");
  const properties = text.properties;
  const units = (properties.lines ?? [{ text: properties.text }]).reduce((sum, line) => sum + line.text.length, 0);
  if (units > 1_048_576) throw new RangeError("Glyph source text exceeds its work budget.");
  return { graphicSpec, properties, fontAliases };
}
