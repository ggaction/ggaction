import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { nativeFontResolver, nativeFontRegistrar } from '../../../src/renderers/nativeBackend.js';
import { renderToPNGBuffer } from '../../../src/renderers/png.js';
import { renderToPDFBuffer } from '../../../src/renderers/pdf.js';
import { prepareFontRendering } from '../../../src/renderers/fontRendering.js';
import { rendererFontFamily } from '../../../src/renderers/text.js';
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
  const installed=new Set(GlobalFonts.families.map(f=>f.family));
  const family=['Arial','DejaVu Sans','Liberation Sans','Noto Sans'].find(f=>installed.has(f));
  assert.ok(family, 'An installed Latin font is required for same-font pixel equality');
  const p=scene('Electricity 2001–2017',family), before=JSON.stringify(p);
  const expected=createCanvas(1,1); renderCanvasProgram(p,expected.getContext('2d'),{},createCanvas);
  const result=await renderToPNGBuffer(p), actual=createCanvas(340,80);
  actual.getContext('2d').drawImage(await loadImage(result.buffer),0,0);
  assert.equal(Buffer.compare(Buffer.from(actual.getContext('2d').getImageData(0,0,340,80).data),
    Buffer.from(expected.getContext('2d').getImageData(0,0,340,80).data)),0,'Exact native font pixels');
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
  assert.equal(Buffer.compare(Buffer.from(actual.getContext('2d').getImageData(0,0,340,80).data),
    Buffer.from(expected.getContext('2d').getImageData(0,0,340,80).data)),0,'Exact native font pixels');
  const pdf=await renderToPDFBuffer(p);
  assert.match(pdf.buffer.toString('latin1'),/\/ToUnicode/);
  assert.doesNotMatch(pdf.buffer.toString('latin1'),/\/Subtype\s*\/Image/);
  assert.equal(JSON.stringify(p),before);
});


test('Canvas default fallback order preserves authored families and deduplicates their quoted names', () => {
  const suffix = '"Noto Sans CJK KR", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", '
    + '"Noto Sans CJK JP", "Noto Sans JP", "Yu Gothic", "Meiryo", '
    + '"Noto Sans CJK SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", '
    + '"Noto Sans CJK TC", "PingFang TC", "Microsoft JhengHei", '
    + '"Arial Unicode MS", "Noto Sans", "DejaVu Sans", "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"';
  assert.equal(rendererFontFamily('sans-serif'), `sans-serif, ${suffix}`);
  const authored = "Custom, 'NOTO SANS CJK KR'";
  assert.equal(rendererFontFamily(authored), `${authored}, ${suffix.slice(suffix.indexOf(', ') + 2)}`);
});

test('generic Canvas and native exports agree before, during and after exact font leases', async () => {
  const bytes = readFileSync(new URL('../../fixtures/fonts/metric-fixture.ttf', import.meta.url));
  const font = { contentHash: createHash('sha256').update(bytes).digest('hex'), mimeType: 'font/ttf', byteLength: bytes.length,
    family: 'ggaction Metric Fixture', style: 'normal', weight: 400, metricsProviderVersion: 'fixture@1',
    payload: { encoding: 'base64', data: bytes.toString('base64') } };
  const generic = scene('Root 0.9', 'sans-serif'), original = JSON.stringify(generic);
  let initialPixels;
  async function compare() {
    const canvas = createCanvas(1, 1);
    renderCanvasProgram(generic, canvas.getContext('2d'), {}, createCanvas);
    const png = await renderToPNGBuffer(generic);
    assert.deepEqual(png.buffer, canvas.toBuffer('image/png'));
    if (initialPixels === undefined) initialPixels = png.buffer;
    else assert.deepEqual(png.buffer, initialPixels, 'Unbound glyphs remain stable across exact font leases');
    const pdf = await renderToPDFBuffer(generic);
    assert.match(pdf.buffer.toString('latin1'), /\/ToUnicode/);
    assert.doesNotMatch(pdf.buffer.toString('latin1'), /\/Subtype\s*\/Image/);
  }
  await compare();
  const bound = scene('AB', font.family);
  Object.assign(bound.graphicSpec.objects.label.properties, { font, fontWeight: 400 });
  const fonts = await prepareFontRendering(bound, { register: nativeFontRegistrar(GlobalFonts) });
  try {
    const png = await renderToPNGBuffer(bound);
    assert.ok(png.buffer.length > 0);
    await compare();
  } finally { fonts.dispose(); }
  await compare();
  assert.equal(JSON.stringify(generic), original);
});
