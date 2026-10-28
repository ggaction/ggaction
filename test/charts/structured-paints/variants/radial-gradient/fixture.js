import { normalizeRadialGradient } from "../../../../../src/grammar/radialGradient.js";
export const frame = Object.freeze({ width: 260, height: 200 });
export const styles = Object.freeze(["centered", "offset-focus", "hard-stop", "alpha-clip", "edge-focus", "varying-alpha"]);
const light = { rgb: [254, 243, 199], css: "#fef3c7", alpha: 1 }, dark = { rgb: [15, 118, 110], css: "#0f766e", alpha: 1 };
export function radialFixture(style) {
  if (!styles.includes(style)) throw new TypeError("Unknown radial review variant.");
  const colors = style === "alpha-clip" ? [
    { ...light, css: "rgba(254,243,199,0.5)", alpha: 0.5 }, { ...dark, css: "rgba(15,118,110,0.5)", alpha: 0.5 }
  ] : style === "varying-alpha" ? [
    { ...light, css: "rgba(254,243,199,0.2)", alpha: 0.2 }, { ...dark, css: "rgba(15,118,110,0.8)", alpha: 0.8 }
  ] : [light, dark];
  const stops = style === "hard-stop" ? [{ offset: 0, value: colors[0] }, { offset: 0.5, value: colors[0] }, { offset: 0.5, value: colors[1] }, { offset: 1, value: colors[1] }]
    : [{ offset: 0, value: colors[0] }, { offset: 1, value: colors[1] }];
  const gradient = normalizeRadialGradient({ center: { x: 130, y: 110 },
    focal: { x: style === "edge-focus" ? 65 : style === "offset-focus" ? 100 : 130, y: style === "offset-focus" ? 90 : 110 }, radius: 65,
    stops: stops.map(stop => ({ offset: stop.offset, color: stop.value.css })) });
  return { style, title: style.replaceAll("-", " "), gradient, stops, bounds: { x: 20, y: 40, width: 220, height: 140 },
    opacity: ["alpha-clip", "varying-alpha"].includes(style) ? 0.65 : 1, clip: style === "alpha-clip", underlay: "#e2e8f0" };
}
