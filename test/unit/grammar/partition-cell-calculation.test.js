import assert from 'node:assert/strict';
import test from 'node:test';
import {isOwned, freezeOwned} from '../../../src/core/immutable.js';
import {partitionBendCellGeometry as geometry} from '../../../src/grammar/hierarchy/partitionCell.js';
import {mapPartitionBendPoint, preparePartitionBendMapping} from '../../../src/grammar/hierarchy/partitionAdapter.js';
import {bendPartitionPoint, insetPartitionBendCell, preparePartitionBendCalculation} from '../../../src/grammar/hierarchy/partitionBend.js';
import {partitionRadius, preparePartitionRadius} from '../../../src/grammar/hierarchy/partitionMapping.js';

const kernel = {width:300,height:100,innerRadius:20,outerRadius:100,radiusPolicy:'equal-depth',sweep:2*Math.PI};
const frame = {origin:[240,180],angle:0,handedness:1,kernel};
const cell = {u0:.1,u1:.7,v0:.2,v1:.9};
const point = {u:.3,v:.5,bend:.37};
function owned(value) {
  if (!value || typeof value !== 'object') return;
  assert.ok(Object.isFrozen(value)); assert.ok(isOwned(value));
  for (const child of Object.values(value)) owned(child);
}
function failure(fn) {
  try { fn(); assert.fail('Expected an admission error'); }
  catch (error) {
    assert.notEqual(error.name,'AssertionError');
    return Object.fromEntries(['name',...Object.getOwnPropertyNames(error).filter(key=>key!=='stack')].map(key=>[key,error[key]]));
  }
}

test('prepared cell calculations preserve generic point and interval math at every bend branch', () => {
  for (const radiusPolicy of ['equal-depth','equal-depth-area'])
  for (const bend of [0,-0,Number.MIN_VALUE,1e-300,1e-12,.37,.9,1])
  for (const angle of [0,1e18]) for (const handedness of [-1,1]) {
    const basis={...frame,angle,handedness,kernel:{...kernel,radiusPolicy}};
    const mapping=preparePartitionBendMapping(basis,{...point,bend});
    for (const u of [0,.3,1]) for (const v of [0,.5,1]) {
      const input={u,v,bend};
      assert.deepEqual(mapping.map(input),mapPartitionBendPoint(basis,input));
    }
    for (const bounds of [cell,{...cell,u1:cell.u0},{u0:0,u1:1,v0:0,v1:1}])
    for (const gap of [[0,0],[4,6],[1000,1000]]) {
      assert.deepEqual(mapping.inset(bounds,gap),insetPartitionBendCell(bounds,basis.kernel,bend,gap));
    }
  }
});

test('prepared numerical policies retain generic defaults, signed zero, and extreme arithmetic', () => {
  for (const patch of [
    {width:Number.MIN_VALUE,height:Number.MIN_VALUE,innerRadius:0,outerRadius:Number.MIN_VALUE},
    {width:1e300,height:1e300,innerRadius:0,outerRadius:1e300},
    {height:-0,innerRadius:-0},{radiusPolicy:undefined},{sweep:undefined},{sweep:null}
  ]) {
    const options={...kernel,...patch}, input={u:1,v:1,bend:Number.MIN_VALUE};
    const calculation=preparePartitionBendCalculation(input,options);
    assert.deepEqual(calculation.point(input),bendPartitionPoint(input,options));
    if (Object.hasOwn(patch,'sweep') && patch.sweep === undefined) {
      assert.deepEqual(failure(()=>calculation.inset(cell,[0,0])),failure(()=>insetPartitionBendCell(cell,options,input.bend,[0,0])));
    } else if (patch.sweep === null) {
      assert.deepEqual(calculation.inset(cell,[0,0]),insetPartitionBendCell(cell,options,input.bend,[0,0]));
    }
  }
  const options={innerRadius:-0,outerRadius:100,radiusPolicy:'equal-depth-area'};
  const radial=preparePartitionRadius(.5,options);
  for (const v of [-0,Number.MIN_VALUE,.5,1]) assert.ok(Object.is(radial(v),partitionRadius(v,options)));
  for (const v of [-1,2,NaN,Infinity]) assert.deepEqual(failure(()=>radial(v)),failure(()=>partitionRadius(v,options)));
  const huge={...kernel,width:Number.MAX_VALUE,height:Number.MAX_VALUE,outerRadius:Number.MAX_VALUE};
  assert.deepEqual(failure(()=>preparePartitionBendCalculation(point,huge).point({u:1,v:1,bend:.5})),failure(()=>bendPartitionPoint({u:1,v:1,bend:.5},huge)));
});

test('preparation retains first frame, point, kernel, and radius admission diagnostics', () => {
  for (const [basis,input] of [
    [{...frame,extra:true},point], [{...frame,origin:[0]},point], [{...frame,angle:NaN},{...point,bend:2}],
    [frame,{...point,extra:true}], [frame,{...point,bend:2}],
    [{...frame,kernel:{...kernel,width:0}},point], [{...frame,kernel:{...kernel,height:-1}},point],
    [{...frame,kernel:{...kernel,sweep:7}},point], [{...frame,kernel:{...kernel,innerRadius:101}},point],
    [{...frame,kernel:{...kernel,radiusPolicy:'bad'}},point], [{...frame,kernel:{...kernel,extra:true}},point]
  ]) assert.deepEqual(failure(()=>preparePartitionBendMapping(basis,input)),failure(()=>mapPartitionBendPoint(basis,input)));
  const calculation=preparePartitionBendCalculation(point,kernel);
  for (const input of [{...point,u:2},{...point,v:NaN},{...point,bend:-1},{...point,extra:1}])
    assert.deepEqual(failure(()=>calculation.point(input)),failure(()=>bendPartitionPoint(input,kernel)));
  for (const [bounds,gap] of [[{...cell,u0:2},[-1,0]],[{...cell,u0:.9},[0,0]],[{...cell,extra:1},[]],[cell,[]],[cell,[-1,0]]])
    assert.deepEqual(failure(()=>calculation.inset(bounds,gap)),failure(()=>insetPartitionBendCell(bounds,kernel,point.bend,gap)));
});

test('cell validation retains segment, frame, bend, cell, and gap precedence', () => {
  const badCell={...cell,u0:2}, badFrame={...frame,angle:NaN,gap:[-1,0]};
  assert.throws(()=>geometry(badCell,badFrame,2,4097),{name:'RangeError',message:'Partition cell segment count must lie from 1 through 4096.'});
  assert.throws(()=>geometry(badCell,badFrame,2,1),{name:'TypeError',message:'Partition bend frame requires finite origin, angle and handedness.'});
  assert.throws(()=>geometry(badCell,{...frame,gap:[-1,0]},2,1),{name:'RangeError',message:'Partition bend bend must lie from zero through one.'});
  assert.throws(()=>geometry(badCell,{...frame,gap:[-1,0]},.5,1),{name:'RangeError',message:'Partition u0 must lie from zero through one.'});
  for (const segments of [null,0,4097,1.5,Infinity]) assert.throws(()=>geometry(cell,{...frame,gap:[0,0]},.5,segments),/segment count/);
  assert.equal(geometry(cell,{...frame,gap:[1000,1000]},.5,4096),null);
});

test('prepared admission never invokes accessors and captures caller scalars without retaining mutable frames', () => {
  let reads=0;
  for (const owner of ['frame','kernel','cell','gap']) {
    const input={frame:structuredClone({...frame,gap:[0,0]}),cell:structuredClone(cell)};
    const target=owner==='frame'?input.frame:owner==='kernel'?input.frame.kernel:owner==='cell'?input.cell:input.frame.gap;
    Object.defineProperty(target,owner==='frame'?'angle':owner==='kernel'?'width':owner==='cell'?'u0':'0',{enumerable:true,get(){reads++;return 0;}});
    assert.throws(()=>geometry(input.cell,input.frame,.37,4),/accessors/);
  }
  assert.equal(reads,0);
  for (const transform of [value=>value,Object.freeze,freezeOwned,value=>Object.assign(Object.create(null),value)]) {
    const basis=transform(structuredClone(frame)), saved=structuredClone(basis);
    const mapping=preparePartitionBendMapping(basis,point), expected=mapping.map(point);
    assert.deepEqual(Object.entries(basis),Object.entries(saved));
    basis.origin[0]=999; basis.kernel.width=900;
    assert.deepEqual(mapping.map(point),expected);
    assert.notDeepEqual(mapPartitionBendPoint(basis,point),expected);
  }
});

test('completed cell and generic wrappers retain deeply owned output and caller isolation', () => {
  const input=structuredClone({...frame,gap:[4,6]}), saved=structuredClone(input);
  const result=geometry(cell,input,.37,4); owned(result);
  owned(mapPartitionBendPoint(frame,point)); owned(bendPartitionPoint(point,kernel)); owned(insetPartitionBendCell(cell,kernel,.37,[4,6]));
  assert.deepEqual(input,saved);
  const snapshot=structuredClone(result);
  input.kernel.width=500; input.origin[0]=999; input.gap[0]=100;
  assert.deepEqual(result,snapshot);
  assert.throws(()=>{result.commands[0].x=0;},TypeError);
  assert.equal(result.commands.at(-1).op,'Z');
});
