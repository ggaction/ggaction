import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
export const reportRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function findRepository(){
 const candidates=[process.env.GGACTION_SOURCE];
 for(let p=reportRoot;;p=path.dirname(p)){candidates.push(p,path.join(p,'ggaction'));if(path.dirname(p)===p)break;}
 for(const p of candidates.filter(Boolean)){
  try{if(JSON.parse(fs.readFileSync(path.join(p,'package.json'),'utf8')).name==='ggaction'&&fs.existsSync(path.join(p,'src/core/ChartProgram.js')))return path.resolve(p);}catch{}
 }
 throw new Error('Set GGACTION_SOURCE to the ggaction checkout.');
}
export async function loadMarked(){
 if(process.env.MARKED_MODULE)return import(pathToFileURL(path.resolve(process.env.MARKED_MODULE)));
 const local=path.join(reportRoot,'.runtime/node_modules/marked/lib/marked.esm.js');
 if(fs.existsSync(local))return import(pathToFileURL(local));
 try{const require=createRequire(path.join(findRepository(),'package.json'));return import(pathToFileURL(require.resolve('marked')));}catch{}
 throw new Error('Install report-only dependency: npm install --prefix '+path.join(reportRoot,'.runtime')+' --ignore-scripts --no-audit --no-fund marked@17.0.5 ; or set MARKED_MODULE.');
}
