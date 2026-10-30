import { cloneAndFreeze } from "../../core/immutable.js";
import { contentDigest, canonicalJSON } from "../../core/contentDigest.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { POSITION_CHANNEL_DEFINITIONS } from "../../core/vocabulary.js";
import { findLayer } from "../../selectors/layers.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveGraphicScope, resolveGraphicLineage } from "../../selectors/resources.js";
import { unnamespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { applyItemMissingPolicy } from "../../grammar/itemMissing.js";
import { derivePolarLineSeries } from "../../grammar/lineSeries.js";
import { deriveArcSectors, usesProportionalArcTheta } from "../../grammar/arcs.js";
import { mapContinuousScaleValues, mapOrdinalPositionValues } from "../../grammar/scales/index.js";
import { unavailablePolarAnimation as unavailable, polarAnimationMatchesNode } from "../../grammar/animation/polarState.js";
import { resolveCoordinatePolarFrame } from "../coordinateBounds.js";
import { resolveRowEncodingValues } from "../rowEncoding.js";
import { resolveMarkItems, resolveMarkSourceItems, resolveMarkIdentities } from "../selection/policies/index.js";
import { identifyItems } from "../selection/items/common.js";
import { pathSeriesItemDefinitions } from "../selection/items/path.js";

function mappingFingerprint(layer,theta,radius,frame) {
  const scale=(input,radial=false)=>input===undefined?null:Object.fromEntries(["type","domain","range","clamp","base","exponent","constant","padding","paddingInner","paddingOuter","align","radialMapping"].filter(key=>Object.hasOwn(input,key)).map(key=>[key,
    key==="range"&&radial?input.range.map(value=>frame.availableRadius===0?0:value/frame.availableRadius):input[key]]));
  const proportional=layer.mark.type==="arc"&&usesProportionalArcTheta(layer.encoding.theta,radius);
  return contentDigest(canonicalJSON({theta:proportional?{proportional:true,range:theta.range}:scale(theta),radius:scale(radius,true)}));
}
function projectLayer(program,layer) {
  if(layer.conditionals?.theta!==undefined||layer.conditionals?.radius!==undefined)return unavailable("conditional-position");
  if(layer.encoding.theta===undefined||layer.mark.type!=="arc"&&layer.encoding.radius===undefined)return unavailable("incomplete-position");
  const dataset=applyItemMissingPolicy(layer,requireDataset(program,layer.data)),frame=resolveCoordinatePolarFrame(program,layer.coordinate);
  validateGeneratedItemLimit(dataset.values.length,"Polar animation source rows");
  const thetaScale=program.resolvedScales[layer.encoding.theta.scale],radiusScale=program.resolvedScales[layer.encoding.radius?.scale];
  const mappingWork=[thetaScale,radiusScale].reduce((sum,scale)=>sum+(scale?.domain??[]).reduce((total,value)=>total+1+(typeof value==="string"?value.length:0),0),0);
  validateWorkLimit(dataset.values.length*Math.max(1,mappingWork),"Polar animation mapping work");
  const mapping=mappingFingerprint(layer,thetaScale,radiusScale,frame),config=program.markConfigs[layer.id]??{},output=new Map();
  const add=(key,role,state)=>output.set(JSON.stringify([key,role]),{...state,frame,mapping});
  if(layer.mark.type==="point") {
    const resolvers={resolveMarkItems,resolveMarkSourceItems};
    const theta=resolveRowEncodingValues(program,layer,dataset,"theta",resolvers),radius=resolveRowEncodingValues(program,layer,dataset,"radius",resolvers);
    const items=identifyItems(program,layer,"point",dataset.values.map((row,index)=>({members:[row],rowKey:dataset.rowKeys[index]})));
    items.forEach((item,index)=>add(item.key,"body",{kind:"point",policy:{},points:[{theta:theta[index],radius:radius[index]}],grid:[[dataset.rowKeys[index]]]}));
  }else if(layer.mark.type==="line") {
    const derived=derivePolarLineSeries(dataset.values,layer,{thetaDomain:thetaScale.domain,lineage:true,vertexLineage:true});
    const definitions=identifyItems(program,layer,"series",pathSeriesItemDefinitions(layer,dataset,derived.series));
    for(const definition of definitions)for(const [segment,index]of definition.graphicIndices.entries()){
      const item=derived.series[index],theta=["nominal","ordinal"].includes(derived.thetaFieldType)?mapOrdinalPositionValues(item.values.map(value=>value.theta),thetaScale):mapContinuousScaleValues(item.values.map(value=>value.theta),thetaScale);
      const radius=mapContinuousScaleValues(item.values.map(value=>value.radius),radiusScale);
      add(definition.key,definition.graphicRoles[segment],{kind:"line",policy:{closed:config.closed??false},points:theta.map((value,i)=>({theta:value,radius:radius[i]})),grid:item.vertexSourceIndices.map(indices=>indices.map(i=>dataset.rowKeys[i]))});
    }
  }else{
    const derived=deriveArcSectors(dataset.values,layer,{thetaScale,...(radiusScale===undefined?{}:{radiusScale}),frame,innerRadius:config.innerRadius??0});
    const definitions=identifyItems(program,layer,"sector",derived.sectors.map(sector=>({members:sector.sourceIndices.map(i=>dataset.values[i]),memberKeys:sector.sourceIndices.map(i=>dataset.rowKeys[i]),
      ...(layer.encoding.theta.aggregate!==undefined||layer.encoding.radius?.aggregate!==undefined?{semanticIdentity:["sector",sector.key]}:{rowKey:dataset.rowKeys[sector.sourceIndices[0]]})})));
    definitions.forEach((item,index)=>{const sector=derived.sectors[index];add(item.key,"body",{kind:"arc",policy:{padAngle:config.padAngle??0},grid:[item.memberKeys],
      points:[{theta:sector.startTheta,endTheta:sector.endTheta,innerRadius:sector.innerRadius,radius:sector.outerRadius}]});});
  }
  return output;
}
export function projectPolarAnimationState(program,endpoint) {
  const scopes=new Map();
  return cloneAndFreeze(endpoint.identities.map((identity,index)=>{
    if(identity===undefined)return unavailable("anonymous");
    const scope=resolveGraphicScope(program,identity),[namespaces,owner]=JSON.parse(identity.key),layer=findLayer(scope,owner);
    if(layer===undefined)return unavailable("semantic-unavailable");
    if(!POSITION_CHANNEL_DEFINITIONS.theta.markTypes.includes(layer.mark.type)||requireCoordinate(scope,layer.coordinate).type!=="polar")return unavailable("unsupported-family");
    if(resolveGraphicLineage(program,identity)!==requireDataset(scope,layer.data))throw new TypeError("Polar animation lineage differs from its native dataset.");
    let layers=scopes.get(scope);if(layers===undefined)scopes.set(scope,layers=new Map());
    if(!layers.has(owner)){const states=projectLayer(scope,layer);layers.set(owner,{states,members:states.reason?undefined:new Map(resolveMarkIdentities(scope,owner).map(item=>[item.key,item.rowKeys]))});}
    const {states,members}=layers.get(owner);if(states.reason)return states;
    const key=unnamespaceItemKey(identity.key,namespaces),expected=members.get(key);
    if(expected===undefined||JSON.stringify(expected)!==JSON.stringify(identity.lineage.rowKeys))throw new TypeError("Polar animation lineage differs from its exact final item.");
    const state=states.get(JSON.stringify([key,identity.role]));if(state===undefined)return unavailable("primitive-role");
    return polarAnimationMatchesNode(state,endpoint.scene.nodes[index])?state:unavailable("edited-position");
  }));
}
