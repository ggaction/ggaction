import { deriveHistogramSegments } from "../bars/histogram.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { resolveRowEncodingValues } from "../rowEncoding.js";
import { resolveMarkItems, resolveMarkSourceItems } from "../selection/policies/index.js";
import { resolveCoordinateBounds } from "../coordinateBounds.js";
import { resolveRuleMode } from "../../grammar/rules.js";
import { resolveRectMode } from "../../grammar/rects.js";
import { resolveBarGrain, resolveBarChannels, resolveBarColorLayout, resolveBarOffsetChannel } from "../../grammar/bars/policy.js";
import { normalizeBarWidth } from "../../grammar/bars/geometry.js";
import { RECT_RADIUS_PROPERTIES } from "../../grammar/roundedRect.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { unavailableCartesianAnimation as unavailable } from "../../grammar/animation/cartesianState.js";

export function projectCartesianRows(program,layer,dataset) {
  const config=program.markConfigs[layer.id]??{}, type=layer.mark.type;
  if(config.fixedSpan||config.boxSpanOwner||layer.derivedBindings?.categorySlot)return unavailable("unsupported-family");
  if(type==="rule"&&resolveRuleMode(layer)===undefined || type==="rect"&&resolveRectMode(layer)===undefined || type==="bar"&&resolveBarGrain(layer)===undefined)return unavailable("incomplete-position");
  const items=resolveMarkItems(program,layer.id), output=new Map(), resolvers={resolveMarkItems,resolveMarkSourceItems};
  const rowIndex=new Map(dataset.values.map((row,i)=>[row,i]));
  const histogram=type==="bar"&&resolveBarGrain(layer)==="histogram"?deriveHistogramSegments({dataset,layer,xEncoding:layer.encoding.x,
    xScale:requireSemanticScale(program,layer.encoding.x.scale),resolvedScales:program.resolvedScales}):undefined;
  const membership=members=>JSON.stringify(members.map(row=>rowIndex.get(row)).sort((a,b)=>a-b));
  const histogramSlots=new Map();
  for(const segment of histogram??[]) {
    const key=membership(segment.members);
    if(histogramSlots.has(key))throw new TypeError("Histogram animation requires unique exact cell membership.");
    histogramSlots.set(key,{index:segment.category,count:segment.categoryCount});
  }
  const values=type==="bar"?{}:Object.fromEntries(["x","y","x2","y2"].filter(channel=>layer.encoding?.[channel]!==undefined).map(channel=>[channel,
    resolveRowEncodingValues(program,layer,dataset,channel,resolvers,{mapped:false,includeScale:true})]));
  const bounds=resolveCoordinateBounds(program,layer.coordinate);
  const frame=(channel,end)=>cartesianPosition(end?1:0,{type:"linear",domain:[0,1],range:channel==="x"?[bounds.x,bounds.x+bounds.width]:[bounds.y,bounds.y+bounds.height]});
  const radius=Object.fromEntries(RECT_RADIUS_PROPERTIES.filter(key=>Object.hasOwn(config,key)).map(key=>[key,config[key]]));
  for(const item of items) {
    let failure;
    const position=(channel,value,scale=program.resolvedScales[layer.encoding[channel.replace("2","")]?.scale])=>{
      if(!["ordinal","band","point","ordinal-offset","linear","time","log","pow","sqrt","symlog"].includes(scale?.type)){failure="scale-type";return undefined;}
      const category=["ordinal","band","point","ordinal-offset"].includes(scale.type);
      if(category?typeof value!=="string"&&!Number.isFinite(value):!Number.isFinite(value)){failure="nonfinite-semantic-value";return undefined;}
      return cartesianPosition(value,scale);
    };
    const index=item.members.length===1?rowIndex.get(item.members[0]):0;
    const at=channel=>{const input=values[channel]?.[index];return input===undefined?undefined:position(channel,input.value,input.scale);};
    let state;
    if(type==="rule") {
      const mode=resolveRuleMode(layer), x=at("x"),y=at("y"),x2=at("x2"),y2=at("y2");
      if(mode===undefined)return unavailable("incomplete-position");
      state={kind:"rule",policy:{},grid:[],points:[{x:x??frame("x",false),y:y??frame("y",false)},
        {x:x2??(mode==="horizontal-span"?frame("x",true):x),y:y2??(mode==="vertical-span"?frame("y",true):y)}]};
    } else if(type==="rect") {
      const mode=resolveRectMode(layer),x=at("x"),y=at("y");
      if(mode===undefined)return unavailable("incomplete-position");
      state={kind:mode==="discrete"?"rect-band":"rect-range",policy:{},grid:[],radius,
        points:mode==="discrete"?[{x,y}]:[{x:x??frame("x",false),y:y??frame("y",false)},
          {x:at("x2")??frame("x",true),y:at("y2")??frame("y",true)}]};
    } else {
      const grain=resolveBarGrain(layer),channels=resolveBarChannels(layer),layout=resolveBarColorLayout(layer);
      if(grain==="histogram") {
        const slot=histogramSlots.get(membership(item.members));
        if(slot===undefined)throw new TypeError("Histogram animation has no native cell slot.");
        state={kind:"histogram",policy:{layout,...slot},grid:[],radius,points:[{x:position("x",item.channels.x),y:position("y",item.channels.y)},
          {x:position("x",item.channels.x2),y:position("y",item.channels.y2)}]};
      } else {
        const offsetChannel=resolveBarOffsetChannel(layer),offsetScale=program.resolvedScales[layer.encoding[offsetChannel]?.scale];
        const offset=layout!=="group"?undefined:cartesianPosition(item.channels[offsetChannel],{...offsetScale,type:"ordinal-offset"});
        const category=channels.category,measure=channels.measure;
        const a={[category]:position(category,item.channels[category]),[measure]:position(measure,item.channels[measure])};
        const b={...a,[measure]:position(measure,item.channels[`${measure}2`])};
        state={kind:"bar",policy:{orientation:channels.orientation,layout,aggregate:grain==="aggregate",explicitGroup:layer.encoding.group!==undefined&&layer.encoding.group.inferredFrom===undefined,...(offset===undefined?{}:{seriesIndex:offsetScale.domain.indexOf(offset.value)}),width:normalizeBarWidth(config.barWidth??(grain==="centered"?{pixels:5}:{}))},grid:[],radius,...(offset===undefined?{}:{offset}),points:[a,b]};
      }
    }
    output.set(JSON.stringify([item.key,"body"]),failure?unavailable(failure):state);
  }
  return output;
}
