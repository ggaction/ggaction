import {cloneAndFreeze} from "../../core/immutable.js";
import {ownRecord} from "../../core/ownData.js";
import {rejectUnknownProperties} from "../../core/validation.js";
import {interpolateNumber} from "../numeric.js";
import {partitionRadius} from "./partitionMapping.js";

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
