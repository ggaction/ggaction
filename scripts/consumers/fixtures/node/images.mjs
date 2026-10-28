import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, prepareImageResource, prepareImageRendering, render } from "ggaction";
import { chart as basic, prepareImageRendering as prepareBasic } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { getMarkItems } from "ggaction/inspection";
const bytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="#ff0000"/></svg>');
const source = { uri: "fixture:logo", expectedHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "image/svg+xml" };
const decode = async ({bytes}) => { const image = await loadImage(bytes); return {image,width:image.width,height:image.height,originClean:true}; };
const host = {requestToken:"now",load:()=>({bytes,mimeType:source.mimeType}),decode:async request=>{const {width,height,originClean}=await decode(request);return{width,height,originClean};}};
async function example() {
  const base = chart().createCanvas({width:100,height:80,margin:0});
  const prepared = await prepareImageResource(base,{kind:"create",id:"logo",...source},host);
  return base.createImageResource({prepared,requestToken:"now"}).createImageMark({fit:"fill",alt:"Logo"});
}
export const cases = [
  { id:"images/resource-lifecycle", async run() {
    const base = await example(), key = getMarkItems(base)[0].key;
    const changed = base.editImageMark({opacity:0.5}).selectMarks({property:"opacity",op:"eq",value:0.5}).highlightMarks({opacity:0.25});
    const prepared = await prepareImageResource(changed,{kind:"replace",target:"logo",...source},host);
    assert.throws(()=>base.replaceImageResource({prepared,requestToken:"now"}),error=>error.assetCode==="stale-result");
    const next = changed.replaceImageResource({prepared,requestToken:"now"});
    assert.equal(next.semanticSpec.layers[0].image.revision,1);assert.equal(getMarkItems(next)[0].key,key);
    assert.equal(next.graphicSpec.objects.image.items[0].properties.opacity,0.25);
    assert.equal(renderToSVG(deserializeProgram(serializeProgram(next))),renderToSVG(next));
    assert.equal(next.removeMark().semanticSpec.resources.filter(resource => resource.kind === "image").length,1);
    assert.equal(basic().createImageMark,undefined);
  } },
  { id:"images/renderer-scene-offline", async run() {
    const program=await example(), graphic=deserializeGraphic(serializeGraphic(program));
    const images=await prepareImageRendering(program,{decode}), canvas=createCanvas(1,1);render(program,canvas.getContext("2d"),{images});
    assert.deepEqual([...canvas.getContext("2d").getImageData(50,40,1,1).data],[255,0,0,255]);
    const restoredImages=await prepareBasic(graphic,{decode}), restoredCanvas=createCanvas(1,1);render(graphic,restoredCanvas.getContext("2d"),{images:restoredImages});
    assert.deepEqual(canvas.toBuffer("image/png"),restoredCanvas.toBuffer("image/png"));
    assert.equal(renderToSVG(graphic),renderToSVG(program));
    assert.deepEqual((await renderToPNGBuffer(graphic)).buffer,(await renderToPNGBuffer(program)).buffer);
    assert.equal((await renderToPDFBuffer(graphic)).buffer.subarray(0,4).toString(),"%PDF");
    const scene=createTransitionScene(graphic,{format:"canvas"}), sceneImages=await prepareImageRendering(scene,{decode}), sceneCanvas=createCanvas(1,1);
    renderTransitionScene(scene,sceneCanvas.getContext("2d"),{images:sceneImages});
    assert.deepEqual(sceneCanvas.toBuffer("image/png"),canvas.toBuffer("image/png"));
    assert.throws(()=>render(graphic,canvas.getContext("2d"),{images}),error=>error.assetCode==="stale-result");
  } }
];
