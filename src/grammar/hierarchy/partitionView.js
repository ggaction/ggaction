import {cloneAndFreeze} from "../../core/immutable.js";
import {ownRecord} from "../../core/ownData.js";
import {rejectUnknownProperties,validateWorkLimit} from "../../core/validation.js";
import {indexHierarchyModel,hierarchyLayoutModel} from "./model.js";
import {layoutHierarchyPartition} from "./partition.js";

function requestedKey(value, fallback) {
  if(value===undefined)return fallback;
  if(typeof value!=="string"||value.length===0)throw new TypeError("Partition focus must be a normalized non-empty node key.");
  return value;
}

export function createPartitionView(model,options={}) {
  ownRecord(options,"Partition view options");
  rejectUnknownProperties(options,["focusKey","rootVisible","maxNodes"],"partition view");
  if(options.rootVisible!==undefined&&typeof options.rootVisible!=="boolean")throw new TypeError("Partition rootVisible must be a boolean.");
  const indexed=indexHierarchyModel(model,options.maxNodes);
  // The interval owner validates again. Charge both explicit passes and the view
  // traversal together before requesting any interval/view output allocation.
  validateWorkLimit(indexed.work*2+indexed.nodes.length*80,"Partition view work");
  return projectPartitionView(layoutHierarchyPartition(model,{maxNodes:options.maxNodes}),options);
}

// Stored layouts already own interval calculation. Projection never recalculates it.
export function projectPartitionView(partition,options={}) {
  ownRecord(options,"Partition view options");
  rejectUnknownProperties(options,["focusKey","rootVisible","maxNodes"],"partition view");
  if(options.rootVisible!==undefined&&typeof options.rootVisible!=="boolean")throw new TypeError("Partition rootVisible must be a boolean.");
  const indexed=indexHierarchyModel(hierarchyLayoutModel(partition),options.maxNodes);
  validateWorkLimit(indexed.work+indexed.nodes.length*80,"Partition view work");
  for(const node of partition.nodes) {
    if(![node.u0,node.u1,node.residualStart].every(Number.isFinite)||node.u0<0||node.u1>1||node.u0>node.residualStart||node.residualStart>node.u1)throw new TypeError("Stored partition intervals must be finite and ordered.");
  }
  const focusKey=requestedKey(options.focusKey,partition.rootKey),focusIndex=indexed.indexes.get(focusKey);
  if(focusKey!==null&&focusIndex===undefined)throw new Error("Unknown partition focus key.");
  if(focusKey===null)return cloneAndFreeze({focusKey:null,breadcrumbKeys:[],levels:0,nodes:[],diagnostics:{emptyHierarchy:true,emptyValue:true,emptyChildrenView:true}});
  const focus=partition.nodes[focusIndex],sourceDepth=focus.depth,breadcrumbKeys=[];
  let ancestor=focus.parentKey;
  while(ancestor!==null){const node=partition.nodes[indexed.indexes.get(ancestor)];if(!node.synthetic)breadcrumbKeys.push(node.key);ancestor=node.parentKey;}
  breadcrumbKeys.reverse();
  let end=focusIndex+1;
  while(end<partition.nodes.length&&partition.nodes[end].depth>sourceDepth)end++;
  let maximumDepth=0;
  for(let i=focusIndex;i<end;i++)maximumDepth=Math.max(maximumDepth,partition.nodes[i].depth-sourceDepth);
  const hiddenRoot=options.rootVisible===false||focus.synthetic===true,offset=hiddenRoot?1:0;
  const levels=Math.max(0,maximumDepth+1-offset),span=focus.u1-focus.u0;
  const remap=value=>span===0?0:value===focus.u0?0:value===focus.u1?1:(value-focus.u0)/span;
  const nodes=partition.nodes.slice(focusIndex,end).map(node=>{
    const depth=node.depth-sourceDepth,visible=node.synthetic!==true&&depth>=offset&&levels>0;
    return{...node,depth,u0:remap(node.u0),u1:remap(node.u1),residualStart:remap(node.residualStart),
      v0:visible?(depth-offset)/levels:0,v1:visible?(depth-offset+1)/levels:0,visible};
  });
  return cloneAndFreeze({focusKey,breadcrumbKeys,levels,nodes,
    diagnostics:{emptyHierarchy:false,emptyValue:span===0,emptyChildrenView:hiddenRoot&&maximumDepth===0}});
}

export function recoverPartitionFocus(previousModel,nextModel,focusKey,options={}) {
  ownRecord(options,"Partition recovery options");rejectUnknownProperties(options,["maxNodes"],"partition recovery");
  const previous=indexHierarchyModel(previousModel,options.maxNodes),next=indexHierarchyModel(nextModel,options.maxNodes);
  validateWorkLimit(previous.work+next.work+previous.nodes.length*4,"Partition focus recovery work");
  const requested=requestedKey(focusKey,previousModel.rootKey);
  if(requested!==null&&!previous.indexes.has(requested))throw new Error("Unknown previous partition focus key.");
  let candidate=requested;
  while(candidate!==null){
    if(next.indexes.has(candidate))return cloneAndFreeze({previousFocusKey:requested,focusKey:candidate,reason:candidate===requested?"retained":"ancestor"});
    candidate=previous.nodes[previous.indexes.get(candidate)].parentKey;
  }
  return cloneAndFreeze({previousFocusKey:requested,focusKey:nextModel.rootKey,reason:nextModel.rootKey===null?"empty":"root"});
}

export function partitionNavigation(model,focusKey,options={}) {
  ownRecord(options,"Partition navigation options");rejectUnknownProperties(options,["maxNodes"],"partition navigation");
  const{nodes,indexes,work}=indexHierarchyModel(model,options.maxNodes);validateWorkLimit(work+nodes.length*4,"Partition navigation work");
  const key=requestedKey(focusKey,model.rootKey);
  if(key===null)return cloneAndFreeze({key:null,parent:null,firstChild:null,previousSibling:null,nextSibling:null,root:null});
  const index=indexes.get(key);if(index===undefined)throw new Error("Unknown partition navigation key.");
  const node=nodes[index],siblings=node.parentKey===null?[key]:nodes[indexes.get(node.parentKey)].childrenKeys,position=siblings.indexOf(key);
  return cloneAndFreeze({key,parent:node.parentKey,firstChild:node.childrenKeys[0]??null,
    previousSibling:position>0?siblings[position-1]:null,nextSibling:siblings[position+1]??null,root:model.rootKey});
}
