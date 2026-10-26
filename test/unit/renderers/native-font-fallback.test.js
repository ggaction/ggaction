import assert from 'node:assert/strict';
import test from 'node:test';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { nativeFontResolver } from '../../../src/renderers/nativeBackend.js';
import { renderToPNGBuffer } from '../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../src/renderers/pdf.js';
import { renderCanvasProgram } from '../../../src/renderers/canvas/index.js';

const scene = (text, fontFamily = 'Arial') => ({ graphicSpec: { order: ['canvas'], objects: {
  canvas: { type: 'canvas', properties: { width: 340, height: 80 }, children: ['label'] },
  label: { type: 'text', properties: { x: 8, y: 8, text, fontSize: 28, fontFamily,
    fill: 'black', textAlign: 'left', textBaseline: 'top' } }
} } });

test('native font fallback keeps authored families first and includes only installed families', () => {
  const resolve = nativeFontResolver({ families: [{family:'Apple SD Gothic Neo'}, {family:'Arial'}, {family:'Noto Sans'}] });
  assert.equal(resolve('Arial'), 'Arial, "Apple SD Gothic Neo", "Noto Sans"');
  assert.equal(resolve('Custom, "Apple SD Gothic Neo"'), 'Custom, "Apple SD Gothic Neo", "Noto Sans"');
  assert.equal(nativeFontResolver({families:[]})('Custom'), 'Custom');
});

test('native fallback preserves Latin pixels and never changes the graphical scene', async () => {
  const p=scene('Electricity 2001–2017'), before=JSON.stringify(p);
  const expected=createCanvas(1,1); renderCanvasProgram(p,expected.getContext('2d'),{},createCanvas);
  const result=await renderToPNGBuffer(p), actual=createCanvas(340,80);
  actual.getContext('2d').drawImage(await loadImage(result.buffer),0,0);
  assert.deepEqual(actual.getContext('2d').getImageData(0,0,340,80).data,
    expected.getContext('2d').getImageData(0,0,340,80).data);
  assert.equal(JSON.stringify(p),before);
});

test('native PNG resolves Hangul through an installed fallback and PDF remains vector text', async t => {
  const installed=new Set(GlobalFonts.families.map(f=>f.family));
  const family=['Noto Sans CJK KR','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic'].find(f=>installed.has(f));
  if(!family){t.skip('No Hangul fallback font is installed on this host.');return;}
  const text='\uC804\uB825 \uC0DD\uC0B0',p=scene(text),before=JSON.stringify(p);
  const explicit=scene(text,`Arial, "${family}"`),expected=createCanvas(1,1);
  renderCanvasProgram(explicit,expected.getContext('2d'),{},createCanvas);
  const actual=createCanvas(340,80),png=await renderToPNGBuffer(p);
  actual.getContext('2d').drawImage(await loadImage(png.buffer),0,0);
  assert.deepEqual(actual.getContext('2d').getImageData(0,0,340,80).data,
    expected.getContext('2d').getImageData(0,0,340,80).data);
  const pdf=await renderToPDFBuffer(p);
  assert.match(pdf.buffer.toString('latin1'),/\/ToUnicode/);
  assert.doesNotMatch(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image/);
  assert.equal(JSON.stringify(p),before);
});
