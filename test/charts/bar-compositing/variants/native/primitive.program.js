import {frame} from "./fixture.js";
const rgba=(paint,alpha)=>`rgba(${paint.rgb.join(",")},${alpha})`;
function rectangle(context,paint){const b=paint.bounds;context.fillRect(b.x,b.y,b.width,b.height);}
export function drawBlendGroup(context,fixture,{isolated=false}={}){
 context.save();context.globalCompositeOperation="source-over";context.globalAlpha=1;
 context.fillStyle=rgba(fixture.back,isolated?fixture.back.alpha:1);rectangle(context,fixture.back);
 context.globalCompositeOperation=fixture.mode;context.fillStyle=rgba(fixture.front,fixture.front.alpha);rectangle(context,fixture.front);context.restore();
}
export function drawBlendPrimitive(context,fixture,isolatedImage){
 context.save();context.fillStyle="white";context.fillRect(0,0,frame.width,frame.height);
 context.fillStyle="#243447";context.font="14px Arial";context.fillText(fixture.title,20,23);
 for(const panel of fixture.panels){context.fillStyle="#e2e8f0";context.fillRect(panel.x,panel.y,fixture.group.width,fixture.group.height);context.save();context.translate(panel.x,panel.y);
  if(panel.isolated)context.drawImage(isolatedImage,0,0);else drawBlendGroup(context,fixture);context.restore();}
 context.fillStyle="#243447";context.font="11px Arial";context.fillText("native blend · opaque backdrop",20,39);context.fillText("shared group · transparent backdrop",20,164);context.restore();
}
export function blendPrimitiveSVG(fixture,dataURL){
 const shape=(paint,alpha,mode)=>{const b=paint.bounds;return`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="rgb(${paint.rgb.join(",")})" fill-opacity="${alpha}"${mode!=="source-over"?` style="mix-blend-mode:${mode}"`:""}/>`;};
 const panels=fixture.panels.map(panel=>`<rect x="${panel.x}" y="${panel.y}" width="260" height="90" fill="#e2e8f0"/><g transform="translate(${panel.x} ${panel.y})">${panel.isolated?`<image width="260" height="90" href="${dataURL}"/>`:`${shape(fixture.back,panel.isolated?fixture.back.alpha:1,"source-over")}${shape(fixture.front,fixture.front.alpha,fixture.mode)}`}</g>`).join("");
 return`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="280" style="isolation:isolate"><rect width="300" height="280" fill="white"/><text x="20" y="23" font-size="14" font-family="Arial" fill="#243447">${fixture.title}</text><text x="20" y="39" font-size="11" font-family="Arial" fill="#243447">native blend · opaque backdrop</text><text x="20" y="164" font-size="11" font-family="Arial" fill="#243447">shared group · transparent backdrop</text>${panels}</svg>`;
}
