import fs from 'node:fs/promises';import path from 'node:path';import {parse}from'acorn';
import {preparePackageConsumer}from'../../scripts/package-consumer.js';
import {run,tscCommand}from'../../scripts/consumers/runtime.js';
import {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS}from'../../scripts/browser-bundle-size.js';
import {documentationPrograms,copyDocumentationSupportFiles}from'../../scripts/doc-snippets.js';
import assert from'node:assert/strict';
const artifact=JSON.parse(await fs.readFile('.artifacts/geo/conditional/package.json','utf8')),consumer=await preparePackageConsumer({packageSpec:artifact.file});
const report={node:process.version,zlib:process.versions.zlib,sha256:artifact.sha256,cases:[],bundles:{}};
try{
 run('npm',['install','--ignore-scripts','--no-audit','--no-fund','@napi-rs/canvas@'+consumer.installedManifest.peerDependencies['@napi-rs/canvas']],consumer.directory);
 for(const name of ['geographic-encodings'])await fs.copyFile('scripts/consumers/fixtures/node/'+name+'.mjs',path.join(consumer.directory,name+'.mjs'));
 await fs.writeFile(path.join(consumer.directory,'run.mjs'),`import fs from'node:fs/promises';const out=[];for(const name of ['geographic-encodings']){const {cases}=await import('./'+name+'.mjs');for(const entry of cases){await entry.run();out.push({id:entry.id,status:'passed'});await fs.writeFile('cases.json',JSON.stringify(out));}}`);
 run(process.execPath,['run.mjs'],consumer.directory);report.cases=JSON.parse(await fs.readFile(path.join(consumer.directory,'cases.json'),'utf8'));
 const typeSource=await fs.readFile('test/contracts/geo-mark-types.test.js','utf8');
 const ast=parse(typeSource,{ecmaVersion:'latest',sourceType:'module'});let template;
 function visit(node){if(!node||typeof node!=='object')return;if(node.type==='TemplateLiteral'&&node.quasis[0].value.cooked.includes('GeoPointMarkOptions'))template=node;for(const [key,value]of Object.entries(node)){if(key==='quasis')continue;if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}}
 visit(ast);assert.ok(template);const types=template.quasis.map((part,i)=>part.value.cooked+(i<template.expressions.length?JSON.stringify(i===0?'ggaction':'ggaction/basic'):'')).join('');
 await fs.writeFile(path.join(consumer.directory,'types.mts'),types);run(process.execPath,[tscCommand,'--strict','--exactOptionalPropertyTypes','--noEmit','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','types.mts'],consumer.directory);report.types='strict Full/Basic geographic encodings consumer passed';
 const snippets=(await documentationPrograms()).filter(item=>item.id==='geographic-feature-conditions');assert.equal(snippets.length,1);
 for(const [i,snippet]of snippets.entries()){await copyDocumentationSupportFiles(snippet,consumer.directory);await fs.writeFile(path.join(consumer.directory,`snippet-${i}.mjs`),snippet.code);run(process.execPath,[`snippet-${i}.mjs`],consumer.directory);}report.snippets=snippets.map(item=>item.id??item.file);
 for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/interaction','ggaction/graph']){const result=await measureMinimalBrowserBundle(consumer.directory,{specifier});report.bundles[specifier]=result;assert.ok(result.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS[specifier],`${specifier}: ${result.gzipBytes} exceeds ${BROWSER_BUNDLE_GZIP_LIMITS[specifier]}`);}
}finally{await fs.writeFile('.artifacts/geo/conditional/installed-'+process.versions.node.split('.')[0]+'.json',JSON.stringify(report,null,2));await consumer.cleanup();}
console.log(JSON.stringify(report,null,2));
