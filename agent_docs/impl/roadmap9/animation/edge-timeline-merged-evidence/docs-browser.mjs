import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=path.resolve('_site');
const server=createServer(async(req,res)=>{try{
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/ggaction(?=\/|$)/,'');
 let file=path.join(root,relative);assert.ok(file.startsWith(root));if((await stat(file)).isDirectory())file=path.join(file,'index.html');
 const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]??'application/octet-stream';res.writeHead(200,{'content-type':mime});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{for(const width of [320,390,768,1440]){const context=await browser.newContext({viewport:{width,height:900}});
 try{for(const pagePath of ['api/interaction/','reference/runtime/']){const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const response=await page.goto(`http://127.0.0.1:${server.address().port}/ggaction/${pagePath}`,{waitUntil:'networkidle'});assert.ok(response.ok());
  const bounds=await page.evaluate(()=>{const width=document.documentElement.clientWidth,content=document.querySelector('.docs-content').getBoundingClientRect();return {width,scroll:document.documentElement.scrollWidth,escaped:[...document.querySelectorAll('.docs-content pre,.docs-content table,.docs-content img')].filter(element=>{const b=element.getBoundingClientRect();return b.left< -1||b.right>width+1||b.right>content.right+1;}).map(element=>element.tagName)};});
  assert.equal(bounds.width,bounds.scroll);assert.deepEqual(bounds.escaped,[]);
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();assert.deepEqual(axe.violations,[]);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({width,pagePath,overflow:0,axe:0,errors:0}));await page.close();
 }}finally{await context.close();}}
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
