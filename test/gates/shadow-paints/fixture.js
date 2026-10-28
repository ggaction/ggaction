import { blurShadowMask } from "../../../src/grammar/shadow.js";

export const frame = Object.freeze({width:260,height:200});
export const styles = Object.freeze(["zero-blur","soft-shadow","negative-offset","alpha-once","clip","circle"]);
export function shadowFixture(style) {
  if (!styles.includes(style)) throw new TypeError("Unknown shadow review variant.");
  const width=70,height=60,fillAlpha=style==="alpha-once"?.6:1;
  const alpha=Array.from({length:width*height},(_,index)=>{
    if(style!=="circle")return Math.round(255*fillAlpha);
    const x=index%width,y=Math.floor(index/width);let count=0;
    for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++)if(Math.hypot(x+(sx+.5)/4-35,y+(sy+.5)/4-30)<=26)count++;
    return Math.round(255*count/16);
  });
  return {style,title:style.replaceAll("-"," "),width,height,alpha,x:80,y:80,
    fill:[210,70,45],shadow:[30,60,90],shadowAlpha:.5,opacity:style==="alpha-once"?.65:1,
    options:{width,height,blurRadius:style==="zero-blur"?0:8,offsetX:style==="negative-offset"?-14:14,offsetY:style==="negative-offset"?-10:10},
    clip:style==="clip"?{x:65,y:65,width:70,height:78}:null,underlay:[226,232,240]};
}

// This candidate rasterizes only the effect glyph, then attenuates it once.
// Source alpha includes authored fill alpha; mark opacity is applied after blur.
export function prepareShadowGlyph(fixture) {
  const shadow=blurShadowMask(fixture.alpha,fixture.options),left=Math.min(0,shadow.bounds.x),top=Math.min(0,shadow.bounds.y);
  const right=Math.max(fixture.width,shadow.bounds.x+shadow.width),bottom=Math.max(fixture.height,shadow.bounds.y+shadow.height);
  const width=right-left,height=bottom-top;
  if(![left,top,width,height].every(Number.isSafeInteger)||width*height*4>8_388_608)throw new RangeError("Shadow review RGBA sublayer exceeds its allocation limit.");
  const pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const sourceX=x+left,sourceY=y+top,sx=sourceX-shadow.bounds.x,sy=sourceY-shadow.bounds.y;
    const source=sourceX>=0&&sourceX<fixture.width&&sourceY>=0&&sourceY<fixture.height?fixture.alpha[sourceY*fixture.width+sourceX]/255:0;
    const behind=sx>=0&&sx<shadow.width&&sy>=0&&sy<shadow.height?shadow.alpha[sy*shadow.width+sx]/255*fixture.shadowAlpha:0;
    const opacity=source+behind*(1-source),index=(y*width+x)*4;
    if(opacity===0)continue;
    for(let channel=0;channel<3;channel++)pixels[index+channel]=Math.round((fixture.fill[channel]*source+fixture.shadow[channel]*behind*(1-source))/opacity);
    pixels[index+3]=Math.round(opacity*fixture.opacity*255);
  }
  return {x:left,y:top,width,height,pixels,shadowPlan:shadow};
}
