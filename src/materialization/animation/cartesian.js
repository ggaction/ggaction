import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { hasPositionBinding } from "../../core/encodingBindings.js";
import { findLayer } from "../../selectors/layers.js";
import { requireDataset } from "../../selectors/datasets.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveGraphicScope, resolveGraphicLineage } from "../../selectors/resources.js";
import { unnamespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { applyItemMissingPolicy } from "../../grammar/itemMissing.js";
import { unavailableCartesianAnimation as unavailable, cartesianAnimationMatchesNode } from "../../grammar/animation/cartesianState.js";
import { resolveMarkIdentities } from "../selection/policies/index.js";
import { projectCartesianRows } from "./cartesianRows.js";
import { projectCartesianSeries } from "./cartesianSeries.js";

const families=new Set(["rule","rect","bar","line","area"]);
function projectLayer(program,layer) {
  if(!families.has(layer.mark.type))return unavailable("unsupported-family");
  if(layer.derivedBindings?.overlay)return unavailable("overlay-position");
  if(requireCoordinate(program,layer.coordinate).type!=="cartesian")return unavailable("coordinate-family");
  if(layer.mark.type!=="bar"&&["xOffset","yOffset"].some(channel=>hasPositionBinding(layer,channel)))return unavailable("offset-position");
  if(["x","y","x2","y2"].some(channel=>layer.conditionals?.[channel]!==undefined))return unavailable("conditional-position");
  if(["line","area"].includes(layer.mark.type)&&["x","y"].some(channel=>!hasPositionBinding(layer,channel)))return unavailable("incomplete-position");
  const dataset=applyItemMissingPolicy(layer,requireDataset(program,layer.data));
  validateGeneratedItemLimit(dataset.values.length,"Cartesian animation source rows");
  // Bound repeated mapping descriptors before constructing per-item states.
  const mappings=Object.values(layer.encoding??{}).flatMap(binding=>binding?.scale===undefined?[]:[program.resolvedScales[binding.scale]]);
  const mappingWork=mappings.reduce((sum,scale)=>sum+(scale?.domain??[]).reduce((total,value)=>total+1+(typeof value==="string"?value.length:0),0),0);
  validateWorkLimit(dataset.values.length*Math.max(1,mappingWork)*2,"Cartesian animation mapping work");
  return ["line","area"].includes(layer.mark.type)?projectCartesianSeries(program,layer,dataset):projectCartesianRows(program,layer,dataset);
}

export function projectCartesianAnimationState(program,endpoint) {
  const scopes=new Map();
  return cloneAndFreeze(endpoint.identities.map((identity,index)=>{
    if(identity===undefined)return unavailable("anonymous");
    const scope=resolveGraphicScope(program,identity),[namespaces,owner]=JSON.parse(identity.key),layer=findLayer(scope,owner);
    if(layer===undefined)return unavailable("semantic-unavailable");
    if(!families.has(layer.mark.type))return unavailable("unsupported-family");
    if(resolveGraphicLineage(program,identity)!==requireDataset(scope,layer.data))throw new TypeError("Cartesian animation lineage differs from its semantic dataset.");
    let layers=scopes.get(scope);if(layers===undefined)scopes.set(scope,layers=new Map());
    if(!layers.has(owner)) {
      const states=projectLayer(scope,layer);
      layers.set(owner,{states,members:states.reason?undefined:new Map(resolveMarkIdentities(scope,owner).map(item=>[item.key,item.rowKeys]))});
    }
    const {states:prepared,members}=layers.get(owner);
    if(prepared.reason)return prepared;
    const key=unnamespaceItemKey(identity.key,namespaces), expected=members.get(key);
    if(expected===undefined||JSON.stringify(expected)!==JSON.stringify(identity.lineage.rowKeys))throw new TypeError("Cartesian animation lineage differs from its exact final item.");
    const state=prepared.get(JSON.stringify([key,identity.role]));
    if(state===undefined)return unavailable("primitive-role");
    if(state.reason)return state;
    return cartesianAnimationMatchesNode(state,endpoint.scene.nodes[index])?state:unavailable("edited-position");
  }));
}
