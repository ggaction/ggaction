// Independent regular-triangle construction from a unit circumcircle and the
// shoelace area. No runtime shape, scale, layout or graphic inputs are consumed.
export function triangleGeometry(area){
 const vertices=Array.from({length:3},(_,i)=>{
  const angle=-Math.PI/2+i*Math.PI*2/3;return{x:Math.cos(angle),y:Math.sin(angle)};
 });
 const twiceArea=vertices.reduce((sum,p,i)=>{const q=vertices[(i+1)%3];return sum+p.x*q.y-q.x*p.y;},0);
 const factor=Math.sqrt(area/(Math.abs(twiceArea)/2));
 const points=vertices.map(p=>({x:p.x*factor,y:p.y*factor}));
 return {points,halfSlot:Math.max(...points.map(p=>Math.abs(p.x))),pitch:2*Math.max(...points.map(p=>Math.abs(p.y)))};
}
export function triangleCommands(area,x,y){return [...triangleGeometry(area).points.map((p,i)=>({op:i?'L':'M',x:x+p.x,y:y+p.y})),{op:'Z'}];}
