import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
process.env.npm_execpath="/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js";
const root=process.cwd(), temporary=path.join(root,'scripts/.routes-package-measure.mjs');
try {
  const source=(await readFile(path.join(root,'scripts/package-artifact.js'),'utf8')).replace('function runPack(', 'export function runPack(');
  await writeFile(temporary,source);
  const {runPack}=await import(pathToFileURL(temporary));
  const manifest=runPack(['--dry-run'],root);
  const output={node:process.version,zlib:process.versions.zlib,entries:manifest.entryCount,packedBytes:manifest.size,unpackedBytes:manifest.unpackedSize};
  await writeFile(path.join(root,'.artifacts/routes/package-size-'+process.version+'.json'),JSON.stringify(output,null,2)+'\n');
  console.log(output);
} finally {await unlink(temporary).catch(()=>{});}
