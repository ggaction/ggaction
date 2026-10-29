import {frame,styles,blendFixture} from "./fixture.js";
import {drawBlendGroup,drawBlendPrimitive,blendPrimitiveSVG} from "./primitive.program.js";
export {frame} from "./fixture.js";
export const variants=styles.map(style=>({chart:"blend-paints",variant:style,title:`Blend · ${style}`,...frame,fixture:blendFixture(style),group:drawBlendGroup,primitive:drawBlendPrimitive,svg:blendPrimitiveSVG,
 callChain:`drawBlendPrimitive(context, blendFixture(${JSON.stringify(style)}), isolatedGroupPNG);`,source:"test/charts/bar-compositing/variants/native/primitive.program.js"}));
