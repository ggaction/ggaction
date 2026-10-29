export const frame = Object.freeze({ width: 260, height: 200 });
export const styles = Object.freeze(["zero-blur", "soft-shadow", "negative-offset", "alpha-once", "clip", "circle"]);
export function shadowFixture(style) {
  if (!styles.includes(style)) throw new TypeError("Unknown shadow style.");
  return { style, kind: style === "circle" ? "circle" : "rect", title: style.replaceAll("-", " "),
    fill: style === "alpha-once" ? "rgba(210,70,45,.6)" : "rgb(210,70,45)", opacity: style === "alpha-once" ? .65 : 1,
    shadow: { color: "rgba(30,60,90,.5)", offsetX: style === "negative-offset" ? -14 : 14,
      offsetY: style === "negative-offset" ? -10 : 10, blurRadius: style === "zero-blur" ? 0 : 8 },
    clip: style === "clip" ? { x: 65, y: 65, width: 70, height: 78 } : null };
}
