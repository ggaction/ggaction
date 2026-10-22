import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlElementIds } from '../../scripts/html-element-ids.js';

test('escaped code examples do not become real fragment targets or duplicate ids',()=>{
 const html='<main id="main"><code>&lt;canvas id="chart"&gt;</code><code>&lt;canvas id="chart"&gt;</code></main>';
 assert.deepEqual(htmlElementIds(html),['main']);
});
test('actual duplicate element ids remain observable by the built checker',()=>{
 const ids=htmlElementIds('<canvas id="chart"></canvas><div id="chart"></div>');
 assert.deepEqual(ids,['chart','chart']);assert.notEqual(new Set(ids).size,ids.length);
});
test('comments, raw text and quoted attribute examples cannot supply fragment targets',()=>{
 const html='<!-- <div id="comment"> --><script id="script">const x="<div id=wrong>";</script><style>.a:after{content:"<a id=wrong>"}</style><textarea><div id=wrong></textarea><p title="example id=wrong" id="real>target">x</p>';
 assert.deepEqual(htmlElementIds(html),['script','real>target']);
});
test('element ids support quoted and unquoted attributes without mistaking data-id',()=>{
 assert.deepEqual(htmlElementIds('<p data-id="fake" id=one></p><div ID = \'two\' hidden></div><input id="three"/>'),['one','two','three']);
});
