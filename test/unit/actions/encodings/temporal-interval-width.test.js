import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';
const start = Date.UTC(2020, 0, 1), middle = Date.UTC(2021, 0, 1), end = Date.UTC(2022, 0, 1);
const values = [{ date: start, value: 2 }, { date: middle, value: 3 }];
const opts = { interval: { unit: 'year', insetStart: 1 } };
function base(horizontal = false) {
  return chart().createCanvas({ width: 440, height: 340, margin: 20 }).createData({ values })
    .createBarPlot({ x: horizontal ? { field:'value', scale: { domain:[0,4] } } : { field:'date', fieldType:'temporal', temporalUnit:'timestamp', scale:{ domain:[start,end], nice:false } },
      y: horizontal ? { field:'date', fieldType:'temporal', temporalUnit:'timestamp', scale:{ domain:[start,end], nice:false } } : { field:'value', scale:{ domain:[0,4] } }, guides:false });
}
const rects = p => p.graphicSpec.objects.barPlot.items.map(i=>i.properties);
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);
test('calendar interval widths retain leap-year spans and explicit edge insets',()=>{
  const before=base(), p=before.encodeBarWidth(opts), [a,b]=rects(p);
  near(a.x,21); near(a.width,400*366/731-1); near(b.x,21+400*366/731); near(b.width,400*365/731-1);
  assert.notEqual(a.width,b.width); assert.equal(before.markConfigs.barPlot?.barWidth,undefined);
  assert.deepEqual(p.markConfigs.barPlot.barWidth,{interval:{unit:'year',insetStart:1,insetEnd:0}});
  assert.ok(Object.isFrozen(p.markConfigs.barPlot.barWidth.interval));
  const resized=p.editCanvas({width:840});near(rects(resized)[0].width,800*366/731-1);
  assert.deepEqual(rects(deserializeProgram(serializeProgram(resized))),rects(resized));
  assert.deepEqual(rects(p.encodeBarWidth({})),rects(p));
  assert.equal(rects(p.encodeBarWidth({pixels:10}))[0].width,10);
});
test('horizontal interval bars respect a reversed temporal range and edge identity',()=>{
  const p=base(true).encodeBarWidth(opts),[a,b]=rects(p);
  near(a.height,300*366/731-1);near(b.height,300*365/731-1);near(a.y,320-300*366/731);near(b.y,20);
});
test('calendar width is order independent and invalid completion remains atomic',()=>{
  const p=chart().createCanvas({width:440,height:340,margin:20}).createData({values}).createBarMark({id:'barPlot'});
  const pending=p.encodeBarWidth(opts), x={field:'date',fieldType:'temporal',temporalUnit:'timestamp',scale:{domain:[start,end],nice:false}},y={field:'value',scale:{domain:[0,4]}};
  assert.deepEqual(rects(pending.encodeY(y).encodeX(x)),rects(base().encodeBarWidth(opts)));
  assert.throws(()=>pending.encodeX({field:'date',fieldType:'nominal'}).encodeY(y),/temporal categories/);
  assert.equal(pending.graphicSpec.objects.barPlot.items.length,0);
});
test('calendar mode validates its vocabulary, endpoints, layout and positive width',()=>{
  const p=base();
  for(const bad of [{interval:{unit:'week'}},{interval:{unit:'month',extra:1}},{interval:{unit:'year',insetEnd:-1}},{pixels:3,...opts},{band:.7,...opts}])assert.throws(()=>p.encodeBarWidth(bad));
  assert.throws(()=>p.encodeBarWidth({interval:{unit:'year',insetStart:1000}}),/positive width/);
  assert.throws(()=>p.editXScale({domain:[start,middle]}).encodeBarWidth(opts),/endpoints/);
  assert.throws(()=>p.encodeColor({field:'value',fieldType:'nominal'}).encodeBarWidth(opts),/ungrouped/);
  assert.deepEqual(p.markConfigs.barPlot?.barWidth,undefined);
});

test('month and quarter intervals preserve varying calendar lengths',()=>{
  for(const [unit,dates,endDate,days] of [
    ['month',[Date.UTC(2024,0,1),Date.UTC(2024,1,1)],Date.UTC(2024,2,1),[31,29]],
    ['quarter',[Date.UTC(2024,0,1),Date.UTC(2024,3,1)],Date.UTC(2024,6,1),[91,91]]
  ]){
    const p=chart().createCanvas({width:440,height:340,margin:20}).createData({values:dates.map((date,i)=>({date,value:i+1}))}).createBarPlot({x:{field:'date',fieldType:'temporal',temporalUnit:'timestamp',scale:{domain:[dates[0],endDate],nice:false}},y:'value',guides:false}).encodeBarWidth({interval:{unit,insetEnd:2}});
    const r=rects(p);near(r[0].x,20);near(r[0].width,400*days[0]/(days[0]+days[1])-2);near(r[1].width,400*days[1]/(days[0]+days[1])-2);
    const reversed=p.editXScale({reverse:true});near(rects(reversed)[0].x,420-400*days[0]/(days[0]+days[1])+2);
  }
});
