import { frame,styles,shadowFixture,prepareShadowGlyph } from "./fixture.js";
import { drawShadowPrimitive,shadowPrimitiveSVG } from "./primitive.program.js";
export { frame } from "./fixture.js";
export const variants=styles.map(style=>({chart:"shadow-paints",variant:style,title:`Shadow · ${style}`,...frame,fixture:shadowFixture(style),prepare:prepareShadowGlyph,primitive:drawShadowPrimitive,svg:shadowPrimitiveSVG,
  callChain:`drawShadowPrimitive(context, shadowFixture(${JSON.stringify(style)}), decodedSublayerPNG, prepareShadowGlyph(shadowFixture(${JSON.stringify(style)})));`,source:"test/gates/shadow-paints/primitive.program.js"}));
