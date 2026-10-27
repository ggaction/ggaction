import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../src/index.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";
import { resolveConcreteGraphicBounds, resolvePrimitiveGraphicBounds } from "../../../src/grammar/schemas/graphicBounds.js";
import { validateGraphicClip } from "../../../src/grammar/schemas/graphicClip.js";

import { sceneSVG } from "../../support/svg-scene.js";
import { renderToSVG } from "../../../src/renderers/svg.js";

const ring = (x, y, size) => [{op:"M",x,y},{op:"L",x:x+size,y},{op:"L",x:x+size,y:y+size},{op:"L",x,y:y+size},{op:"Z"}];
const pathClip = {type:"path",commands:[...ring(2,2,40),...ring(12,12,20)],fillRule:"evenodd"};
function nestedProgram() {
  let p = chart().createCanvas({width:100,height:90,margin:0})
    .createGraphics({id:"nested",type:"canvas",parent:"plot-main"});
  for (const [property,value] of Object.entries({x:13.25,y:9.5,width:60,height:60})) p=p.editGraphics({target:"nested",property,value});
  p=p.createGraphics({id:"group",type:"collection",parent:"nested"})
    .editGraphics({target:"group",property:"clip",value:pathClip})
    .createGraphics({id:"shape",type:"rect",parent:"group"});
  for (const [property,value] of Object.entries({x:0,y:0,width:50,height:50,fill:"red",stroke:"black",strokeWidth:2})) p=p.editGraphics({target:"shape",property,value});
  return p.editGraphics({target:"shape",property:"clip",value:{type:"path",commands:ring(5,5,35)}});
}
function raster(program, scene, ratio=1) {
  const canvas=createCanvas(1,1),context=canvas.getContext("2d");
  if(scene) renderTransitionScene(scene,context,{pixelRatio:ratio}); else render(program,context,{pixelRatio:ratio});
  return {canvas,rgba:context.getImageData(0,0,canvas.width,canvas.height).data};
}
test("nested fractional frames retain intersecting path and rectangle clips through scene replay",()=>{
  const p=nestedProgram();
  for (const program of [p,p.editGraphics({target:"shape",property:"clip",value:{x:5,y:5,width:35,height:35}})]) {
    const scene=JSON.parse(JSON.stringify(createTransitionScene(program,{format:"canvas"})));
    for (const ratio of [1,2]) assert.deepEqual(raster(program,scene,ratio).rgba,raster(program,null,ratio).rgba);
    const node=scene.nodes.find(node=>node.properties.fill==="red");
    assert.equal(node.clips.length,3);assert.equal(node.clips[1].commands[0].x,15.25);
    assert.deepEqual(node.offset,[13.25,9.5]);
    const {rgba}=raster(program),sample=(x,y)=>[...rgba.slice((y*100+x)*4,(y*100+x)*4+4)];
    assert.deepEqual(sample(22,18),[255,0,0,255]);
    assert.deepEqual(sample(35,30),[255,255,255,255]);
    const bounds=resolveConcreteGraphicBounds(program.graphicSpec,"shape");
    for(let y=0;y<90;y++)for(let x=0;x<100;x++)if(rgba[(y*100+x)*4+1]<255){
      assert.ok(x+1>=bounds.left&&x<=bounds.right&&y+1>=bounds.top&&y<=bounds.bottom);
    }
  }
});
test("path clips retain owner scope across item replacement and reject unsafe import before drawing",()=>{
  let p=nestedProgram().editGraphics({target:"shape",property:"length",value:2});
  const clip=p.graphicSpec.objects.shape.clip;
  p=p.editGraphics({target:"shape",property:"items",value:[{type:"path",properties:{commands:ring(0,0,50),fill:"red"}}]});
  assert.deepEqual(p.graphicSpec.objects.shape.clip,clip);
  assert.throws(()=>p.editGraphics({target:p.graphicSpec.objects.shape.items[0].id,property:"clip",value:pathClip}),/clip/);
  const invalid=p.editGraphics({target:"shape",property:"clip",value:{type:"path",commands:[{op:"M",x:20000000,y:0}]}});
  const canvas=createCanvas(7,9),context=canvas.getContext("2d");
  assert.throws(()=>render(invalid,context),/16777216/);assert.equal(canvas.width,7);assert.equal(canvas.height,9);
  const scene=structuredClone(createTransitionScene(p,{format:"canvas"}));
  scene.nodes.at(-1).clips.push({type:"path",commands:[],fillRule:"evenodd"});
  assert.throws(()=>renderTransitionScene(scene,context));assert.equal(canvas.width,7);
  let reads=0;
  assert.throws(()=>validateGraphicClip({get type(){reads++;return "path";},commands:ring(0,0,1)},"path"),/data properties/);
  assert.equal(reads,0);
});
test("subpath stroke bounds include native zero-length caps and rotated cubic ink",()=>{
  for(const lineCap of ["butt","round","square"])for(const command of [{op:"L",x:20,y:20},{op:"C",x1:20,y1:20,x2:20,y2:20,x:20,y:20},{op:"Z"}]){
    const properties={commands:[{op:"M",x:20,y:20},command],stroke:"black",strokeWidth:4,lineCap};
    const bounds=resolvePrimitiveGraphicBounds("path",properties);
    assert.deepEqual(bounds,lineCap==="butt"?{left:20,right:20,top:20,bottom:20}:{left:18,right:22,top:18,bottom:22});
  }
  let p=chart().createCanvas({width:100,height:90,margin:0}).createGraphics({id:"p",type:"path",parent:"plot-main"});
  const properties={commands:[...ring(10,10,15),{op:"M",x:60,y:30},{op:"C",x1:30,y1:60,x2:60,y2:80,x:80,y:60}],stroke:"black",strokeWidth:6,lineCap:"square",lineJoin:"miter"};
  for(const [property,value]of Object.entries(properties))p=p.editGraphics({target:"p",property,value});
  const bounds=resolveConcreteGraphicBounds(p.graphicSpec,"p"),{rgba}=raster(p);
  for(let y=0;y<90;y++)for(let x=0;x<100;x++)if(rgba[(y*100+x)*4]<255)assert.ok(x+1>=bounds.left&&x<=bounds.right&&y+1>=bounds.top&&y<=bounds.bottom);
});

test("SVG scene path clips retain translated local geometry through JSON transport",async()=>{
  const p=nestedProgram(),scene=JSON.parse(JSON.stringify(createTransitionScene(p)));
  const rasterize=async svg=>{
    const image=await loadImage(Buffer.from(svg)),canvas=createCanvas(image.width,image.height),context=canvas.getContext("2d");
    context.drawImage(image,0,0);return Buffer.from(context.getImageData(0,0,image.width,image.height).data);
  };
  assert.equal(Buffer.compare(await rasterize(sceneSVG(scene)),await rasterize(renderToSVG(p))),0);
});
