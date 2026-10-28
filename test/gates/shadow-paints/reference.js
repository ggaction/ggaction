import {shadowSampleReference} from "../../oracles/shadow.js";
export function expectedColor(fixture,x,y){
  if(x<20||x>=240||y<45||y>=180)return [255,255,255,255];
  if(x>=210&&x<230&&y>=75&&y<110)return [251,191,36,255];
  const clip=fixture.clip;if(clip&&(x<clip.x||x>=clip.x+clip.width||y<clip.y||y>=clip.y+clip.height))return [...fixture.underlay,255];
  const px=x-fixture.x,py=y-fixture.y;
  const sa=px>=0&&px<fixture.width&&py>=0&&py<fixture.height?fixture.alpha[py*fixture.width+px]/255:0;
  const ba=shadowSampleReference(fixture.alpha,fixture.width,fixture.height,fixture.options.blurRadius/2,px-fixture.options.offsetX,py-fixture.options.offsetY)/255*fixture.shadowAlpha;
  const combined=sa+ba*(1-sa);if(combined===0)return [...fixture.underlay,255];
  const alpha=Math.round(combined*fixture.opacity*255)/255;
  const straight=fixture.fill.map((c,i)=>Math.round((c*sa+fixture.shadow[i]*ba*(1-sa))/combined));
  return [...straight.map((c,i)=>Math.round(c*alpha+fixture.underlay[i]*(1-alpha))),255];
}
export const pixels=Object.freeze([[115,110],[158,115],[175,115],[90,147],[75,75],[220,85],[50,100],[145,115]]);
