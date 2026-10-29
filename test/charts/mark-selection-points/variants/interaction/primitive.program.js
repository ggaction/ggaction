export function createSelectionPreviewPrimitive(p) {
  return p.editMarkSelection({ selection: "picked", region: { x: { ranges: [{ min: 1, max: 5 }] }, y: { ranges: [{ min: 0, max: 7 }] } } })
    .createGraphics({ id: "interaction-selection-preview", type: "collection", parent: "canvas" })
    .editGraphics({ target: "interaction-selection-preview", property: "items", value: [{ type: "path", properties: {
      commands: [{ op: "M", x: 100, y: 120 }, { op: "L", x: 200, y: 120 }, { op: "L", x: 200, y: 230 }, { op: "L", x: 100, y: 230 }, { op: "Z" }],
      fillRule: "evenodd", fill: "#3b82f6", stroke: "#2563eb", strokeWidth: 1, opacity: .25
    } }] });
}
