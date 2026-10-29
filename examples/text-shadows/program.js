import { chart, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { fonts } from "../font-assets/fonts/manifest.js";
import { loadFont, decodeFont, measureFont } from "../font-assets/host.js";
import { frame, styles, textShadowFixture } from "./data.js";
const font=fonts[0],requestToken="text-shadow-example",programs=new Map();
for(const style of styles){
 const f=textShadowFixture(style),scale={domain:[0,512],range:[0,512]};
 let p=chart().createCanvas({...frame,margin:f.clip?{left:60,top:50,right:110,bottom:55}:0})
  .createData({id:"labels",values:[{x:f.x,y:f.y,text:f.text}]})
  .createTextMark({id:"labels",data:"labels",fontFamily:font.family,fontWeight:400,fontSize:f.fontSize,lineHeight:f.lineHeight,
    fill:"#d2462d",opacity:.8,rotation:f.rotation,shadow:f.shadow,lineJoin:"round",clip:Boolean(f.clip),
    ...(f.outline?{outline:f.outline}:{})})
  .encodeX({field:"x",scale}).encodeY({field:"y",scale}).encodeText({field:"text"});
 const prepared=await prepareFontResource(p,{kind:"create",id:"shadow-font",uri:new URL(`../font-assets/fonts/${font.file}`,import.meta.url).href,
  mimeType:font.mimeType,expectedHash:font.sha256,family:font.family,style:"normal",weight:400,metricsProviderVersion:"example-canvas@1",license:"OFL-1.1"},
  {requestToken,load:loadFont,decode:decodeFont});
 p=p.createFontResource({prepared,requestToken});
 const metrics=await prepareTextMetrics(p,{id:"shadow-metrics",fonts:["shadow-font"]},{requestToken,decode:decodeFont,measure:measureFont});
 programs.set(style,p.applyTextMetrics({prepared:metrics,requestToken}));
}
export function createTextShadowExample(style="rotated-outline"){
 if(!programs.has(style))throw new TypeError("Unknown text shadow style.");
 return programs.get(style);
}
