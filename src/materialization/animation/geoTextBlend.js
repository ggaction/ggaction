import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { MAX_BLEND_SOURCES } from "../../grammar/weightedBlend.js";

const key = identity => JSON.stringify([identity.key,identity.role]);
const rect = value => Array.isArray(value)?{x:value[0],y:value[1],width:value[2],height:value[3]}:value;

// Geometry comes from the current native resolver. This only combines the
// concrete per-item sources; it never moves endpoint pixels or nests blends.
export function blendGeoTextGraphics(outputs, expressions, frames) {
  const combined={labels:[],leaders:[]};
  for(const role of ["labels","leaders"]) {
    const byKey=new Map();
    outputs.forEach((output,index)=>{for(const graphic of output[role]) {
      const token=key(graphic.identity);if(!byKey.has(token))byKey.set(token,[]);
      byKey.get(token).push({graphic,index,weight:expressions[index].weight});
    }});
    for(const sources of byKey.values()) {
      if(sources.length>MAX_BLEND_SOURCES)throw new RangeError("Geographic Text exceeds its flat blend source budget.");
      const sum=sources.reduce((total,value)=>total+value.weight,0);
      const opacity=Math.min(1,sum);
      if(sum===0)continue;
      const frame=role==="leaders"?frames?.leaderFrame:frames?.frame;
      let representative=sources[0];for(const source of sources)if(source.weight>=representative.weight)representative=source;
      const {identity}=representative.graphic;
      const expressionIndices=sources.map(source=>source.index);
      if(sources.length===1) {
        const graphic=sources[0].graphic;
        const properties=opacity===1?graphic.properties:{...graphic.properties,opacity:(graphic.properties.opacity??1)*opacity};
        validateConcreteGraphicProperties(graphic.type,properties);
        combined[role].push({...graphic,properties,expressionIndices,representative:representative.index});continue;
      }
      if(frame===undefined||frame===null)throw new TypeError("Geographic Text blending requires its current concrete frame.");
      const mode=sources[0].graphic.properties.blend??"normal";
      if(sources.some(source=>(source.graphic.properties.blend??"normal")!==mode))throw new TypeError("Geographic Text expressions cannot combine different backdrop blend modes.");
      const properties={sources:sources.map(({graphic,weight})=>{
        const {blend:_blend,...properties}=graphic.properties;
        return {weight:weight/sum,type:graphic.type,properties,offset:frame.offset,clip:rect(frame.clip),clips:frame.clips.map(rect)};
      }),...(opacity===1?{}:{opacity}),...(mode==="normal"?{}:{blend:mode})};
      validateConcreteGraphicProperties("weighted-blend",properties);
      combined[role].push({type:"weighted-blend",identity,properties,frame:{offset:[0,0],clip:frame.clip,clips:[]},
        expressionIndices,representative:representative.index});
    }
  }
  return combined;
}
