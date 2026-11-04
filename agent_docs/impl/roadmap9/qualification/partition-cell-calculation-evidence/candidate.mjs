// Read-only source transform. General wrappers keep full admission and ownership.
import assert from 'node:assert/strict';
export const paths=['src/grammar/hierarchy/partitionMapping.js','src/grammar/hierarchy/partitionBend.js','src/grammar/hierarchy/partitionAdapter.js','src/grammar/hierarchy/partitionCell.js'];
function replace(s,a,b){assert.equal(s.split(a).length,2,`Expected one anchor: ${a}`);return s.replace(a,b);}
export function candidate(path,s){
 if(path===paths[0]){
  s=replace(s,`export function partitionRadius(v,options){
 unit(v,"Partition radial proportion");ownRecord(options,"Partition radius options");rejectUnknownProperties(options,["innerRadius","outerRadius","radiusPolicy"],"partition radius");
 return radius(v,radiusOptions(options));
}`,`function admitRadius(v,options){
 unit(v,"Partition radial proportion");ownRecord(options,"Partition radius options");rejectUnknownProperties(options,["innerRadius","outerRadius","radiusPolicy"],"partition radius");
 return radiusOptions(options);
}
export function partitionRadius(v,options){
 return radius(v,admitRadius(v,options));
}
// Internal calculation captures only the fully admitted numeric radial policy.
export function preparePartitionRadius(v,options){
 const radial=admitRadius(v,options);
 return value=>{unit(value,"Partition radial proportion");return radius(value,radial);};
}`);
 }
 if(path===paths[1]){
  s=replace(s,'partitionRadius,validatePartitionInterval','partitionRadius,preparePartitionRadius,validatePartitionInterval');
  const start=s.indexOf('export function bendPartitionPoint(point,options){'),math=s.indexOf(' const{u,v,bend:b}=point'),end=s.indexOf('\n// Insets use');
  assert.ok(start>0&&math>start&&end>math);
  const prefix=s.slice(start,math),pointChecks=prefix.slice(prefix.indexOf('\n ownRecord(point'),prefix.indexOf('\n ownRecord(options')),optionChecks=prefix.slice(prefix.indexOf('\n ownRecord(options'),prefix.indexOf('\n const r=partitionRadius'));
  const mathBody=s.slice(math,end).replaceAll('return cloneAndFreeze({x:width*q,y:height*v});','return {x:width*q,y:height*v};').replaceAll('return cloneAndFreeze({x:r*Math.sin(theta),y:r*Math.cos(theta)});','return {x:r*Math.sin(theta),y:r*Math.cos(theta)};').replaceAll('return cloneAndFreeze({x,y:vertical});','return {x,y:vertical};');
  const replacement=`function validateBendPoint(point){${pointChecks}
}
function admitBendOptions(options){${optionChecks}
 return {width,height,sweep};
}
function bendCoordinates(point,width,height,sweep,r){\n${mathBody.trimStart()}
export function bendPartitionPoint(point,options){
 validateBendPoint(point);const{width,height,sweep}=admitBendOptions(options);
 const r=partitionRadius(point.v,{innerRadius:options.innerRadius,outerRadius:options.outerRadius,radiusPolicy:options.radiusPolicy});
 return cloneAndFreeze(bendCoordinates(point,width,height,sweep,r));
}
// Full admission precedes the ephemeral calculation. No raw caller can supply
// an already-validated token, and every later point retains its range checks.
export function preparePartitionBendCalculation(point,options){
 validateBendPoint(point);const{width,height,sweep}=admitBendOptions(options);
 const radial=preparePartitionRadius(point.v,{innerRadius:options.innerRadius,outerRadius:options.outerRadius,radiusPolicy:options.radiusPolicy});
 const bend=point.bend,tangentKernel={width:options.width,sweep:options.sweep};
 const calculate=input=>{validateBendPoint(input);return bendCoordinates(input,width,height,sweep,radial(input.v));};
 return {point:calculate,inset(cell,gap){
  validateCellGap(cell,gap);
  return insetCoordinates(cell,tangentKernel,bend,gap,v=>calculate({u:.5,v,bend}).y);
 }};
}
`;
  s=s.slice(0,start)+replacement+s.slice(end);
  s=replace(s,`export function insetPartitionBendCell(cell,kernel,bend,gap){
 validatePartitionInterval(cell);ownArray(gap,"Partition bend gaps");
 if(gap.length!==2)throw new TypeError("Partition bend gaps require two distances.");
 gap.forEach(value=>validateNonNegativeFinite(value,"Partition bend gap"));
 const depth=v=>bendPartitionPoint({u:.5,v,bend},kernel).y;`, `function validateCellGap(cell,gap){
 validatePartitionInterval(cell);ownArray(gap,"Partition bend gaps");
 if(gap.length!==2)throw new TypeError("Partition bend gaps require two distances.");
 gap.forEach(value=>validateNonNegativeFinite(value,"Partition bend gap"));
}
export function insetPartitionBendCell(cell,kernel,bend,gap){
 validateCellGap(cell,gap);
 return cloneAndFreeze(insetCoordinates(cell,kernel,bend,gap,v=>bendPartitionPoint({u:.5,v,bend},kernel).y));
}
function insetCoordinates(cell,kernel,bend,gap,depth){`);
  s=replace(s,'return cloneAndFreeze({u0:u,u1:u,v0:anchorV,v1:anchorV,anchorV,visible:false});','return {u0:u,u1:u,v0:anchorV,v1:anchorV,anchorV,visible:false};');
  s=replace(s,'return cloneAndFreeze({u0:cell.u0+inset,u1:cell.u1-inset,v0,v1,anchorV:inverse(finiteMidpoint(depth(v0),depth(v1))),visible:true});','return {u0:cell.u0+inset,u1:cell.u1-inset,v0,v1,anchorV:inverse(finiteMidpoint(depth(v0),depth(v1))),visible:true};');
 }
 if(path===paths[2]){
  s=replace(s,'import { bendPartitionPoint }','import { bendPartitionPoint, preparePartitionBendCalculation }');
  s=replace(s,'export function mapPartitionBendPoint(frame, point) {','function validateBendFrame(frame) {');
  s=replace(s,'  const canonical = bendPartitionPoint(point, frame.kernel), x = Math.cos(frame.angle), y = Math.sin(frame.angle);',`}

export function mapPartitionBendPoint(frame, point) {
  validateBendFrame(frame);
  return cloneAndFreeze(screenCoordinates(frame, bendPartitionPoint(point, frame.kernel)));
}

// A single cell consumes this local calculation; only admitted scalar frame
// fields are captured, and the generic wrapper above retains full admission.
export function preparePartitionBendMapping(frame, point) {
  validateBendFrame(frame);
  const calculation = preparePartitionBendCalculation(point, frame.kernel);
  const basis = { origin: [frame.origin[0], frame.origin[1]], angle: frame.angle, handedness: frame.handedness };
  return { map: input => screenCoordinates(basis, calculation.point(input)), inset: calculation.inset };
}

function screenCoordinates(frame, canonical) {
  const x = Math.cos(frame.angle), y = Math.sin(frame.angle);`);
  s=replace(s,'  return cloneAndFreeze(result);','  return result;');
 }
 if(path===paths[3]){
  s=replace(s,'mapPartitionBendPoint, partitionBendSegments','preparePartitionBendMapping, partitionBendSegments');
  s=replace(s,'import { insetPartitionBendCell } from "./partitionBend.js";\n','');
  s=replace(s,'  mapPartitionBendPoint(basis, { u: .5, v: .5, bend });\n  const interval = insetPartitionBendCell(cell, basis.kernel, bend, gap);',`  const mapping = preparePartitionBendMapping(basis, { u: .5, v: .5, bend });
  mapping.map({ u: .5, v: .5, bend });
  const interval = mapping.inset(cell, gap);`);
  s=s.replaceAll('mapPartitionBendPoint(basis, {','mapping.map({');
 }
 return s;
}
