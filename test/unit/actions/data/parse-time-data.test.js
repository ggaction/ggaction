import test from 'node:test';import assert from 'node:assert/strict';import {chart} from '../../../../src/index.js';import {parseTimeValue} from '../../../../src/grammar/parseTime.js';
test('explicit UTC date formats preserve day/month order and reject calendar rollover',()=>{
 assert.equal(parseTimeValue('01/07/1992','%d/%m/%Y'),Date.UTC(1992,6,1));assert.equal(parseTimeValue('01/07/1992','%m/%d/%Y'),Date.UTC(1992,0,7));assert.equal(parseTimeValue('2000-02-29','%Y-%m-%d'),Date.UTC(2000,1,29));assert.equal(new Date(parseTimeValue('0099-01-01','%Y-%m-%d')).getUTCFullYear(),99);
 for(const value of ['1900-02-29','2024-04-31','2024-00-01','bad','2024-13-01'])assert.equal(parseTimeValue(value,'%Y-%m-%d'),null);
 for(const value of [null,undefined,42,false])assert.equal(parseTimeValue(value,'%d/%m/%Y'),null);assert.equal(parseTimeValue('bad'),null);assert.equal(parseTimeValue('2020-01-01T01:00:00+01:00'),Date.UTC(2020,0,1));assert.equal(parseTimeValue('2020'),Date.UTC(2020,0,1));
});
test('typed parsing retains original rows and lets a public filter remove missing timestamps',()=>{
 const raw=[{date:'01/07/1992',value:1},{date:'invalid',value:9},{date:'01/10/1992',value:2}],base=chart().createData({values:raw});
 const parsed=base.createComputedData({id:'parsed',as:'timestamp',expression:{op:'parseTime',operand:{field:'date'},format:'%d/%m/%Y'}});
 assert.deepEqual(parsed.semanticSpec.datasets.at(-1).values.map(r=>r.timestamp),[Date.UTC(1992,6,1),null,Date.UTC(1992,9,1)]);assert.deepEqual(base.semanticSpec.datasets[0].values,raw);
 const valid=parsed.filterData({id:'valid',field:'timestamp',noneOf:[null]});assert.equal(valid.semanticSpec.datasets.at(-1).values.length,2);
 const line=valid.createCanvas({width:240,height:180,margin:20}).createLinePlot({x:{field:'timestamp',fieldType:'temporal',temporalUnit:'timestamp'},y:{field:'value'},guides:false});assert.ok(line.graphicSpec.objects.linePlot);
 assert.throws(()=>base.createComputedData({id:'bad',as:'time',expression:{op:'parseTime',operand:{field:'date'},format:'%Q'}}),/format/);
 assert.throws(()=>base.createComputedData({id:'bad',as:'time',expression:{op:'parseTime',operand:{field:'missing'}}}),/missing/);
 assert.throws(()=>base.createComputedData({id:'bad',as:'time',expression:{op:'parseTime',operand:{field:'date'},timeZone:'UTC'}}));assert.equal(base.semanticSpec.datasets.length,1);
});
