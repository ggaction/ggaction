import assert from "node:assert/strict";
import { chart, hconcat } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { createInteractionSession } from "ggaction/interaction";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
const make = factory => factory().createCanvas({ width: 200, height: 160, margin: 0 })
  .createData({ id: "rows", values: [{ x: 50, y: 60 }, { x: 50, y: 60 }] })
  .createPointMark({ id: "points" }).encodePointRadius({ value: 8 })
  .encodeX({ field: "x", scale: { domain: [0, 200], range: [0, 200] } })
  .encodeY({ field: "y", scale: { domain: [0, 160], range: [0, 160] } });
export const cases = [
  { id: "interaction/geographic-context", run() {
    const p = chart().createCanvas({ width: 300, height: 200, margin: 0 })
      .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
        type: "Feature", id: 1, properties: { name: "Place" }, geometry: { type: "Point", coordinates: [80, 90] }
      } }).createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
      .createGeoPointMark({ id: "places", geometry: "places", radiusPx: 8 })
      .selectMarks({ id: "picked", target: "places", items: [] });
    const s = createInteractionSession({ program: p, bindings: [] });
    s.dispatch({ type: "contextMenu", point: { x: 80, y: 90 }, slop: 0 });
    const hit = s.getState().hit.target; assert.equal(hit.ownerId, "places");
    assert.deepEqual(hit.resourceRefs, [{ kind: "geometry", id: "places", revision: 0 }]);
    assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0);
    s.dispatch({ type: "select", target: "places", payload: { id: "picked", select: { items: [hit.itemKey] } } });
    const selected = s.getState().program.highlightMarks({ selection: "picked", color: "gold", dimOthers: false, bringToFront: false });
    const loaded = deserializeProgram(serializeProgram(selected));
    assert.deepEqual(getMarkItems(loaded, { target: "places" }).filter(item => item.properties.fill === "gold").map(item => item.fields.name), ["Place"]);
    s.destroy();
  } },
  { id: "interaction/partition-host-focus", run() {
    const rows = [{ id: "root", parent: null }, { id: 1, parent: "root" }, { id: "1", parent: 1, value: 2 }, { id: "other", parent: "root", value: 4 }];
    const p = chart().createCanvas({ width: 500, height: 350 }).createData({ id: "rows", values: rows, keyField: "id" })
      .createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "value" })
      .layoutHierarchy({ id: "layout", method: "partition" }).createPartitionPlot({ id: "partition" });
    const source = serializeProgram(p), session = createInteractionSession({ program: p, bindings: [] }), events = [];
    session.subscribe(event => events.push(event));
    session.dispatch({ type: "focusHierarchy", target: "partition", payload: { focus: { key: 1 } } });
    const focused = deserializeProgram(serializeProgram(session.getState().program));
    assert.deepEqual(getMarkItems(focused, { target: "partition" }).filter(item => item.visible).map(item => item.fields.id), [1, "1"]);
    assert.deepEqual(focused.graphicSpec, p.editPartitionPlot({ target: "partition", focus: { key: 1 } }).graphicSpec);
    session.dispatch({ type: "focusHierarchy", target: "partition", payload: { focus: null } });
    assert.deepEqual(getMarkItems(session.getState().program, { target: "partition" }).filter(item => item.visible).map(item => item.fields.id), rows.map(row => row.id));
    assert.deepEqual(events.map(event => event.phase), ["commit", "settled", "commit", "settled"]);
    assert.equal(serializeProgram(p), source); session.destroy();
    const unsupported = createInteractionSession({ program: basic().createCanvas(), bindings: [] });
    assert.throws(() => unsupported.dispatch({ type: "focusHierarchy", target: "partition", payload: { focus: null } }), /editPartitionPlot/); unsupported.destroy();
  } },
  { id: "interaction/context-host-request", run() {
    for (const factory of [chart, basic]) {
      const p = make(factory), original = serializeProgram(p), events = [], listeners = new Map();
      const s = createInteractionSession({ program: p, bindings: [{ type: "contextMenu" }] });
      s.subscribe(event => events.push(event));
      const release = s.mount({ getBoundingClientRect: () => ({ left: 10, top: 20, width: 200, height: 160 }),
        addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) });
      let prevented = false;
      listeners.get("contextmenu")({ clientX: 60, clientY: 80, preventDefault() { prevented = true; } });
      assert.equal(prevented, true); assert.equal(events.at(-1).type, "contextMenu");
      assert.equal(s.getState().hit.candidates.length, 2); assert.equal(s.getState().hit.target.ownerId, "points");
      assert.equal(s.getState().program, p); assert.equal(s.getState().revision, 0); assert.equal(serializeProgram(p), original);
      assert.equal(release(), true); assert.equal(listeners.size, 0); s.destroy();
    }
  } },
  { id: "interaction/legend-visibility-filter-composition", run() {
    const p = chart().createCanvas({ width: 500, height: 350, margin: 100 }).createData({ id: "rows", keyField: "id", values: [
      { id: "a", x: 1, y: 2, category: 1 }, { id: "b", x: 2, y: 20, category: "1" }, { id: "c", x: 3, y: 4, category: 1 }
    ] }).createScatterPlot({ id: "points", x: "x", y: "y", color: "category", guides: false }).createLegend({ channels: ["color"] })
      .filterMarks({ target: "points", field: "x", op: "lte", value: 2 });
    const session = createInteractionSession({ program: p, bindings: [{ type: "legend", effect: "visibility", target: "points", channel: "color", scaleDomain: "all-data" }] });
    session.dispatch({ type: "setVisibility", target: "points", payload: { channel: "color", values: ["1"], visible: false, scaleDomain: "all-data" } });
    const q = deserializeProgram(serializeProgram(session.getState().program));
    assert.deepEqual(getMarkItems(q, { target: "points" }).map(item => item.fields.id), ["a"]);
    assert.deepEqual(q.resolvedScales.y.domain, [2, 20]); assert.deepEqual(q.guideConfigs.legend.color.domain, [1, "1"]);
    assert.deepEqual(getMarkItems(q.removeMarkVisibility(), { target: "points" }).map(item => item.fields.id), ["a", "b"]);
    assert.deepEqual(getMarkItems(q.removeMarkFilter(), { target: "points" }).map(item => item.fields.id), ["a", "c"]);
    session.dispatch({ type: "setVisibility", target: "points", payload: { clear: true } });
    assert.deepEqual(getMarkItems(session.getState().program, { target: "points" }).map(item => item.fields.id), ["a", "b"]);
    assert.equal(typeof basic().setMarkVisibility, "undefined"); session.destroy();
  } },
  { id: "interaction/full-basic-immutable-inspection", run() {
    for (const factory of [chart, basic]) {
      const p = make(factory), original = serializeProgram(p), session = createInteractionSession({ program: p });
      assert.deepEqual(session.dispatch({ type: "inspect", point: { x: 50, y: 60 } }), { status: "applied" });
      assert.throws(() => createInteractionSession({ program: p, bindings: [{ type: "inspect", events: null }] }), /array/);
      const hit = session.getState().hit;
      if (factory === chart) {
        const events = [], stop = session.subscribe(event => { if ('phase' in event) events.push(event); });
        session.dispatch({ type: 'select', target: 'points', payload: { id: 'picked', select: { items: [hit.target.itemKey] } }, transactionId: 'pick' });
        const selected = session.getState().program.highlightMarks({ selection: 'picked', color: 'red', bringToFront: false, dimOthers: false });
        session.updateProgram(deserializeProgram(serializeProgram(selected)));
        assert.equal(getMarkItems(session.getState().program, {target:'points'}).filter(i=>i.properties.fill==='red').length,1);
        session.dispatch({type:'clearSelection',target:'points',payload:{id:'picked'}});
        assert.equal(getMarkItems(session.getState().program, {target:'points'}).filter(i=>i.properties.fill==='red').length,0);
        assert.deepEqual(events.map(e=>e.phase),['commit','settled','commit','settled']);
        assert.equal(events[0].previous,p); assert.equal(events[0].transactionId,'pick');
        const firstKey=getMarkItems(session.getState().program,{target:'points'}).map(item=>item.key).sort()[0];
        for(const nearest of [{space:'screen',point:{x:63,y:60},maxDistance:6},{space:'data',fields:['x','y'],values:[50,60],metric:'euclidean',maxDistance:0}]) {
          session.dispatch({type:'select',target:'points',payload:{id:'picked',nearest}});
          assert.deepEqual(getMarkItems(session.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').map(item=>item.key),[firstKey]);
        }
        session.dispatch({type:'filter',target:'points',payload:{select:{items:[firstKey]}}});
        assert.equal(getMarkItems(session.getState().program,{target:'points'}).length,1);
        session.dispatch({type:'filter',target:'points',payload:{clear:true}});
        assert.equal(getMarkItems(session.getState().program,{target:'points'}).length,2);
        const controls=createInteractionSession({program:chart().createCanvas().createData({values:[{g:'A',v:2},{g:'B',v:5}]}).createBarPlot({id:'bars',x:'g',y:'v',guides:false}),bindings:[]});
        controls.dispatch({type:'reorder',target:'bars',payload:{channel:'x',values:['B','A']}});
        assert.deepEqual(controls.getState().program.resolvedScales.x.domain,['B','A']);
        assert.deepEqual(deserializeProgram(serializeProgram(controls.getState().program)).graphicSpec,controls.getState().program.graphicSpec);
        controls.dispatch({type:'filter',target:'bars',payload:{select:{field:'g',op:'eq',value:'B'}}});
        assert.deepEqual(controls.getState().program.resolvedScales.x.domain,['B']);
        assert.deepEqual(deserializeProgram(serializeProgram(controls.getState().program)).graphicSpec,controls.getState().program.graphicSpec);
        controls.dispatch({type:'filter',target:'bars',payload:{clear:true}});
        assert.deepEqual(controls.getState().program.resolvedScales.x.domain,['B','A']);
        controls.dispatch({type:'reorder',target:'bars',payload:{channel:'x',clear:true}});
        assert.deepEqual(controls.getState().program.resolvedScales.x.domain,['A','B']);controls.destroy();
        stop();
        for (const selectionPolicy of ['keep-hidden','drop']) {
          const original=session.getState().program, lifecycle=createInteractionSession({program:original,selectionPolicy,bindings:[]}), events=[];
          lifecycle.subscribe(event=>events.push(event));
          lifecycle.updateProgram(original.filterMarks({target:'points',field:'x',op:'gt',value:100}));
          assert.equal(events[0].selectionChanges[0][selectionPolicy==='drop'?'droppedKeys':'hiddenKeys'].length,1);
          const current=deserializeProgram(serializeProgram(lifecycle.getState().program)).removeMarkFilter({target:'points'});
          lifecycle.updateProgram(current);
          assert.equal(getMarkItems(lifecycle.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').length,selectionPolicy==='drop'?0:1);
          lifecycle.destroy();
        }
      } else assert.throws(()=>session.dispatch({type:'select',target:'points',payload:{id:'picked',select:{items:[]}}}),/does not support/);

      assert.equal(hit.candidates.length, 2); assert.equal(hit.target.role, "point");
      assert.equal(new Set(hit.candidates.map(item => item.itemKey)).size, 2);
      assert.deepEqual(hit.target.localPoint, { x: 50, y: 60 });
      assert.ok(Object.isFrozen(hit.target)); assert.equal(serializeProgram(p), original);
      session.dispatch({ type: "leave" }); assert.equal(session.getState().hit, null);
      assert.equal(session.destroy(), true); assert.equal(session.destroy(), false);
      assert.throws(() => session.dispatch({ type: "leave" }), /disposed/);
    }
  } },
  { id: "interaction/current-frame-and-restored-program", run() {
    const child=make(chart).selectMarks({id:'picked',target:'points',items:[]}).highlightMarks({selection:'picked',color:'red',bringToFront:false,dimOthers:false});
    const joined=hconcat({programs:[{id:'left',program:child},{id:'right',program:child}]});
    const linked=createInteractionSession({program:deserializeProgram(serializeProgram(joined)),bindings:[{type:'linkSelection',id:'rows',target:{childPath:['right'],id:'points'},selection:'picked',resolve:'global',sources:[{target:{childPath:['left'],id:'points'},selection:'picked',projection:{type:'rows',sourceData:'rows',targetData:'rows'}}]}]});
    const first=getMarkItems(linked.getState().program,{target:{childPath:['left'],id:'points'}})[0].key;
    linked.dispatch({type:'select',target:{childPath:['left'],id:'points'},payload:{id:'picked',select:{items:[first]}}});
    assert.equal(getMarkItems(linked.getState().program.children.right,{target:'points'}).filter(item=>item.properties.fill==='red').length,1);
    assert.equal(linked.getState().linkedSelections[0].keys.length,1);
    linked.dispatch({type:'clearSelection',target:{childPath:['left'],id:'points'},payload:{id:'picked'}});
    assert.equal(linked.getState().linkedSelections[0].keys.length,0);linked.destroy();
    const filtered = createInteractionSession({ program: joined, bindings: [{type:'linkFilter',id:'filterRows',target:{childPath:['right'],id:'points'},selection:'picked',resolve:'global',sources:[{target:{childPath:['left'],id:'points'},selection:'picked',projection:{type:'rows',sourceData:'rows',targetData:'rows'}}]}] });
    for (const select of [{items:[first]}, {items:[]}, {items:[],empty:'all'}]) {
      filtered.dispatch({type:'select',target:{childPath:['left'],id:'points'},payload:{id:'picked',select}});
      const current=deserializeProgram(serializeProgram(filtered.getState().program));
      assert.equal(getMarkItems(current.children.right,{target:'points'}).length,select.empty==='all'?2:select.items.length);
    }
    assert.equal(filtered.getState().linkedSelections[0].effect,'filter');
    const accepted=filtered.getState().program;
    assert.throws(()=>filtered.dispatch({type:'filter',target:{childPath:['right'],id:'points'},payload:{clear:true}}),/owned by its binding/);
    assert.equal(filtered.getState().program,accepted);filtered.destroy();
    const p = make(chart), session = createInteractionSession({ program: p }), state = session.getState();
    const scene = structuredClone(state.scene);
    for (const node of scene.nodes.filter(node => node.type === "circle")) node.properties.x += 30;
    assert.equal(session.dispatch({ type: "frame", scene, version: 1, generation: 0 }).status, "applied");
    scene.nodes.length = 0;
    session.dispatch({ type: "inspect", point: { x: 50, y: 60 } }); assert.equal(session.getState().hit.target, null);
    session.dispatch({ type: "inspect", point: { x: 80, y: 60 } }); assert.equal(session.getState().hit.candidates.length, 2);
    assert.equal(session.dispatch({ type: "frame", scene: null, version: 1, generation: 0 }).status, "stale");
    session.updateProgram(deserializeProgram(serializeProgram(p)));
    assert.equal(session.getState().generation, 1); assert.equal(session.getState().frameVersion, 2);
    assert.equal(session.dispatch({ type: "frame", scene: null, version: 10, generation: 0 }).status, "stale");
    session.dispatch({ type: "inspect", point: { x: 50, y: 60 } }); assert.equal(session.getState().hit.candidates.length, 2);
    session.destroy();
  } },
  { id: "interaction/guide-and-host-cleanup", run() {
    {
      const p=chart().createCanvas({width:500,height:350,margin:100}).createData({values:[{id:'a',x:1,y:2,c:1},{id:'b',x:2,y:3,c:'1'},{id:'c',x:3,y:4,c:1}],keyField:'id'})
        .createPointMark({id:'points'}).encodeX({field:'x'}).encodeY({field:'y'}).encodeColor({field:'c'}).createLegend({channels:['color']})
        .selectMarks({id:'picked',target:'points',items:[]}).highlightMarks({selection:'picked',color:'red',dimOthers:false,bringToFront:false});
      const session=createInteractionSession({program:p,bindings:[{type:'legend',effect:'selection',target:'points',channel:'color',selection:'picked'}]}), callbacks=new Map();
      session.mount({getBoundingClientRect:()=>({left:0,top:0,width:500,height:350}),addEventListener:(type,fn)=>callbacks.set(type,fn),removeEventListener:type=>callbacks.delete(type)});
      const symbol=session.getState().scene.nodes.find(n=>n.type==='rect'&&n.properties.width===14&&n.properties.height===12);
      const point={clientX:symbol.offset[0]+symbol.properties.x+7,clientY:symbol.offset[1]+symbol.properties.y+6};callbacks.get('click')(point);
      const restored=deserializeProgram(serializeProgram(session.getState().program));
      assert.deepEqual(getMarkItems(restored,{target:'points'}).filter(item=>item.properties.fill==='red').map(item=>item.fields.id),['a','c']);
      callbacks.get('click')(point);assert.deepEqual(getMarkItems(session.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red'),[]);
      session.destroy();assert.equal(callbacks.size,0);
    }

    const autoProgram=make(chart).selectMarks({id:'picked',target:'points',items:[]}).highlightMarks({selection:'picked',color:'red',dimOthers:false,bringToFront:false});
    assert.throws(() => autoProgram.editMarkSelection({ selection: 'picked', region: { x: { ranges: [{min:0,max:1},{min:1,max:2}] } } }), /non-overlapping/);
    const automatic=createInteractionSession({program:autoProgram,bindings:[{type:'select',target:'points',selection:'picked',mode:'toggle'}]}), clicks=new Map();
    const host={getBoundingClientRect:()=>({left:10,top:20,width:200,height:160}),addEventListener:(event,listener)=>clicks.set(event,listener),removeEventListener:(event,listener)=>{if(clicks.get(event)===listener)clicks.delete(event)}};
    automatic.mount(host);clicks.get('click')({clientX:60,clientY:80});
    assert.equal(getMarkItems(automatic.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').length,1);
    clicks.get('click')({clientX:60,clientY:80});assert.equal(getMarkItems(automatic.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').length,0);
    const captures=new Set();host.setPointerCapture=id=>captures.add(id);host.releasePointerCapture=id=>captures.delete(id);host.hasPointerCapture=id=>captures.has(id);
    automatic.mount(host);const phases=[];automatic.subscribe(event=>{if(event.phase)phases.push(event.phase)});
    const pointer={clientX:60,clientY:80,pointerId:1,pointerType:'mouse',button:0};
    clicks.get('pointerdown')(pointer);assert.equal(captures.size,1);clicks.get('pointerup')(pointer);clicks.get('click')({...pointer,detail:1});
    assert.deepEqual(phases,['commit','settled']);assert.equal(getMarkItems(automatic.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').length,1);
    const accepted=automatic.getState().program;clicks.get('pointerdown')(pointer);clicks.get('keydown')({key:'Escape'});clicks.get('pointerup')(pointer);clicks.get('click')({...pointer,detail:1});
    assert.equal(automatic.getState().program,accepted);assert.equal(phases.at(-1),'cancel');assert.equal(captures.size,0);
    automatic.destroy();assert.equal(clicks.size,0);
    {
      const angular = chart().createCanvas({width:200,height:160,margin:0}).createData({values:[{id:'a',angle:355,radius:1},{id:'b',angle:180,radius:1},{id:'c',angle:5,radius:1}],keyField:'id'})
        .createPolarScatterPlot({id:'points',theta:{field:'angle',scale:{domain:[0,360]}},radius:{field:'radius',scale:{domain:[0,2]}},guides:false})
        .selectMarks({id:'picked',target:'points',items:[]}).highlightMarks({selection:'picked',color:'red',bringToFront:false,dimOthers:false});
      const session=createInteractionSession({program:angular,bindings:[{type:'brush',axis:'theta',target:'points',selection:'picked'}]}), pending=new Map();let frameId=0;
      host.requestAnimationFrame=fn=>{pending.set(++frameId,fn);return frameId;};host.cancelAnimationFrame=id=>pending.delete(id);session.mount(host);
      const pointer=angle=>({pointerId:1,pointerType:'mouse',clientX:110+64*Math.sin(angle*Math.PI/180),clientY:100-64*Math.cos(angle*Math.PI/180)});
      clicks.get('pointerdown')(pointer(350));clicks.get('pointermove')(pointer(10));const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn());
      assert.equal(session.getState().program,angular);assert.ok(session.getState().previewProgram);clicks.get('pointerup')(pointer(10));
      const restored=deserializeProgram(serializeProgram(session.getState().program));
      assert.deepEqual(getMarkItems(restored,{target:'points'}).filter(item=>item.properties.fill==='red').map(item=>item.fields.id),['a','c']);
      assert.equal(restored.semanticSpec.resources.find(resource=>resource.id==='picked').options.predicate.screenAngles.length,2);
      assert.equal(captures.size,0);assert.equal(pending.size,0);session.destroy();assert.equal(clicks.size,0);
    }
    for (const type of ["brush", "lasso"]) {
      const source = autoProgram, session = createInteractionSession({ program: source, bindings: [{ type, target: "points", selection: "picked" }] });
      const pending = new Map(); let frameId = 0;
      host.requestAnimationFrame = fn => { pending.set(++frameId, fn); return frameId; };
      host.cancelAnimationFrame = id => pending.delete(id);
      session.mount(host); const phases = []; session.subscribe(event => { if (event.phase) phases.push(event.phase); });
      const pointer = (x, y) => ({ pointerId: 1, pointerType: "mouse", button: 0, clientX: x + 10, clientY: y + 20 });
      clicks.get("pointerdown")(pointer(20, 20));
      clicks.get("pointermove")(pointer(90, 20)); clicks.get("pointermove")(pointer(90, 100));
      if (type === "lasso") clicks.get("pointermove")(pointer(20, 100));
      assert.equal(pending.size, 1); const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn());
      assert.equal(session.getState().program, source); assert.equal(session.getState().revision, 0);
      assert.equal(getMarkItems(session.getState().previewProgram, { target: "points" }).filter(item => item.properties.fill === "red").length, 2);
      clicks.get("pointerup")(pointer(type === "brush" ? 90 : 20, 100));
      assert.deepEqual(phases, ["preview", "preview", "commit", "settled"]); assert.equal(session.getState().revision, 1);
      assert.equal(session.getState().previewProgram, null); assert.equal(captures.size, 0); assert.equal(pending.size, 0);
      const restored = deserializeProgram(serializeProgram(session.getState().program));
      assert.equal(getMarkItems(restored, { target: "points" }).filter(item => item.properties.fill === "red").length, 2);
      if (type === "lasso") assert.equal(restored.semanticSpec.resources.find(resource => resource.id === "picked").options.screenPolygon.length, 4);
      session.destroy(); assert.equal(clicks.size, 0);
    }
    const calendarRows = [{id:'a',day:'2024-02-28',value:2},{id:'b',day:'2024-02-29',value:3},{id:'c',day:'2024-02-29',value:4}];
    const calendar = chart().createCanvas({width:300,height:200,margin:10}).createData({id:'days',keyField:'id',values:calendarRows})
      .createCalendarLayout({date:'day',value:'value',start:'2024-02-28',end:'2024-02-29',timeZone:'UTC',weekStartsOn:1,aggregate:'sum',missing:'omit'})
      .createCalendarPlot({color:false,labels:false}).selectMarks({id:'picked',target:'calendar',items:[]})
      .highlightMarks({selection:'picked',fill:'red',bringToFront:false,dimOthers:false});
    const calendarSession = createInteractionSession({program:calendar,bindings:[{type:'lasso',target:'calendar',selection:'picked'}]});
    const pendingCalendar = new Map();let sequence=0;host.requestAnimationFrame=fn=>(pendingCalendar.set(++sequence,fn),sequence);host.cancelAnimationFrame=id=>pendingCalendar.delete(id);
    calendarSession.mount(host);
    const cell = getMarkItems(calendar,{target:'calendar'}).at(-1), {x,y,width,height}=cell.geometry[0].properties;
    const polygon = [[x+.1,y+.1],[x+width-.1,y+.1],[x+width-.1,y+height-.1],[x+.1,y+height-.1]];
    const fire=(type,point)=>clicks.get(type)({pointerId:1,pointerType:'mouse',button:0,clientX:point[0]+10,clientY:point[1]+20});
    fire('pointerdown',polygon[0]);for(const point of polygon.slice(1))fire('pointermove',point);fire('pointerup',polygon[0]);
    const selectedCalendar=deserializeProgram(serializeProgram(calendarSession.getState().program));
    const day=getMarkItems(selectedCalendar,{target:'calendar'}).filter(item=>item.properties.fill==='red');
    assert.equal(day.length,1);assert.equal(day[0].fields.date,'2024-02-29');assert.equal(day[0].fields.value,7);assert.equal(day[0].rows.length,2);
    assert.equal(day[0].key,cell.key);assert.equal(calendarSession.getState().revision,1);assert.equal(pendingCalendar.size,0);
    assert.equal(getMarkItems(calendar,{target:'calendar'}).filter(item=>item.properties.fill==='red').length,0);calendarSession.destroy();assert.equal(clicks.size,0);
    const p = make(chart);
    const session = createInteractionSession({ program: p }), active = new Map();
    const element = { addEventListener(type, listener) { active.set(type, listener); },
      removeEventListener(type) { active.delete(type); }, getBoundingClientRect() { return { left: 10, top: 20, width: 200, height: 160 }; } };
    const release = session.mount(element); assert.equal(active.size, 3);
    active.get("click")({ clientX: 60, clientY: 80, pointerType: "mouse" });
    assert.equal(session.getState().hit.candidates.length, 2);
    assert.equal(release(), true); assert.equal(release(), false); assert.equal(active.size, 0);
    session.updateProgram(chart().createCanvas({ width: 200, height: 160, margin: 40 }).createTitle({ text: "Inspect" }));
    const text = session.getState().scene.nodes.find(node => node.type === "text");
    session.dispatch({ type: "inspect", point: { x: text.properties.x + text.offset[0], y: text.properties.y + text.offset[1] } });
    assert.equal(session.getState().hit.target.role, "chart-title");
    const parameterProgram=p.createParameter({id:'threshold',value:1});
    session.updateProgram(parameterProgram);
    session.dispatch({type:'setParameter',target:'threshold',payload:{value:2}});
    const edited=session.getState().program;
    assert.equal(edited.semanticSpec.resources.find(r=>r.id==='threshold').result.value,2);
    assert.throws(()=>session.dispatch({type:'setParameter',target:'threshold',payload:{value:'bad'}}));
    assert.equal(session.getState().program,edited);
    assert.equal(serializeProgram(deserializeProgram(serializeProgram(edited))),serializeProgram(edited));
    session.destroy();
  } }
];
