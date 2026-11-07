import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';import {pathToFileURL}from'node:url';
process.env.npm_execpath='/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js';
const root=process.cwd(),temporary=path.join(root,'scripts/.geo-labels-measure.mjs');
try{await writeFile(temporary,(await readFile('scripts/package-artifact.js','utf8')).replace('function runPack(', 'export function runPack('));
const {runPack}=await import(pathToFileURL(temporary));const m=runPack(['--dry-run'],root),o={node:process.version,zlib:process.versions.zlib,entries:m.entryCount,packedBytes:m.size,unpackedBytes:m.unpackedSize};await writeFile('.artifacts/geo/labels/package-size-'+process.versions.node.split('.')[0]+'.json',JSON.stringify(o,null,2));console.log(o);
}finally{await unlink(temporary).catch(()=>{});}
