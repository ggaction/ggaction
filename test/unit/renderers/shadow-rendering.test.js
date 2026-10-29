import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prepareShadowRendering } from "../../../src/renderers/shadowRendering.js";
import { render } from "../../../src/renderers/canvas/index.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { createTransitionScene, renderTransitionScene } from "../../../src/scene.js";

const decode = async ({ bytes }) => { const image = await loadImage(bytes); return { image, width: image.width, height: image.height, originClean: true }; };
const host = { createCanvas, decode };
function example(patch = {}) {
  return { graphicSpec: { objects: {
    canvas: { type: "canvas", properties: { width: 32, height: 32 } },
    rect: { type: "rect", properties: { x: 8, y: 8, width: 8, height: 8, fill: "red", stroke: "none", strokeWidth: 0, opacity: 1,
      shadow: { color: "blue", offsetX: 4, offsetY: 2, blurRadius: 0 }, ...patch } }
  }, order: ["canvas", "rect"] } };
}
function pixels(program, shadows) {
  const canvas = createCanvas(32, 32), context = canvas.getContext("2d");
  render(program, context, { shadows });
  return context.getImageData(0, 0, 32, 32).data;
}
const pixel = (rgba, x, y) => [...rgba.slice((y * 32 + x) * 4, (y * 32 + x) * 4 + 4)];

test("prepares actual fill alpha and one canonical glyph shared by Canvas and embedded SVG", async () => {
  const p = example(), snapshot = JSON.stringify(p), shadows = await prepareShadowRendering(p, host);
  assert.equal(shadows.kind, "shadow-rendering"); assert.equal(shadows.glyphCount, 1); assert.equal(shadows.pixelRatio, 1);
  const rgba = pixels(p, shadows);
  assert.deepEqual(pixel(rgba, 8, 8), [255,0,0,255]);
  assert.deepEqual(pixel(rgba, 13, 12), [255,0,0,255]);
  assert.deepEqual(pixel(rgba, 18, 12), [0,0,255,255]);
  assert.deepEqual(pixel(rgba, 18, 8), [0,0,0,0]);
  const svg = renderToSVG(p, { shadows });
  assert.match(svg, /data:image\/png;base64,/);
  // Decode the exact embedded bytes here; real SVG rasterization is covered by
  // the browser contract because this native SVG decoder omits embedded images.
  const tag = svg.match(/<image ([^>]+)\/>/)[1];
  const attr = name => tag.match(new RegExp(`${name}="([^\"]+)"`))[1];
  const image = await loadImage(Buffer.from(attr("href").split(",")[1], "base64"));
  const canvas = createCanvas(32,32), ctx = canvas.getContext("2d");
  ctx.drawImage(image, Number(attr("x")), Number(attr("y")), Number(attr("width")), Number(attr("height")));
  assert.deepEqual(ctx.getImageData(0,0,32,32).data, rgba);
  assert.equal(JSON.stringify(p), snapshot);
  shadows.dispose(); shadows.dispose();
  assert.throws(() => pixels(p, shadows), /disposed/);
  assert.throws(() => renderToSVG(p, { shadows }), /disposed/);
});

test("applies opacity once to the combined source and shadow and retains normal compositing", async () => {
  const p = example({ opacity: .5, blend: "normal" }), shadows = await prepareShadowRendering(p, host), rgba = pixels(p, shadows);
  assert.deepEqual(pixel(rgba, 13, 12), [255,0,0,128]);
  assert.deepEqual(pixel(rgba, 18, 12), [0,0,255,128]);
  shadows.dispose();
});

test("retains source outside an owner clip when its shadow contributes inside", async () => {
  const p = example(); p.graphicSpec.objects.rect.clip = { x: 16, y: 0, width: 16, height: 32 };
  const shadows = await prepareShadowRendering(p, host), rgba = pixels(p, shadows);
  assert.deepEqual(pixel(rgba, 14, 12), [0,0,0,0]);
  assert.deepEqual(pixel(rgba, 18, 12), [0,0,255,255]);
  shadows.dispose();
});

test("rejects absent, wrong, stale, changed, disposed and incompatible density handles before clear", async () => {
  const p = example(), shadows = await prepareShadowRendering(p, host), canvas = createCanvas(5,5), ctx = canvas.getContext("2d");
  ctx.fillStyle = "green"; ctx.fillRect(0,0,5,5); const before = [...ctx.getImageData(0,0,5,5).data];
  for (const options of [{}, { shadows: {} }, { shadows, pixelRatio: 2 }]) assert.throws(() => render(p, ctx, options));
  assert.throws(() => render(example(), ctx, { shadows }), /different/);
  p.graphicSpec.objects.rect.properties.fill = "yellow";
  assert.throws(() => render(p, ctx, { shadows }), /changed/);
  assert.equal(canvas.width, 5); assert.equal(canvas.height, 5); assert.deepEqual([...ctx.getImageData(0,0,5,5).data], before);
  shadows.dispose();
});

test("provides SVG-only preparation without decoding and requires explicit Canvas decode", async () => {
  const p = example(), shadows = await prepareShadowRendering(p, { createCanvas });
  assert.match(renderToSVG(p, { shadows }), /image\/png/);
  assert.throws(() => pixels(p, shadows), /decode callback/);
  shadows.dispose();
});

test("shares concrete Canvas and SVG scene effects and checks handle lifecycle on every creation", async () => {
  const p = example(), shadows = await prepareShadowRendering(p, host);
  const svgScene = createTransitionScene(p, { shadows }); assert.match(svgScene.nodes[0].svg, /image\/png/);
  shadows.dispose(); assert.throws(() => createTransitionScene(p, { shadows }), /disposed/);
  const scene = createTransitionScene(p, { format: "canvas" });
  const sceneShadows = await prepareShadowRendering(scene, host), canvas = createCanvas(32,32), ctx = canvas.getContext("2d");
  renderTransitionScene(scene, ctx, { shadows: sceneShadows });
  assert.deepEqual(pixel(ctx.getImageData(0,0,32,32).data, 18,12), [0,0,255,255]);
  sceneShadows.dispose();
});

test("validates closed host input, cumulative work and abort before callbacks", async () => {
  let calls = 0; const create = (...args) => { calls++; return createCanvas(...args); };
  const controller = new AbortController(); controller.abort();
  for (const options of [null, {}, { createCanvas: create, extra: 1 }, { createCanvas: create, pixelRatio: 0 },
    { createCanvas: create, decode: 1 }, { createCanvas: create, signal: controller.signal }]) {
    await assert.rejects(prepareShadowRendering(example(), options));
  }
  const p = example({ shadow: { color: "blue", offsetX: 1e6, offsetY: 0, blurRadius: 0 } });
  await assert.rejects(prepareShadowRendering(p, { createCanvas: create }), /dimension/);
  assert.equal(calls, 0);
  const huge = example({ width: 400, height: 300, shadow: { color: "blue", offsetX: 0, offsetY: 0, blurRadius: 20 } });
  huge.graphicSpec.objects.canvas.properties = { width: 400, height: 300 };
  await assert.rejects(prepareShadowRendering(huge, { createCanvas: create }), /work/);
  assert.equal(calls, 0);
});

test("rejects host mutation and asynchronous abort without returning a reusable handle", async () => {
  const p = example();
  await assert.rejects(prepareShadowRendering(p, { ...host, decode: async request => {
    p.graphicSpec.objects.rect.properties.opacity = .25; return decode(request);
  } }), /changed/);
  const controller = new AbortController();
  await assert.rejects(prepareShadowRendering(example(), { ...host, signal: controller.signal, decode: async request => {
    controller.abort(); return decode(request);
  } }), error => error.name === "AbortError");
});

test("prepares nested collection glyphs in root pixel alignment and retains exact ancestor clips", async () => {
  const p = example(), properties = p.graphicSpec.objects.rect.properties;
  p.graphicSpec.objects.canvas.children = ["nested"];
  p.graphicSpec.objects.nested = {type:"canvas",properties:{x:5,y:7,width:24,height:24},children:["rect"]};
  p.graphicSpec.objects.rect = {type:"rect",items:[{id:"first",properties},
    {id:"second",properties:{...properties,x:1000,y:1000}}]};
  p.graphicSpec.order=["canvas"];
  const shadows=await prepareShadowRendering(p,host);
  try {
    const rgba=pixels(p,shadows);
    assert.deepEqual(pixel(rgba,23,19),[0,0,255,255]);
    assert.deepEqual(pixel(rgba,30,19),[0,0,0,0]);
    assert.equal(shadows.glyphCount,2);
  } finally {shadows.dispose();}
});

test("active handles release their abort listener on abort and explicit disposal", async () => {
  const {getEventListeners}=await import("node:events");
  for(const abort of [false,true]){
    const controller=new AbortController(),p=example();
    const shadows=await prepareShadowRendering(p,{...host,signal:controller.signal});
    assert.equal(getEventListeners(controller.signal,"abort").length,1);
    if(abort)controller.abort();else shadows.dispose();
    assert.equal(getEventListeners(controller.signal,"abort").length,0);
    assert.throws(()=>pixels(p,shadows),/disposed/);shadows.dispose();
  }
});

test("unreadable or malformed host surfaces fail without returning a glyph handle", async () => {
  for(const create of [()=>null,(width,height)=>{
    const canvas=createCanvas(width,height),context=canvas.getContext("2d");
    context.getImageData=()=>({data:new Uint8Array(width*height*4)});return canvas;
  }])await assert.rejects(prepareShadowRendering(example(),{createCanvas:create}),/readable|RGBA/);
  const p=example();p.graphicSpec.objects.rect.clip={x:30,y:30,width:0,height:0};
  const shadows=await prepareShadowRendering(p,host);
  try{assert.ok([...pixels(p,shadows)].every(value=>value===0));}finally{shadows.dispose();}
});
