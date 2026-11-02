import assert from 'node:assert/strict';
import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// A source-pinned proposal inventory, never a runtime dispatch/registration map.
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const bytes=await readFile(path.join(root,'agent_docs/contract/ACTION_INDEX.json'));
const index=JSON.parse(bytes),groups={};
const domains=['marks','encodings','axes','grid','legend_and_title','mark-selection','composition','charts'];
const core=new Set([
 'editCanvas','fitCanvas','applyTextMetrics','removeTextMetrics','applyTheme','removeTheme',
 'applyDataUpdate','reviseData','removeData','removeScale','removeCoordinate','bindMarkData','filterData',
 'editGraphData','editInferredGraphData','editParameter','removeParameter',
 'editDerivedData','editBin2DData','editFilteredData','editTimeUnitData','editWindowData','editDensityData','editRegressionData','editRegressionStatisticsData',
 'editCoordinate','createScale','editScale','editXScale','editYScale','editXOffsetScale','editYOffsetScale','editParallelScale','editThetaScale','editRScale',
 'editColorScale','editStrokeScale','editSizeScale','editOpacityScale','editShapeScale','editStrokeWidthScale','editStrokeDashScale',
 'replaceImageResource','replaceFontResource','removeResource','editHierarchyData','editLayout','editFlowData','editContourData',
 'editGeometryData','editGeoJoinData','editGeoRouteData','editGeoLODData','editProjection','navigateProjection'
]);
for(const action of index.actions) {
 const included=domains.includes(action.domain)||core.has(action.name)||action.domain==='statistics'&&!/^create.*Data$/.test(action.name);
 if(!included)continue;
 assert.equal(action.status,'implemented');assert.ok(['user-facing','advanced'].includes(action.layer),action.name);
 await access(path.join(root,action.contract.file));
 (groups[action.domain]??=[]).push({action:action.name,contract:action.contract.file,
  ...(action.name==='navigateProjection'?{restriction:'resize only; other native operations remain ordinary projection actions'}:{}),
  ...(action.name==='applyDataUpdate'?{restriction:'authentic exact-base/token source preparation only'}:{})});
}
for(const name of core)assert.ok(index.actions.some(action=>action.name===name),name);
const selected=Object.values(groups).flat(),names=selected.map(value=>value.action);assert.equal(new Set(names).size,names.length);
for(const primitive of ['editSemantic','createGraphics','editGraphics','bundleGraphEdges','editEdgeRoute','createCanvas','createData'])assert.ok(!names.includes(primitive));
const excluded=index.actions.filter(action=>!names.includes(action.name)).map(({name,domain})=>({action:name,domain}));
const report={schemaVersion:1,status:'candidate superset snapshot for closed adapters; not a proven minimal union, product admission or completion',source:'90ae731513ec85a8eb5bd378a82d5904d1be6da4',
 actionIndexSHA256:createHash('sha256').update(bytes).digest('hex'),count:names.length,groups,excluded,
 constraints:['No runtime domain wildcard: exact names must be reviewed and compiled into closed adapters.',
 'Every request requires at least one existing bounded route and actual native route-input/viewport/removal closure; otherwise use its ordinary action.',
 'Original native args/alias/validation/trace and exact child program identity must be preserved.',
 'All listed adapters remain unimplemented and need per-family positive/atomic failure tests. Membership alone is not support evidence.']};
await writeFile(new URL('./native-union.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({count:report.count,groups:Object.fromEntries(Object.entries(groups).map(([key,value])=>[key,value.length])),excluded:excluded.length}));
