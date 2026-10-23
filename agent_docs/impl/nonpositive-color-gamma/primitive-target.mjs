// Review-only primitive target; public behavior has not been extended yet.
import fs from "node:fs";
import {chart} from "../../../src/index.js";
import {layout,publicCalls,createColorControls} from "../../../examples/color-controls/program.js";
import {primitiveItems,rowGeometry} from "../../../test/charts/color-controls/fixtures.js";
const targets=JSON.parse(fs.readFileSync(new URL("./NUMERIC_TARGETS.json",import.meta.url)));
export const targetVariants=[0,-0.1].map(gamma=>({gamma,variant:gamma===0?"zero-gamma":"negative-gamma",title:gamma===0?"Zero lightness gamma":"Negative lightness gamma",colors:targets.vectors.find(v=>v.interpolation==="cubehelix"&&v.gamma===gamma&&v.range[0]==="#75190b").colors}));
export function createPrimitiveTarget(gamma){const variant=targetVariants.find(v=>v.gamma===gamma),r=rowGeometry.gamma22,items=variant.colors.map((fill,i)=>({type:"rect",properties:{x:r.x+i*r.width,y:r.y,width:r.width,height:r.height,fill,opacity:1,stroke:"transparent",strokeWidth:0}}));return chart().createCanvas(layout)
 .createGraphics({id:"gamma1",type:"rect",parent:"plot-main",length:9})
 .editGraphics({target:"gamma1",property:"items",value:primitiveItems("gamma1")})
 .createGraphics({id:"gamma22",type:"rect",parent:"plot-main",length:9})
 .editGraphics({target:"gamma22",property:"items",value:items})
 .createGraphics({id:"power",type:"rect",parent:"plot-main",length:9})
 .editGraphics({target:"power",property:"items",value:primitiveItems("power")});}
export const intendedPublicCalls=gamma=>[...publicCalls,{op:"editColorScale",args:{target:"gamma22",gamma}}];
export function reproduceCurrentPublicRejection(gamma){const before=createColorControls();try{before.editColorScale({target:"gamma22",gamma});return{rejected:false};}catch(e){return{rejected:true,error:e.message};}}
