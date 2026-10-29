export { canvas, observations } from "../../../examples/waterfall/fixture.js";
export const expected = Object.freeze({
  rectangles: [
    { x: 58, y: 160, width: 48, height: 120, fill: "#16a34a" },
    { x: 142, y: 160, width: 48, height: 48, fill: "#dc2626" },
    { x: 226, y: 208, width: 48, height: 72, fill: "#64748b" },
    { x: 310, y: 112, width: 48, height: 96, fill: "#16a34a" },
    { x: 394, y: 112, width: 48, height: 168, fill: "#2563eb" }
  ],
  connectors: [undefined, [106, 142, 160], [190, 226, 208], [274, 310, 208], [358, 394, 112]],
  labels: [[82, 154, "5"], [166, 154, "-2"], [250, 202, "3"], [334, 106, "4"], [418, 106, "7"]]
});
