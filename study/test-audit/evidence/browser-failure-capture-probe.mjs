import assert from 'node:assert/strict';
import {readdir,writeFile} from 'node:fs/promises';
import {chromium} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/node_modules/playwright/index.mjs';
import {startStaticServer} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/static-server.js';
import {openBrowserPage,closeBrowserWithEvidence} from '/Users/hj/Desktop/ggaction_chongjeonglee/ggaction/test/support/browser.js';
const root='/Users/hj/Desktop/ggaction_chongjeonglee/ggaction';
const evidence='/Users/hj/Desktop/ggaction_chongjeonglee/study/test-audit/evidence';
const before=await readdir(`${root}/.artifacts/failures`).catch(()=>[]);
const browser=await chromium.launch({headless:true}),server=await startStaticServer(root);
let caught,remainingPages;
try{
 const {page}=await openBrowserPage(browser,server.baseUrl+'examples/named-shapes/',{waitFor:()=>window.__ggactionExample!==undefined});
 try{assert.equal('actual','expected','Intentional post-readiness assertion failure');}
 finally{await page.close();}
}catch(error){caught=error.message;}
finally{
 remainingPages=browser.contexts().flatMap(x=>x.pages()).length;
 await closeBrowserWithEvidence(browser);await server.close();
}
const after=await readdir(`${root}/.artifacts/failures`).catch(()=>[]);
const results={caught,remainingPagesBeforeEvidenceCapture:remainingPages,newFailureDirectories:after.filter(x=>!before.includes(x)),pattern:'named-shapes.browser.js:44-45'};
await writeFile(`${evidence}/browser-failure-capture-results.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
