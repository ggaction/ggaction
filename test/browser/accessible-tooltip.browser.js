import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserContextEvidence} from '../support/browser.js';
import {startStaticServer} from '../support/static-server.js';
let browser,server;
test.before(async()=>{server=await startStaticServer(fileURLToPath(new URL('../../',import.meta.url)), { dependencies: 'repository' });browser=await chromium.launch({headless:true});});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();});
for(const backend of ['canvas','svg']) for(const input of ['keyboard','touch']) test(`${backend} accessible tooltip supports ${input}, current native selection and explicit teardown`,async()=>{
 const section=(await readFile(new URL('../../docs/api/interaction.md',import.meta.url),'utf8')).split('## Accessible tooltips and touch')[1];
 const html=section.match(/```html\n([\s\S]*?)```/)[1],source=section.match(/```javascript\n([\s\S]*?)```/)[1];
 const context=await browser.newContext({viewport:{width:900,height:720},deviceScaleFactor:2,hasTouch:input==='touch'});
 try{
  const {page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
  await page.evaluate(async({html,source,backend})=>{
   window.__inspectionSessions.forEach(session=>session.destroy());document.body.replaceChildren();
   const main=document.createElement('main');main.innerHTML=html;document.body.append(main);
   for(const [specifier,file] of [['ggaction','index'],['ggaction/accessibility','accessibility'],['ggaction/interaction','interaction'],['ggaction/scene','scene']])source=source.replaceAll(JSON.stringify(specifier),JSON.stringify(new URL(`/src/${file}.js`,location.href).href));
   source=source.replace('{ name: "C",','{ name: "<img src=x onerror=alert(1)>",');
   const url=URL.createObjectURL(new Blob([source+'\nwindow.__accessible=accessibleSession;window.__disposeAccessible=disposeAccessible;'],{type:'text/javascript'}));try{await import(url);}finally{URL.revokeObjectURL(url);}
   if(backend==='svg'){
    const {renderToSVG}=await import('/src/renderers/svg.js');const panel=document.createElement('div');panel.setAttribute('aria-hidden','true');document.querySelector('#accessible-canvas').style.display='none';document.querySelector('#accessible-chart').prepend(panel);
    const draw=()=>{panel.innerHTML=renderToSVG(window.__accessible.getState().program);};draw();window.__accessible.subscribe(draw);
   }
  },{html,source,backend});
  const surface=page.locator('#accessible-chart'),tooltip=page.locator('#accessible-tooltip');
  const box=await surface.boundingBox();
  if(input==='keyboard'){
   await page.mouse.move(box.x+294,box.y+118);assert.equal(await tooltip.textContent(),'B: x 8, y 7. Not selected.');assert.equal(await tooltip.isVisible(),true);
   const tip=await tooltip.boundingBox();await page.mouse.move(tip.x+10,tip.y+10);assert.equal(await tooltip.isVisible(),true);
   await page.keyboard.press('Escape');assert.equal(await tooltip.isVisible(),false);assert.equal(await surface.getAttribute('aria-describedby'),null);
   await surface.focus();await page.keyboard.press('Home');assert.equal(await tooltip.textContent(),'A: x 2, y 3. Not selected.');
   await page.keyboard.press('Enter');assert.equal(await tooltip.textContent(),'A: x 2, y 3. Selected.');
   await page.keyboard.press('Escape');assert.equal(await tooltip.isVisible(),false);assert.equal(await page.evaluate(()=>window.__accessible.getState().history.undoCount),1);
   await page.keyboard.press('End');assert.match(await tooltip.textContent(),/^<img src=x onerror=alert\(1\)>:/);assert.equal(await page.locator('main img').count(),0);
   await page.keyboard.press('Home');await page.locator('#accessible-hide').click();assert.equal(await surface.getAttribute('aria-activedescendant'),null);assert.equal(await page.evaluate(()=>window.__accessible.getState().focus.itemKey),null);assert.equal(await page.getByRole('option').count(),2);
   await page.evaluate(()=>window.__accessible.updateProgram(window.__accessible.getState().program.removeMark({target:'points'})));assert.equal(await page.getByRole('option').count(),0);assert.equal(await tooltip.isVisible(),false);
  }else{
   await page.touchscreen.tap(box.x+294,box.y+118);assert.equal(await tooltip.textContent(),'B: x 8, y 7. Selected.');assert.equal(await tooltip.isVisible(),true);
   assert.equal(await page.evaluate(()=>window.__accessible.getState().history.undoCount),1);assert.equal(await page.evaluate(()=>document.activeElement.id),'accessible-chart');
   await page.touchscreen.tap(box.x+294,box.y+118);assert.equal(await tooltip.textContent(),'B: x 8, y 7. Not selected.');assert.equal(await page.evaluate(()=>window.__accessible.getState().history.undoCount),2);
  }
  const a11y=await new AxeBuilder({page}).include('main').analyze();assert.deepEqual(a11y.violations,[]);
  await page.locator('#accessible-dispose').click();assert.equal(await tooltip.isVisible(),false);const revision=await page.evaluate(()=>window.__accessible.getState().revision);
  await surface.focus();await page.keyboard.press('Enter');await page.mouse.click(box.x+294,box.y+118);assert.equal(await page.evaluate(()=>window.__accessible.getState().revision),revision);assert.equal(await page.evaluate(()=>window.__accessible.getState().destroyed),true);
  assertNoBrowserErrors(errors,`${backend} ${input} accessible tooltip`);await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});
