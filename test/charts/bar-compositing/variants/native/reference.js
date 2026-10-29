import {blendOver,sourceOverStraight} from "../../../../oracles/compositing.js";
const inside=(paint,x,y)=>{const b=paint.bounds;return x>=b.x&&x<b.x+b.width&&y>=b.y&&y<b.y+b.height;};
const color=(paint,alpha)=>paint.rgb.map(v=>v/255).concat(alpha);
export function expectedGroup(fixture,x,y,isolated=true,applyGroupOpacity=true){
 let rgba=isolated?[0,0,0,0]:fixture.underlay.map(v=>v/255).concat(1);
 if(inside(fixture.back,x,y))rgba=sourceOverStraight(color(fixture.back,isolated?fixture.back.alpha:1),rgba);
 if(inside(fixture.front,x,y))rgba=blendOver(color(fixture.front,fixture.front.alpha),rgba,fixture.mode);
 if(isolated&&applyGroupOpacity)rgba[3]*=fixture.groupOpacity;
 return rgba;
}
export function expectedColor(fixture,panel,x,y){
 const rgba=expectedGroup(fixture,x,y,panel.isolated);
 return(panel.isolated?sourceOverStraight(rgba.map(v=>Math.round(v*255)/255),fixture.underlay.map(v=>v/255).concat(1)):rgba).map(v=>Math.round(v*255));
}
export const samplePoints=Object.freeze([[5,5],[40,25],[200,70],[120,50],[175,45]]);
