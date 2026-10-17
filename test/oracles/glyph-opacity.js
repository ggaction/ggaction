// Independent literal primitive: 40px center, 20px radius / 40px square, 10px outline.
export const GLYPH_OPACITY_COMMANDS=[{op:'M',x:20,y:20},{op:'L',x:60,y:20},{op:'L',x:60,y:60},{op:'L',x:20,y:60},{op:'Z'}];
export function normalGlyphScene(type,opacity,fill,stroke,nested=false){
 const glyph={type,properties:{...(type==='circle'?{x:40,y:40,radius:20}:type==='rect'?{x:20,y:20,width:40,height:40}:{commands:GLYPH_OPACITY_COMMANDS}),fill,stroke,strokeWidth:10,opacity,blend:'normal'}};
 return {graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:80,height:80,background:'white'},children:[nested?'window':'glyph']},...(nested?{window:{type:'canvas',properties:{x:3.5,y:2.25,width:55,height:60},children:['glyph']}}:{}),glyph},order:['canvas']}};
}
export function independentGlyphReference(factory,{type,opacity,fill,stroke,background,pixelRatio=1,nested=false,surfaceOnly=false}){
 const offsetX=nested?3.5:0,offsetY=nested?2.25:0;
 // Literal primitive outline bound15..65 and independent one-device-pixel AA pad.
 const left=Math.max(Math.floor(offsetX*pixelRatio),Math.floor((15+offsetX)*pixelRatio)-1);
 const top=Math.max(Math.floor(offsetY*pixelRatio),Math.floor((15+offsetY)*pixelRatio)-1);
 const right=Math.min(Math.ceil((nested?58.5:80)*pixelRatio),Math.ceil((65+offsetX)*pixelRatio)+1);
 const bottom=Math.min(Math.ceil((nested?62.25:80)*pixelRatio),Math.ceil((65+offsetY)*pixelRatio)+1);
 const width=right-left,height=bottom-top,source=factory(width,height),s=source.getContext('2d');
 s.scale(pixelRatio,pixelRatio);s.translate(-(left/pixelRatio-offsetX),-(top/pixelRatio-offsetY));
 s.fillStyle=fill;s.strokeStyle=stroke;s.lineWidth=10;s.beginPath();
 if(type==='rect'){s.fillRect(20,20,40,40);s.moveTo(20,20);s.lineTo(60,20);s.lineTo(60,60);s.lineTo(20,60);s.closePath();s.stroke();}
 else if(type==='circle')s.arc(40,40,20,0,Math.PI*2);
 else{s.moveTo(20,20);s.lineTo(60,20);s.lineTo(60,60);s.lineTo(20,60);s.closePath();}
 if(type!=='rect'){s.fill();s.stroke();}
 const intrinsic=s.getImageData(0,0,width,height).data;
 s.setTransform(1,0,0,1,0,0);s.globalCompositeOperation='destination-in';s.globalAlpha=opacity;s.fillStyle='white';s.fillRect(0,0,width,height);
 const attenuated=s.getImageData(0,0,width,height).data;
 // Alpha must be attenuated once, with the backend's8bit paint-alpha conversion.
 const alphaProbe=factory(1,1),probe=alphaProbe.getContext('2d');probe.globalAlpha=opacity;probe.fillStyle='white';probe.fillRect(0,0,1,1);const mask=probe.getImageData(0,0,1,1).data[3];
 for(let i=3;i<intrinsic.length;i+=4){
  const expected=Math.round(intrinsic[i]*mask/255);
  if(attenuated[i]!==expected)throw new Error(`Source alpha must apply once: ${attenuated[i]} versus ${expected}.`);
 }
 if(surfaceOnly)return{source,left,top};
 const expected=factory(80*pixelRatio,80*pixelRatio),e=expected.getContext('2d');e.fillStyle=background;e.fillRect(0,0,expected.width,expected.height);
 if(nested){e.beginPath();e.rect(offsetX*pixelRatio,offsetY*pixelRatio,55*pixelRatio,60*pixelRatio);e.clip();}
 e.drawImage(source,left,top);
 return expected;
}
