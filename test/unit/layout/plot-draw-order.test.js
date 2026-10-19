import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePlotDrawOrder} from '../../../src/layout/plotDrawOrder.js';

test('explicit underlays keep grid ranks, mark/extension order, border-before-axis and owner component order',()=>{
  const source={children:['gridV','point','band','axisBTitle','border','gridH','axisALine','axisBLine','label'],
    grids:[{id:'gridV',zIndex:2,index:1},{id:'gridH',zIndex:0,index:0}],border:{id:'border',underlay:true},
    axes:[{ids:['axisALine'],underlay:false},{ids:['axisBLine','axisBTitle'],underlay:true}]};
  const saved=structuredClone(source);
  assert.deepEqual(resolvePlotDrawOrder(source),['gridH','border','axisBTitle','axisBLine','point','band','label','gridV','axisALine']);
  assert.deepEqual(resolvePlotDrawOrder({...source,border:{id:'border',underlay:false},
    axes:source.axes.map(axis=>({...axis,underlay:false}))}),['gridH','point','band','label','gridV','border','axisALine','axisBTitle','axisBLine']);
  assert.deepEqual(source,saved);
});

test('missing optional guide graphics do not add children and grid ties preserve directional rank',()=>{
  assert.deepEqual(resolvePlotDrawOrder({children:['v','m','h'],grids:[{id:'v',index:1},{id:'h',index:0}],
    border:{id:'absent',underlay:true},axes:[{ids:['not-created'],underlay:true}]}),['h','v','m']);
});
