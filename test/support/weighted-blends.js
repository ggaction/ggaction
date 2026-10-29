export const blendFrame = Object.freeze({ width: 80, height: 80 });
export function blendSource(weight, type, properties, patch = {}) {
  return { weight, type, properties, offset: [0, 0], clip: { x: 0, y: 0, ...blendFrame }, clips: [], ...patch };
}
export function weightedBlendFixture(kind = "opaque", font) {
  const rect = (weight, fill, opacity = 1) => blendSource(weight, "rect", { x: 10, y: 10, width: 20, height: 20, fill, stroke: "none", strokeWidth: 0, opacity });
  let sources = [rect(.5, "red"), rect(.5, "blue")], checks = [{ point: [15, 15], rgba: [188, 0, 188, 255], tolerance: 1 }];
  if (kind === "translucent") { sources = [rect(.5, "red", .25), rect(.5, "blue", .75)]; checks = [{ point: [15, 15], rgba: [137, 0, 225, 128], tolerance: 2 }]; }
  if (kind === "endpoint") { sources[0].weight = 1;sources[1].weight = 0;checks = [{ point: [15, 15], rgba: [255, 0, 0, 255], tolerance: 0 }]; }
  if (kind === "many") sources = Array.from({ length: 64 }, (_, index) => rect(1 / 64, index % 2 ? "blue" : "red"));
  if (kind === "unequal") {
    sources = [rect(.1, "red"), rect(.2, "blue"), rect(.7, "lime")];
    checks = [{ point: [15, 15], rgba: [89, 218, 124, 255], tolerance: 1 }];
  }
  if (kind === "topology") {
    sources[1] = blendSource(.5, "circle", { x: 30, y: 20, radius: 10, fill: "blue", stroke: "none", strokeWidth: 0 });
    checks = [{ point: [15, 20], rgba: [255, 0, 0, 128], tolerance: 1 }, { point: [25, 20], rgba: [188, 0, 188, 255], tolerance: 1 }, { point: [35, 20], rgba: [0, 0, 255, 128], tolerance: 1 }];
  }
  if (["native-circle", "native-fill-path", "native-stroke-path"].includes(kind)) {
    const shape = color => kind === "native-circle"
      ? blendSource(.5, "circle", { x: 20, y: 20, radius: 10, fill: color })
      : blendSource(.5, "path", { commands: [{ op: "M", x: 10, y: 10 }, { op: "L", x: 30, y: 10 },
        { op: "L", x: 30, y: 30 }, { op: "L", x: 10, y: 30 }, { op: "Z" }],
        ...(kind === "native-fill-path" ? { fill: color } : { stroke: color, strokeWidth: 4 }) });
    sources = [shape("red"), shape("blue")];
    checks = [{ point: kind === "native-stroke-path" ? [10, 20] : [20, 20], rgba: [188, 0, 188, 255], tolerance: 1 }];
  }
  if (kind === "text") {
    const properties = text => ({ x: 20, y: 40, text, fill: "red", fontSize: 20, fontFamily: font.family, fontWeight: 400,
      textAlign: "left", textBaseline: "alphabetic", font, outline: { color: "black", width: 2 },
      shadow: { color: "blue", offsetX: 0, offsetY: 20, blurRadius: 0 } });
    sources = [blendSource(.5, "text", properties("A")), blendSource(.5, "text", properties("AB"))];
    checks = [{ point: [23, 32], rgba: [255, 0, 0, 255], tolerance: 1 }, { point: [23, 52], rgba: [0, 0, 255, 255], tolerance: 1 }, { point: [41, 32], rgba: [255, 0, 0, 128], tolerance: 1 }];
  }
  return { kind, checks, program: { graphicSpec: { objects: { canvas: { type: "canvas", properties: blendFrame },
    item: { type: "weighted-blend", properties: { sources } } }, order: ["canvas", "item"] } } };
}
