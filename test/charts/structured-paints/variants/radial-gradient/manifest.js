import { frame, styles, radialFixture } from "./fixture.js";
import { drawRadialPrimitive, radialPrimitiveSVG } from "./primitive.program.js";
export { frame, radialFixture } from "./fixture.js";
export const variants = styles.map(style => ({ chart: "radial-gradient", variant: style, title: `Radial gradient · ${style}`, ...frame,
  fixture: radialFixture(style), primitive: drawRadialPrimitive, svg: radialPrimitiveSVG,
  callChain: `drawRadialPrimitive(context, radialFixture(${JSON.stringify(style)}), { lowerOpacity: true, clipCone: true });`, source: "test/charts/structured-paints/variants/radial-gradient/primitive.program.js" }));
