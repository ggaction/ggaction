import { buildCompoundPathCommands } from "../../../src/grammar/pathTopology.js";
import {
  outerCommands, holeCommands, reversedHoleCommands, islandCommands, cubicCommands
} from "../../fixtures/geometry/compound-path.js";

export const frame = Object.freeze({ width: 400, height: 304, scale: 24, x: 32, y: 32 });
export const underlay = Object.freeze({ x: frame.x - frame.scale / 2, y: frame.y + 4 * frame.scale, width: 15 * frame.scale, height: 2 * frame.scale });
export const shapeBounds = Object.freeze({ x: frame.x, y: frame.y, width: 14 * frame.scale, height: 10 * frame.scale });
export const paint = Object.freeze({ fill: "#267dff", stroke: "#102b4e", opacity: 0.65, underlay: "#ffb35c" });
const rings = [outerCommands, holeCommands, islandCommands];
export const variants = [
  { id: "nonzero-hole", title: "Nonzero · opposite winding", fillRule: "nonzero", kind: "rings", hole: true,
    commands: buildCompoundPathCommands([outerCommands, reversedHoleCommands, islandCommands]) },
  { id: "evenodd-hole", title: "Evenodd · same winding", fillRule: "evenodd", kind: "rings", hole: true,
    commands: buildCompoundPathCommands(rings) },
  { id: "nonzero-solid", title: "Nonzero · same winding", fillRule: "nonzero", kind: "rings", hole: false,
    commands: buildCompoundPathCommands(rings) },
  { id: "evenodd-clip", title: "Compound clip · evenodd", fillRule: "evenodd", kind: "clip", hole: true,
    commands: buildCompoundPathCommands(rings) },
  { id: "open-fill", title: "Open fill · open stroke", fillRule: "nonzero", kind: "curve",
    commands: buildCompoundPathCommands([cubicCommands, [{ op: "M", x: 12, y: 0 }, { op: "L", x: 14, y: 2 }]]) },
  { id: "point-only", title: "Point-only paths · zero fill", fillRule: "nonzero", kind: "points",
    commands: buildCompoundPathCommands([[{ op: "M", x: 5, y: 5 }], [{ op: "M", x: 12, y: 1 }, { op: "Z" }]]) }
];

export function pixelCommands(variant) {
  return variant.commands.map(command => Object.fromEntries(Object.entries(command).map(([key, value]) =>
    [key, key === "op" ? value : value * frame.scale + (key.startsWith("x") ? frame.x : frame.y)])));
}

export function reviewSamples(variant) {
  const result = [{ name: "outside", x: 11, y: 1, color: [255, 255, 255, 255] }];
  if (variant.kind === "rings" || variant.kind === "clip") result.push(
    { name: "outer", x: 1, y: 1, color: [114, 171, 255, 255] },
    { name: "island", x: 13, y: 1, color: [114, 171, 255, 255] },
    { name: "center", x: 5, y: 5, color: variant.hole ? [255, 179, 92, 255] : [114, 144, 198, 255] }
  );
  if (variant.kind === "curve") result.push(
    { name: "open-stroke-gap", x: 5, y: -1 / frame.scale, color: [255, 255, 255, 255] },
    { name: "curve-fill", x: 5, y: 2, color: [114, 171, 255, 255] }
  );
  if (variant.kind === "points") result.push({ name: "zero-area", x: 12, y: 1, color: [255, 255, 255, 255] });
  return result.map(sample => ({ ...sample, pixel: [Math.round(frame.x + sample.x * frame.scale), Math.round(frame.y + sample.y * frame.scale)] }));
}
