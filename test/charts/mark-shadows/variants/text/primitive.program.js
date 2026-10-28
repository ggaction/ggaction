import { chart } from "../../../../../src/index.js";
import { fonts } from "../../../../../examples/font-assets/fonts/manifest.js";
import { loadFont } from "../../../../../examples/font-assets/host.js";
import { frame, textShadowFixture } from "../../../../../examples/text-shadows/data.js";
const source=fonts[0],{bytes}=await loadFont({uri:new URL(`../../../../../examples/font-assets/fonts/${source.file}`,import.meta.url).href,mimeType:source.mimeType});
let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);
const font={contentHash:source.sha256,mimeType:source.mimeType,byteLength:bytes.length,family:source.family,style:"normal",weight:400,metricsProviderVersion:"example-canvas@1",payload:{encoding:"base64",data:btoa(binary)}};
export function createTextShadowPrimitive(style="rotated-outline"){
 const f=textShadowFixture(style);
 let p=chart().createGraphics({id:"canvas",type:"canvas"})
  .editGraphics({target:"canvas",property:"width",value:frame.width})
  .editGraphics({target:"canvas",property:"height",value:frame.height})
  .editGraphics({target:"canvas",property:"background",value:"white"})
  .createGraphics({id:"plot-main",type:"collection",parent:"canvas"})
  .createGraphics({id:"labels",type:"text",parent:"plot-main",length:1})
  .editGraphics({target:"labels",property:"items",value:[{type:"text",properties:{x:65,y:65,text:"AB\nA",
   lineJoin:"round",lines:[{text:"AB",x:0,y:0},{text:"A",x:0,y:30}],fill:"#d2462d",opacity:.8,fontSize:24,fontFamily:source.family,fontWeight:400,
   textAlign:"left",textBaseline:"alphabetic",rotation:f.rotation,font,shadow:f.shadow,...(f.outline?{outline:f.outline}:{})}}]});
 return f.clip?p.editGraphics({target:"labels",property:"clip",value:f.clip}):p;
}
