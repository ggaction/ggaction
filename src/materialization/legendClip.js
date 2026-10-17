import{cloneAndFreeze}from'../core/immutable.js';
import{categoricalLegendSymbolId}from'../grammar/legendBlocks.js';
import{validateLegendClip}from'../grammar/legendClip.js';
import{hasRectRadius}from'../grammar/roundedRect.js';
import{resolvePrimitiveGraphicBounds}from'../grammar/schemas/graphicBounds.js';
import{translatedProperties}from'./graphicTranslation.js';

function roles(kind,config){
 if(['series','color','stroke'].includes(kind))return config.symbol.layers.map(layer=>({
  id:categoricalLegendSymbolId(config,layer.type),point:layer.type==='point',
  type:layer.type==='line'?'line':layer.type==='point'?config.channels.includes('shape')?'collection':'circle':hasRectRadius(layer)?'collection':'rect'
 }));
 const prefix=kind==='gradient'?'colorGradient':`${kind}Legend`;
 return [{id:`${prefix}Symbols`,type:'circle',point:true}];
}
function wrapped(owner){return owner?.children?.some(id=>id.startsWith('legendSampleClip:'));}
export function hasLegendClipGraphics(program){
 return Object.values(program.graphicSpec.objects).some(wrapped);
}
function copyGraphic(program,objects){return program._clone({graphicSpec:cloneAndFreeze({...program.graphicSpec,objects})});}
export function resetLegendClipGraphics(program){
 if(!hasLegendClipGraphics(program))return program;
 const objects={...program.graphicSpec.objects};
 function remove(id){const object=objects[id];for(const child of object?.children??[])remove(child);delete objects[id];}
 for(const[kind,config]of Object.entries(program.guideConfigs.legend??{})){
  const descriptors=roles(kind,config);
  if(!descriptors.some(role=>wrapped(objects[role.id])))continue;
  for(const role of descriptors){
   const owner=objects[role.id];if(!owner)continue;
   for(const child of owner.children??[])remove(child);
   objects[role.id]={type:role.type,items:[]};
  }
 }
 return copyGraphic(program,objects);
}
function union(bounds){return bounds.reduce((a,b)=>a===undefined?b:{left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),top:Math.min(a.top,b.top),bottom:Math.max(a.bottom,b.bottom)},undefined);}
function anchorY(type,p){
 if(type==='circle')return p.y;
 if(type==='rect')return p.y+p.height/2;
 throw new Error('Path samples require their authored glyph anchor.');
}
export function applyLegendClipGraphics(program,{force=false,anchors={}}={}){
 if(program.context.deferLegendClip===true&&!force)return program;
 let next=program;
 for(const[kind,config]of Object.entries(program.guideConfigs.legend??{})){
  validateLegendClip(kind,config);if(config.clipHeight===undefined)continue;
  if (["series","color","stroke"].includes(kind) && anchors[kind] === undefined && !force) continue;
  const descriptors=roles(kind,config),owners=descriptors.map(role=>next.graphicSpec.objects[role.id]);
  if(owners.some(wrapped)||owners.some(owner=>!owner?.items))continue;
  const count=owners[0].items.length;if(count===0||owners.some(owner=>owner.items.length!==count))continue;
  const objects={...next.graphicSpec.objects},primary=descriptors[0].id,children=[];
  for(let index=0;index<count;index++){
   const samples=owners.map((owner,j)=>({item:owner.items[index],type:owner.items[index].type??owner.type,role:descriptors[j]}));
   const point=samples.find(sample=>sample.role.point),y=anchors[kind]?.[index]??anchorY(point.type,point.item.properties);
   const b=union(samples.map(sample=>resolvePrimitiveGraphicBounds(sample.type,sample.item.properties)));
   const x=b.left,top=y-config.clipHeight/2,id=`legendSampleClip:${primary}:${index}`,glyphs=[];
   for(const sample of samples){
    const glyph=sample.item.id;glyphs.push(glyph);
    objects[glyph]={type:sample.type,properties:translatedProperties(sample.type,sample.item.properties,-x,-top)};
   }
   objects[id]={type:'canvas',properties:{x,y:top,width:b.right-b.left,height:config.clipHeight},children:glyphs};children.push(id);
  }
  for(const descriptor of descriptors)objects[descriptor.id]={type:'collection',items:[],...(descriptor.id===primary?{children}:{})};
  next=copyGraphic(next,objects);
 }
 return next;
}

export function restoreLegendClipContext(program, previous) {
 const {deferLegendClip: _deferred, ...context} = program.context;
 if (previous !== undefined) context.deferLegendClip = previous;
 return program._clone({context});
}
