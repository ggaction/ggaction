import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { validateGraphicClip } from "../schemas/graphicClip.js";

// Concrete collection placement has the same contract in every typed family.
// The prefix preserves the existing owner's diagnostics during extraction.
export function validateAnimationPlacement(frame, prefix = "Animation") {
  const label = `${prefix} animation frame`, keys = ["offset", "clip", "clips"];
  ownRecord(frame, label); rejectUnknownProperties(frame, keys, label);
  if (keys.some(key => !Object.hasOwn(frame, key) || frame[key] === undefined)) throw new TypeError(`${label} requires every declared field.`);
  const tuple = (value, length, label) => {
    ownArray(value, label);
    if (value.length !== length || value.some(n => !Number.isFinite(n))) throw new TypeError(`${label} requires a finite tuple.`);
  };
  const rectangle = value => {
    tuple(value, 4, `${prefix} frame clip`);
    validateGraphicClip({ x: value[0], y: value[1], width: value[2], height: value[3] });
  };
  tuple(frame.offset, 2, `${prefix} frame offset`); rectangle(frame.clip);
  ownArray(frame.clips, `${prefix} frame clips`);
  for (const clip of frame.clips) Array.isArray(clip) ? rectangle(clip) : validateGraphicClip(clip);
  return frame;
}
