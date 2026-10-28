import { graphicClipBounds, intersectClipBounds, validateGraphicClip } from "../grammar/schemas/graphicClip.js";
import { walkGraphicTreeEvents } from "../grammar/schemas/graphicTree.js";

// One ordered local-to-root frame calculation for bounded per-glyph painting.
// Clips constrain final output; callers decide how much source outside the clip
// can contribute through an effect. Path clips retain their exact drawing path.
export function walkGraphicPaintItems(target, visit) {
  const frames = [{ offset: [0, 0], clip: { left: 0, top: 0, right: target.width, bottom: target.height } }];
  walkGraphicTreeEvents(target.graphicSpec, {
    enter({ id, object }) {
      if (object.type === "canvas") {
        const parent = frames.at(-1), properties = object.properties;
        const offset = id === target.canvasId ? [0, 0] :
          [parent.offset[0] + properties.x, parent.offset[1] + properties.y];
        frames.push({ offset, clip: intersectClipBounds(parent.clip, {
          left: offset[0], top: offset[1], right: offset[0] + properties.width, bottom: offset[1] + properties.height
        }) });
      }
      if (object.clip !== undefined) {
        const parent = frames.at(-1);
        validateGraphicClip(object.clip, object.type);
        frames.push({ offset: parent.offset, clip: intersectClipBounds(parent.clip,
          graphicClipBounds(object.clip, ...parent.offset)) });
      }
      if (!object.items) visit(id, object, object.type, frames.at(-1));
    },
    item({ id, object, owner }) { visit(id, object, object.type ?? owner.type, frames.at(-1)); },
    exit({ object }) {
      if (object.clip !== undefined) frames.pop();
      if (object.type === "canvas") frames.pop();
    }
  });
}
