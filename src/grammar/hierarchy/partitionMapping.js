import {cloneAndFreeze} from "../../core/immutable.js";
import {ownRecord} from "../../core/ownData.js";
import {rejectUnknownProperties} from "../../core/validation.js";
import {finiteMidpoint,interpolateNumber} from "../numeric.js";
const TAU=Math.PI*2;
function finite(value,label){if(!Number.isFinite(value))throw new TypeError(`${label} must be finite.`);return value;}
function nonnegative(value,label){finite(value,label);if(value<0)throw new RangeError(`${label} must be nonnegative.`);return value;}
function unit(value,label){finite(value,label);if(value<0||value>1)throw new RangeError(`${label} must lie from zero through one.`);return value;}
function enumValue(value,values,label){if(!values.includes(value))throw new Error(`Unsupported ${label}.`);return value;}
export function validatePartitionInterval(cell){
 ownRecord(cell,"Partition cell");rejectUnknownProperties(cell,["u0","u1","v0","v1"],"partition cell");
 for(const name of["u0","u1","v0","v1"])unit(cell[name],`Partition ${name}`);
 if(cell.u0>cell.u1||cell.v0>cell.v1)throw new RangeError("Partition cell boundaries must be ordered.");
 return cell;
}
function radiusOptions(options){
 const inner=nonnegative(options.innerRadius,"Partition inner radius"),outer=finite(options.outerRadius,"Partition outer radius");
 if(outer<=inner)throw new RangeError("Partition outer radius must exceed its inner radius.");
 return{inner,outer,policy:enumValue(options.radiusPolicy??"equal-depth",["equal-depth","equal-depth-area"],"partition radius policy")};
}
function radius(v,{inner,outer,policy}){
 if(v===0)return inner;if(v===1)return outer;
 if(policy==="equal-depth")return interpolateNumber(inner,outer,v);
 const ratio=inner/outer,squared=ratio*ratio;
 return outer*Math.sqrt(squared+(1-squared)*v);
}
export function partitionRadius(v,options){
 unit(v,"Partition radial proportion");ownRecord(options,"Partition radius options");rejectUnknownProperties(options,["innerRadius","outerRadius","radiusPolicy"],"partition radius");
 return radius(v,radiusOptions(options));
}
export function mapPartitionRectangle(cell,options){
 validatePartitionInterval(cell);ownRecord(options,"Partition rectangle options");rejectUnknownProperties(options,["x","y","width","height","orientation","reverseU","reverseV","gapX","gapY"],"partition rectangle");
 const x=finite(options.x,"Partition x"),y=finite(options.y,"Partition y"),width=nonnegative(options.width,"Partition width"),height=nonnegative(options.height,"Partition height");
 const right=finite(x+width,"Partition right edge"),bottom=finite(y+height,"Partition bottom edge");
 const orientation=enumValue(options.orientation??"horizontal",["horizontal","vertical"],"partition orientation");
 for(const property of["reverseU","reverseV"])if(options[property]!==undefined&&typeof options[property]!=="boolean")throw new TypeError(`Partition ${property} must be boolean.`);
 const u=options.reverseU?[1-cell.u1,1-cell.u0]:[cell.u0,cell.u1],v=options.reverseV?[1-cell.v1,1-cell.v0]:[cell.v0,cell.v1];
 const horizontal=orientation==="horizontal",xs=horizontal?u:v,ys=horizontal?v:u;
 const left=interpolateNumber(x,right,xs[0]),end=interpolateNumber(x,right,xs[1]),top=interpolateNumber(y,bottom,ys[0]),lower=interpolateNumber(y,bottom,ys[1]);
 const gapX=nonnegative(options.gapX??0,"Partition horizontal gap"),gapY=nonnegative(options.gapY??0,"Partition vertical gap");
 const w=end-left,h=lower-top,visible=w>gapX&&h>gapY;
 return cloneAndFreeze({x:w>gapX?left+gapX/2:finiteMidpoint(left,end),y:h>gapY?top+gapY/2:finiteMidpoint(top,lower),width:w>gapX?w-gapX:0,height:h>gapY?h-gapY:0,visible});
}
export function mapPartitionSector(cell,options){
 validatePartitionInterval(cell);ownRecord(options,"Partition sector options");rejectUnknownProperties(options,["innerRadius","outerRadius","radiusPolicy","startAngle","sweep","direction","angularGap","radialGap"],"partition sector");
 const radial=radiusOptions(options),start=finite(options.startAngle??0,"Partition start angle")%TAU,sweep=finite(options.sweep??TAU,"Partition angular sweep");
 if(!(sweep>0&&sweep<=TAU))throw new RangeError("Partition sweep must be positive and at most two pi.");
 const sign=enumValue(options.direction??"clockwise",["clockwise","counterclockwise"],"partition direction")==="clockwise"?1:-1;
 const r0=radius(cell.v0,radial),r1=radius(cell.v1,radial),a0=start+sign*sweep*cell.u0,a1=start+sign*sweep*cell.u1;
 const angularGap=nonnegative(options.angularGap??0,"Partition angular gap"),radialGap=nonnegative(options.radialGap??0,"Partition radial gap"),mid=finiteMidpoint(r0,r1);
 const angularInset=angularGap===0?0:mid===0?Infinity:angularGap/mid/2,radialInset=radialGap/2;
 const angularVisible=Number.isFinite(angularInset)&&Math.abs(a1-a0)>angularInset*2,radialVisible=r1-r0>radialGap;
 return cloneAndFreeze({startAngle:angularVisible?a0+sign*angularInset:finiteMidpoint(a0,a1),endAngle:angularVisible?a1-sign*angularInset:finiteMidpoint(a0,a1),innerRadius:radialVisible?r0+radialInset:mid,outerRadius:radialVisible?r1-radialInset:mid,visible:angularVisible&&radialVisible});
}
