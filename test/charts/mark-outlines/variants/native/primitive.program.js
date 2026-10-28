import {frame,fontFamily} from "./fixture.js";
const rgb=c=>`rgb(${c.join(",")})`;
function shape(context,fixture){
 context.beginPath();
 if(fixture.kind==="rect"){const b=fixture.rect;context.rect(b.x,b.y,b.width,b.height);}
 if(fixture.kind==="circle"){const c=fixture.circle;context.arc(c.x,c.y,c.radius,0,Math.PI*2);}
 if(fixture.kind==="path"){fixture.path.forEach((p,i)=>i?context.lineTo(p.x,p.y):context.moveTo(p.x,p.y));context.closePath();}
}
export function drawOutlineGlyph(context,fixture){
 context.save();context.globalAlpha=1;context.fillStyle=rgb(fixture.fill);context.strokeStyle=rgb(fixture.stroke);context.lineWidth=fixture.strokeWidth||1;context.lineJoin="round";context.lineCap="round";
 if(fixture.kind==="text"){
  const t=fixture.text;context.font=`${t.fontSize}px "${fontFamily}"`;context.textBaseline="alphabetic";
  if(fixture.strokeWidth>0)context.strokeText(t.value,t.x,t.y);context.fillText(t.value,t.x,t.y);
 }else{shape(context,fixture);if(fixture.strokeWidth>0)context.stroke();context.fill();}context.restore();
}
export function drawOutlinePrimitive(context,fixture,groupImage){
 context.save();context.fillStyle="white";context.fillRect(0,0,frame.width,frame.height);context.fillStyle="#243447";context.font="14px Arial";context.fillText(fixture.title,20,24);
 context.fillStyle=rgb(fixture.underlay);context.fillRect(20,45,240,135);context.save();
 if(fixture.clip){const c=fixture.clip;context.beginPath();context.rect(c.x,c.y,c.width,c.height);context.clip();}
 if(groupImage){context.drawImage(groupImage,fixture.group.x,fixture.group.y);}else drawOutlineGlyph(context,fixture);
 context.restore();context.restore();
}
export function outlinePrimitiveSVG(fixture,fontURL,groupURL){
 const paint=`fill="${rgb(fixture.fill)}" stroke="${rgb(fixture.stroke)}" stroke-width="${fixture.strokeWidth}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke fill"`;
 let glyph;
 if(fixture.kind==="rect"){const b=fixture.rect;glyph=`<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" ${paint}/>`;}
 if(fixture.kind==="circle"){const c=fixture.circle;glyph=`<circle cx="${c.x}" cy="${c.y}" r="${c.radius}" ${paint}/>`;}
 if(fixture.kind==="path")glyph=`<path d="${fixture.path.map((p,i)=>`${i?"L":"M"}${p.x},${p.y}`).join(" ")} Z" ${paint}/>`;
 if(fixture.kind==="text"){const t=fixture.text;glyph=`<text x="${t.x}" y="${t.y}" font-family="${fontFamily}" font-size="${t.fontSize}" ${paint}>${t.value}</text>`;}
 if(groupURL)glyph=`<image x="${fixture.group.x}" y="${fixture.group.y}" width="${fixture.group.width}" height="${fixture.group.height}" href="${groupURL}"/>`;
 const c=fixture.clip,clip=c?`<clipPath id="clip"><rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}"/></clipPath>`:"";
 return`<svg xmlns="http://www.w3.org/2000/svg" width="280" height="200"><defs><style>@font-face{font-family:'${fontFamily}';src:url('${fontURL}')}</style>${clip}</defs><rect width="280" height="200" fill="white"/><text x="20" y="24" font-family="Arial" font-size="14" fill="#243447">${fixture.title}</text><rect x="20" y="45" width="240" height="135" fill="#e2e8f0"/><g${c?' clip-path="url(#clip)"':""}>${glyph}</g></svg>`;
}
