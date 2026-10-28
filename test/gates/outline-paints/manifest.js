import {frame,styles,outlineFixture} from "./fixture.js";
import {drawOutlineGlyph,drawOutlinePrimitive,outlinePrimitiveSVG} from "./primitive.program.js";
export {frame} from "./fixture.js";
export const variants=styles.map(style=>({chart:"outline-paints",variant:style,title:`Outline · ${style}`,...frame,fixture:outlineFixture(style),glyph:drawOutlineGlyph,primitive:drawOutlinePrimitive,svg:outlinePrimitiveSVG,
 callChain:`drawOutlinePrimitive(context, outlineFixture(${JSON.stringify(style)}), optionalAttenuatedGlyphPNG);`,source:"test/gates/outline-paints/primitive.program.js"}));
