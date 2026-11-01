import { deriveConditionalLineBranch } from "../conditionalLineStructure.js";
import { deriveConditionalAreaBranch } from "../conditionalAreaStructure.js";
import { pathSeriesItemDefinitions } from "../selection/items/path.js";
import { identifyItems } from "../selection/items/common.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { categoricalDensityMaximum } from "../../grammar/categoricalDensity.js";
import { hasConditionalLinePosition } from "../conditionalLineStructure.js";
import { hasConditionalAreaPosition } from "../conditionalAreaStructure.js";
import { conditionalLinePositions } from "../conditionalLineValues.js";
import { conditionalAreaValues } from "../conditionalAreaValues.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../selection/policies/index.js";

// Native series derivation owns grouping, sample order, stack/wiggle endpoints
// and membership. It runs only while preparing an authored endpoint.
export function projectCartesianSeries(program, layer, dataset) {
  const line=layer.mark.type==="line", config=program.markConfigs[layer.id]??{};
  const resolvers={resolveMarkItems,resolveMarkSourceItems};
  const conditional=line?hasConditionalLinePosition(layer):hasConditionalAreaPosition(layer);
  const result=conditional?(line?conditionalLinePositions(program,layer,dataset,resolvers)
    :conditionalAreaValues(program,layer,dataset,resolvers,{mapped:false}))
    :line?{derived:deriveConditionalLineBranch(program,layer,dataset)}:deriveConditionalAreaBranch(program,layer,dataset);
  const derived=result.derived, series=derived.series;
  const definitions=identifyItems(program,layer,"series",pathSeriesItemDefinitions(layer,dataset,series));
  const output=new Map();
  for(const definition of definitions) {
    for(let segment=0;segment<definition.graphicIndices.length;segment++) {
      const seriesIndex=definition.graphicIndices[segment],item=series[seriesIndex];
      const grid=(line?item.vertexSourceIndices:item.sourceIndices.map(index=>[index])).map(indices=>indices.map(index=>dataset.rowKeys[index]));
      const selected=(channel,index)=>line?result.selectedPositions?.[seriesIndex]?.[channel]?.[index]
        :result.selected?.[channel]?.[result.raw.series[seriesIndex].sourceIndices[index]];
      const binding=(channel,index)=>selected(channel,index)?.binding??layer.encoding[channel]??layer.encoding[channel[0]];
      const point=(x,y,index,xChannel="x",yChannel="y")=>({x:cartesianPosition(x,program.resolvedScales[binding(xChannel,index).scale]),y:cartesianPosition(y,program.resolvedScales[binding(yChannel,index).scale])});
      if(result.transform?.placement?.type==="category") {
        const channel=derived.placement.channel,points=item.values.map((value,index)=>channel==="x"?point(item.category,value.value,index):point(value.value,item.category,index));
        output.set(JSON.stringify([definition.key,definition.graphicRoles[segment]]),{kind:"area-category-density",
          policy:{channel,curve:config.curve??"linear",side:item.side,widthBand:derived.placement.width.band,widthResolve:derived.placement.width.resolve},
          points,grid,density:{values:item.values.map(value=>value.density),maximum:categoricalDensityMaximum(derived,item)}});
        continue;
      }
      const density=result.transform!==undefined,orientation=derived.mode==="x-density"?"horizontal":derived.orientation??"vertical";
      const lower=density?item.values.map((value,index)=>derived.mode==="x-density"?point(0,value.y,index):point(value.x,value.lower,index)):item.values.map((value,index)=>point(line&&conditional?selected("x",index).value:value.x,
        line&&conditional?selected("y",index).value:derived.mode==="y-center"?value.lower:value.y,index));
      const upper=line?[]:density?item.values.map((value,index)=>derived.mode==="x-density"?point(value.x,value.y,index):point(value.x,value.upper,index))
        :item.values.map((value,index)=>orientation==="horizontal"?point(value.x2,value.y,index,"x2")
          :point(value.x,derived.mode==="y-center"?value.upper:value.y2,index,"x",result.selected?.y2!==undefined||layer.encoding.y2!==undefined?"y2":"y"));
      const state={kind:line?"line":density?"area-density":"area",policy:line?{curve:config.curve??"linear",...(config.tension===undefined?{}:{tension:config.tension})}
        :{orientation,curve:config.curve??"linear",layout:derived.mode==="y-center"?"center":layer.layout?.mode??layer.encoding.color?.layout??"overlay"},
        points:[...lower,...upper],grid:line?grid:[...grid,...grid]};
      output.set(JSON.stringify([definition.key,definition.graphicRoles[segment]]),state);
    }
  }
  return output;
}
