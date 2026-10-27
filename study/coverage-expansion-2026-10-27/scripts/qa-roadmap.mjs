import {findRepository} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(findRepository(),'package.json'));
const {chromium}=require('playwright');
const plan=JSON.parse(fs.readFileSync(path.join(root,'roadmap/plan.json'),'utf8'));
const build=JSON.parse(fs.readFileSync(path.join(root,'evidence/roadmap-build.json'),'utf8'));
const checks=[],errors=[],network=[];
const check=(name,ok,detail)=>{checks.push({name,passed:!!ok,detail});if(!ok)errors.push(name);};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:'ko-KR'});
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
const previews=path.join(root,'evidence/roadmap-preview');fs.mkdirSync(previews,{recursive:true});
try{
 await page.goto(pathToFileURL(path.join(root,'ROADMAP.ko.html')).href);
 await page.screenshot({path:path.join(previews,'desktop.png')});
 check('desktop width',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 check('all cards and sections',await page.locator('article h3[id^="step-"]').count()===plan.tasks.length);
 check('unique anchors',await page.locator('[id]').evaluateAll(es=>new Set(es.map(e=>e.id)).size===es.length));
 await page.locator('#wp-filter').selectOption('WP-25');
 check('WP filter',await page.locator('.task-nav a:visible').count()===plan.tasks.filter(t=>t.workPackage==='WP-25').length);
 const t=plan.tasks.find(t=>t.slug==='force-edge-bundling');
 await page.locator('.task-nav a[href="#'+t.id.toLowerCase()+'"]').click();
 check('task navigation',await page.locator('#'+t.id.toLowerCase()).evaluate(e=>Math.abs(e.getBoundingClientRect().top-24)<10));
 await page.screenshot({path:path.join(previews,'task-card.png')});
 for(const q of ['sourceRevisionVector','maxStretch','UpSet','STEP-035','schema 4']){
  await page.locator('#search').fill(q);check('search '+q,await page.locator('.search-results button').count()>0);
  await page.locator('.search-results button').first().click();check('jump '+q,await page.locator('.highlight').count()===1);
 }
 await page.locator('#search').fill('no-match-84729936');check('empty search',await page.locator('.search-results button').count()===0);
 await page.locator('#search').press('Escape');check('escape restores toc',await page.locator('.toc').isVisible());
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.join(previews,'mobile.png')});
 check('mobile no document overflow',await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth));
 await page.locator('.mobile-menu').click();check('mobile menu open',await page.locator('aside').isVisible());
 await page.locator('.task-nav a:visible').first().click();check('mobile menu closes',!(await page.locator('aside').isVisible()));
 check('mobile tables scroll',await page.locator('.table-scroll').evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth)));
 await page.screenshot({path:path.join(previews,'mobile-task.png')});
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({media:'print'});
 check('print hides navigation',!(await page.locator('aside').isVisible()));
 check('offline viewer network zero',network.length===0,network);
 check('no JS errors',errors.length===0,errors.slice());
}catch(e){errors.push(e.stack);}finally{
 const result={scope:'Roadmap HTML UI, not ggaction runtime',htmlSha256:build.htmlSha256,browser:browser.version(),passed:errors.length===0,checks,errors};
 fs.writeFileSync(path.join(root,'evidence/roadmap-ui-qa.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));await browser.close();
}
if(errors.length)process.exitCode=1;
