import {colors,rectangle,sector,bendOptions} from "./reference-values.js";

// Hand-authored normalized cells, independent of the hierarchy and mapping code.
export function expectedCells(variant){
  if(variant.input==="zero")return [];
  if(variant.focus==="A")return [["A",0,1,0,.5],["A1",0,1/3,.5,1],["A2",1/3,1,.5,1]];
  if(variant.rootVisible===false||variant.input==="forest")return [["A",0,.6,0,.5],["A1",0,.2,.5,1],["A2",.2,.6,.5,1],["B",.6,1,0,.5]];
  return [["R",0,1,0,1/3],["A",0,.6,1/3,2/3],["A1",0,.2,2/3,1],["A2",.2,variant.input==="inclusive"?.3:.6,2/3,1],["B",.6,1,1/3,2/3]];
}
export function expectedRectangle(cell,variant){
  const [,u0,u1,v0,v1]=cell,o={...rectangle,...variant.mapping},vertical=o.orientation==="vertical";
  const xs=vertical?[v0,v1]:[u0,u1],ys=vertical?[u0,u1]:[v0,v1];
  return{x:o.x+xs[0]*o.width+o.gapX/2,y:o.y+ys[0]*o.height+o.gapY/2,width:(xs[1]-xs[0])*o.width-o.gapX,height:(ys[1]-ys[0])*o.height-o.gapY};
}
export function expectedSector(cell,variant){
  const [,u0,u1,v0,v1]=cell,o={...sector,...variant.mapping},sign=o.direction==="counterclockwise"?-1:1;
  const r=v=>o.radiusPolicy==="equal-depth-area"?Math.sqrt(o.innerRadius**2+(o.outerRadius**2-o.innerRadius**2)*v):o.innerRadius+(o.outerRadius-o.innerRadius)*v;
  const r0=r(v0),r1=r(v1),half=o.angularGap/(r0+r1);
  return {startAngle:(o.startAngle??0)+sign*2*Math.PI*u0+sign*half,endAngle:(o.startAngle??0)+sign*2*Math.PI*u1-sign*half,innerRadius:r0+o.radialGap/2,outerRadius:r1-o.radialGap/2};
}
export function expectedBendPoint(u,v,b){
  const {width:W,height:H,innerRadius:r0,outerRadius:r1}=bendOptions,r=r0+(r1-r0)*v,theta=2*Math.PI*b*(u-.5);
  if(b===0)return{x:240+W*(u-.5),y:180+H*v};
  const R=(1-b)*W/(2*Math.PI*b),y=(1-b)*H*v+b*r;
  return{x:240+(R+y)*Math.sin(theta),y:180+(R+y)*Math.cos(theta)-R};
}
const rgba=hex=>[1,3,5].map(i=>Number.parseInt(hex.slice(i,i+2),16)).concat(255);
export function samplePoints(variant){
  const samples=expectedCells(variant).map(cell=>{
    const [label,u0,u1,v0,v1]=cell;let point;
    if(variant.kind==="rectangle"){const r=expectedRectangle(cell,variant);point={x:r.x+r.width*.23,y:r.y+r.height*.23};}
    else if(variant.kind==="sector"){const s=expectedSector(cell,variant),a=s.startAngle+(s.endAngle-s.startAngle)*.23,r=s.innerRadius+(s.outerRadius-s.innerRadius)*.3;point={x:240+r*Math.sin(a),y:190-r*Math.cos(a)};}
    else point=expectedBendPoint(u0+(u1-u0)*.23,v0+(v1-v0)*.3,variant.bend);
    return{label,x:Math.floor(point.x),y:Math.floor(point.y),rgba:rgba(colors[label])};
  });
  samples.push({label:"background",x:20,y:60,rgba:[255,255,255,255]});
  if(variant.input==="inclusive")samples.push({label:"residual-tail",x:210,y:260,rgba:[255,255,255,255]});
  if(variant.input==="zero"||variant.kind==="sector")samples.push({label:"empty-center",x:240,y:190,rgba:[255,255,255,255]});
  return samples;
}
