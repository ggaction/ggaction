import assert from "node:assert/strict";
import test from "node:test";
import {createCanvas} from "@napi-rs/canvas";
import {chart,render} from "../../../../src/index.js";
import {referenceLabColor,referenceSignedPower,referenceCubehelixColor} from "../../../oracles/color-interpolation.js";

function publicSwatches(values,scale) {
 return chart().createCanvas({width:480,height:270,margin:0,background:"#ffffff"})
  .createData({values:values.map((value,i)=>({lo:30+i*46,hi:76+i*46,bottom:160,top:200,value}))})
  .createRectMark({id:"swatches",stroke:false})
  .encodeXRange({lower:"lo",upper:"hi",scale:{domain:[0,480]}})
  .encodeYRange({lower:"bottom",upper:"top",scale:{domain:[0,270]}})
  .encodeColor({field:"value",fieldType:"quantitative",scale});
}
function assertPrimitivePixels(program,expected) {
 const primitive=createCanvas(480,270).getContext("2d");
 primitive.fillStyle="#ffffff";primitive.fillRect(0,0,480,270);
 expected.forEach((fill,i)=>{primitive.fillStyle=fill;primitive.fillRect(30+i*46,70,46,40);});
 const context=createCanvas(480,270).getContext("2d");
 render(program,context);
 assert.deepEqual(context.getImageData(0,0,480,270).data,primitive.getImageData(0,0,480,270).data);
 assert.deepEqual(program.graphicSpec.objects.swatches.items.map(item=>item.properties.fill),expected);
}
test("public D50 and default D65 swatches exactly match independently calculated primitive pixels",()=>{
 const values=Array.from({length:9},(_,i)=>i/8);
 for(const whitePoint of ["d65","d50"]) {
  const program=publicSwatches(values,{domain:[0,1],range:["red","blue"],interpolate:"lab",...(whitePoint==="d50"?{whitePoint}:{})});
  assertPrimitivePixels(program,values.map(t=>referenceLabColor([1,0,0],[0,0,1],t,whitePoint)));
 }
});
test("public signed-power swatches exactly match primitive colors at the original values",()=>{
 const values=Array.from({length:9},(_,i)=>-2+i*.5);
 const program=publicSwatches(values,{type:"pow",exponent:3,domain:[-2,2],range:["blue","red"]});
 const colors=values.map(value=>{
  const t=referenceSignedPower(value,[-2,2],3);
  return "#"+[Math.round(255*t),0,Math.round(255*(1-t))].map(v=>v.toString(16).padStart(2,"0")).join("");
 });
 assertPrimitivePixels(program,colors);
});

test("public cubehelix gamma exactly matches independently solved quantized endpoint primitives",()=>{
 const values=Array.from({length:9},(_,i)=>i/8);
 const expected=[
  ["#75190b","#8c3000","#944e00","#926f00","#899202","#7fb31c","#79cf43","#7ee472","#90f2a4"],
  ["#75190b","#6e2300","#683100","#634700","#5d6500","#568900","#54b118","#62d654","#90f2a4"]
 ];
 [1,2.2].forEach((gamma,index)=>{
  const colors=values.map(t=>referenceCubehelixColor([117,25,11],[144,242,164],t,gamma));
  assert.deepEqual(colors,expected[index]);
  const program=publicSwatches(values,{domain:[0,1],range:["#75190b","#90f2a4"],interpolate:"cubehelix",gamma});
  assertPrimitivePixels(program,colors);
 });
});

