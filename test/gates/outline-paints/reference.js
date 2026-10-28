const within=(b,x,y)=>x>=b.x&&y>=b.y&&x<b.x+b.width&&y<b.y+b.height;
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
function polygonContains(points,x,y){let sign;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],value=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(value!==0){const next=value>0;if(sign!==undefined&&next!==sign)return false;sign=next;}}return true;}
function rectangleCoverage(b,x,y,extent){if(within(b,x,y))return"fill";const distance=Math.hypot(Math.max(b.x-x,0,x-b.x-b.width),Math.max(b.y-y,0,y-b.y-b.height));return extent>0&&distance<extent?"stroke":null;}
export function expectedColor(fixture,x,y){
 x+=.5;y+=.5;if(fixture.clip&&!within(fixture.clip,x,y))return fixture.underlay.concat(255);
 const extent=fixture.strokeWidth/2;let ink;
 if(fixture.kind==="rect")ink=rectangleCoverage(fixture.rect,x,y,extent);
 if(fixture.kind==="circle"){const c=fixture.circle,distance=Math.hypot(x-c.x,y-c.y);ink=distance<c.radius?"fill":extent>0&&distance<c.radius+extent?"stroke":null;}
 if(fixture.kind==="path"){const p=fixture.path;ink=polygonContains(p,x,y)?"fill":extent>0&&p.some((a,i)=>segmentDistance(x,y,a,p[(i+1)%p.length])<extent)?"stroke":null;}
 if(fixture.kind==="text"){
  // Independent font literals: A [50,0,550,700], B [50,0,750,700],
  // advances 600/800 at 1000 units per em; no font parser or production owner.
  const t=fixture.text,scale=t.fontSize/1000,boxes=[{x:t.x+50*scale,y:t.y-700*scale,width:500*scale,height:700*scale},{x:t.x+650*scale,y:t.y-700*scale,width:700*scale,height:700*scale}];
  const covers=boxes.map(b=>rectangleCoverage(b,x,y,extent));ink=covers.includes("fill")?"fill":covers.includes("stroke")?"stroke":null;
 }
 if(!ink)return fixture.underlay.concat(255);
 return fixture[ink].map((v,i)=>Math.round(v*fixture.opacity+fixture.underlay[i]*(1-fixture.opacity))).concat(255);
}
export function samplePoints(fixture){
 if(fixture.clip)return[[95,100],[85,100],[192,100],[198,100],[95,77],[95,142]];
 if(fixture.kind==="text")return[[90,100],[81,110],[76,110],[116,110],[125,100],[166,110],[84,110]];
 if(fixture.kind==="circle")return[[140,110],[140,151],[140,158],[181,110],[100,110],[220,160]];
 if(fixture.kind==="path")return[[140,100],[140,67],[140,63],[140,142],[205,140],[220,160]];
 return[[100,100],[77,110],[74,110],[85,77],[75,75],[220,160]];
}
export function expectedBounds(fixture){
 const extent=fixture.strokeWidth/2;let bounds;
 if(fixture.kind==="rect"){const r=fixture.rect;bounds={left:r.x-extent,right:r.x+r.width+extent,top:r.y-extent,bottom:r.y+r.height+extent};}
 if(fixture.kind==="circle"){const c=fixture.circle,r=c.radius+extent;bounds={left:c.x-r,right:c.x+r,top:c.y-r,bottom:c.y+r};}
 if(fixture.kind==="path"){const p=fixture.path;bounds={left:Math.min(...p.map(v=>v.x))-extent,right:Math.max(...p.map(v=>v.x))+extent,top:Math.min(...p.map(v=>v.y))-extent,bottom:Math.max(...p.map(v=>v.y))+extent};}
 if(fixture.kind==="text"){const t=fixture.text,s=t.fontSize/1000;bounds={left:t.x+50*s-extent,right:t.x+1350*s+extent,top:t.y-700*s-extent,bottom:t.y+extent};}
 if(fixture.clip){const c=fixture.clip;bounds={left:Math.max(bounds.left,c.x),right:Math.min(bounds.right,c.x+c.width),top:Math.max(bounds.top,c.y),bottom:Math.min(bounds.bottom,c.y+c.height)};}
 return bounds;
}
