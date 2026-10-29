import {cloneAndFreeze} from "../../core/immutable.js";
import {ownArray,ownRecord} from "../../core/ownData.js";
import {rejectUnknownProperties,validateNonNegativeFinite} from "../../core/validation.js";
import {finiteMidpoint,interpolateNumber} from "../numeric.js";
import {partitionRadius,validatePartitionInterval} from "./partitionMapping.js";

// Canonical mathematical coordinates, before one screen/rotation adapter.
export function bendPartitionPoint(point,options){
 ownRecord(point,"Partition bend point");rejectUnknownProperties(point,["u","v","bend"],"partition bend point");
 for(const key of["u","v","bend"])if(!Number.isFinite(point[key])||point[key]<0||point[key]>1)throw new RangeError(`Partition bend ${key} must lie from zero through one.`);
 ownRecord(options,"Partition bend options");rejectUnknownProperties(options,["width","height","innerRadius","outerRadius","radiusPolicy","sweep"],"partition bend");
 const{width,height}=options,sweep=options.sweep??Math.PI*2;
 if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<0)throw new RangeError("Partition bend requires positive finite width and nonnegative finite height.");
 if(!Number.isFinite(sweep)||sweep<=0||sweep>Math.PI*2)throw new RangeError("Partition bend sweep must be positive and at most two pi.");
 const r=partitionRadius(point.v,{innerRadius:options.innerRadius,outerRadius:options.outerRadius,radiusPolicy:options.radiusPolicy});
 const{u,v,bend:b}=point,q=u-.5,theta=sweep*b*q;
 if(b===0)return cloneAndFreeze({x:width*q,y:height*v});
 if(b===1)return cloneAndFreeze({x:r*Math.sin(theta),y:r*Math.cos(theta)});
 const y=interpolateNumber(height*v,r,b);
 // R never needs to be formed: 2R*sin(theta/2)^2 can overflow as b tends
 // toward zero even though its product has a finite, vanishing limit.
 const sinc=theta===0?1:Math.sin(theta)/theta;
 const half=theta/2,sincHalf=half===0?1:Math.sin(half)/half;
 const drop=(1-b)*width*q*(sweep*b*q/2)*sincHalf*sincHalf;
 const x=(1-b)*width*q*sinc+y*Math.sin(theta),vertical=y*Math.cos(theta)-drop;
 if(!Number.isFinite(x)||!Number.isFinite(vertical))throw new RangeError("Partition bend output exceeds finite coordinates.");
 return cloneAndFreeze({x,y:vertical});
}

// Insets use current CSS distances after bending, never endpoint pixel geometry.
export function insetPartitionBendCell(cell,kernel,bend,gap){
 validatePartitionInterval(cell);ownArray(gap,"Partition bend gaps");
 if(gap.length!==2)throw new TypeError("Partition bend gaps require two distances.");
 gap.forEach(value=>validateNonNegativeFinite(value,"Partition bend gap"));
 const depth=v=>bendPartitionPoint({u:.5,v,bend},kernel).y;
 const low=depth(cell.v0),high=depth(cell.v1),middle=finiteMidpoint(low,high);
 const tangent=(1-bend)*kernel.width+kernel.sweep*bend*middle;
 if(!Number.isFinite(tangent))throw new RangeError("Partition bend tangent exceeds finite coordinates.");
 const inverse=value=>{
  if(value===low)return cell.v0;if(value===high)return cell.v1;
  let left=cell.v0,right=cell.v1;
  for(let count=0;count<64;count++){
   const mid=finiteMidpoint(left,right),actual=depth(mid);
   if(actual===value||mid===left||mid===right)return mid;
   if(actual<value)left=mid;else right=mid;
  }
  return finiteMidpoint(left,right);
 };
 const width=cell.u1-cell.u0;
 const visible=width>0&&high>low&&tangent>0&&gap[0]/tangent<width&&gap[1]<high-low;
 if(!visible){const u=finiteMidpoint(cell.u0,cell.u1),anchorV=inverse(middle);return cloneAndFreeze({u0:u,u1:u,v0:anchorV,v1:anchorV,anchorV,visible:false});}
 const inset=gap[0]/tangent/2;
 const v0=gap[1]===0?cell.v0:inverse(low+gap[1]/2),v1=gap[1]===0?cell.v1:inverse(high-gap[1]/2);
 return cloneAndFreeze({u0:cell.u0+inset,u1:cell.u1-inset,v0,v1,anchorV:inverse(finiteMidpoint(depth(v0),depth(v1))),visible:true});
}
