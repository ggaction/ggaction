import { prepareShadowRendering, render } from "../../src/index.js";
import { createMarkShadowExample } from "./program.js";
const program=createMarkShadowExample(), pixelRatio=window.devicePixelRatio;
const shadows=await prepareShadowRendering(program,{
  pixelRatio,
  createCanvas(width,height){const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;return canvas;},
  async decode({bytes,mimeType}){const image=await createImageBitmap(new Blob([bytes],{type:mimeType}));return{image,width:image.width,height:image.height,originClean:true};}
});
render(program,document.querySelector("#chart").getContext("2d"),{pixelRatio,shadows});
shadows.dispose();
document.querySelector("#status").textContent="Mark shadows rendered";
window.__ggactionExample=Object.freeze({id:"mark-shadows",width:260,height:200});
