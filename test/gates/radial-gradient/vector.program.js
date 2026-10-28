import { radialGradientCircle } from "../../../src/grammar/radialGradient.js";
import { interpolateColorStops } from "../../../src/grammar/scales/color.js";
import { frame } from "./fixture.js";
export const RADIAL_BANDS = 512;
const hex = rgb => "#" + rgb.map(value => value.toString(16).padStart(2,"0")).join("");
function paintAt(fixture, t) {
  let left=fixture.stops[0],right=fixture.stops.at(-1);
  for(const stop of fixture.stops)if(stop.offset<=t)left=stop;
  for(const stop of fixture.stops)if(stop.offset>t){right=stop;break;}
  const ratio=right.offset===left.offset?1:Math.min(1,Math.max(0,(t-left.offset)/(right.offset-left.offset)));
  return {color:interpolateColorStops([hex(left.value.rgb),hex(right.value.rgb)],ratio,"rgb"),alpha:(left.value.alpha+(right.value.alpha-left.value.alpha)*ratio)*fixture.opacity};
}
function circle(context,value){context.moveTo(value.x+value.radius,value.y);context.arc(value.x,value.y,value.radius,0,Math.PI*2);context.closePath();}
// Bounded native vector candidate. Every band is a disjoint compound ring.
// No images or full-chart raster fallback; public integration remains pending.
export function drawRadialVectorPrimitive(context,fixture){
  const {bounds,gradient}=fixture;
  context.save();context.fillStyle="white";context.fillRect(0,0,frame.width,frame.height);
  context.fillStyle="#243447";context.font="14px Arial";context.fillText(fixture.title,20,24);
  context.fillStyle=fixture.underlay;context.fillRect(bounds.x,bounds.y,bounds.width,bounds.height);
  context.save();context.beginPath();context.rect(bounds.x,bounds.y,bounds.width,bounds.height);context.clip();
  if(fixture.clip){context.beginPath();context.arc(130,110,60,0,Math.PI*2);context.clip();}
  // This review's edge focal is exactly the leftmost point of its end circle.
  if(fixture.style==="edge-focus"){context.beginPath();context.rect(gradient.focal.x,bounds.y,bounds.x+bounds.width-gradient.focal.x,bounds.height);context.clip();}
  const outside=paintAt(fixture,1);context.fillStyle=outside.color;context.globalAlpha=outside.alpha;
  context.beginPath();context.rect(bounds.x,bounds.y,bounds.width,bounds.height);circle(context,radialGradientCircle(gradient,1));context.fill("evenodd");
  for(let index=RADIAL_BANDS;index>0;index--){
    const outer=radialGradientCircle(gradient,index/RADIAL_BANDS),inner=radialGradientCircle(gradient,(index-1)/RADIAL_BANDS),paint=paintAt(fixture,(index-0.5)/RADIAL_BANDS);
    context.fillStyle=paint.color;context.globalAlpha=paint.alpha;context.beginPath();circle(context,outer);if(inner.radius>0)circle(context,inner);context.fill("evenodd");
  }
  context.restore();context.restore();
}
