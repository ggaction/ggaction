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
    const autoProgram=make(chart).selectMarks({id:'picked',target:'points',items:[]}).highlightMarks({selection:'picked',color:'red',dimOthers:false,bringToFront:false});
    const automatic=createInteractionSession({program:autoProgram,bindings:[{type:'select',target:'points',selection:'picked',mode:'toggle'}]}), clicks=new Map();
    const host={getBoundingClientRect:()=>({left:10,top:20,width:200,height:160}),addEventListener:(event,listener)=>clicks.set(event,listener),removeEventListener:event=>clicks.delete(event)};
    automatic.mount(host);clicks.get('click')({clientX:60,clientY:80});
    assert.equal(getMarkItems(automatic.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').length,1);
    clicks.get('click')({clientX:60,clientY:80});assert.equal(getMarkItems(automatic.getState().program,{target:'points'}).filter(item=>item.properties.fill==='red').length,0);
    automatic.destroy();assert.equal(clicks.size,0);
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
