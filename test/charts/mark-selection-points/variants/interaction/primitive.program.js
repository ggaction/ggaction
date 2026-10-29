export function createSelectionPreviewPrimitive(p) {
  return p.editMarkSelection({ selection: "picked", region: { x: { ranges: [{ min: 1, max: 5 }] }, y: { ranges: [{ min: 0, max: 7 }] } } })
    .createGraphics({ id: "interaction-selection-preview", type: "collection", parent: "canvas" })
    .editGraphics({ target: "interaction-selection-preview", property: "items", value: [{ type: "path", properties: {
      commands: [{ op: "M", x: 100, y: 120 }, { op: "L", x: 200, y: 120 }, { op: "L", x: 200, y: 230 }, { op: "L", x: 100, y: 230 }, { op: "Z" }],
      fillRule: "evenodd", fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 1, opacity: .25
    } }] });
}

export function createAngularPreviewPrimitive(p) {
  return p.editMarkSelection({ selection: "picked", region: { theta: { ranges: [{ min: 0, max: 90 }, { min: 360, max: 360 }] } }, screenAngles: [0, Math.PI / 2] })
    .createGraphics({ id: "interaction-selection-preview", type: "collection", parent: "canvas" })
    .editGraphics({ target: "interaction-selection-preview", property: "items", value: [{ type: "path", properties: {
      commands: [{ op: "M", x: 100, y: 0 }, { op: "C", x1: 155.22847498307934, y1: 0, x2: 200, y2: 44.77152501692066, x: 200, y: 100 }, { op: "L", x: 100, y: 100 }, { op: "Z" }],
      fillRule: "evenodd", fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 1, opacity: .25
    } }] })
    .editGraphics({ target: "interaction-selection-preview", property: "clip", value: { x: 0, y: 0, width: 200, height: 200 } });
}
