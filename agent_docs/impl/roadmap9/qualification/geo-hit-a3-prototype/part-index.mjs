const SAFE = 2 ** 20, PAD = 2 ** -10, LEAF = 8;
export function lowerBound(bounds, point) {
  if (![point.x,point.y,...bounds].every(x=>Number.isFinite(x)&&Math.abs(x)<=SAFE)) return 0;
  return Math.max(0, bounds[0]-point.x-PAD,point.x-bounds[2]-PAD,bounds[1]-point.y-PAD,point.y-bounds[3]-PAD);
}
const spread=x=>{x&=65535;x=(x|(x<<8))&0x00ff00ff;x=(x|(x<<4))&0x0f0f0f0f;x=(x|(x<<2))&0x33333333;return(x|(x<<1))&0x55555555;};
export function buildPartIndex(parts,limit=16000000){
 let work=0;const spend=n=>{work+=n;if(work>limit)throw new RangeError('Hit path index exceeds its preparation work budget.');};
 const n=parts.length,L=Math.ceil(n/LEAF),count=Math.max(0,2*L-1),bounds=new Float64Array(count*4),metadata=new Uint32Array(count*4),keys=new Uint32Array(n),order=new Uint32Array(n),scratch=new Uint32Array(n),buckets=new Uint32Array(256);
 let safe=true,xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
 for(let i=0;i<n;i++){spend(1);const b=parts[i].bounds;safe&&=!parts[i].circle&&b!==null&&Object.values(b).every(x=>Number.isFinite(x)&&Math.abs(x)<=SAFE);if(b){xmin=Math.min(xmin,b.left);ymin=Math.min(ymin,b.top);xmax=Math.max(xmax,b.right);ymax=Math.max(ymax,b.bottom);}}
 const quant=(x,a,b)=>a===b?0:Math.max(0,Math.min(65535,Math.floor((x-a)/(b-a)*65535)));
 for(let i=0;i<n;i++){spend(1);order[i]=i;const b=parts[i].bounds;keys[i]=!b||!safe?0:(spread(quant(b.left/2+b.right/2,xmin,xmax))|(spread(quant(b.top/2+b.bottom/2,ymin,ymax))<<1))>>>0;}
 for(let shift=0;shift<32;shift+=8){buckets.fill(0);spend(256);for(let i=0;i<n;i++){spend(1);buckets[(keys[order[i]]>>>shift)&255]++;}let sum=0;for(let i=0;i<256;i++){spend(1);const size=buckets[i];buckets[i]=sum;sum+=size;}for(let i=0;i<n;i++){spend(1);const ordinal=order[i];scratch[buckets[(keys[ordinal]>>>shift)&255]++]=ordinal;}order.set(scratch);spend(n);}
 let cursor=0;
 function build(first,last){spend(1);const node=cursor++,b=node*4;let box=[Infinity,Infinity,-Infinity,-Infinity],ordinal=n;
  const union=q=>{box[0]=Math.min(box[0],q[0]);box[1]=Math.min(box[1],q[1]);box[2]=Math.max(box[2],q[2]);box[3]=Math.max(box[3],q[3]);};
  if(last-first===1){metadata[b]=1;metadata[b+1]=first*LEAF;metadata[b+2]=Math.min(n,last*LEAF);for(let i=metadata[b+1];i<metadata[b+2];i++){spend(1);const j=order[i],p=parts[j].bounds;ordinal=Math.min(ordinal,j);if(p)union([p.left,p.top,p.right,p.bottom]);}}
  else{const middle=first+Math.floor((last-first)/2),left=build(first,middle),right=build(middle,last);metadata[b+1]=left;metadata[b+2]=right;union(bounds.subarray(left*4,left*4+4));union(bounds.subarray(right*4,right*4+4));ordinal=Math.min(metadata[left*4+3],metadata[right*4+3]);}
  bounds.set(box,b);metadata[b+3]=ordinal;return node;
 }
 if(L)build(0,L);
 return{bounds,metadata,order,safe,work,parts};
}
export function indexedDistance(index,point,visit,spend=()=>{}){
 const {bounds,metadata,order,parts}=index;let best=Infinity;
 if(!index.safe||![point.x,point.y].every(x=>Number.isFinite(x)&&Math.abs(x)<=SAFE)){for(let j=0;j<parts.length;j++){spend(1);best=Math.min(best,visit(parts[j],j));}return best;}
 const pending=order.length?[0]:[];
 while(pending.length){const node=pending.pop(),b=node*4;spend(1);if(lowerBound(bounds.subarray(b,b+4),point)>best)continue;
  if(metadata[b]){for(let i=metadata[b+1];i<metadata[b+2];i++){spend(1);const j=order[i];best=Math.min(best,visit(parts[j],j));}}
  else{const a=metadata[b+1],c=metadata[b+2],da=lowerBound(bounds.subarray(a*4,a*4+4),point),dc=lowerBound(bounds.subarray(c*4,c*4+4),point);if(da<dc||da===dc&&metadata[a*4+3]<metadata[c*4+3])pending.push(c,a);else pending.push(a,c);}
 }
 return best;
}
