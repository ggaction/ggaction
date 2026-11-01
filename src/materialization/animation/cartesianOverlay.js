import { requireLayer } from "../../selectors/layers.js";
import { requireDataset } from "../../selectors/datasets.js";
import { applyItemMissingPolicy } from "../../grammar/itemMissing.js";
import { resolveBarChannels } from "../../grammar/bars/policy.js";
import { cartesianPosition } from "../../grammar/animation/cartesianPosition.js";
import { unavailableCartesianAnimation as unavailable } from "../../grammar/animation/cartesianState.js";
import { resolveOverlayGeometry } from "../overlayGeometry.js";
import { overlaySegments } from "../overlayItems.js";
import { overlayItemDefinitions } from "../selection/items/overlay.js";
import { identifyItems } from "../selection/items/common.js";
import { projectCartesianRows } from "./cartesianRows.js";
import { validateCartesianMappingWork } from "./cartesianWork.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

// The native overlay resolver owns endpoint choice, total-series selection,
// missing breaks and ordering. Retain forward inputs from that same result.
export function projectCartesianOverlay(program,layer) {
  const binding=layer.derivedBindings.overlay,source=requireLayer(program,binding.source);
  const point=source.mark.type==="point",row=point||source.mark.type==="bar";
  if(point&&(program.materializationConfigs.jitters?.[source.id]||program.materializationConfigs.pointPacking?.[source.id]))return unavailable("overlay-position");
  if(point) {
    const graphic=program.graphicSpec.objects[source.id];
    if(graphic.items.some(item=>(item.type??graphic.type)!=="circle"))return unavailable("overlay-position");
  }
  const dataset=applyItemMissingPolicy(source,requireDataset(program,source.data));
  validateGeneratedItemLimit(dataset.values.length,"Cartesian overlay source rows");
  validateCartesianMappingWork(program,source,dataset.values.length);
  const groups=resolveOverlayGeometry(program,binding,{includePositionBindings:true});
  validateCartesianMappingWork(program,source,groups.reduce((sum,group)=>sum+group.points.length,0));
  const definitions=identifyItems(program,layer,layer.mark.type==="point"?"point":"series",overlayItemDefinitions(groups,layer,binding));
  const sourceStates=row?projectCartesianRows(program,source,dataset):undefined;
  if(sourceStates?.reason)return sourceStates;
  const rowKeys=new Map(dataset.values.map((value,index)=>[value,dataset.rowKeys[index]]));
  let work=0;
  const anchor=item=>{
    validateWorkLimit(++work,"Cartesian overlay anchor work");
    if(row) {
      const state=sourceStates.get(JSON.stringify([item.key,"body"]));
      if(state===undefined)throw new TypeError("Cartesian overlay has no exact native source item.");
      return state.reason?state:{role:point?"point":`${resolveBarChannels(source).measure}-end`,state};
    }
    return {role:"point",state:{kind:"point",policy:{},grid:[],points:[Object.fromEntries(["x","y"].map(channel=>
      [channel,cartesianPosition(item.channels[channel],program.resolvedScales[item.positionBindings[channel].scale])]))]}};
  };
  const output=new Map(),config=program.markConfigs[layer.id]??{};
  function store(definition,role,points) {
    validateGeneratedItemLimit(points.length,"Cartesian overlay anchors");
    const anchors=points.map(anchor),failure=anchors.find(value=>value.reason!==undefined);
    const grid=points.map(item=>[...new Set(item.memberKeys??item.members.map(member=>rowKeys.get(member)))]);
    for(const keys of grid)validateWorkLimit(work+=keys.length,"Cartesian overlay anchor work");
    output.set(JSON.stringify([definition.key,role]),failure??{kind:layer.mark.type==="point"?"overlay-point":"overlay-line",
      policy:layer.mark.type==="point"?{}:{curve:config.curve??"linear",...(config.tension===undefined?{}:{tension:config.tension}),closed:config.closed??false},
      points:[],grid,anchors});
  }
  if(layer.mark.type==="point")groups.flatMap(group=>group.points).forEach((item,index)=>store(definitions[index],"body",[item]));
  else groups.forEach((group,index)=>overlaySegments(group,binding).forEach((points,segment)=>store(definitions[index],definitions[index].graphicRoles[segment],points)));
  return output;
}
