import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
import { documentationPrograms } from "../../scripts/doc-snippets.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url)), { dependencies: "repository" }); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
test("host buttons and keyboard commit filter and reorder to the same Canvas and SVG view", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1000, height: 700 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async () => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createInteractionSession } = await import("/src/interaction.js");
      document.body.innerHTML = '<button id="filter">Keep B</button><button id="clear">Restore rows</button><button id="order">B first</button><canvas id="controls" aria-label="Bar chart"></canvas><div id="vector"></div>';
      const program = chart().createCanvas({ width: 360, height: 240 }).createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 5 }] })
        .createBarPlot({ id: "bars", x: "category", y: "value", guides: false });
      const session = createInteractionSession({ program, bindings: [] }); window.__controlsSession = session; window.__controlsPhases = [];
      const draw = current => { render(current, document.querySelector("#controls").getContext("2d"), { pixelRatio: 2 }); document.querySelector("#vector").innerHTML = renderToSVG(current); };
      session.subscribe(event => { if (event.phase) window.__controlsPhases.push(event.phase); if (event.phase === "commit") draw(event.current); }); draw(program);
      for (const [id, command] of [["filter", { type: "filter", payload: { select: { field: "category", op: "eq", value: "B" } } }],
        ["clear", { type: "filter", payload: { clear: true } }], ["order", { type: "reorder", payload: { channel: "x", values: ["B", "A"] } }]]) {
        document.querySelector(`#${id}`).addEventListener("click", () => session.dispatch({ ...command, target: "bars", origin: "user" }));
      }
    });
    await page.getByRole("button", { name: "Keep B" }).click();
    assert.deepEqual(await page.evaluate(async () => {
      const { getMarkItems } = await import("/src/inspection.js"); return getMarkItems(window.__controlsSession.getState().program, { target: "bars" }).map(item => item.fields.category);
    }), ["B"]);
    await page.getByRole("button", { name: "Restore rows" }).focus(); await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "B first" }).focus(); await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Keep B" }).click();
    assert.deepEqual(await page.evaluate(() => window.__controlsSession.getState().program.resolvedScales.x.domain), ["B"]);
    await page.getByRole("button", { name: "Restore rows" }).focus(); await page.keyboard.press("Enter");
    const result = await page.evaluate(async () => {
      const { getMarkItems } = await import("/src/inspection.js"); const state = window.__controlsSession.getState();
      const items = getMarkItems(state.program, { target: "bars" });
      const centers = items.map(item => ({ category: item.fields.category, x: item.geometry[0].properties.x }));
      return { domain: state.program.resolvedScales.x.domain, phases: window.__controlsPhases, revision: state.revision,
        focus: document.activeElement.id, centers, canvas: [document.querySelector("#controls").width, document.querySelector("#controls").height], svg: document.querySelector("#vector svg") !== null };
    });
    assert.deepEqual(result.domain, ["B", "A"]); assert.equal(result.revision, 5); assert.equal(result.focus, "clear");
    assert.deepEqual(result.phases, Array.from({ length: 5 }, () => ["commit", "settled"]).flat());
    assert.ok(result.centers.find(item => item.category === "B").x < result.centers.find(item => item.category === "A").x);
    assert.deepEqual(result.canvas, [720, 480]); assert.equal(result.svg, true);
    await page.evaluate(() => window.__controlsSession.destroy()); assertNoBrowserErrors(errors, "direct interaction controls"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});
for (const ratio of [1, 2, 3]) test(`real Canvas and SVG pointer events share CSS targets at DPR ${ratio}`, async () => {
  const context = await browser.newContext({ deviceScaleFactor: ratio, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => document.querySelector("#status")?.textContent === "Canvas and SVG inspection ready" });
    const hits = [];
    for (const [index, selector] of ["#chart", "#vector svg"].entries()) {
      const box = await page.locator(selector).boundingBox();
      await page.mouse.move(box.x + 126, box.y + 182);
      const result = await page.evaluate(index => window.__inspectionSessions[index].getState().hit, index);
      assert.equal(result.candidates.length, 2); assert.equal(result.target.ownerId, "observations");
      assert.deepEqual(result.target.screenPoint, { x: 126, y: 182 }); assert.deepEqual(result.target.localPoint, { x: 126, y: 182 });
      hits.push(result.candidates.map(candidate => candidate.itemKey));
      await page.mouse.click(box.x + 294, box.y + 118);
      assert.equal(await page.evaluate(index => window.__inspectionSessions[index].getState().hit.candidates.length, index), 1);
      await page.mouse.move(box.x + 30, box.y + 270);
      assert.equal(await page.evaluate(index => window.__inspectionSessions[index].getState().hit.target, index), null);
    }
    assert.deepEqual(hits[0], hits[1]);
    const before = await page.evaluate(() => window.__inspectionSessions[0].getState().frameVersion);
    await page.evaluate(async () => {
      const session = window.__inspectionSessions[0], state = session.getState(), scene = structuredClone(state.scene);
      for (const node of scene.nodes) if (node.type === "circle") node.properties.x += 25;
      session.dispatch({ type: "frame", scene, version: state.frameVersion + 1, generation: state.generation });
      const { renderTransitionScene } = await import("/src/scene.js");
      renderTransitionScene(session.getState().scene, document.querySelector("#chart").getContext("2d"), { pixelRatio: window.devicePixelRatio });
    });
    const box = await page.locator("#chart").boundingBox();
    await page.mouse.move(box.x + 126, box.y + 182);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit.target), null);
    await page.mouse.move(box.x + 151, box.y + 182);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit.candidates.length), 2);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit.frameVersion), before + 1);
    await page.evaluate(() => window.__inspectionSessions.forEach(session => session.destroy()));
    await page.mouse.click(box.x + 151, box.y + 182);
    assert.equal(await page.evaluate(() => window.__inspectionSessions[0].getState().hit), null);
    assertNoBrowserErrors(errors, "interaction session"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("host click commands commit and redraw the same logical selection in Canvas and SVG", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => document.querySelector("#status")?.textContent === "Canvas and SVG inspection ready" });
    await page.evaluate(async () => {
      const { render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      window.__selectionEvents = [[], []];
      for (const [index, session] of window.__inspectionSessions.entries()) {
        session.updateProgram(session.getState().program.selectMarks({ id: "picked", target: "observations", items: [] })
          .highlightMarks({ selection: "picked", color: "red", bringToFront: false, dimOthers: false }));
        const attach = element => element.addEventListener("click", () => {
          const hit = session.getState().hit?.target;
          if (hit?.ownerId === "observations") session.dispatch({ type: "select", target: hit.ownerId,
            payload: { id: "picked", mode: "toggle", select: { items: [hit.itemKey] } }, origin: "user" });
        });
        session.subscribe(event => {
          if (!event.phase) return;
          window.__selectionEvents[index].push(event.phase);
          if (event.phase !== "commit") return;
          if (index === 0) render(event.current, document.querySelector("#chart").getContext("2d"), { pixelRatio: 2 });
          else {
            document.querySelector("#vector").innerHTML = renderToSVG(event.current);
            const element = document.querySelector("#vector svg"); session.mount(element); attach(element);
          }
        });
        attach(document.querySelector(index === 0 ? "#chart" : "#vector svg"));
      }
    });
    for (const [index, selector] of ["#chart", "#vector svg"].entries()) {
      const box = await page.locator(selector).boundingBox();
      await page.mouse.click(box.x + 294, box.y + 118);
      const selected = await page.evaluate(async index => {
        const { getMarkItems } = await import("/src/inspection.js");
        return getMarkItems(window.__inspectionSessions[index].getState().program, { target: "observations" })
          .filter(item => item.properties.fill === "red").map(item => item.fields.id);
      }, index);
      assert.deepEqual(selected, ["b"]);
      assert.deepEqual(await page.evaluate(index => window.__selectionEvents[index], index), ["commit", "settled"]);
      await page.mouse.click(box.x + 294, box.y + 118);
      assert.equal(await page.evaluate(async index => {
        const { getMarkItems } = await import("/src/inspection.js");
        return getMarkItems(window.__inspectionSessions[index].getState().program, { target: "observations" }).filter(item => item.properties.fill === "red").length;
      }, index), 0);
    }
    assertNoBrowserErrors(errors, "interaction selection commands"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("one browser click commits a linked child selection and redraws Canvas and SVG together", async()=>{
  const context=await browser.newContext({deviceScaleFactor:2,viewport:{width:1000,height:700}});
  try {
    const {page,errors}=await openBrowserPage(context,new URL("examples/inspect-chart/",server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
    await page.evaluate(async()=>{
      window.__inspectionSessions.forEach(session=>session.destroy());
      const {chart,hconcat,render}=await import('/src/index.js');
      const {renderToSVG}=await import('/src/renderers/svg.js');
      const {createInteractionSession}=await import('/src/interaction.js');
      document.body.innerHTML='<canvas id="linkedCanvas"></canvas><div id="linkedSvg"></div>';
      const child=chart().createCanvas({width:200,height:160,margin:0}).createData({id:'rows',keyField:'id',values:[{id:'a',x:50,y:60},{id:'b',x:100,y:100}]})
        .createPointMark({id:'points'}).encodeX({field:'x',scale:{domain:[0,200],range:[0,200]}}).encodeY({field:'y',scale:{domain:[0,160],range:[0,160]}}).encodePointRadius({value:8})
        .selectMarks({id:'picked',items:[]}).highlightMarks({selection:'picked',color:'red',bringToFront:false,dimOthers:false});
      const program=hconcat({programs:[{id:'left',program:child},{id:'right',program:child}]});
      const canvas=document.querySelector('#linkedCanvas');
      const session=createInteractionSession({program,bindings:[{type:'inspect',events:['click']},{type:'linkSelection',id:'rows',resolve:'global',target:{childPath:['right'],id:'points'},selection:'picked',sources:[{target:{childPath:['left'],id:'points'},selection:'picked',projection:{type:'rows',sourceData:'rows',targetData:'rows'}}]}]});
      window.__linkedSession=session;window.__linkedPhases=[];
      const draw=p=>{render(p,canvas.getContext('2d'),{pixelRatio:2});document.querySelector('#linkedSvg').innerHTML=renderToSVG(p);};
      draw(program);session.mount(canvas);
      session.subscribe(event=>{if(!event.phase)return;window.__linkedPhases.push(event.phase);if(event.phase==='commit')draw(event.current);});
      canvas.addEventListener('click',()=>{const hit=session.getState().hit?.target;if(hit?.childPath[0]==='left')session.dispatch({type:'select',target:{childPath:hit.childPath,id:hit.ownerId},payload:{id:'picked',select:{items:[hit.itemKey]}},origin:'user'});});
    });
    const box=await page.locator('#linkedCanvas').boundingBox();await page.mouse.click(box.x+50,box.y+60);
    const result=await page.evaluate(async()=>{
      const {getMarkItems}=await import('/src/inspection.js'),session=window.__linkedSession;
      return {phases:window.__linkedPhases,revision:session.getState().revision,
        ids:['left','right'].map(child=>getMarkItems(session.getState().program.children[child],{target:'points'}).filter(item=>item.properties.fill==='red').map(item=>item.fields.id)),
        redSvg:document.querySelectorAll('#linkedSvg circle[fill="red"]').length};
    });
    assert.deepEqual(result,{phases:['commit','settled'],revision:1,ids:[['a'],['a']],redSvg:2});
    await page.evaluate(()=>window.__linkedSession.destroy());assertNoBrowserErrors(errors,'linked selection transaction');await page.close();
  }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});


test("CSS nearest click outside a fill selects the same item on Canvas and SVG", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async () => {
      const { render } = await import('/src/index.js'), { renderToSVG } = await import('/src/renderers/svg.js');
      for (const [index, session] of window.__inspectionSessions.entries()) {
        session.updateProgram(session.getState().program.selectMarks({id:'picked',target:'observations',items:[]})
          .highlightMarks({selection:'picked',color:'red',bringToFront:false,dimOthers:false}));
        const element=document.querySelector(index===0?'#chart':'#vector svg');
        element.addEventListener('click',event=>{
          const rect=element.getBoundingClientRect();
          session.dispatch({type:'select',target:'observations',payload:{id:'picked',nearest:{space:'screen',point:{x:event.clientX-rect.left,y:event.clientY-rect.top},maxDistance:20}},origin:'user'});
        });
        session.subscribe(event=>{
          if(event.phase!=='commit')return;
          if(index===0)render(event.current,document.querySelector('#chart').getContext('2d'),{pixelRatio:2});
          else document.querySelector('#vector').innerHTML=renderToSVG(event.current);
        });
      }
    });
    for (const [index, selector] of ['#chart','#vector svg'].entries()) {
      const box=await page.locator(selector).boundingBox(); await page.mouse.click(box.x+310,box.y+118);
      const selected=await page.evaluate(async index=>{
        const {getMarkItems}=await import('/src/inspection.js');
        return getMarkItems(window.__inspectionSessions[index].getState().program,{target:'observations'}).filter(item=>item.properties.fill==='red').map(item=>item.fields.id);
      },index);
      assert.deepEqual(selected,['b']);
    }
    await page.evaluate(()=>window.__inspectionSessions.forEach(session=>session.destroy()));
    assertNoBrowserErrors(errors,'nearest selection'); await page.close();
  } catch(error) { await saveBrowserContextEvidence(context,error); throw error; }
  finally { await context.close(); }
});

test("Canvas and SVG hosts render accepted drop programs after real pointer selection", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => document.querySelector("#status")?.textContent === "Canvas and SVG inspection ready" });
    for (const [index, selector] of ["#chart", "#vector svg"].entries()) {
      const box = await page.locator(selector).boundingBox(); await page.mouse.click(box.x + 294, box.y + 118);
      const result = await page.evaluate(async index => {
        const { createInteractionSession } = await import('/src/interaction.js'), { getMarkItems } = await import('/src/inspection.js');
        const { render } = await import('/src/index.js'), { renderToSVG } = await import('/src/renderers/svg.js');
        const prior = window.__inspectionSessions[index], key = prior.getState().hit.target.itemKey;
        const selected = prior.getState().program.selectMarks({id:'picked',target:'observations',items:[key]})
          .highlightMarks({selection:'picked',color:'red',bringToFront:false,dimOthers:false});
        const session = createInteractionSession({program:selected,selectionPolicy:'drop',bindings:[]}), events=[];
        session.subscribe(event=>events.push(event));
        session.updateProgram(selected.filterMarks({target:'observations',field:'id',op:'neq',value:'b'}));
        session.updateProgram(session.getState().program.removeMarkFilter({target:'observations'}));
        const program=session.getState().program;
        if(index===0)render(program,document.querySelector('#chart').getContext('2d'),{pixelRatio:2});
        else document.querySelector('#vector').innerHTML=renderToSVG(program);
        const value={dropped:events[0].selectionChanges[0].droppedKeys,highlighted:getMarkItems(program,{target:'observations'}).filter(item=>item.properties.fill==='red').length,key};
        session.destroy();return value;
      }, index);
      assert.deepEqual(result.dropped,[result.key]);assert.equal(result.highlighted,0);
    }
    await page.evaluate(()=>window.__inspectionSessions.forEach(session=>session.destroy()));
    assertNoBrowserErrors(errors,'selection lifecycle');await page.close();
  } catch(error) { await saveBrowserContextEvidence(context,error);throw error; }
  finally { await context.close(); }
});

test("automatic click bindings toggle and clear in real Canvas and remounted SVG without host selection code", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => document.querySelector("#status")?.textContent === "Canvas and SVG inspection ready" });
    await page.evaluate(async () => {
      const { createInteractionSession }=await import('/src/interaction.js'),{render}=await import('/src/index.js'),{renderToSVG}=await import('/src/renderers/svg.js');
      window.__automaticEvents=[[],[]];
      window.__automaticSessions=window.__inspectionSessions.map((previous,index)=>{
        const program=previous.getState().program.selectMarks({id:'picked',target:'observations',items:[]}).highlightMarks({selection:'picked',color:'red',dimOthers:false,bringToFront:false});previous.destroy();
        const session=createInteractionSession({program,bindings:[{type:'select',target:'observations',selection:'picked',mode:'toggle'}]});
        session.mount(document.querySelector(index===0?'#chart':'#vector svg'));
        session.subscribe(event=>{
          if(!event.phase)return;window.__automaticEvents[index].push([event.phase,event.origin]);if(event.phase!=='commit')return;
          if(index===0)render(event.current,document.querySelector('#chart').getContext('2d'),{pixelRatio:2});
          else {document.querySelector('#vector').innerHTML=renderToSVG(event.current);session.mount(document.querySelector('#vector svg'));}
        });return session;
      });
    });
    for (const [index, selector] of ['#chart','#vector svg'].entries()) {
      const box=await page.locator(selector).boundingBox();
      for(const [x,y,expected] of [[294,118,['b']],[294,118,[]],[294,118,['b']],[30,270,[]]]) {
        await page.mouse.click(box.x+x,box.y+y);
        const selected=await page.evaluate(async index=>{const {getMarkItems}=await import('/src/inspection.js');return getMarkItems(window.__automaticSessions[index].getState().program,{target:'observations'}).filter(item=>item.properties.fill==='red').map(item=>item.fields.id);},index);
        assert.deepEqual(selected,expected);
      }
      assert.deepEqual(await page.evaluate(index=>window.__automaticEvents[index],index),Array.from({length:4},()=>[['commit','user'],['settled','user']]).flat());
      assert.equal(await page.evaluate(index=>window.__automaticSessions[index].getState().hit,index),null);
    }
    await page.evaluate(()=>window.__automaticSessions.forEach(session=>session.destroy()));
    assertNoBrowserErrors(errors,'automatic click selection');await page.close();
  }catch(error){await saveBrowserContextEvidence(context,error);throw error;}
  finally{await context.close();}
});

async function installCapturedSelections(page) {
  await page.evaluate(async () => {
    const { createInteractionSession } = await import('/src/interaction.js');
    const { render } = await import('/src/index.js'), { renderToSVG } = await import('/src/renderers/svg.js');
    window.__captureEvents = [[], []]; window.__captureIds = [];
    window.__captureSessions = window.__inspectionSessions.map((previous, index) => {
      const program = previous.getState().program.selectMarks({ id: 'picked', target: 'observations', items: [] })
        .highlightMarks({ selection: 'picked', color: 'red', dimOthers: false, bringToFront: false }); previous.destroy();
      const session = createInteractionSession({ program, bindings: [{ type: 'select', target: 'observations', selection: 'picked', mode: 'toggle' }] });
      const mount = () => {
        const host = document.querySelector(index === 0 ? '#chart' : '#vector svg'); host.style.touchAction = 'none'; host.setAttribute('tabindex', '0');
        host.addEventListener('pointerdown', event => { window.__captureIds[index] = event.pointerId; }); session.mount(host);
      };
      mount(); session.subscribe(event => {
        if (!event.phase) return; window.__captureEvents[index].push([event.phase, event.diagnostics[0]?.message ?? null]);
        if (event.phase !== 'commit') return;
        if (index === 0) render(event.current, document.querySelector('#chart').getContext('2d'), { pixelRatio: 2 });
        else { document.querySelector('#vector').innerHTML = renderToSVG(event.current); mount(); }
      }); return session;
    });
  });
}

test("real mouse capture, Escape and long movement cancel once in Canvas and SVG", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL('examples/inspect-chart/', server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await installCapturedSelections(page);
    for (const [index, selector] of ['#chart', '#vector svg'].entries()) {
      const box = await page.locator(selector).boundingBox();
      const before = await page.evaluate(async index => { const { serializeProgram } = await import('/src/persistence.js'); return serializeProgram(window.__captureSessions[index].getState().program); }, index);
      await page.mouse.move(box.x + 294, box.y + 118); await page.mouse.down();
      assert.equal(await page.locator(selector).evaluate((element, index) => element.hasPointerCapture(window.__captureIds[index]), index), true);
      await page.mouse.move(box.x + 295, box.y + 118); await page.keyboard.press('Escape');
      assert.equal(await page.locator(selector).evaluate((element, index) => element.hasPointerCapture(window.__captureIds[index]), index), false);
      await page.mouse.up();
      assert.deepEqual(await page.evaluate(index => window.__captureEvents[index], index), [['cancel', 'Escape']]);
      await page.mouse.move(box.x + 294, box.y + 118); await page.mouse.down();
      await page.mouse.move(box.x + 394, box.y + 118, { steps: 100 }); await page.mouse.up();
      assert.deepEqual(await page.evaluate(index => window.__captureEvents[index], index), [['cancel', 'Escape'], ['cancel', 'movement']]);
      assert.equal(await page.evaluate(async index => { const { serializeProgram } = await import('/src/persistence.js'); return serializeProgram(window.__captureSessions[index].getState().program); }, index), before);
      assert.equal(await page.evaluate(index => window.__captureSessions[index].getState().revision, index), 0);
      await page.mouse.click(box.x + 294, box.y + 118);
      assert.equal(await page.evaluate(index => window.__captureSessions[index].getState().revision, index), 1);
    }
    await page.evaluate(() => window.__captureSessions.forEach(session => session.destroy()));
    assertNoBrowserErrors(errors, 'pointer capture and keyboard cancellation'); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("real touch capture cancels movement and commits one tap without a second synthetic click", async () => {
  const context = await browser.newContext({ hasTouch: true, deviceScaleFactor: 2, viewport: { width: 1100, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL('examples/inspect-chart/', server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await installCapturedSelections(page);
    const protocol = await context.newCDPSession(page);
    for (const [index, selector] of ['#chart', '#vector svg'].entries()) {
      const box = await page.locator(selector).boundingBox(), x = box.x + 294, y = box.y + 118;
      await protocol.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      assert.equal(await page.locator(selector).evaluate((element, index) => element.hasPointerCapture(window.__captureIds[index]), index), true);
      await protocol.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 10, y, id: 1 }] });
      await protocol.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.deepEqual(await page.evaluate(index => window.__captureEvents[index], index), [['cancel', 'movement']]);
      await page.touchscreen.tap(x, y);
      assert.deepEqual(await page.evaluate(index => window.__captureEvents[index], index), [['cancel', 'movement'], ['commit', null], ['settled', null]]);
      assert.equal(await page.evaluate(index => window.__captureSessions[index].getState().revision, index), 1);
    }
    await protocol.detach(); await page.evaluate(() => window.__captureSessions.forEach(session => session.destroy()));
    assertNoBrowserErrors(errors, 'touch capture'); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("categorical legend clicks and cancellation select the same groups on Canvas and SVG", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1200, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async () => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createInteractionSession } = await import("/src/interaction.js");
      document.body.innerHTML = '<canvas id="legend-canvas" aria-label="Legend selection chart"></canvas><div id="legend-vector"></div>';
      const program = chart().createCanvas({ width: 500, height: 350, margin: 100 })
        .createData({ values: [{ id: "a", x: 1, y: 2, category: "A" }, { id: "b", x: 2, y: 3, category: "B" }, { id: "c", x: 3, y: 4, category: "A" }], keyField: "id" })
        .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "category" })
        .createLegend({ channels: ["color"] }).selectMarks({ id: "picked", target: "points", items: [] })
        .highlightMarks({ selection: "picked", color: "red", dimOthers: false, bringToFront: false });
      window.__legendPhases = [[], []];
      window.__legendSessions = [0, 1].map(index => {
        const session = createInteractionSession({ program, bindings: [{ type: "legend", effect: "selection", target: "points", channel: "color", selection: "picked" }] });
        const draw = current => {
          if (index === 0) { const element = document.querySelector("#legend-canvas"); render(current, element.getContext("2d"), { pixelRatio: 2 }); session.mount(element); }
          else { const container = document.querySelector("#legend-vector"); container.innerHTML = renderToSVG(current); session.mount(container.querySelector("svg")); }
        };
        session.subscribe(event => { if (event.phase) window.__legendPhases[index].push(event.phase); if (event.phase === "commit") draw(event.current); });
        draw(program); return session;
      });
    });
    const vector = await page.locator("#legend-vector svg").boundingBox();
    const label = await page.locator("#legend-vector text").filter({ hasText: /^A$/ }).boundingBox();
    const local = { x: label.x + label.width / 2 - vector.x, y: label.y + label.height / 2 - vector.y };
    for (const [index, selector] of ["#legend-canvas", "#legend-vector svg"].entries()) {
      const box = await page.locator(selector).boundingBox(), point = { x: box.x + local.x, y: box.y + local.y };
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.keyboard.press("Escape"); await page.mouse.up();
      assert.equal(await page.evaluate(index => window.__legendSessions[index].getState().revision, index), 0);
      await page.mouse.click(point.x, point.y);
      assert.deepEqual(await page.evaluate(async index => { const { getMarkItems } = await import("/src/inspection.js"); return getMarkItems(window.__legendSessions[index].getState().program, { target: "points" }).filter(item => item.properties.fill === "red").map(item => item.fields.id); }, index), ["a", "c"]);
      assert.deepEqual(await page.evaluate(index => window.__legendPhases[index], index), ["cancel", "commit", "settled"]);
    }
    assert.deepEqual(await page.locator("#legend-canvas").evaluate(canvas => [canvas.width, canvas.height]), [1000, 700]);
    await page.evaluate(() => window.__legendSessions.forEach(session => session.destroy()));
    assertNoBrowserErrors(errors, "legend selection"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("categorical visibility retains control labels and restores actual items on Canvas and SVG", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1200, height: 850 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async () => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createInteractionSession } = await import("/src/interaction.js");
      document.body.innerHTML = '<canvas id="legend-canvas" aria-label="Category visibility chart"></canvas><div id="legend-vector"></div>';
      const program = chart().createCanvas({ width: 500, height: 350, margin: 100 })
        .createData({ values: [{ id: "a", x: 1, y: 2, category: "A" }, { id: "b", x: 2, y: 3, category: "B" }, { id: "c", x: 3, y: 4, category: "A" }], keyField: "id" })
        .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" }).encodeColor({ field: "category" })
        .createLegend({ channels: ["color"] }).selectMarks({ id: "picked", target: "points", items: [] })
        .highlightMarks({ selection: "picked", color: "red", dimOthers: false, bringToFront: false });
      window.__legendPhases = [[], []];
      window.__legendSessions = [0, 1].map(index => {
        const session = createInteractionSession({ program, bindings: [{ type: "legend", effect: "visibility", target: "points", channel: "color", scaleDomain: "all-data" }] });
        const draw = current => {
          if (index === 0) { const element = document.querySelector("#legend-canvas"); render(current, element.getContext("2d"), { pixelRatio: 2 }); session.mount(element); }
          else { const container = document.querySelector("#legend-vector"); container.innerHTML = renderToSVG(current); session.mount(container.querySelector("svg")); }
        };
        session.subscribe(event => { if (event.phase) window.__legendPhases[index].push(event.phase); if (event.phase === "commit") draw(event.current); });
        draw(program); return session;
      });
    });
    const vector = await page.locator("#legend-vector svg").boundingBox();
    const label = await page.locator("#legend-vector text").filter({ hasText: /^A$/ }).boundingBox();
    const local = { x: label.x + label.width / 2 - vector.x, y: label.y + label.height / 2 - vector.y };
    for (const [index, selector] of ["#legend-canvas", "#legend-vector svg"].entries()) {
      const box = await page.locator(selector).boundingBox(), point = { x: box.x + local.x, y: box.y + local.y };
      await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.keyboard.press("Escape"); await page.mouse.up();
      assert.equal(await page.evaluate(index => window.__legendSessions[index].getState().revision, index), 0);
      await page.mouse.click(point.x, point.y);
      assert.deepEqual(await page.evaluate(async index => { const { getMarkItems } = await import("/src/inspection.js"); return getMarkItems(window.__legendSessions[index].getState().program, { target: "points" }).map(item => item.fields.id); }, index), ["b"]);
      await page.mouse.click(point.x, point.y);
      assert.deepEqual(await page.evaluate(async index => { const { getMarkItems } = await import("/src/inspection.js"); return getMarkItems(window.__legendSessions[index].getState().program, { target: "points" }).map(item => item.fields.id); }, index), ["a", "b", "c"]);
      assert.deepEqual(await page.evaluate(index => window.__legendPhases[index], index), ["cancel", "commit", "settled", "commit", "settled"]);
    }
    assert.deepEqual(await page.locator("#legend-canvas").evaluate(canvas => [canvas.width, canvas.height]), [1000, 700]);
    await page.evaluate(() => window.__legendSessions.forEach(session => session.destroy()));
    assertNoBrowserErrors(errors, "legend visibility"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});


test("native parameter inputs and host context actions preserve keyboard focus and immutable commits", async () => {
  const snippet = (await documentationPrograms()).find(program => program.id === "interaction-parameter-context");
  assert.ok(snippet);
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1000, height: 700 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="chart" aria-label="Adjustable points"></canvas><div id="vector"></div>';
      const source = code.replaceAll('"ggaction"', JSON.stringify(new URL('/src/index.js', location.href).href)).replaceAll('"ggaction/interaction"', JSON.stringify(new URL('/src/interaction.js', location.href).href));
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__parameterSession=parameterSession;window.__disposeControls=disposeControls;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js");
      window.__parameterPhases = [];
      window.__parameterSession.subscribe(event => {
        if (event.phase) window.__parameterPhases.push(event.phase);
        if (event.phase === "commit") document.querySelector("#vector").innerHTML = renderToSVG(event.current);
      });
    }, snippet.code);
    const range = page.getByRole("slider", { name: "Multiplier" }); await range.focus(); await page.keyboard.press("ArrowRight");
    assert.deepEqual(await page.evaluate(() => {
      const state = window.__parameterSession.getState(); return { value: document.querySelector("input").value,
        computed: state.program.semanticSpec.datasets.find(dataset => dataset.id === state.program.semanticSpec.layers.find(layer => layer.id === "points").data).values.map(row => row.height),
        revision: state.revision, focus: document.activeElement.id, svg: !!document.querySelector("#vector svg") };
    }), { value: "2", computed: [6, 12], revision: 1, focus: "multiplier", svg: true });
    const hit = await page.evaluate(() => {
      const n = window.__parameterSession.getState().scene.nodes.find(node => node.type === "circle");
      return { x: n.offset[0] + n.properties.x, y: n.offset[1] + n.properties.y };
    });
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.click(box.x + hit.x, box.y + hit.y, { button: "right" });
    assert.equal(await page.getByRole("button", { name: "Select this point" }).isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), "select-context");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "multiplier");
    assert.equal(await page.evaluate(() => window.__parameterSession.getState().revision), 1);
    await page.mouse.click(box.x + hit.x, box.y + hit.y, { button: "right" }); await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(async () => {
      const { getMarkItems } = await import("/src/inspection.js"); const state = window.__parameterSession.getState();
      return { selected: getMarkItems(state.program, { target: "points" }).filter(item => item.properties.fill === "red").map(item => item.fields.id),
        focus: document.activeElement.id, revision: state.revision, phases: window.__parameterPhases };
    }), { selected: ["a"], focus: "multiplier", revision: 2, phases: ["commit", "settled", "commit", "settled"] });
    await page.keyboard.press("End");
    assert.deepEqual(await page.evaluate(() => {
      const s = window.__parameterSession, before = s.getState(); let rejected = false;
      const noop = s.dispatch({ type: "setParameter", target: "factor", payload: { value: 4 } });
      try { s.dispatch({ type: "setParameter", target: "factor", payload: { value: "bad" } }); } catch { rejected = true; }
      return { computed: before.program.semanticSpec.datasets.find(dataset => dataset.id === before.program.semanticSpec.layers.find(layer => layer.id === "points").data).values.map(row => row.height),
        unchanged: before.program === s.getState().program, rejected, noop: noop.status, revision: s.getState().revision };
    }), { computed: [12, 24], unchanged: true, rejected: true, noop: "unchanged", revision: 3 });
    assert.deepEqual(await page.evaluate(() => {
      window.__disposeControls(); const event = new MouseEvent("contextmenu", { cancelable: true, bubbles: true });
      document.querySelector("canvas").dispatchEvent(event);
      return { prevented: event.defaultPrevented, destroyed: window.__parameterSession.getState().destroyed, panel: !!document.querySelector("#multiplier") };
    }), { prevented: false, destroyed: true, panel: false });
    assertNoBrowserErrors(errors, "parameter inputs and context actions"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("host partition buttons and breadcrumbs follow native focus with pointer and keyboard activation", async () => {
  const snippet = (await documentationPrograms()).find(program => program.id === "interaction-hierarchy-focus"); assert.ok(snippet);
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1000, height: 750 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="chart" aria-label="Hierarchy partition"></canvas><div id="vector"></div>';
      let source = code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/inspection", "inspection"], ["ggaction/interaction", "interaction"]]) {
        source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      }
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__focusSession=focusSession;window.__disposeFocus=disposeFocus;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js"); window.__focusPhases = [];
      window.__focusSession.subscribe(event => { if (event.phase) window.__focusPhases.push(event.phase);
        if (event.phase === "commit") document.querySelector("#vector").innerHTML = renderToSVG(event.current); });
    }, snippet.code);
    assert.equal(await page.locator("output").textContent(), "root");
    await page.getByRole("button", { name: "Group A", exact: true }).focus(); await page.keyboard.press("Enter");
    assert.equal(await page.locator("output").textContent(), "root / A");
    assert.deepEqual(await page.evaluate(async () => {
      const { getMarkItems } = await import("/src/inspection.js"); const state = window.__focusSession.getState();
      return { ids: getMarkItems(state.program, { target: "partition" }).filter(item => item.visible).map(item => item.fields.id),
        revision: state.revision, focus: document.activeElement.id, vector: !!document.querySelector("#vector svg") };
    }), { ids: ["A", "A1", "A2"], revision: 1, focus: "focus-a", vector: true });
    await page.getByRole("button", { name: "All groups", exact: true }).focus(); await page.keyboard.press("Space");
    assert.equal(await page.locator("output").textContent(), "root");
    await page.getByRole("button", { name: "Group A", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => ({ revision: window.__focusSession.getState().revision, phases: window.__focusPhases, focus: document.activeElement.id })),
      { revision: 3, phases: ["commit", "settled", "commit", "settled", "commit", "settled"], focus: "focus-a" });
    await page.evaluate(() => window.__disposeFocus()); assert.equal(await page.getByRole("navigation").count(), 0);
    assertNoBrowserErrors(errors, "partition host focus"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});


test("host viewport buttons apply native projection transforms to Canvas and SVG with keyboard focus", async () => {
  const snippet = (await documentationPrograms()).find(program => program.id === "interaction-viewport"); assert.ok(snippet);
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1000, height: 750 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="chart" aria-label="Map points"></canvas><div id="vector"></div>';
      let source = code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/interaction", "interaction"], ["ggaction/inspection", "inspection"]]) {
        source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      }
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__viewportSession=viewportSession;window.__disposeViewport=disposeViewport;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js"); window.__viewportPhases = [];
      const vector = current => { document.querySelector("#vector").innerHTML = renderToSVG(current); };
      window.__viewportSession.subscribe(event => { if (event.phase) window.__viewportPhases.push(event.phase);
        if (event.phase === "commit") vector(event.current); });
      vector(window.__viewportSession.getState().program);
    }, snippet.code);
    const inspect = () => page.evaluate(() => {
      const state = window.__viewportSession.getState();
      const circles = state.scene.nodes.filter(node => node.type === "circle").map(node => [node.properties.x, node.properties.y]);
      const vector = [...document.querySelectorAll("#vector circle")].map(node => [Number(node.getAttribute("cx")), Number(node.getAttribute("cy"))]);
      const context = document.querySelector("canvas").getContext("2d");
      return { circles, vector, painted: circles.every(([x, y]) => { const pixel = context.getImageData(x, y, 1, 1).data; return pixel[3] > 0 && pixel.slice(0, 3).some(channel => channel < 250); }),
        revision: state.revision, focus: document.activeElement.id };
    });
    assert.equal(await page.locator("output").textContent(), "Scale 1; translation 0, 0");
    await page.getByRole("button", { name: "Pan right", exact: true }).focus(); await page.keyboard.press("Enter");
    assert.deepEqual(await inspect(), { circles: [[80,70],[140,110]], vector: [[80,70],[140,110]], painted: true, revision: 1, focus: "map-right" });
    await page.getByRole("button", { name: "Zoom in", exact: true }).focus(); await page.keyboard.press("Space");
    assert.deepEqual(await inspect(), { circles: [[80,70],[200,150]], vector: [[80,70],[200,150]], painted: true, revision: 2, focus: "map-zoom" });
    await page.getByRole("button", { name: "Original view", exact: true }).click();
    assert.deepEqual(await inspect(), { circles: [[60,70],[120,110]], vector: [[60,70],[120,110]], painted: true, revision: 3, focus: "map-home" });
    assert.deepEqual(await page.evaluate(() => window.__viewportPhases), ["commit","settled","commit","settled","commit","settled"]);
    await page.evaluate(() => window.__disposeViewport()); assert.equal(await page.getByRole("navigation").count(), 0);
    assertNoBrowserErrors(errors, "projection viewport host controls"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("canonical graph node controls preserve current Canvas and SVG hits across mouse touch keyboard and cancel", async () => {
  const snippet = (await documentationPrograms()).find(program => program.id === "interaction-node-movement"); assert.ok(snippet);
  const context = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, viewport: { width: 1000, height: 750 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="chart" aria-label="Movable graph nodes"></canvas><div id="vector"></div>';
      let source = code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/inspection", "inspection"], ["ggaction/interaction", "interaction"]]) {
        source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      }
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__nodeSession=nodeSession;window.__disposeNodeControls=disposeNodeControls;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js"); window.__nodePhases = [];
      const vector = current => { document.querySelector("#vector").innerHTML = renderToSVG(current); };
      window.__nodeSession.subscribe(event => { if (event.phase) { window.__nodePhases.push(event.phase); vector(event.state.previewProgram ?? event.state.program); } });
      vector(window.__nodeSession.getState().program);
    }, snippet.code);
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 72, box.y + 92); await page.mouse.down(); await page.mouse.move(box.x + 112, box.y + 122, { steps: 12 });
    await page.waitForFunction(() => window.__nodeSession.getState().previewProgram !== null);
    assert.deepEqual(await page.evaluate(() => {
      const s = window.__nodeSession; s.dispatch({ type: "inspect", point: { x: 110, y: 120 }, slop: 0 });
      const vector = document.querySelector("#vector circle");
      const pixel = document.querySelector("canvas").getContext("2d").getImageData(110,120,1,1).data;
      return { revision: s.getState().revision, hit: s.getState().hit.target.role, circle: [Number(vector.getAttribute("cx")), Number(vector.getAttribute("cy"))], painted: pixel[3] > 0 && pixel.slice(0,3).some(channel => channel < 250) };
    }), { revision: 0, hit: "node", circle: [110,120], painted: true });
    await page.mouse.up(); assert.equal(await page.locator("output").textContent(), "First node: 110, 120");
    assert.equal(await page.evaluate(() => window.__nodeSession.getState().revision), 1);
    await page.mouse.move(box.x + 110, box.y + 120); await page.mouse.down(); await page.mouse.move(box.x + 150, box.y + 150);
    await page.waitForFunction(() => window.__nodeSession.getState().previewProgram !== null); await page.keyboard.press("Escape"); await page.mouse.up();
    assert.equal(await page.locator("output").textContent(), "First node: 110, 120");
    await page.getByRole("button", { name: "Move first node right" }).focus(); await page.keyboard.press("Enter");
    assert.equal(await page.locator("output").textContent(), "First node: 130, 120");
    assert.equal(await page.evaluate(() => document.activeElement.id), "node-right");
    const protocol = await context.newCDPSession(page);
    await protocol.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 130, y: box.y + 120 }] });
    await protocol.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + 160, y: box.y + 140 }] });
    await page.waitForFunction(() => window.__nodeSession.getState().previewProgram !== null);
    await protocol.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.equal(await page.locator("output").textContent(), "First node: 160, 140");
    assert.deepEqual(await page.evaluate(() => ({ revision: window.__nodeSession.getState().revision,
      commits: window.__nodePhases.filter(phase => phase === "commit").length, cancels: window.__nodePhases.filter(phase => phase === "cancel").length })), { revision: 3, commits: 3, cancels: 1 });
    await page.evaluate(() => window.__disposeNodeControls()); assertNoBrowserErrors(errors, "node movement host controls"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("canonical annotation buttons preserve data anchors and exact Canvas SVG text through pointer touch and keyboard", async () => {
  const snippet = (await documentationPrograms()).find(program => program.id === "interaction-annotation"); assert.ok(snippet);
  const context = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, viewport: { width: 1000, height: 750 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="chart" aria-label="Annotated points"></canvas><div id="vector"></div>';
      let source = code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/interaction", "interaction"]]) {
        source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      }
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__annotationSession=annotationSession;window.__disposeAnnotation=disposeAnnotationControls;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js"); window.__annotationPhases = [];
      const draw = current => { document.querySelector("#vector").innerHTML = renderToSVG(current); };
      window.__annotationSession.subscribe(event => { if (event.phase) window.__annotationPhases.push(event.phase); if (event.phase === "commit") draw(event.current); });
      draw(window.__annotationSession.getState().program);
    }, snippet.code);
    const inspect = () => page.evaluate(() => {
      const state = window.__annotationSession.getState(), properties = state.program.graphicSpec.objects.note.items[0].properties;
      const text = document.querySelector("#vector text"), canvas = document.querySelector("canvas"), ctx = canvas.getContext("2d");
      const rgba = ctx.getImageData(properties.x, properties.y - 15, 60, 18).data;
      return { point: [properties.x, properties.y], vector: [Number(text.getAttribute("x")), Number(text.getAttribute("y"))],
        text: text.textContent, painted: [...rgba].some((value, i) => i % 4 !== 3 && value < 150 && rgba[i - i % 4 + 3] > 0),
        revision: state.revision, focus: document.activeElement.id };
    });
    await page.getByRole("button", { name: "Revise note", exact: true }).focus(); await page.keyboard.press("Enter");
    assert.deepEqual(await inspect(), { point: [316,84], vector: [316,84], text: "Revised", painted: true, revision: 1, focus: "revise-note" });
    await page.getByRole("button", { name: "Offset note", exact: true }).focus(); await page.keyboard.press("Space");
    assert.deepEqual(await inspect(), { point: [320,76], vector: [320,76], text: "Revised", painted: true, revision: 2, focus: "offset-note" });
    await page.getByRole("button", { name: "Revise note", exact: true }).tap();
    await page.getByRole("button", { name: "Offset note", exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__annotationPhases), ["commit","settled","commit","settled","commit","settled","commit","settled"]);
    assert.equal((await inspect()).revision, 4);
    await page.evaluate(() => window.__disposeAnnotation()); assert.equal(await page.locator("#revise-note").count(), 0);
    assert.equal(await page.evaluate(() => window.__annotationSession.getState().destroyed), true);
    assertNoBrowserErrors(errors, "annotation host controls"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("geographic annotation controls reuse native feature anchors through keyboard touch and projection changes", async () => {
  const context = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, viewport: { width: 900, height: 650 } });
  try {
    const {page,errors}=await openBrowserPage(context,new URL("examples/inspect-chart/",server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
    await page.evaluate(async()=>{
      window.__inspectionSessions.forEach(s=>s.destroy());
      const {chart,render}=await import('/src/index.js'),{createInteractionSession}=await import('/src/interaction.js'),{renderToSVG}=await import('/src/renderers/svg.js');
      document.body.innerHTML='<button id="anchor">Move note</button><button id="project">Change viewport</button><canvas id="map"></canvas><div id="vector"></div>';
      const program=chart().createCanvas({width:300,height:200,margin:0})
        .createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'FeatureCollection',features:[{type:'Feature',id:1,properties:{},geometry:{type:'Point',coordinates:[30,40]}},{type:'Feature',id:'1',properties:{},geometry:{type:'Point',coordinates:[80,90]}}]}})
        .createProjection({id:'projection',type:'identity'}).createCoordinate({type:'geo'})
        .createGeoAnnotation({id:'note',anchor:{type:'feature',geometry:'places',key:1},text:'Port'});
      const session=createInteractionSession({program,bindings:[]});window.__geoNote=session;window.__geoNotePhases=[];
      const draw=p=>{render(p,document.querySelector('canvas').getContext('2d'),{pixelRatio:2});document.querySelector('#vector').innerHTML=renderToSVG(p)};
      session.subscribe(e=>{if(e.phase)window.__geoNotePhases.push(e.phase);if(e.phase==='commit')draw(e.current)});draw(program);
      document.querySelector('#anchor').onclick=()=>session.dispatch({type:'annotate',target:'note',payload:{anchor:{type:'feature',key:'1'},text:'Harbor',dx:4,dy:-8}});
      document.querySelector('#project').onclick=()=>session.dispatch({type:'setViewport',target:'projection',payload:{scalePx:2}});
    });
    await page.getByRole('button',{name:'Move note'}).focus();await page.keyboard.press('Enter');
    const inspect=()=>page.evaluate(()=>{
      const state=window.__geoNote.getState(),p=state.program.graphicSpec.objects.note.items[0].properties,t=document.querySelector('#vector text');
      const rgba=document.querySelector('canvas').getContext('2d').getImageData(p.x*2,(p.y-14)*2,100,32).data;
      return {point:[p.x,p.y],svg:[Number(t.getAttribute('x')),Number(t.getAttribute('y'))],text:t.textContent,key:state.program.semanticSpec.layers[0].geoBinding.anchor.key,ink:[...rgba].some((v,i)=>i%4!==3&&v<150&&rgba[i-i%4+3]>0)};
    });
    assert.deepEqual(await inspect(),{point:[84,82],svg:[84,82],text:'Harbor',key:'1',ink:true});
    await page.getByRole('button',{name:'Change viewport'}).tap();
    assert.deepEqual(await inspect(),{point:[164,172],svg:[164,172],text:'Harbor',key:'1',ink:true});
    await page.getByRole('button',{name:'Move note'}).focus();await page.keyboard.press('Space');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'anchor');
    assert.deepEqual(await page.evaluate(()=>window.__geoNotePhases),['commit','settled','commit','settled','commit','settled']);
    await page.evaluate(()=>window.__geoNote.destroy());assertNoBrowserErrors(errors,'geographic annotation controls');await page.close();
  }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});

test("annotation membership buttons preserve item anchors and focus across pointer touch and keyboard",async()=>{
 const context=await browser.newContext({deviceScaleFactor:2,hasTouch:true,viewport:{width:900,height:650}});
 try{
  const {page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
  await page.evaluate(async()=>{
   window.__inspectionSessions.forEach(s=>s.destroy());
   const {chart,render}=await import('/src/index.js'),{getMarkItems}=await import('/src/inspection.js'),{createInteractionSession}=await import('/src/interaction.js'),{renderToSVG}=await import('/src/renderers/svg.js');
   document.body.innerHTML='<button id="all">All notes</button><button id="one">First note</button><button id="none">No notes</button><canvas id="notes" aria-label="Selected item notes"></canvas><div id="vector"></div>';
   const base=chart().createCanvas({width:256,height:160,margin:0}).createData({values:[{x:40,y:60},{x:120,y:90}]})
    .createPointMark({id:'points'}).encodeX({field:'x',scale:{domain:[0,256],range:[0,256]}}).encodeY({field:'y',scale:{domain:[0,160],range:[0,160]}});
   const key=getMarkItems(base)[0].key,program=base.selectMarks({id:'picked',target:'points',items:[key]}).createAnnotation({id:'notes',source:'points',text:'Note',selection:'picked',dy:-5});
   const session=createInteractionSession({program,bindings:[]});window.__memberSession=session;window.__memberPhases=[];
   const draw=p=>{render(p,document.querySelector('canvas').getContext('2d'),{pixelRatio:2});document.querySelector('#vector').innerHTML=renderToSVG(p)};
   session.subscribe(e=>{if(e.phase)window.__memberPhases.push(e.phase);if(e.phase==='commit')draw(e.current)});draw(program);
   for(const[id,payload]of[['all',{all:true}],['one',{selection:'picked'}],['none',{select:{items:[]}}]])document.querySelector('#'+id).onclick=()=>session.dispatch({type:'annotate',target:'notes',payload});
  });
  await page.getByRole('button',{name:'All notes'}).focus();await page.keyboard.press('Enter');
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#vector text')].map(t=>[Number(t.getAttribute('x')),Number(t.getAttribute('y'))])),[[40,55],[120,85]]);
  await page.getByRole('button',{name:'No notes'}).tap();assert.equal(await page.locator('#vector text').count(),0);
  await page.getByRole('button',{name:'First note'}).click();assert.equal(await page.locator('#vector text').count(),1);
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'one');
  assert.deepEqual(await page.evaluate(()=>window.__memberPhases),['commit','settled','commit','settled','commit','settled','commit','settled']);
  assert.equal(await page.evaluate(()=>{const c=document.querySelector('canvas').getContext('2d'),rgba=c.getImageData(60,70,100,40).data;return [...rgba].some((v,i)=>i%4!==3&&v<150&&rgba[i-i%4+3]>0)}),true);
  await page.evaluate(()=>window.__memberSession.destroy());assertNoBrowserErrors(errors,'annotation membership controls');await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});

test("screen annotation controls keep Canvas pixel anchors through resize and keyboard editing", async () => {
  const context=await browser.newContext({deviceScaleFactor:2,hasTouch:true,viewport:{width:900,height:650}});
  try {
    const {page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
    await page.evaluate(async()=>{
      window.__inspectionSessions.forEach(s=>s.destroy());
      const {chart,render}=await import('/src/index.js'),{renderToSVG}=await import('/src/renderers/svg.js'),{createInteractionSession}=await import('/src/interaction.js');
      document.body.innerHTML='<button id="move">Move screen note</button><button id="resize">Resize Canvas</button><canvas aria-label="Screen note"></canvas><div id="vector"></div>';
      const p=chart().createCanvas({width:300,height:180,margin:30}).createAnnotation({id:'note',space:'screen',x:12,y:24,text:'Screen',fontSize:20});
      const session=createInteractionSession({program:p,bindings:[]});window.__screenNote=session;window.__screenPhases=[];
      const draw=p=>{render(p,document.querySelector('canvas').getContext('2d'),{pixelRatio:2});document.querySelector('#vector').innerHTML=renderToSVG(p)};
      session.subscribe(e=>{window.__screenPhases.push(e.phase);if(e.phase==='commit')draw(e.current)});draw(p);
      document.querySelector('#move').onclick=()=>session.dispatch({type:'annotate',target:'note',payload:{x:40,y:60,text:'Moved',dx:2,dy:-3}});
      document.querySelector('#resize').onclick=()=>session.updateProgram(session.getState().program.editCanvas({width:500,height:240,margin:60}));
    });
    await page.getByRole('button',{name:'Move screen note'}).focus();await page.keyboard.press('Enter');
    const inspect=()=>page.evaluate(()=>{const t=document.querySelector('#vector text'),p=window.__screenNote.getState().program;return {x:Number(t.getAttribute('x')),y:Number(t.getAttribute('y')),text:t.textContent,data:p.semanticSpec.datasets.length,scales:p.semanticSpec.scales.length}});
    assert.deepEqual(await inspect(),{x:42,y:57,text:'Moved',data:0,scales:0});
    await page.getByRole('button',{name:'Resize Canvas'}).tap();assert.deepEqual(await inspect(),{x:42,y:57,text:'Moved',data:0,scales:0});
    await page.getByRole('button',{name:'Move screen note'}).click();await page.keyboard.press('Space');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'move');
    assert.equal(await page.evaluate(()=>{const rgba=document.querySelector('canvas').getContext('2d').getImageData(80,75,130,45).data;return [...rgba].some((v,i)=>i%4!==3&&v<150&&rgba[i-i%4+3]>0)}),true);
    await page.evaluate(()=>window.__screenNote.destroy());assertNoBrowserErrors(errors,'screen annotation controls');await page.close();
  } catch(error) {await saveBrowserContextEvidence(context,error);throw error;} finally {await context.close();}
});

test("canonical annotation dragging preserves anchors across mouse touch keyboard and cancellation", async () => {
  const snippet = (await documentationPrograms()).find(program => program.id === "interaction-annotation"); assert.ok(snippet);
  const context = await browser.newContext({ deviceScaleFactor: 2, hasTouch: true, viewport: { width: 1000, height: 750 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      document.body.innerHTML = '<canvas id="chart" aria-label="Draggable annotation"></canvas><div id="vector"></div>';
      let source = code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/interaction", "interaction"]]) source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      const url = URL.createObjectURL(new Blob([source + '\nwindow.__annotationDrag=annotationSession;window.__disposeAnnotationDrag=disposeAnnotationControls;'], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const { renderToSVG } = await import("/src/renderers/svg.js"); window.__annotationDragPhases = [];
      const draw = p => { document.querySelector("#vector").innerHTML = renderToSVG(p); };
      window.__annotationDrag.subscribe(event => { if (event.phase) { window.__annotationDragPhases.push(event.phase); draw(event.state.previewProgram ?? event.state.program); } });
      draw(window.__annotationDrag.getState().program);
    }, snippet.code);
    const box = await page.locator("canvas").boundingBox();
    const inspect = () => page.evaluate(() => {
      const state = window.__annotationDrag.getState(), p = state.previewProgram ?? state.program;
      const text = p.graphicSpec.objects.note.items[0].properties, vector = document.querySelector("#vector text");
      const pixels = document.querySelector("canvas").getContext("2d").getImageData(text.x, text.y - 15, 65, 16).data;
      const layer = p.semanticSpec.layers.find(layer => layer.id === "note");
      return { xy: [text.x, text.y], vector: [Number(vector.getAttribute("x")), Number(vector.getAttribute("y"))],
        anchor: [layer.encoding.x.datum, layer.encoding.y.datum], revision: state.revision,
        ink: [...pixels].some((value, index) => index % 4 !== 3 && value < 150 && pixels[index - index % 4 + 3] > 0) };
    });
    await page.mouse.move(box.x + 104, box.y + 176); await page.mouse.down(); await page.mouse.move(box.x + 134, box.y + 196, { steps: 8 });
    await page.waitForFunction(() => window.__annotationDrag.getState().previewProgram !== null);
    assert.deepEqual(await inspect(), { xy: [130, 200], vector: [130, 200], anchor: [2, 3], revision: 0, ink: true });
    await page.mouse.up(); assert.equal((await inspect()).revision, 1);
    await page.mouse.move(box.x + 134, box.y + 196); await page.mouse.down(); await page.mouse.move(box.x + 164, box.y + 206);
    await page.waitForFunction(() => window.__annotationDrag.getState().previewProgram !== null);
    await page.keyboard.press("Escape"); await page.mouse.up(); assert.deepEqual((await inspect()).xy, [130, 200]);
    await page.getByRole("button", { name: "Offset note" }).focus(); await page.keyboard.press("Enter");
    assert.deepEqual((await inspect()).xy, [104, 172]);
    const protocol = await context.newCDPSession(page);
    await protocol.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 108, y: box.y + 168 }] });
    await protocol.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + 128, y: box.y + 178 }] });
    await page.waitForFunction(() => window.__annotationDrag.getState().previewProgram !== null);
    await protocol.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.deepEqual(await inspect(), { xy: [124, 182], vector: [124, 182], anchor: [2, 3], revision: 3, ink: true });
    assert.deepEqual(await page.evaluate(() => ({ commits: window.__annotationDragPhases.filter(phase => phase === "commit").length,
      cancels: window.__annotationDragPhases.filter(phase => phase === "cancel").length })), { commits: 3, cancels: 1 });
    assert.equal(await page.evaluate(() => window.__annotationDrag.getState().history.undoCount), 3);
    await page.getByRole("button", { name: "Undo", exact: true }).focus(); await page.keyboard.press("Enter");
    assert.deepEqual((await inspect()).xy, [104, 172]);
    await page.getByRole("button", { name: "Redo", exact: true }).tap(); assert.deepEqual((await inspect()).xy, [124, 182]);
    await page.getByRole("button", { name: "Reset", exact: true }).click(); assert.deepEqual((await inspect()).xy, [100, 180]);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); assert.deepEqual((await inspect()).xy, [124, 182]);
    assert.equal(await page.evaluate(() => window.__annotationDragPhases.filter(phase => phase === "commit").length), 7);
    await page.evaluate(() => window.__disposeAnnotationDrag()); assertNoBrowserErrors(errors, "annotation dragging"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("canonical asset resolver keeps browser pixels committed and closes late image bitmaps after destroy", async () => {
  const { readFile } = await import("node:fs/promises"), { documentationCodeBlocks } = await import("../../scripts/doc-snippets.js");
  const source = documentationCodeBlocks(await readFile(new URL("../../docs/api/interaction.md", import.meta.url), "utf8"))
    .find(block => block.code.includes("const assetSession = createInteractionSession")).code;
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 900, height: 650 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart } = await import("/src/index.js");
      document.body.innerHTML = '<button id="edit">Change level</button><button id="destroy">Destroy session</button><canvas aria-label="Prepared image"></canvas>';
      const sample = document.createElement("canvas"); sample.width = sample.height = 2;
      sample.getContext("2d").fillStyle = "#008000"; sample.getContext("2d").fillRect(0, 0, 2, 2);
      const blob = await new Promise(resolve => sample.toBlob(resolve)), bytes = new Uint8Array(await blob.arrayBuffer());
      const contentHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
      const image = { contentHash, mimeType: "image/png", byteLength: bytes.length, width: 2, height: 2, payload: { encoding: "base64", data: btoa(String.fromCharCode(...bytes)) } };
      let program = chart().createCanvas({ width: 200, height: 120, margin: 0 }).createParameter({ id: "level", value: 0 }).createGraphics({ id: "picture", type: "image", parent: "plot-main" });
      for (const [property, value] of Object.entries({ image, x: 10, y: 10, width: 40, height: 40 })) program = program.editGraphics({ target: "picture", property, value });
      window.__assetProgram = program; window.__assetContext = document.querySelector("canvas").getContext("2d");
      window.__assetHolds = []; window.__assetCloseCount = 0; window.__assetWrites = 0; window.__assetHold = false;
      const native = window.createImageBitmap.bind(window);
      window.createImageBitmap = async (...args) => {
        const bitmap = await native(...args), close = bitmap.close.bind(bitmap);
        bitmap.close = () => { window.__assetCloseCount++; close(); };
        if (window.__assetHold) await new Promise(resolve => window.__assetHolds.push(resolve));
        return bitmap;
      };
      let module = 'const program=window.__assetProgram, context=window.__assetContext, interactionBindings=[];\n' + code;
      for (const [specifier, file] of [["ggaction", "index"], ["ggaction/interaction", "interaction"]]) module = module.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      module += '\nwindow.__assetSession=assetSession;window.__assetCleanup=disposeAssets;';
      const url = URL.createObjectURL(new Blob([module], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      window.__assetSession.subscribe(event => { if (event.phase === "commit") window.__assetWrites++; });
      window.__assetHold = true; let value = 0;
      document.querySelector("#edit").onclick = () => window.__assetSession.dispatch({ type: "setParameter", target: "level", payload: { value: ++value } });
      document.querySelector("#destroy").onclick = () => window.__assetCleanup();
    }, source);
    assert.deepEqual(await page.evaluate(() => [...window.__assetContext.getImageData(20, 20, 1, 1).data]), [0, 128, 0, 255]);
    await page.getByRole("button", { name: "Change level" }).click(); await page.waitForFunction(() => window.__assetHolds.length === 1);
    await page.getByRole("button", { name: "Change level" }).focus(); await page.keyboard.press("Enter"); await page.waitForFunction(() => window.__assetHolds.length === 2);
    assert.deepEqual(await page.evaluate(() => [window.__assetSession.getState().revision, window.__assetWrites]), [0, 0]);
    await page.evaluate(async () => { window.__assetHolds[1](); await window.__assetSession.whenSettled(); window.__assetHolds[0](); });
    await page.waitForFunction(() => window.__assetCloseCount === 2);
    assert.deepEqual(await page.evaluate(() => [window.__assetSession.getState().revision, window.__assetSession.getState().history.undoCount, window.__assetWrites]), [1, 1, 1]);
    await page.getByRole("button", { name: "Change level" }).click(); await page.waitForFunction(() => window.__assetHolds.length === 3);
    await page.getByRole("button", { name: "Destroy session" }).click();
    await page.evaluate(() => window.__assetHolds[2]()); await page.waitForFunction(() => window.__assetCloseCount === 4);
    assert.deepEqual(await page.evaluate(() => [window.__assetSession.getState().destroyed, window.__assetSession.getState().assets, window.__assetWrites]), [true, null, 1]);
    assert.deepEqual(await page.evaluate(() => [...window.__assetContext.getImageData(20, 20, 1, 1).data]), [0, 128, 0, 255]);
    assertNoBrowserErrors(errors, "atomic image preparation"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("canonical native update and real browser workers reject stale completion and release transport on destroy", async () => {
  const { readFile } = await import("node:fs/promises"), { documentationCodeBlocks } = await import("../../scripts/doc-snippets.js");
  const source = documentationCodeBlocks(await readFile(new URL("../../docs/api/interaction.md", import.meta.url), "utf8"))
    .find(block => block.code.includes("const routeExecutor = createGraphRouteExecutor")).code;
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 900, height: 650 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      const { createGraphRouteExecutor, prepareGraphEdgeRoutes, computeGraphEdgeRoutes } = await import("/src/graph.js");
      document.body.innerHTML = '<button id="prepare">Prepare routes</button><button id="destroy">Destroy routes</button><canvas aria-label="Prepared routes"></canvas><div id="vector"></div>';
      window.__routeBase = chart().createCanvas({ width: 400, height: 300 }).createData({ id: "nodes", values: [{ id: "a" }, { id: "b" }, { id: "c" }] })
        .createData({ id: "edges", values: [{ s: "a", t: "c" }, { s: "a", t: "b" }, { s: "b", t: "c" }] })
        .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id", source: "s", target: "t" })
        .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "a", x: 0, y: 0 }, { key: "b", x: 50, y: 50 }, { key: "c", x: 100, y: 0 }] } })
        .createGraphPlot({ id: "network" });
      let module = 'const program=window.__routeBase;\n' + code;
      for (const [specifier, file] of [["ggaction/graph", "graph"], ["ggaction/interaction", "interaction"]]) module = module.replaceAll(JSON.stringify(specifier), JSON.stringify(new URL(`/src/${file}.js`, location.href).href));
      module += '\nwindow.__routeSession=routeSession;window.__routeCleanup=disposeRoutes;';
      const url = URL.createObjectURL(new Blob([module], { type: "text/javascript" }));
      try { await import(url); } finally { URL.revokeObjectURL(url); }
      const draw = program => { render(program, document.querySelector("canvas").getContext("2d"), { pixelRatio: 2 }); document.querySelector("#vector").innerHTML = renderToSVG(program); };
      window.__routeWrites = 0; draw(window.__routeSession.getState().program);
      window.__routeSession.subscribe(event => { if (event.type === "program") { window.__routeWrites++; draw(event.state.program); } });
      window.__routeWorkers = [];
      const workerUrl = URL.createObjectURL(new Blob([`import {computeGraphEdgeRoutes} from ${JSON.stringify(new URL('/src/graph.js', location.href).href)};onmessage=({data})=>postMessage(computeGraphEdgeRoutes(data.job));`], { type: "text/javascript" }));
      const executor = createGraphRouteExecutor({ createWorker() {
        const native = new Worker(workerUrl, { type: "module" }), listeners = new Map();
        const worker = { job: null, terminated: 0, listeners, late: null,
          postMessage(message) { this.job = message.job; this.late = listeners.get("message"); this.release = () => native.postMessage(message); },
          addEventListener(type, listener) { listeners.set(type, listener); native.addEventListener(type, listener); },
          removeEventListener(type, listener) { listeners.delete(type); native.removeEventListener(type, listener); },
          terminate() { this.terminated++; native.terminate(); } };
        window.__routeWorkers.push(worker); return worker;
      } });
      let exponent = 2;
      document.querySelector("#prepare").onclick = () => {
        const value = ++exponent;
        window.__routeSession.updateProgram(async ({ program, signal, transactionId }) => {
          const prepared = await prepareGraphEdgeRoutes(program, { kind: "edit", target: "routes", options: { exponent: value } }, { executor, signal, requestToken: transactionId });
          return program.editEdgeRoute({ prepared, requestToken: transactionId });
        }, { history: "record" });
      };
      document.querySelector("#destroy").onclick = () => { window.__routeCleanup(); executor.dispose(); URL.revokeObjectURL(workerUrl); };
      window.__routeLate = index => { const worker = window.__routeWorkers[index]; worker.late({ data: computeGraphEdgeRoutes(worker.job) }); };
      window.__routeParity = () => {
        const current = window.__routeSession.getState().program, expected = window.__routeBase.bundleGraphEdges({ id: "routes", graph: "graph", layout: "layout", method: "edge-path" })
          .editGraphPlot({ target: "network", routes: "routes" }).editEdgeRoute({ target: "routes", options: { exponent: 4 } });
        const canvas = document.createElement("canvas"); render(expected, canvas.getContext("2d"), { pixelRatio: 2 });
        return { svg: renderToSVG(current) === renderToSVG(expected), pixels: canvas.toDataURL() === document.querySelector("canvas").toDataURL() };
      };
    }, source);
    assert.deepEqual(await page.evaluate(() => [window.__routeSession.getState().revision, window.__routeSession.getState().history.undoCount]), [1, 1]);
    await page.getByRole("button", { name: "Prepare routes" }).click(); await page.waitForFunction(() => window.__routeWorkers.length === 1);
    await page.getByRole("button", { name: "Prepare routes" }).focus(); await page.keyboard.press("Enter"); await page.waitForFunction(() => window.__routeWorkers.length === 2);
    assert.deepEqual(await page.evaluate(() => [window.__routeSession.getState().revision, window.__routeWrites, window.__routeWorkers[0].terminated, window.__routeWorkers[0].listeners.size]), [1, 0, 1, 0]);
    await page.evaluate(async () => { window.__routeWorkers[1].release(); await window.__routeSession.whenSettled(); window.__routeLate(0); });
    assert.deepEqual(await page.evaluate(() => window.__routeParity()), { svg: true, pixels: true });
    assert.deepEqual(await page.evaluate(() => [window.__routeSession.getState().revision, window.__routeSession.getState().history.undoCount, window.__routeWrites]), [2, 2, 1]);
    await page.getByRole("button", { name: "Prepare routes" }).click(); await page.waitForFunction(() => window.__routeWorkers.length === 3);
    await page.getByRole("button", { name: "Destroy routes" }).click(); await page.evaluate(() => window.__routeLate(2));
    assert.deepEqual(await page.evaluate(() => ({ destroyed: window.__routeSession.getState().destroyed, writes: window.__routeWrites,
      workers: window.__routeWorkers.map(worker => [worker.terminated, worker.listeners.size]) })), { destroyed: true, writes: 1, workers: [[1, 0], [1, 0], [1, 0]] });
    assertNoBrowserErrors(errors, "native prepared route replacement"); await page.close();
  } catch (error) { await saveBrowserContextEvidence(context, error); throw error; }
  finally { await context.close(); }
});

test("canonical observed resize uses CSS pixels and prepared native rendering with deterministic teardown", async () => {
  const { readFile } = await import("node:fs/promises"), { documentationCodeBlocks } = await import("../../scripts/doc-snippets.js");
  const source = documentationCodeBlocks(await readFile(new URL("../../docs/api/interaction.md", import.meta.url), "utf8"))
    .find(block => block.code.includes("const resizeSession = createInteractionSession")).code;
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 900, height: 650 } });
  try {
    const { page, errors } = await openBrowserPage(context, new URL("examples/inspect-chart/", server.baseUrl).href,
      { waitFor: () => window.__inspectionSessions?.length === 2 });
    await page.evaluate(async code => {
      window.__inspectionSessions.forEach(session => session.destroy());
      const { chart, render } = await import("/src/index.js"), { renderToSVG } = await import("/src/renderers/svg.js");
      document.body.innerHTML = '<div id="surface" style="width:200px;height:160px"><canvas aria-label="Resizable points"></canvas></div><div id="vector"></div>';
      const program = chart().createCanvas({width:200,height:160,margin:20}).createData({values:[{x:0,y:0},{x:1,y:1}]})
        .createPointMark({id:"points"}).encodeX({field:"x"}).encodeY({field:"y"});
      window.__resizeBase=program; window.__resizeEvents=[];window.__resizeWrites=0;window.__resizeObservers=[];
      const NativeResizeObserver=window.ResizeObserver;
      window.ResizeObserver=class {
        constructor(callback){this.disconnected=0;this.native=new NativeResizeObserver(callback);window.__resizeObservers.push(this);}
        observe(...args){this.native.observe(...args);}disconnect(){this.disconnected++;this.native.disconnect();}
      };
      let module='const program=window.__resizeBase,element=document.querySelector("#surface");\n'+code;
      module=module.replaceAll('"ggaction/interaction"',JSON.stringify(new URL('/src/interaction.js',location.href).href));
      module+='\nwindow.__resizeSession=resizeSession;window.__resizeCleanup=disposeResize;window.__stopResizePolicy=stopResize;';
      const url=URL.createObjectURL(new Blob([module],{type:'text/javascript'}));try{await import(url);}finally{URL.revokeObjectURL(url);}
      const draw=current=>{render(current,document.querySelector('canvas').getContext('2d'),{pixelRatio:2});document.querySelector('#vector').innerHTML=renderToSVG(current);};draw(program);
      window.__resizeSession.subscribe(event=>{if(event.type==='resize')window.__resizeEvents.push(event.size);if(event.type==='program'){window.__resizeWrites++;draw(event.state.program);}});
      window.__resizeParity=(width,height)=>{const expected=program.editCanvas({width,height}),canvas=document.createElement('canvas');render(expected,canvas.getContext('2d'),{pixelRatio:2});return{svg:renderToSVG(window.__resizeSession.getState().program)===renderToSVG(expected),pixels:canvas.toDataURL()===document.querySelector('canvas').toDataURL(),physical:[document.querySelector('canvas').width,document.querySelector('canvas').height]};};
      window.__setSurface=(width,height)=>{const element=document.querySelector('#surface');element.style.width=`${width}px`;element.style.height=`${height}px`;};
    },source);
    await page.waitForFunction(()=>window.__resizeWrites===1);
    await page.evaluate(()=>window.__setSurface(300,200));await page.waitForFunction(()=>window.__resizeWrites===2);
    assert.deepEqual(await page.evaluate(()=>window.__resizeEvents),[{width:200,height:160},{width:300,height:200}]);
    assert.deepEqual(await page.evaluate(()=>window.__resizeParity(300,200)),{svg:true,pixels:true,physical:[600,400]});
    await page.evaluate(()=>{
      window.__stopResizePolicy();window.__resizePending=[];
      window.__resizeSession.subscribe(event=>{if(event.type==='resize')window.__resizeSession.updateProgram(request=>new Promise(resolve=>window.__resizePending.push({request,resolve,size:event.size})),{history:'record'});});
      window.__resizeBefore=window.__resizeSession.getState().program;window.__setSurface(400,250);
    });
    await page.waitForFunction(()=>window.__resizePending.length===1);
    await page.evaluate(()=>window.__setSurface(500,300));await page.waitForFunction(()=>window.__resizePending.length===2);
    assert.deepEqual(await page.evaluate(()=>[window.__resizeSession.getState().program===window.__resizeBefore,window.__resizePending[0].request.signal.aborted,window.__resizeWrites]),[true,true,2]);
    await page.evaluate(async()=>{const [old,current]=window.__resizePending;current.resolve(current.request.program.editCanvas(current.size));await window.__resizeSession.whenSettled();old.resolve(old.request.program.editCanvas(old.size));});
    assert.deepEqual(await page.evaluate(()=>window.__resizeParity(500,300)),{svg:true,pixels:true,physical:[1000,600]});
    assert.deepEqual(await page.evaluate(()=>[window.__resizeSession.getState().history.undoCount,window.__resizeWrites]),[3,3]);
    await page.evaluate(()=>window.__setSurface(550,320));await page.waitForFunction(()=>window.__resizePending.length===3);
    await page.evaluate(async()=>{window.__resizeCleanup();const pending=window.__resizePending[2];pending.resolve(pending.request.program.editCanvas(pending.size));window.__setSurface(600,340);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    assert.deepEqual(await page.evaluate(()=>[window.__resizeSession.getState().destroyed,window.__resizeWrites,window.__resizeEvents.length,window.__resizeObservers[0].disconnected]),[true,3,5,1]);
    assertNoBrowserErrors(errors,"observed resize lifecycle");await page.close();
  }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});

test("canonical map navigation handles real drag wheel pinch keyboard and cancellation in Canvas and SVG",async()=>{
 const snippet=(await documentationPrograms()).find(p=>p.id==='interaction-navigation');assert.ok(snippet);
 const context=await browser.newContext({deviceScaleFactor:2,hasTouch:true,viewport:{width:1000,height:750}});
 try{
  const {page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
  await page.evaluate(async code=>{
   window.__inspectionSessions.forEach(s=>s.destroy());document.body.innerHTML='<canvas id="chart"></canvas><div id="vector"></div>';
   let source=code;for(const[specifier,file]of[['ggaction','index'],['ggaction/interaction','interaction'],['ggaction/inspection','inspection']])source=source.replaceAll(JSON.stringify(specifier),JSON.stringify(new URL(`/src/${file}.js`,location.href).href));
   const url=URL.createObjectURL(new Blob([source+'\nwindow.__navigation=navigationSession;window.__disposeNavigation=disposeNavigation;'],{type:'text/javascript'}));try{await import(url)}finally{URL.revokeObjectURL(url)}
   const {renderToSVG}=await import('/src/renderers/svg.js');window.__navigationEvents=[];document.querySelector('canvas').addEventListener('wheel',event=>{window.__navigationWheel={deltaY:event.deltaY,deltaMode:event.deltaMode}},{passive:true});
   const draw=state=>document.querySelector('#vector').innerHTML=renderToSVG(state.previewProgram??state.program);
   window.__navigation.subscribe(e=>{if(e.phase)window.__navigationEvents.push(e.phase);draw(e.state)});draw(window.__navigation.getState());
  },snippet.code);
  const canvas=page.locator('canvas'),rect=await canvas.boundingBox(),point=(x,y)=>({x:rect.x+x,y:rect.y+y});
  const inspect=()=>page.evaluate(()=>{const state=window.__navigation.getState(),circles=state.scene.nodes.filter(n=>n.type==='circle').map(n=>[n.properties.x,n.properties.y]),vector=[...document.querySelectorAll('#vector circle')].map(n=>[+n.getAttribute('cx'),+n.getAttribute('cy')]);
   const ctx=document.querySelector('canvas').getContext('2d');return{circles,vector,history:state.history.undoCount,preview:state.previewProgram!==null,painted:circles.every(([x,y])=>ctx.getImageData(x*2,y*2,1,1).data[3]>0)};});
  await page.mouse.move(...Object.values(point(80,90)));await page.mouse.down();await page.mouse.move(...Object.values(point(100,90)));await page.waitForTimeout(35);
  assert.deepEqual(await inspect(),{circles:[[100,90],[160,110]],vector:[[100,90],[160,110]],history:0,preview:true,painted:true});
  await page.keyboard.press('Escape');await page.mouse.up();assert.deepEqual((await inspect()).circles,[[80,90],[140,110]]);assert.equal((await inspect()).history,0);
  await page.mouse.move(...Object.values(point(80,90)));await page.mouse.wheel(0,-300);await page.waitForTimeout(35);
  const wheel=await page.evaluate(()=>window.__navigationWheel);assert.equal(wheel.deltaMode,0);assert.ok(wheel.deltaY<0);const factor=2**(-wheel.deltaY/300);
  assert.deepEqual((await inspect()).circles,[[80,90],[80+60*factor,90+20*factor]]);assert.equal((await inspect()).history,1);
  await canvas.focus();await page.keyboard.press('Home');assert.deepEqual((await inspect()).circles,[[80,90],[140,110]]);
  const client=await context.newCDPSession(page);const touch=(x,y,id)=>({...point(x,y),id,radiusX:1,radiusY:1,force:1});
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(80,90,1)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(100,90,1)]});await page.waitForTimeout(35);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(100,90,1),touch(140,90,2)]});
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(100,90,1),touch(180,90,2)]});await page.waitForTimeout(35);
  assert.deepEqual((await inspect()).circles,[[100,90],[220,130]]);
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await inspect()).history,3);assert.equal((await inspect()).preview,false);
  await page.keyboard.press('ArrowRight');assert.deepEqual((await inspect()).circles,[[110,90],[230,130]]);assert.deepEqual((await inspect()).vector,[[110,90],[230,130]]);
  await page.evaluate(async()=>{const {serializeProgram,deserializeProgram}=await import('/src/persistence.js');const s=window.__navigation;s.updateProgram(deserializeProgram(serializeProgram(s.getState().program)),{history:'record'});});
  assert.deepEqual((await inspect()).circles,[[110,90],[230,130]]);assert.equal((await inspect()).painted,true);
  await page.evaluate(()=>window.__disposeNavigation());await page.mouse.wheel(0,-300);await page.keyboard.press('Home');assertNoBrowserErrors(errors,'native camera navigation');await client.detach();await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error}finally{await context.close()}
});

test('rotation navigation sends real pointer and keyboard input through native globe coordinates',async()=>{
 const context=await browser.newContext({deviceScaleFactor:2,viewport:{width:900,height:650}});
 try{
  const{page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
  await page.evaluate(async()=>{
   window.__inspectionSessions.forEach(s=>s.destroy());const {chart,render}=await import('/src/index.js'),{getProjectionView}=await import('/src/inspection.js'),{createInteractionSession}=await import('/src/interaction.js'),{renderToSVG}=await import('/src/renderers/svg.js');
   document.body.innerHTML='<canvas id="globe" tabindex="0" aria-label="Rotating globe" style="touch-action:none"></canvas><div id="vector"></div>';
   const p=chart().createCanvas({width:400,height:300,margin:0}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:'id',values:{type:'Feature',id:'a',properties:{},geometry:{type:'Point',coordinates:[0,0]}}})
    .createProjection({id:'map',type:'orthographic',scalePx:100,translatePx:[200,150]}).createCoordinate({type:'geo'}).createGeoPointMark({id:'world',radiusPx:8});
   const s=createInteractionSession({program:p,bindings:[{type:'navigate',target:'map',mode:'rotate',rotationStepDeg:0.5,scaleExtent:[10,500],initial:getProjectionView(p,{target:'map'}).parameters}]});window.__globe=s;
   const draw=()=>{const state=s.getState(),p=state.previewProgram??state.program;render(p,document.querySelector('canvas').getContext('2d'),{pixelRatio:2});document.querySelector('#vector').innerHTML=renderToSVG(p);};s.subscribe(draw);s.mount(document.querySelector('canvas'));draw();
  });
  const canvas=page.locator('canvas'),rect=await canvas.boundingBox();await page.mouse.move(rect.x+200,rect.y+150);await page.mouse.down();await page.mouse.move(rect.x+220,rect.y+150);await page.mouse.up();
  const x=()=>page.evaluate(()=>window.__globe.getState().scene.nodes.find(n=>n.type==='circle').properties.x);
  assert.ok(Math.abs(await x()-(200+100*Math.sin(Math.PI/18)))<1e-9);await canvas.focus();await page.keyboard.press('ArrowRight');assert.ok(Math.abs(await x()-(200+100*Math.sin(Math.PI/12)))<1e-9);
  assert.equal(await page.evaluate(()=>window.__globe.getState().history.undoCount),2);await page.keyboard.press('Home');assert.equal(await x(),200);
  await page.evaluate(()=>window.__globe.destroy());assertNoBrowserErrors(errors,'rotation navigation');await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error}finally{await context.close()}
});

test("canonical preview asset rendering waits for real browser bitmaps and releases cancelled gesture leases",async()=>{
 const {readFile}=await import('node:fs/promises'),{documentationCodeBlocks}=await import('../../scripts/doc-snippets.js');
 const code=documentationCodeBlocks(await readFile(new URL('../../docs/api/interaction.md',import.meta.url),'utf8')).find(b=>b.code.includes('const assetSession = createInteractionSession')).code;
 const context=await browser.newContext({deviceScaleFactor:2,viewport:{width:900,height:650}});
 try{
  const{page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
  await page.evaluate(async code=>{
   window.__inspectionSessions.forEach(s=>s.destroy());const {chart}=await import('/src/index.js'),{getProjectionView}=await import('/src/inspection.js');
   document.body.innerHTML='<canvas id="map" tabindex="0" aria-label="Prepared map" style="touch-action:none"></canvas>';
   const sample=document.createElement('canvas');sample.width=sample.height=2;sample.getContext('2d').fillStyle='#008000';sample.getContext('2d').fillRect(0,0,2,2);
   const blob=await new Promise(resolve=>sample.toBlob(resolve)),bytes=new Uint8Array(await blob.arrayBuffer()),contentHash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
   const image={contentHash,mimeType:'image/png',byteLength:bytes.length,width:2,height:2,payload:{encoding:'base64',data:btoa(String.fromCharCode(...bytes))}};
   let p=chart().createCanvas({width:200,height:160,margin:0}).createGeometryData({id:'places',format:'geojson',coordinateKind:'planar',featureKey:'id',values:{type:'Feature',id:'a',properties:{},geometry:{type:'Point',coordinates:[80,90]}}}).createProjection({id:'map',type:'identity'}).createCoordinate({type:'geo'}).createGeoPointMark({id:'places',radiusPx:6}).createGraphics({id:'picture',type:'image',parent:'plot-main'});
   for(const[property,value]of Object.entries({image,x:2,y:2,width:12,height:12}))p=p.editGraphics({target:'picture',property,value});
   window.__previewBase=p;window.__previewBindings=[{type:'navigate',target:'map',mode:'pan',scaleExtent:[0.5,8],initial:getProjectionView(p,{target:'map'}).parameters}];
   window.__previewHolds=[];window.__previewCloses=0;window.__previewHold=false;const native=createImageBitmap.bind(window);
   window.createImageBitmap=async(...args)=>{const bitmap=await native(...args),close=bitmap.close.bind(bitmap);bitmap.close=()=>{window.__previewCloses++;close();};if(window.__previewHold)await new Promise(resolve=>window.__previewHolds.push(resolve));return bitmap;};
   let source='const program=window.__previewBase,context=document.querySelector("canvas").getContext("2d"),interactionBindings=window.__previewBindings;\n'+code;
   for(const[specifier,file]of[['ggaction','index'],['ggaction/interaction','interaction']])source=source.replaceAll(JSON.stringify(specifier),JSON.stringify(new URL(`/src/${file}.js`,location.href).href));
   source+='\nwindow.__previewSession=assetSession;window.__previewDispose=disposeAssets;assetSession.mount(document.querySelector("canvas"));';
   const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{await import(url)}finally{URL.revokeObjectURL(url)}window.__previewHold=true;
  },code);
  const canvas=page.locator('canvas'),box=await canvas.boundingBox(),point=(x,y)=>[box.x+x,box.y+y];
  const state=()=>page.evaluate(()=>{const s=window.__previewSession.getState(),ctx=document.querySelector('canvas').getContext('2d');return{preview:s.previewProgram!==null,x:s.scene.nodes.find(n=>n.type==='circle').properties.x,green:[...ctx.getImageData(5,5,1,1).data],history:s.history.undoCount};});
  await page.mouse.move(...point(80,90));await page.mouse.down();await page.mouse.move(...point(100,90));await page.waitForFunction(()=>window.__previewHolds.length===1);
  assert.deepEqual(await state(),{preview:false,x:80,green:[0,128,0,255],history:0});
  await page.evaluate(async()=>{window.__previewHolds[0]();await window.__previewSession.whenSettled();});assert.deepEqual(await state(),{preview:true,x:100,green:[0,128,0,255],history:0});
  await page.mouse.move(...point(120,90));await page.waitForFunction(()=>window.__previewHolds.length===2);await page.keyboard.press('Escape');await page.mouse.up();
  assert.deepEqual(await state(),{preview:false,x:80,green:[0,128,0,255],history:0});assert.equal(await page.evaluate(()=>window.__previewCloses),1);
  await page.evaluate(()=>window.__previewHolds[1]());await page.waitForFunction(()=>window.__previewCloses===2);assert.equal((await state()).x,80);
  await page.evaluate(()=>window.__previewDispose());assert.equal(await page.evaluate(()=>window.__previewCloses),3);assertNoBrowserErrors(errors,'prepared native gesture preview');await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error}finally{await context.close()}
});
