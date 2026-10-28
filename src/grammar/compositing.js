import {ownArray,ownRecord} from "../core/ownData.js";
import {validateKeys,validateUnitInterval} from "../core/validation.js";

const MODES=new Set(["normal","multiply","screen","difference"]);
function rgba(value,label){
  ownArray(value,label);
  if(value.length!==4)throw new TypeError(`${label} requires four straight RGBA channels.`);
  for(const channel of value)validateUnitInterval(channel,label);
}

// Straight, unit-range inputs; Float64 premultiplied working values. No renderer
// surface or color parser is involved. Group opacity attenuates the result once.
export function compositeRGBA(source,backdrop,options={}){
  rgba(source,"Composite source");rgba(backdrop,"Composite backdrop");
  ownRecord(options,"Composite options");validateKeys(options,["mode","opacity"],"Composite");
  if(Object.values(options).some(value=>value===undefined))throw new TypeError("Composite options cannot contain explicit undefined.");
  const{mode="normal",opacity=1}=options;
  if(!MODES.has(mode))throw new TypeError("Unsupported composite mode.");
  validateUnitInterval(opacity,"Composite opacity");
  const as=source[3],ab=backdrop[3],alpha=as+ab-as*ab;
  if(alpha===0)return Object.freeze([0,0,0,0]);
  const result=[];
  for(let channel=0;channel<3;channel++){
    const s=source[channel]*as,b=backdrop[channel]*ab;
    const value=mode==="normal"?s+b*(1-as)
      :mode==="multiply"?s*b+s*(1-ab)+b*(1-as)
        :mode==="screen"?s+b-s*b:s+b-2*Math.min(s*ab,b*as);
    // The exact expression is in [0,alpha]. Clamp only roundoff at that bound,
    // after rejecting all out-of-range inputs above.
    result.push(Math.max(0,Math.min(1,value/alpha)));
  }
  result.push(alpha*opacity);
  return Object.freeze(result);
}

// Quantization happens after group opacity. This preserves the approved half-byte
// bound and avoids a native premultiply/unpremultiply roundtrip before PNG encoding.
export function quantizeRGBA(value){
  rgba(value,"RGBA quantization");
  return Object.freeze(value.map(channel=>Math.round(channel*255)));
}
