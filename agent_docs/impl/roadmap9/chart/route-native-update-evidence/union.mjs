import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const historicalBytes=await readFile(new URL('../density-schedule-evidence/native-union.json',import.meta.url));
const historical=JSON.parse(historicalBytes), source=await readFile(new URL('../../../../../src/actions/data/edit.js',import.meta.url),'utf8');
const aliases=[...source.matchAll(/export const (edit\w+Data)\s*=\s*\/\* @__PURE__ \*\/\s*focusedEditor\(/g)].map(match=>match[1]);
aliases.push('editBin2DData','editRegressionStatisticsData');
const aliasOwner=action=>action==='editBin2DData'?'src/actions/data/bin2d.js':action==='editRegressionStatisticsData'?'src/actions/data/regressionStatistics.js':'src/actions/data/edit.js';
for(const action of aliases)assert.match(await readFile(new URL('../../../../../'+aliasOwner(action),import.meta.url),'utf8'),new RegExp('export const '+action+'\\b'));
const direct='editGraphData editInferredGraphData editFlowData editHierarchyData editLayout reviseData editDerivedData editParameter applyDataUpdate filterMarks removeMarkFilter editCanvas fitCanvas navigateProjection'.split(' ');
assert.equal(direct.length,14);assert.equal(historical.count,332);assert.equal(aliases.length,21);
const state=action=>action==='editLayout'?{status:'partial-unit-native-connection',implemented:['graph layout exact native options/node','hierarchy layout exact native order/options','world/screen affected route revision','mixed v1/v2 dependency order','GraphPlot/TreePlot/GeoLine consumer closure'],remaining:['scoped/composition/facet receiver dispatch','indirect viewport mutation requiring additional prepared screen jobs','full native union qualification']}:{status:'pending-public-native-connection'};
const report={schemaVersion:1,scope:'Implementation matrix; membership never grants runtime permission or completion.',historical:{source:historical.source,sha256:createHash('sha256').update(historicalBytes).digest('hex'),count:historical.count},direct:direct.map(action=>({action,...state(action)})),focusedDerivedAliases:aliases.map(action=>({action,status:'pending-public-native-connection',owner:aliasOwner(action),requirement:'Preserve original alias wrapper and exact source identity; no generic replay.'})),audited: Object.entries(historical.groups).flatMap(([domain,entries])=>entries.map(entry=>({...entry,domain,...state(entry.action)}))),nextDependencies:[
{family:'graph/hierarchy edits',owners:['actions/graphs/resources.js','actions/graphs/layouts.js','actions/hierarchy/resources.js'],needs:'Native resource plan/apply consumption through original wrapper; prepared inference keeps original registry.'},
{family:'source/data/derived/parameters',owners:['actions/data/revise.js','actions/data/edit.js','actions/data/sourceContext.js','materialization/revisionIdentity.js'],needs:'Resolve source/row/derived identities once; preserve speculative/actual native branches; bind transient identity context only during synchronous iterator steps.'},
{family:'Canvas/fit/projection',owners:['actions/canvas/actions.js','actions/canvas/fitting.js','materialization/canvasResourceRevision.js'],needs:'Own viewport plans and ordered native probes; terminal abort/deadline/quota never become ordinary fit failure; preserve original editCanvas trace.'},
{family:'composition/facet/indirect consumers',owners:['actions/composition/','actions/guides/','actions/theme/'],needs:'Exact childPath/base/root refs and complete affected union; preserve theme completion and no wildcard action adapter.'}
],limitations:['Snapshot acquisition and deep clone remain synchronous with incompletely metered initial work/depth/heap.','No whole-request 100ms proof.','No large density/FDEB capacity completion claim.','Public native update currently admits only editLayout on completed Full unit receivers.']};
assert.equal(report.audited.length,332);
await writeFile(new URL('./union.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({direct:direct.length,aliases:aliases.length,audited:report.audited.length,partiallyConnected:1}));
