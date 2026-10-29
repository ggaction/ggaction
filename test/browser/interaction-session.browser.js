import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { openBrowserPage, assertNoBrowserErrors, closeBrowserWithEvidence, saveBrowserContextEvidence } from "../support/browser.js";
import { startStaticServer } from "../support/static-server.js";
let browser, server;
test.before(async () => { server = await startStaticServer(fileURLToPath(new URL("../../", import.meta.url))); browser = await chromium.launch({ headless: true }); });
test.after(async () => { await closeBrowserWithEvidence(browser); await server?.close(); });
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
