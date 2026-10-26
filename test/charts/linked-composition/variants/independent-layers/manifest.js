import { chart } from '../../../../../src/index.js';

export const rows = Array.from({ length: 72 }, (_, i) => ({
  group: ['A', 'B', 'C'][i % 3], value: 8 + (i % 3) * 4 + (i * 7 % 19) / 3,
  time: Math.floor(i / 3), response: 4 + Math.floor(i / 3) * .8 + (i * 11 % 7)
}));
const x = { field: 'group', fieldType: 'nominal', scale: { id: 'category' } };
const y = { field: 'value', fieldType: 'quantitative', scale: { id: 'value' } };
const baseCalls = [
  { method: 'createCanvas', args: { plot: { width: 370, height: 300 }, margin: { left: 70, right: 35, top: 60, bottom: 60 } } },
  { method: 'createData', args: { id: 'observations', values: rows } }
];
export const variants = [{
  id: 'beeswarm-box', title: 'Beeswarm + box: observations and distribution',
  calls: [...baseCalls,
    { method: 'createBeeswarmPlot', args: { id: 'observations', data: 'observations', x, y, point: { radius: 3, opacity: .65, fill: '#4c78a8' }, guides: false } },
    { method:'createLayerPlot',args:{id:'summary',source:'observations',plot:{action:'createBoxPlot',options:{box:{opacity:.25,fill:'#e45756',stroke:'#8d2424'},width:{band:.4},outliers:false}}} },
    { method: 'createGuides', args: { axes: { x: {}, y: {} }, legend: false } },
    { method: 'createTitle', args: { text: 'Beeswarm + box' } }],
}, {
  id: 'violin-box-points', title: 'Violin + box + observations: three independently editable layers',
  calls: [...baseCalls,
    { method: 'createViolinPlot', args: { id: 'density', data: 'observations', x, y, area: { opacity: .25 }, guides: false } },
    { method:'createLayerPlot',args:{id:'summary',source:'density',plot:{action:'createBoxPlot',options:{width:{band:.2},outliers:false,box:{opacity:.5}}}} },
    { method:'createLayerPlot',args:{id:'samples',source:'density',plot:{action:'createBeeswarmPlot',options:{point:{radius:2,opacity:.55,fill:'#e45756'}}}} },
    { method: 'createGuides', args: { axes: { x: {}, y: {} }, legend: false } },
    { method: 'createTitle', args: { text: 'Violin + box + points' } }],
}];
export function publicCallChain(variant) {
  return 'chart()\n' + variant.calls.map(call=>`  .${call.method}(${JSON.stringify(call.args)})`).join('\n') + ';';
}
export function build(variant) {
  return variant.calls.reduce((program,call)=>program[call.method](call.args),chart());
}
// Approved primitive composition: explicitly bind each existing constructor to
// the same input, coordinate and scales, without the new layer planner.
export function buildPrimitive(variant) {
  return variant.calls.reduce((program,call)=>call.method==='createLayerPlot'
    ? program[call.args.plot.action]({id:call.args.id,data:'observations',coordinate:'main',x,y,...call.args.plot.options,guides:false})
    : program[call.method](call.args),chart());
}
