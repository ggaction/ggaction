import { prepareFontRendering, prepareShadowRendering, render } from "../../src/index.js";
import { renderToSVG } from "../../src/renderers/svg.js";
import { registerFont } from "../font-assets/host.js";
import { createTextShadowExample } from "./program.js";
const program=createTextShadowExample(),pixelRatio=window.devicePixelRatio;
const fonts=await prepareFontRendering(program,{register:registerFont});
const shadows=await prepareShadowRendering(program,{fonts,pixelRatio,
 createCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;return c;},
 async decode({bytes,mimeType}){const image=await createImageBitmap(new Blob([bytes],{type:mimeType}));return{image,width:image.width,height:image.height,originClean:true};}
});
try{render(program,document.querySelector("#chart").getContext("2d"),{fonts,shadows,pixelRatio});document.querySelector("#svg").innerHTML=renderToSVG(program,{shadows});}
finally{shadows.dispose();fonts.dispose();}
document.querySelector("#status").textContent="Text shadows rendered";
window.__ggactionExample=Object.freeze({id:"text-shadows",width:220,height:160});
