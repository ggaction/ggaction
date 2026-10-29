import { deriveConditionalLineBranch } from "../conditionalLineStructure.js";
import { deriveConditionalAreaBranch } from "../conditionalAreaStructure.js";
import { pathSeriesItemDefinitions } from "../selection/items/path.js";
import { identifyItems } from "../selection/items/common.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { unavailableCartesianAnimation as unavailable } from "../../grammar/animation/cartesianState.js";

// Native series derivation owns grouping, sample order, stack/wiggle endpoints
// and membership. It runs only while preparing an authored endpoint.
export function projectCartesianSeries(program, layer, dataset) {
  const line=layer.mark.type==="line", config=program.markConfigs[layer.id]??{};
  const result=line?{derived:deriveConditionalLineBranch(program,layer,dataset)}:deriveConditionalAreaBranch(program,layer,dataset);
  if(result.transform!==undefined)return unavailable("unsupported-series");
  const derived=result.derived, series=derived.series;
  const definitions=identifyItems(program,layer,"series",pathSeriesItemDefinitions(layer,dataset,series));
  const output=new Map();
  const scale=channel=>program.resolvedScales[layer.encoding[channel]?.scale];
  for(const definition of definitions) {
    for(let segment=0;segment<definition.graphicIndices.length;segment++) {
      const item=series[definition.graphicIndices[segment]];
      const grid=(line?item.vertexSourceIndices:item.sourceIndices.map(index=>[index])).map(indices=>indices.map(index=>dataset.rowKeys[index]));
      const point=(x,y)=>({x:cartesianPosition(x,scale("x")),y:cartesianPosition(y,scale("y"))});
      const orientation=derived.orientation??"vertical";
      const lower=item.values.map(value=>point(value.x,derived.mode==="y-center"?value.lower:value.y));
      const upper=line?[]:item.values.map(value=>orientation==="horizontal"?point(value.x2,value.y):point(value.x,derived.mode==="y-center"?value.upper:value.y2));
      const state={kind:line?"line":"area",policy:line?{curve:config.curve??"linear",...(config.tension===undefined?{}:{tension:config.tension})}
        :{orientation,curve:config.curve??"linear",layout:derived.mode==="y-center"?"center":layer.layout?.mode??layer.encoding.color?.layout??"overlay"},
        points:[...lower,...upper],grid:line?grid:[...grid,...grid]};
      output.set(JSON.stringify([definition.key,definition.graphicRoles[segment]]),state);
    }
  }
  return output;
}
