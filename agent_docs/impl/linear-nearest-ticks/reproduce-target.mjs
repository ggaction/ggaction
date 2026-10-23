import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNGBuffer } from "../../../src/renderers/png.js";
import { renderToSVG } from "../../../src/renderers/svg.js";
import { verifyTarget, tickValues } from "./target.mjs";

const out = ".artifacts/test/png/review/linear-nearest-ticks/default";
const hash = b => createHash("sha256").update(b).digest("hex");
await fs.mkdir(out, { recursive: true });
const { primitive, control } = verifyTarget();
const a = await renderToPNGBuffer(primitive), b = await renderToPNGBuffer(control);
assert.deepEqual(a.buffer, b.buffer);
const decode = async buffer => {
  const image = await loadImage(buffer), canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return Buffer.from(context.getImageData(0, 0, image.width, image.height).data);
};
const pixels = await decode(a.buffer);
assert.deepEqual(pixels, await decode(b.buffer));
let plotInk = 0;
for (let y = 20; y < 140; y++) for (let x = 40; x < 240; x++) {
  const i = 4 * (y * 260 + x);
  if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) plotInk++;
}
assert(plotInk > 100);
const svg = renderToSVG(primitive);
assert.equal(svg, renderToSVG(control));
await fs.writeFile(out + "/primitive.png", a.buffer);
await fs.writeFile(out + "/explicit-control.png", b.buffer);
await fs.writeFile(out + "/primitive.svg", svg);
const proof = {
  status: "verified-before-new-public-option-implementation", width: a.width, height: a.height,
  graphicSpecExact: true, sameRunPngBufferExact: true, sameRunDecodedPixelsExact: true,
  sameSvgExact: true, plotInkPixels: plotInk, tickValues,
  pngSha256: hash(a.buffer), decodedPixelsSha256: hash(pixels),
  targetSourceSha256: hash(await fs.readFile(new URL("./target.mjs", import.meta.url))),
  manualImageInspection: false, publicNewOptionImplemented: false
};
await fs.writeFile(out + "/target-proof.json", JSON.stringify(proof, null, 2) + "\n");
await fs.writeFile(out + "/variant.json", JSON.stringify({ capability: "axes", chart: "linear-nearest-ticks", variant: "default", displayTitle: "Nearest-step automatic linear ticks", targetSource: "agent_docs/impl/linear-nearest-ticks/target.mjs", targetPublicCallChain: "chart().createCanvas({plot:{width:200,height:120},margin:{left:40,top:20,right:20,bottom:30}}).createData({values:[{x:0,y:0},{x:1,y:133}]}).createLinePlot({x:{field:'x',scale:{domain:[0,1]}},y:{field:'y',scale:{domain:[0,140]}},guides:false}).createYAxis({title:false,ticksAndLabels:{count:5,rounding:'nearest'}})", targetCallIsProposed: true, width: 260, height: 170 }, null, 2) + "\n");
console.log(proof);
