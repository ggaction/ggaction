import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserContextEvidence} from '../support/browser.js';
import {startStaticServer} from '../support/static-server.js';
let browser,server;
test.before(async()=>{server=await startStaticServer(fileURLToPath(new URL('../../',import.meta.url)));browser=await chromium.launch({headless:true});});
test.after(async()=>{await closeBrowserWithEvidence(browser);await server?.close();});
for(const backend of ['canvas','svg']) test(`keyboard native items expose safe focused alternatives beside ${backend}`,async()=>{
 const section=(await readFile(new URL('../../docs/api/interaction.md',import.meta.url),'utf8')).split('## Keyboard item focus')[1];
 const html=section.match(/```html\n([\s\S]*?)```/)[1],source=section.match(/```javascript\n([\s\S]*?)```/)[1];
 const context=await browser.newContext({viewport:{width:800,height:600},deviceScaleFactor:2});
 try {
  const {page,errors}=await openBrowserPage(context,new URL('examples/inspect-chart/',server.baseUrl).href,{waitFor:()=>window.__inspectionSessions?.length===2});
  await page.evaluate(async({html,source,backend})=>{
   window.__inspectionSessions.forEach(session=>session.destroy());
   document.body.replaceChildren();const main=document.createElement('main');main.innerHTML=html;document.body.append(main);
   // The static authored HTML is trusted; all data strings in the actual example use textContent.
   for(const [specifier,file] of [['ggaction','index'],['ggaction/accessibility','accessibility'],['ggaction/interaction','interaction'],['ggaction/scene','scene']])source=source.replaceAll(JSON.stringify(specifier),JSON.stringify(new URL(`/src/${file}.js`,location.href).href));
   const url=URL.createObjectURL(new Blob([source+'\nwindow.__keyboard=keyboardSession;window.__disposeKeyboard=disposeKeyboard;'],{type:'text/javascript'}));
   try{await import(url);}finally{URL.revokeObjectURL(url);}
   if(backend==='svg'){
    const {renderToSVG}=await import('/src/renderers/svg.js');const panel=document.createElement('div');panel.setAttribute('aria-hidden','true');document.querySelector('#item-canvas').style.display='none';document.querySelector('#item-focus').prepend(panel);
    const draw=()=>{panel.innerHTML=renderToSVG(window.__keyboard.getState().program);};draw();window.__keyboard.subscribe(draw);
   }
   const button=document.createElement('button');button.id='hide-first';button.textContent='Hide A';button.onclick=()=>window.__keyboard.updateProgram(window.__keyboard.getState().program.filterMarks({target:'points',field:'name',op:'eq',value:'B'}));main.append(button);
   const field=document.createElement('input');field.setAttribute('aria-label','Host text');document.querySelector('#item-focus').append(field);
  },{html,source,backend});
  await page.locator('#item-focus').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#item-focus').getAttribute('aria-activedescendant'),'measurement-0');
  assert.equal(await page.locator('#measurement-0').textContent(),'A: x 1, y 2');
  await page.keyboard.press('Enter');
  const focused=await page.locator('#item-focus').getAttribute('aria-activedescendant');assert.equal(await page.locator(`#${focused}`).getAttribute('aria-selected'),'true');assert.equal(await page.locator(`#${focused}`).textContent(),'A: x 1, y 2');
  assert.equal(await page.evaluate(()=>window.__keyboard.getState().history.undoCount),1);
  await page.getByRole('textbox',{name:'Host text'}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#item-focus').getAttribute('aria-activedescendant'),focused);
  await page.getByRole('textbox',{name:'Host text'}).evaluate(element=>element.remove());
  await page.getByRole('button',{name:'Hide A'}).click();assert.equal(await page.locator('#item-focus').getAttribute('aria-activedescendant'),null);assert.equal(await page.evaluate(()=>window.__keyboard.getState().focus.itemKey),null);
  await page.locator('#item-focus').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#measurement-0').textContent(),'B: x 2, y 3');
  await page.keyboard.press('Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'item-focus');
  const a11y=await new AxeBuilder({page}).include('main').analyze();assert.deepEqual(a11y.violations,[]);
  assert.equal(await page.evaluate(()=>Object.isFrozen(window.__keyboard.getState().focus)),true);
  await page.evaluate(()=>window.__disposeKeyboard());const revision=await page.evaluate(()=>window.__keyboard.getState().revision);await page.locator('#item-focus').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.__keyboard.getState().revision),revision);
  assertNoBrowserErrors(errors,`keyboard ${backend}`);await page.close();
 }catch(error){await saveBrowserContextEvidence(context,error);throw error;}finally{await context.close();}
});
