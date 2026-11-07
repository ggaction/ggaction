import { validateBoolean } from "../../../core/validation.js";
export { validateAxisFormat, formatNumericAxisTicks, formatAxisValue } from "../../../grammar/axisFormat.js";

const AXIS_POSITIONS = Object.freeze({
  x: Object.freeze(["bottom", "top"]),
  y: Object.freeze(["left", "right"])
});

export function resolveAxisFrameConfig(current, args) {
  if (args.underlay !== undefined) validateBoolean(args.underlay, "Axis underlay");
  const frame = { ...current };
  if (Object.hasOwn(args, "offset")) frame.offset = args.offset;
  if (args.underlay === true) frame.underlay = true;
  else if (args.underlay === false) delete frame.underlay;
  return Object.keys(frame).length === 0 ? undefined : frame;
}

export function defaultAxisPosition(channel) {
  return channel === "x" ? "bottom" : "left";
}

export function validateAxisPosition(channel, position) {
  if (!AXIS_POSITIONS[channel]?.includes(position)) {
    throw new Error(`Unsupported ${channel}-axis position "${position}".`);
  }
  return position;
}

export function defaultAxisTitleRotation(channel, position) {
  if (channel === "x") return 0;
  return position === "right" ? Math.PI / 2 : -Math.PI / 2;
}
