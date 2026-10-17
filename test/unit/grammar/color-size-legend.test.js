import assert from 'node:assert/strict';import test from 'node:test';
import{resolveColorSizeMapping,normalizeColorSizeSymbol,isColorSizeChannels}from'../../../src/grammar/colorSizeLegend.js';
const fixture=()=>({layer:{id:'p',mark:{type:'point'},encoding:{color:{field:'v',fieldType:'quantitative',scale:'c',data:'d',aggregate:'mean'},size:{field:'v',fieldType:'quantitative',scale:'s',data:'d',aggregate:'mean'}}},scales:{c:{type:'sequential',domain:[0,10]},s:{type:'pow',domain:[0,10]}},pointConfig:{shape:'circle'},coordinate:{type:'cartesian'}});
test('continuous combined mapping owns both scale references and exact numeric endpoints',()=>{
 const f=fixture();assert.deepEqual(resolveColorSizeMapping(f),{target:'p',field:'v',fieldType:'quantitative',colorScale:'c',sizeScale:'s',domain:[0,10]});
 for(const mutate of [f=>f.layer.encoding.size.aggregate='sum',f=>f.layer.encoding.size.data='other',f=>f.layer.encoding.size.fieldType='ordinal',f=>f.layer.encoding.shape={field:'shape'},f=>f.coordinate.type='polar',f=>f.pointConfig.shape='square',f=>f.scales.c.type='ordinal',f=>f.scales.s.type='ordinal',f=>f.scales.s.domain=[0,11],f=>f.scales.c.domain=[0,Infinity],f=>{f.scales.c.domain=[0,0];f.scales.s.domain=[0,0];}]){const invalid=fixture();mutate(invalid);assert.throws(()=>resolveColorSizeMapping(invalid));}
});
test('mapped symbols allow only finite stroke appearance and one explicit sample opacity',()=>{
 assert.equal(isColorSizeChannels(['size','color']),true);for(const input of [undefined,[],['color'],['color','color'],['color','size','shape']])assert.equal(isColorSizeChannels(input),false);
 assert.deepEqual(normalizeColorSizeSymbol(undefined),{type:'point',strokeWidth:0,opacity:1});
 const previous={type:'point',stroke:'red',strokeWidth:2,opacity:.7};assert.deepEqual(normalizeColorSizeSymbol(undefined,previous),previous);
 assert.deepEqual(normalizeColorSizeSymbol('auto',previous),{type:'point',strokeWidth:0,opacity:1});
 for(const symbol of [{type:'line'},{fill:'red'},{size:5},{radius:2},{layers:[]},{stroke:''},{strokeWidth:-1},{strokeWidth:Infinity},{opacity:-.1},{opacity:1.1},{opacity:NaN}])assert.throws(()=>normalizeColorSizeSymbol(symbol));
 assert.deepEqual(normalizeColorSizeSymbol({opacity:0},previous),{...previous,opacity:0});
});
