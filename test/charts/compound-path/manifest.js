import { variants, frame, paint, pixelCommands, underlay, shapeBounds } from "../../../examples/compound-path/data.js";
export { variants, frame, paint, pixelCommands, underlay, shapeBounds } from "../../../examples/compound-path/data.js";
import { createCompoundPathExample } from "../../../examples/compound-path/program.js";
import { createCompoundPathPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

function displayedCalls(variant) {
  const edit = (target, property, value) => ({op:"editGraphics",args:{target,property,value}});
  const calls = [{op:"createCanvas",args:{width:frame.width,height:frame.height,margin:0}},
    {op:"createGraphics",args:{id:"underlay",type:"rect",parent:"plot-main"}},
    ...[...Object.entries(underlay),["stroke","none"],["strokeWidth",0],["fill",paint.underlay]].map(([key,value])=>edit("underlay",key,value))];
  if (variant.kind === "clip") return [...calls,
    {op:"createGraphics",args:{id:"shape",type:"rect",parent:"plot-main"}},
    ...[["x",shapeBounds.x],["y",shapeBounds.y],["stroke","none"],["strokeWidth",0],["width",shapeBounds.width],["height",shapeBounds.height],
      ["fill",paint.fill],["opacity",paint.opacity],["clip",{type:"path",commands:pixelCommands(variant),fillRule:variant.fillRule}]].map(([key,value])=>edit("shape",key,value))];
  return [...calls, {op:"createGraphics",args:{id:"shape",type:"path",parent:"plot-main"}},
    ...[["commands",pixelCommands(variant)],["fillRule",variant.fillRule],["fill",paint.fill],["opacity",paint.opacity],
      ...(variant.kind === "points" ? [] : [["stroke",paint.stroke],["strokeWidth",2]])].map(([key,value])=>edit("shape",key,value))];
}
export const visualVariants = variants.map(variant => defineVisualVariant({
  chart:"compound-path",variant:variant.id,title:variant.title,width:frame.width,height:frame.height,
  userFacing:()=>createCompoundPathExample(variant),primitive:()=>createCompoundPathPrimitive(variant),compareSemanticSpec:false,
  callChain:"chart()\n"+displayedCalls(variant).map(call=>`  .${call.op}(${JSON.stringify(call.args)})`).join("\n")+";",
  artifact:{scope:"charts",capability:"path-geometry"},
  regions:[{name:"underlay-and-path",x:20,y:32,width:360,height:240,minimumInkPixels:1000}],
  colors:[{value:paint.underlay,minimumPixels:1000}]
}));

export function samplePixels(variant) {
  const result = [{ name: "outside", x: 11, y: 1, color: [255, 255, 255, 255] }];
  if (variant.kind === "rings" || variant.kind === "clip") result.push(
    { name: "outer", x: 1, y: 1, color: [114, 171, 255, 255] },
    { name: "island", x: 13, y: 1, color: [114, 171, 255, 255] },
    { name: "center", x: 5, y: 5, color: variant.hole ? [255, 179, 92, 255] : [114, 144, 198, 255] }
  );
  if (variant.kind === "curve") result.push(
    { name: "open-stroke-gap", x: 5, y: -1 / frame.scale, color: [255, 255, 255, 255] },
    { name: "curve-fill", x: 5, y: 2, color: [114, 171, 255, 255] }
  );
  if (variant.kind === "points") result.push({ name: "zero-area", x: 12, y: 1, color: [255, 255, 255, 255] });
  return result.map(sample => ({ ...sample, pixel: [Math.round(frame.x + sample.x * frame.scale), Math.round(frame.y + sample.y * frame.scale)] }));
}
