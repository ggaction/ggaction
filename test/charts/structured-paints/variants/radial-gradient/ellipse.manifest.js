import {normalizeRadialGradient} from "../../../../../src/grammar/radialGradient.js";
import {radialFixture,frame} from "./fixture.js";
import {drawRadialPrimitive,radialPrimitiveSVG} from "./primitive.program.js";

export function ellipseFixture(){
  const original=radialFixture("centered");
  return {...original,style:"object-bounds-ellipse",title:"Object bounds · 220 × 140",unitBounds:true,
    gradient:normalizeRadialGradient({center:{x:.5,y:.5},radius:.5,stops:original.gradient.stops})};
}
export const ellipseVariant={chart:"radial-gradient",variant:"object-bounds-ellipse",title:"Radial gradient · object bounds ellipse",...frame,
  fixture:ellipseFixture(),primitive:drawRadialPrimitive,svg:radialPrimitiveSVG,
  callChain:"drawRadialPrimitive(context, ellipseFixture(), { lowerOpacity: true, clipCone: true });",source:"test/charts/structured-paints/variants/radial-gradient/primitive.program.js"};
