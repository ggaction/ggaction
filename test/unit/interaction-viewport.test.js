import assert from "node:assert/strict";
import test from "node:test";
import { chart, hconcat } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { createInteractionSession } from "../../src/interaction.js";
import { getMarkItems } from "../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../src/persistence.js";

const geometry = { type: "Feature", id: "place", properties: { name: "Place" }, geometry: { type: "Point", coordinates: [80, 90] } };
const make = () => chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: geometry })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoPointMark({ id: "places", geometry: "places", radiusPx: 8 })
  .selectMarks({ id: "picked", target: "places", items: [] });
const move = payload => ({ type: "setViewport", target: "map", payload });
const circle = state => state.scene.nodes.find(node => node.type === "circle").properties;

test("viewport commands apply literal native projection coordinates and preserve feature selections", () => {
  const p = make(), original = serializeProgram(p), key = getMarkItems(p, { target: "places" })[0].key;
  const selected = p.editMarkSelection({ selection: "picked", items: [key] }).highlightMarks({ selection: "picked", color: "gold", dimOthers: false, bringToFront: false });
  const s = createInteractionSession({ program: selected, bindings: [] }), events = [];
  s.subscribe(event => events.push(event));
  const initial = s.getState();
  s.dispatch({ ...move({ scalePx: 2, translatePx: [10, -20] }), transactionId: "pan-zoom" });
  const q = s.getState().program;
  assert.deepEqual([circle(s.getState()).x, circle(s.getState()).y], [170, 160]);
  assert.deepEqual(q.graphicSpec, selected.editProjection({ target: "map", scalePx: 2, translatePx: [10, -20] }).graphicSpec);
  assert.equal(q.semanticSpec.resources.find(r => r.kind === "geometry"), selected.semanticSpec.resources.find(r => r.kind === "geometry"));
  assert.equal(q.semanticSpec.resources.find(r => r.kind === "projection").revision, 1);
  assert.deepEqual(events.map(event => [event.type, event.phase, event.revision]), [["setViewport", "commit", 1], ["setViewport", "settled", 1]]);
  assert.deepEqual(events[0].selectionChanges, []);
  assert.equal(getMarkItems(deserializeProgram(serializeProgram(q)), { target: "places" })[0].properties.fill, "gold");
  assert.deepEqual(s.dispatch({ type: "frame", scene: initial.scene, generation: initial.generation, version: 100 }), { status: "stale" });
  s.dispatch({ type: "inspect", point: { x: 170, y: 160 }, slop: 0 }); assert.equal(s.getState().hit.target.itemKey, key);
  assert.equal(serializeProgram(p), original); s.destroy();
});

test("viewport transform detaches fitted geometry while angular edits retain native fitting", () => {
  const p = make().editProjection({ target: "map", fit: { geometry: "places", width: 400, height: 300, pointScale: 2 } });
  const s = createInteractionSession({ program: p, bindings: [] });
  const previous = p.semanticSpec.resources.find(r => r.kind === "projection");
  assert.equal(previous.inputs.length, 1);
  s.dispatch(move({ translatePx: [0, 0] }));
  const current = s.getState().program.semanticSpec.resources.find(r => r.kind === "projection");
  assert.deepEqual(current.inputs, []); assert.equal(current.options.scalePx, previous.result.scalePx);
  assert.equal(current.options.fit, undefined); s.destroy();
  const globe = chart().createCanvas({ width: 400, height: 300, margin: 0 })
    .createGeometryData({ id: "places", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: { ...geometry, geometry: { type: "Point", coordinates: [1, 0] } } })
    .createProjection({ id: "map", type: "equirectangular", scalePx: 180 / Math.PI, translatePx: [100, 100] })
    .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "places", geometry: "places" });
  const g = createInteractionSession({ program: globe, bindings: [] });
  assert.ok(Math.abs(circle(g.getState()).x - 101) < 1e-10);
  g.dispatch(move({ centerDeg: [1, 0] })); assert.ok(Math.abs(circle(g.getState()).x - 100) < 1e-10);
  g.dispatch(move({ rotateDeg: [1, 0] })); assert.ok(Math.abs(circle(g.getState()).x - 101) < 1e-10);
  const fitted = globe.editProjection({ target: "map", fit: { geometry: "places", width: 400, height: 300, pointScale: 2 } });
  g.updateProgram(fitted); g.dispatch(move({ centerDeg: [2, 0] }));
  const fittedResource = g.getState().program.semanticSpec.resources.find(r => r.kind === "projection");
  assert.deepEqual(fittedResource.inputs, [{ kind: "geometry", id: "places", revision: 0 }]);
  assert.deepEqual(fittedResource.options.fit, fitted.semanticSpec.resources.find(r => r.kind === "projection").options.fit);
  assert.deepEqual(g.getState().program.graphicSpec, fitted.editProjection({ target: "map", centerDeg: [2, 0] }).graphicSpec);
  g.destroy();
});

test("scoped projection edits preserve siblings and reject every invalid patch atomically", () => {
  const child = make(), p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
  const s = createInteractionSession({ program: p, bindings: [] });
  s.dispatch({ ...move({ translatePx: [10, 20] }), target: { childPath: ["left"], id: "map" } });
  assert.equal(s.getState().program.children.right, child);
  assert.deepEqual(s.getState().program.children.left.graphicSpec, child.editProjection({ target: "map", translatePx: [10, 20] }).graphicSpec);
  const before = s.getState(), bytes = serializeProgram(before.program); let calls = 0;
  for (const payload of [{}, { scalePx: 0 }, { scalePx: Infinity }, { translatePx: [1] }, { centerDeg: [0, 0] },
    { rotateDeg: [0, 0] }, { type: "mercator" }, { fit: { width: 400, height: 300 } }, { zoom: 2 }, { get scalePx() { calls++; return 2; } }]) {
    assert.throws(() => s.dispatch({ ...move(payload), target: { childPath: ["left"], id: "map" } }));
  }
  assert.throws(() => s.dispatch({ ...move({ scalePx: 2 }), target: { childPath: ["left"], id: "places" } }));
  assert.equal(calls, 0); assert.equal(s.getState().program, before.program); assert.equal(s.getState().revision, before.revision);
  assert.equal(serializeProgram(before.program), bytes); s.destroy();
  const b = createInteractionSession({ program: basic().createCanvas(), bindings: [] });
  assert.throws(() => b.dispatch(move({ scalePx: 2 })), /editProjection/); b.destroy();
});

test("prepared native camera updates preserve geographic label and screen annotation lineage through history", async () => {
  const p = make().createMarkLabels({source:"places",field:"name"})
    .createAnnotation({id:"note",space:"screen",x:12,y:18,text:"Fixed"});
  const source = serializeProgram(p), s = createInteractionSession({program:p,bindings:[]});
  const label = getMarkItems(p,{target:"places-labels"})[0], note = getMarkItems(p,{target:"note"})[0];
  assert.deepEqual(p.graphicSpec.objects.note.items[0].identity.lineage,{kind:"screen"});
  assert.equal(p.graphicSpec.objects['places-labels'].items[0].identity.lineage.resource.kind,"geometry");
  s.updateProgram(({program})=>program.navigateProjection({target:"map",operation:{type:"pan",deltaPx:[30,-10]}}),{history:"record"});
  assert.equal((await s.whenSettled()).status,"settled");
  const q = s.getState().program, moved = getMarkItems(q,{target:"places-labels"})[0];
  assert.equal(moved.key,label.key);assert.deepEqual(moved.rows,[]);
  assert.deepEqual(q.graphicSpec.objects['places-labels'].items.map(item=>[item.properties.x,item.properties.y]),[[110,80]]);
  assert.deepEqual(q.graphicSpec.objects.note,p.graphicSpec.objects.note);assert.equal(getMarkItems(q,{target:"note"})[0].key,note.key);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  s.dispatch({type:"undo"});assert.equal(s.getState().program,p);s.dispatch({type:"redo"});assert.equal(s.getState().program,q);
  assert.equal(serializeProgram(p),source);s.destroy();
});

test("scoped camera edits retain mixed Text identities and the untouched nested sibling", () => {
  const child=make().createMarkLabels({source:"places",field:"name"}).createAnnotation({id:"note",space:"screen",x:10,y:20,text:"Local"});
  const p=hconcat({programs:[{id:"left",program:child},{id:"right",program:child}]}),s=createInteractionSession({program:p,bindings:[]});
  const before=getMarkItems(p,{target:{childPath:["left"],id:"places-labels"}})[0];
  s.dispatch({...move({translatePx:[5,6]}),target:{childPath:["left"],id:"map"}});
  const q=s.getState().program;
  assert.equal(q.children.right,p.children.right);assert.deepEqual(q.children.left.graphicSpec.objects.note,child.graphicSpec.objects.note);
  assert.equal(getMarkItems(q,{target:{childPath:["left"],id:"places-labels"}})[0].key,before.key);
  assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
  assert.deepEqual(getMarkItems(q,{target:{childPath:["left"],id:"note"}})[0].rows,[]);s.destroy();
});

const camera = (operation, target = "map", transactionId) => ({ type: "setViewport", target, payload: { operation }, ...(transactionId ? { transactionId } : {}) });
const tick = () => new Promise(resolve => setImmediate(resolve));

test("camera commands preserve an explicit inverse anchor and create one native history transaction", () => {
  const p=make().createMarkLabels({source:"places",field:"name"}), bytes=serializeProgram(p);
  const s=createInteractionSession({program:p,bindings:[]}),events=[];s.subscribe(event=>events.push(event));
  const pan={type:"pan",deltaPx:[20,-10]},zoom={type:"zoom",anchorPx:[100,80],factor:2,scaleExtent:[0.5,4]};
  s.dispatch(camera(pan,"map","pan"));assert.deepEqual([circle(s.getState()).x,circle(s.getState()).y],[100,80]);
  const first=s.getState().program; s.dispatch(camera(zoom,"map","zoom"));
  assert.deepEqual([circle(s.getState()).x,circle(s.getState()).y],[100,80]);
  assert.deepEqual(s.getState().program.graphicSpec,p.navigateProjection({target:"map",operation:pan}).navigateProjection({target:"map",operation:zoom}).graphicSpec);
  assert.equal(s.getState().history.undoCount,2);assert.equal(s.getState().revision,2);
  assert.deepEqual(events.map(e=>[e.type,e.phase,e.transactionId]),[["setViewport","commit","pan"],["setViewport","settled","pan"],["setViewport","commit","zoom"],["setViewport","settled","zoom"]]);
  assert.deepEqual(events.at(-1).affectedOwners,[{id:"map",childPath:[]}]);
  assert.deepEqual(s.getState().program.graphicSpec.objects['places-labels'].items.map(x=>[x.properties.x,x.properties.y]),[[100,80]]);
  const final=s.getState().program;s.dispatch({type:"undo"});assert.equal(s.getState().program,first);
  s.dispatch({type:"redo"});assert.equal(s.getState().program,final);
  assert.deepEqual(deserializeProgram(serializeProgram(final)).graphicSpec,final.graphicSpec);
  assert.equal(serializeProgram(p),bytes);s.destroy();
});

test("pinch, fitted resize, rotate and explicit reset share the native camera owner", async () => {
  const {getProjectionView}=await import('../../src/inspection.js');
  const p=make(),s=createInteractionSession({program:p,bindings:[]});
  const initial=getProjectionView(p,{target:"map"}).parameters;
  s.dispatch(camera({type:"pinch",fromPx:[[60,90],[100,90]],toPx:[[50,100],[130,100]],scaleExtent:[0.5,4]}));
  assert.deepEqual([circle(s.getState()).x,circle(s.getState()).y],[90,100]);
  s.dispatch(camera({type:"reset",initial}));assert.deepEqual(s.getState().program.graphicSpec,p.graphicSpec);
  const fit={type:"fit",fit:{geometry:"places",width:400,height:300,pointScale:2}};
  s.dispatch(camera(fit));assert.deepEqual([circle(s.getState()).x,circle(s.getState()).y],[200,150]);
  const resize={type:"resize",canvas:{width:800,height:600},scaling:"fit"};
  const fitted=s.getState().program;s.dispatch(camera(resize));
  assert.deepEqual(s.getState().program.graphicSpec,fitted.navigateProjection({target:"map",operation:resize}).graphicSpec);
  assert.deepEqual([circle(s.getState()).x,circle(s.getState()).y],[400,300]);
  assert.equal(s.getState().history.undoCount,4);s.destroy();
  const globe=chart().createCanvas({width:400,height:300,margin:0})
    .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:'id',values:{...geometry,geometry:{type:'Point',coordinates:[0,0]}}})
    .createProjection({id:'map',type:'equirectangular',scalePx:180/Math.PI,translatePx:[100,100]})
    .createCoordinate({type:'geo'}).createGeoPointMark({id:'world',geometry:'world'});
  const g=createInteractionSession({program:globe,bindings:[]});g.dispatch(camera({type:'rotate',rotateDeg:[10,0,0]}));
  assert.ok(Math.abs(circle(g.getState()).x-110)<1e-10);assert.equal(circle(g.getState()).y,100);g.destroy();
});

test("camera operation scope is explicit and mixed, unknown or unsafe inputs preserve the full snapshot", () => {
  const child=make(),p=hconcat({programs:[{id:'left',program:child},{id:'right',program:child}]}),s=createInteractionSession({program:p,bindings:[]});
  const target={childPath:['left'],id:'map'};s.dispatch(camera({type:'pan',deltaPx:[5,6]},target));
  assert.equal(s.getState().program.children.right,child);
  assert.deepEqual(s.getState().program.children.left.graphicSpec,child.navigateProjection({target:'map',operation:{type:'pan',deltaPx:[5,6]}}).graphicSpec);
  const before=s.getState(),bytes=serializeProgram(before.program);let reads=0;
  for(const payload of [{operation:{type:'pan',deltaPx:[1,2]},scalePx:2},{operation:{type:'pan',deltaPx:[1,2]},target:'map'},
    {operation:null},{operation:{type:'pan',deltaPx:[Infinity,2]}},{operation:{type:'zoom',anchorPx:[1,2],factor:2}},
    {operation:{type:'pan',deltaPx:[1,2],extra:true}},{operation:{get type(){reads++;return 'pan'},deltaPx:[1,2]}}]) {
    assert.throws(()=>s.dispatch({type:'setViewport',target,payload}));
    assert.equal(s.getState().program,before.program);assert.equal(s.getState().scene,before.scene);
    assert.equal(s.getState().revision,before.revision);assert.deepEqual(s.getState().history,before.history);
  }
  for(const owner of ['map',{childPath:['missing'],id:'map'},{childPath:['left']},{childPath:['left'],id:'places'}])assert.throws(()=>s.dispatch(camera({type:'pan',deltaPx:[1,2]},owner)));
  assert.equal(reads,0);assert.equal(serializeProgram(before.program),bytes);s.destroy();
  const b=createInteractionSession({program:basic().createCanvas(),bindings:[]});
  assert.throws(()=>b.dispatch(camera({type:'pan',deltaPx:[1,2]})),/navigateProjection/);b.destroy();
});

test("camera preparation cancellation and failure leave program, current frame, history and native trace together", async () => {
  const p=make(),calls=[],released=[],events=[];
  const s=createInteractionSession({program:p,bindings:[],assetResolver:request=>new Promise((resolve,reject)=>calls.push({request,resolve,reject}))});
  const lease=id=>({dispose(){released.push(id)}});s.subscribe(event=>events.push(event));
  await tick();calls[0].resolve(lease('initial'));await s.whenSettled();const baseline=s.getState();
  s.dispatch(camera({type:'pan',deltaPx:[20,30]},'map','cancel'));const cancelled=s.whenSettled();await tick();
  assert.equal(s.getState().program,p);assert.equal(s.getState().scene,baseline.scene);assert.equal(s.getState().history.undoCount,0);
  assert.deepEqual(calls[1].request.resourceRevisionVector.filter(r=>r.kind==='projection'),[{kind:'projection',id:'map',revision:1,childPath:[]}]);
  s.dispatch({type:'undo'});assert.equal((await cancelled).status,'cancelled');assert.equal(calls[1].request.signal.aborted,true);
  calls[1].resolve(lease('late'));await tick();assert.deepEqual(released,['late']);
  assert.equal(s.getState().program,p);assert.equal(s.getState().scene,baseline.scene);assert.equal(s.getState().revision,0);
  s.dispatch(camera({type:'zoom',anchorPx:[80,90],factor:2,scaleExtent:[0.5,4]},'map','fail'));await tick();
  calls[2].reject(new Error('offline asset'));assert.equal((await s.whenSettled()).status,'error');
  assert.equal(s.getState().program,p);assert.equal(s.getState().scene,baseline.scene);assert.equal(s.getState().history.undoCount,0);
  s.dispatch(camera({type:'pan',deltaPx:[20,30]},'map','success'));await tick();calls[3].resolve(lease('moved'));await s.whenSettled();
  assert.deepEqual([circle(s.getState()).x,circle(s.getState()).y],[100,120]);assert.equal(s.getState().history.undoCount,1);
  assert.deepEqual(events.filter(e=>e.type==='setViewport').map(e=>[e.transactionId,e.phase]),[['cancel','cancel'],['fail','error'],['success','commit'],['success','settled']]);
  assert.deepEqual(released,['late','initial']);s.destroy();assert.deepEqual(released,['late','initial','moved']);
});
