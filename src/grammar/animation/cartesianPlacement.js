import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validatePositiveFinite } from "../../core/validation.js";
import { normalizeBarWidth, resolveBarWidth } from "../bars/geometry.js";
import { centeredRuleSpan, boxRuleSpan } from "../ruleGeometry.js";
import { categorySlotPixels } from "../positionOffset.js";
import { interpolateNumber } from "./values.js";

const has=(value,key)=>Object.hasOwn(value,key);
const own=(value,key)=>has(value,key)?value[key]:undefined;
export function normalizeCartesianSpan(input) {
  ownRecord(input,"Cartesian rule span");
  if(!has(input,"kind"))throw new TypeError("Cartesian rule span requires kind.");
  rejectUnknownProperties(input,["kind","orientation",...(input.kind==="fixed"?["size"]:["width","pixels","slotBand"])],"Cartesian rule span");
  if(!has(input,"kind")||!["fixed","box"].includes(input.kind)||!has(input,"orientation")||!["horizontal","vertical"].includes(input.orientation))throw new TypeError("Cartesian rule span requires its native kind and orientation.");
  if(input.kind==="fixed") {
    if(!has(input,"size"))throw new TypeError("Cartesian fixed span requires size.");
    validatePositiveFinite(input.size,"Cartesian fixed span size");
    return {...input};
  }
  if(!has(input,"width"))throw new TypeError("Cartesian box span requires native width.");
  ownRecord(input.width,"Cartesian box span width");
  rejectUnknownProperties(input.width,["band","pixels"],"Cartesian box span width");
  if(Object.keys(input.width).length!==1||Object.values(input.width).some(value=>value===undefined))throw new TypeError("Cartesian box span width requires exactly one unit.");
  const width=normalizeBarWidth(Object.assign(Object.create(null),input.width));
  if(has(input,"pixels"))validatePositiveFinite(input.pixels,"Cartesian median pixel width");
  if(has(input,"slotBand"))validateBand(input.slotBand);
  return {...input,width};
}
function validateBand(value) {
  if(!Number.isFinite(value)||value<-.5||value>.5)throw new RangeError("Cartesian category slot must be within [-0.5, 0.5] band.");
}
export function normalizeCartesianSlot(input) {
  ownRecord(input,"Cartesian category slot");rejectUnknownProperties(input,["channel","band"],"Cartesian category slot");
  if(!has(input,"channel")||!["x","y"].includes(input.channel)||!has(input,"band"))throw new TypeError("Cartesian category slot requires channel and band.");
  validateBand(input.band);return {...input};
}
export function compatibleCartesianPlacement(from,to) {
  if((own(from,"span")===undefined)!==(own(to,"span")===undefined)||(own(from,"slot")===undefined)!==(own(to,"slot")===undefined))return false;
  if(own(from,"slot")&&own(from,"slot").channel!==own(to,"slot").channel)return false;
  const a=own(from,"span"),b=own(to,"span");
  return a===undefined||a.kind===b.kind&&a.orientation===b.orientation&&(a.kind==="fixed"||
    Object.keys(a.width)[0]===Object.keys(b.width)[0]&&has(a,"pixels")===has(b,"pixels")&&has(a,"slotBand")===has(b,"slotBand"));
}
export function sampleCartesianPlacement(from,to,progress) {
  const span=own(from,"span")===undefined?undefined:own(from,"span").kind==="fixed"?{...own(from,"span"),size:interpolateNumber(own(from,"span").size,own(to,"span").size,progress)}
    :{...own(from,"span"),width:Object.fromEntries(Object.keys(own(from,"span").width).map(key=>[key,interpolateNumber(own(from,"span").width[key],own(to,"span").width[key],progress)])),
      ...(has(own(from,"span"),"pixels")?{pixels:interpolateNumber(own(from,"span").pixels,own(to,"span").pixels,progress)}:{}),
      ...(has(own(from,"span"),"slotBand")?{slotBand:interpolateNumber(own(from,"span").slotBand,own(to,"span").slotBand,progress)}:{})};
  return {...(span===undefined?{}:{span}),...(own(from,"slot")===undefined?{}:{slot:{channel:own(from,"slot").channel,band:interpolateNumber(own(from,"slot").band,own(to,"slot").band,progress)}})};
}
export function resolveCartesianSpan(span,sample) {
  const axis=span.orientation==="horizontal"?"x":"y", category=sample[axis];
  const size=span.kind==="fixed"?span.size:resolveBarWidth(span.width,Math.abs(category.resolvedScale.bandwidth??category.resolvedScale.step));
  const point={x:sample.x.position,y:sample.y.position};
  if(span.kind==="fixed")return centeredRuleSpan(point.x,point.y,span.orientation,size);
  const box=axis==="x"?{x:point.x-size/2,width:size}:{y:point.y-size/2,height:size};
  if(has(span,"slotBand"))box[axis]+=categorySlotPixels(category.resolvedScale,span.slotBand);
  return boxRuleSpan(point.x,point.y,span.orientation,box,own(span,"pixels"));
}
export function cartesianSlotPixels(slot,sample) {
  return slot===undefined?0:categorySlotPixels(sample[slot.channel].resolvedScale,slot.band);
}
