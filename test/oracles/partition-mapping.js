// Bounded independent references; no production imports.
export function rectangleReference(cell,frame){
 const u=frame.reverseU?[1-cell.u1,1-cell.u0]:[cell.u0,cell.u1],v=frame.reverseV?[1-cell.v1,1-cell.v0]:[cell.v0,cell.v1];
 const axes=frame.orientation==="vertical"?[v,u]:[u,v];
 return{x:frame.x+frame.width*axes[0][0],y:frame.y+frame.height*axes[1][0],width:frame.width*(axes[0][1]-axes[0][0]),height:frame.height*(axes[1][1]-axes[1][0])};
}
export function radialReference(v,inner,outer,policy){return policy==="equal-depth-area"?Math.sqrt(inner*inner+(outer*outer-inner*inner)*v):inner+(outer-inner)*v;}
export function bendReference(u,v,b,{width,height,innerRadius,outerRadius,sweep,radiusPolicy}){
 const r=radialReference(v,innerRadius,outerRadius,radiusPolicy),theta=sweep*b*(u-.5);
 if(b===0)return{x:width*(u-.5),y:height*v};
 const R=(1-b)*width/(sweep*b),local=(1-b)*height*v+b*r;
 return{x:(R+local)*Math.sin(theta),y:(R+local)*Math.cos(theta)-R};
}
