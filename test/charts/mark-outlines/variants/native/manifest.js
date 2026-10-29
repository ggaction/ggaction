import {frame,styles,outlineFixture} from "./fixture.js";
import {drawOutlineGlyph,drawOutlinePrimitive,outlinePrimitiveSVG} from "./primitive.program.js";
export {frame} from "./fixture.js";
export const variants=styles.map(style=>({chart:"native",variant:style,title:`Outline · ${style}`,...frame,fixture:outlineFixture(style),glyph:drawOutlineGlyph,primitive:drawOutlinePrimitive,svg:outlinePrimitiveSVG,
 callChain:`drawOutlinePrimitive(context, outlineFixture(${JSON.stringify(style)}), optionalAttenuatedGlyphPNG);`,source:"test/charts/mark-outlines/variants/native/primitive.program.js"}));
