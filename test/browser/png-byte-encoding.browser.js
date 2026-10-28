import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";
import {chromium} from "playwright";
import {encodeRGBA8PNG} from "../../src/core/pngEncoding.js";
import {startStaticServer} from "../support/static-server.js";
import {openBrowserPage,assertNoBrowserErrors,closeBrowserWithEvidence,saveBrowserEvidence} from "../support/browser.js";
const root=fileURLToPath(new URL("../../",import.meta.url));

test("browser glyph PNG bytes equal Node bytes and decode without Canvas encoding",async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),"ggaction-png-bytes-"));let server,browser;
  try{
    const bundle=await build({stdin:{contents:"export {encodeRGBA8PNG} from './src/core/pngEncoding.js';",resolveDir:root},bundle:true,format:"esm",platform:"browser",write:false});
    await writeFile(path.join(directory,"encoder.js"),bundle.outputFiles[0].contents);
    await writeFile(path.join(directory,"index.html"),'<!doctype html><p id="status">Ready</p><canvas aria-label="Decoded glyph PNG"></canvas>');
    server=await startStaticServer(directory);browser=await chromium.launch({headless:true});
    const opened=await openBrowserPage(browser,server.baseUrl,{waitFor:()=>document.querySelector("#status").textContent==="Ready"});
    const inputs=[[1,1],[3,2],[65,252]].map(([width,height])=>({width,height,rgba:Array.from({length:width*height*4},(_,i)=>[255,0,128,255][i%4])}));
    const actual=await opened.page.evaluate(async inputs=>{
      const{encodeRGBA8PNG}=await import("/encoder.js"),results=[];
      for(const input of inputs){
        const bytes=encodeRGBA8PNG({...input,rgba:new Uint8Array(input.rgba)});
        const base64=btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(""));
        const image=new Image();image.src="data:image/png;base64,"+base64;await image.decode();
        const canvas=document.querySelector("canvas");canvas.width=image.width;canvas.height=image.height;
        canvas.getContext("2d").drawImage(image,0,0);
        results.push({base64,width:image.width,height:image.height,pixel:[...canvas.getContext("2d").getImageData(image.width-1,image.height-1,1,1).data]});
      }
      return results;
    },inputs);
    for(const [index,input]of inputs.entries()){
      const expected=encodeRGBA8PNG({...input,rgba:new Uint8Array(input.rgba)}),output=actual[index];
      assert.deepEqual(Buffer.from(output.base64,"base64"),Buffer.from(expected));
      assert.deepEqual([output.width,output.height],[input.width,input.height]);
      assert.deepEqual(output.pixel,[255,0,128,255]);
    }
    assert.equal(await opened.page.locator('canvas[aria-label="Decoded glyph PNG"]').count(),1);
    assertNoBrowserErrors(opened.errors,"PNG byte encoding");await opened.page.close();
  }catch(error){await saveBrowserEvidence(browser,error);throw error;}
  finally{await closeBrowserWithEvidence(browser);await server?.close();await rm(directory,{recursive:true,force:true});}
});
