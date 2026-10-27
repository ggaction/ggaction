const buildCompoundPathCommands = subpaths => subpaths.flat();
import {
  outerCommands, holeCommands, reversedHoleCommands, islandCommands, cubicCommands
} from "./coordinates.js";

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

