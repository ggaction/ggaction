import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DOMParser } from "@xmldom/xmldom";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { validateSvgImage } from "../../../src/resources/svgImage.js";
import { prepareImageAsset } from "../../../src/resources/resolveAssets.js";

const encode = source => new TextEncoder().encode(source);
const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50">${body}</svg>`;
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const input = bytes => ({ uri: "fixture:svg", expectedHash: digest(bytes), mimeType: "image/svg+xml" });
const reject = source => assert.throws(() => validateSvgImage(encode(source)), /SVG image/);
const drawing = svg(`<defs><linearGradient id="paint"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#00f"/></linearGradient><clipPath id="clip"><circle cx="50" cy="25" r="20"/></clipPath></defs><rect width="100" height="50" fill="url(#paint)" clip-path="url(#clip)"/>`);

test("accepts only self-contained geometry, local paints, clips and descriptive text", () => {
  assert.deepEqual(validateSvgImage(encode(drawing)), { nodes: 8, references: 2 });
  const source = `<?xml version='1.0' encoding="UTF-8"?>\n<!-- static -->${svg(`<title>A &amp; B &#x1F642;</title><desc>&lt;data&gt; &quot;one&quot; &apos;two&apos;</desc><g id="shapes" transform="translate(1 2)"><path d="M0 0L10 10"/><ellipse rx="2" ry="3"/><line x2="4" y2="5"/><polyline points="0,0 1,1"/><polygon points="0,0 1,1 0,1"/></g>`)}`;
  assert.equal(validateSvgImage(encode(source)).nodes, 9);
  const warnings = [];
  new DOMParser({ onError: (level, message) => warnings.push([level, message]) }).parseFromString(source, "image/svg+xml");
  assert.deepEqual(warnings, []);
  assert.equal(validateSvgImage(encode(svg('<defs><radialGradient id="r"><stop offset="0" stop-color="rgba(1,2,3,.5)"/><stop offset="1" stop-color="transparent"/></radialGradient></defs><circle r="3" fill="url(#r)"/>'))).references, 1);
});

test("rejects executable, external, font, styling and namespace escape surfaces", () => {
  for (const body of [
    '<script>alert(1)</script>', '<foreignObject/>', '<image href="https://example.test/a.png"/>',
    '<use href="#a"/>', '<a href="https://example.test"><rect/></a>', '<text>font dependency</text>',
    '<style>rect{fill:red}</style>', '<animate attributeName="x"/>', '<filter/>', '<pattern/>',
    '<rect onload="run()"/>', '<rect style="fill:url(https://example.test)"/>', '<rect href="data:image/png;base64,x"/>',
    '<svg:rect/>', '<rect xml:base="https://example.test"/>', '<g xmlns="http://example.test"/>',
    '<rect xmlns:xlink="http://www.w3.org/1999/xlink"/>', '<rect fill="url(https://example.test/a.svg#p)"/>',
    '<rect fill="url(&#35;missing)"/>', '<rect fill="u&#114;l(javascript:run())"/>',
    '<rect fill="var(--color)"/>', '<rect fill="red;display:none"/>', '<rect stroke="r\\65 d"/>',
    '<rect transform="url(#x)"/>', '<defs><linearGradient id="p" href="#q"/></defs>',
    '<rect unknown="ignored"/>', '<g><svg xmlns="http://www.w3.org/2000/svg"/></g>'
  ]) reject(svg(body));
});

test("rejects declarations, entities and malformed XML instead of depending on decoder recovery", () => {
  for (const source of ['', '<svg/>', '<svg xmlns="http://example.test"/>',
    '<?xml version="1.0\'?>' + svg(''), '<?xml version="1.1"?>' + svg(''),
    '<?xml version="1.0" encoding="UTF-16"?>' + svg(''), '<?xml-stylesheet href="x"?>' + svg(''),
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///tmp/x">]>' + svg(''), svg('<![CDATA[text]]>'),
    svg('<desc>&unknown;</desc>'), svg('<desc>&#0;</desc>'), svg('<desc>&#xD800;</desc>'),
    svg('<desc>&#1114112;</desc>'), svg('<desc>&broken</desc>'), svg('<desc>]]></desc>'),
    svg('<rect/><'), svg('<rect width="1"width="2"/>'), svg('<rect width="1" width="2"/>'),
    svg('<rect width=1/>'), svg('<rect width="<"/>'), svg('<rect>'), svg('</rect>'),
    svg('<rect></circle>'), svg('<rect/ >'), svg('<rect></rect extra>'), svg('<rect/>') + svg(''),
    svg('<desc>\u0000</desc>'), svg('<desc>bad & text</desc>'), svg('<rect/>trailing'),
    svg('<!-- bad -- comment -->'), svg('<!-- trailing- -->').replace('trailing- ', 'trailing-'),
    svg('<!-- unfinished'), svg('<desc><rect/></desc>')]) reject(source);
  assert.throws(() => validateSvgImage(Uint8Array.of(255)), /UTF-8/);
});

test("requires unique local reference identities and matching resource kinds", () => {
  for (const body of [
    '<rect id="a"/><circle id="a"/>', '<rect id="bad id"/>', '<rect fill="url(#missing)"/>',
    '<rect id="a"/><circle fill="url(#a)"/>', '<defs><linearGradient id="p"/></defs><rect clip-path="url(#p)"/>',
    '<defs><clipPath id="c"><rect clip-path="url(#c)"/></clipPath></defs>',
    '<stop offset="0"/>', '<defs><rect/></defs>', '<rect clip-path="invalid"/>',
    '<defs><radialGradient id="p"><stop stop-color="url(#p)"/></radialGradient></defs>'
  ]) reject(svg(body));
  assert.equal(validateSvgImage(encode(svg('<defs><clipPath id="a"><g><rect width="4" height="5"/></g></clipPath></defs><rect clip-path="none" fill="none" stroke="rgb(1,2,3)"/>'))).nodes, 6);
});

test("bounds bytes, element count and nesting before host decode", () => {
  assert.throws(() => validateSvgImage(new Uint8Array(1024 * 1024 + 1)), RangeError);
  reject(svg('<rect/>'.repeat(10000)));
  reject(svg('<g>'.repeat(128) + '</g>'.repeat(128)));
  assert.equal(validateSvgImage(encode(svg('<g>'.repeat(127) + '</g>'.repeat(127)))).nodes, 128);
  assert.equal(validateSvgImage(encode(svg('<rect/>'.repeat(9999)))).nodes, 10000);
});

test("unsafe SVG fails preparation with retained cause and zero decoder calls", async () => {
  const bytes = encode(svg('<script/>')); let decoded = 0;
  await assert.rejects(prepareImageAsset(input(bytes), {
    load: async () => ({ bytes, mimeType: 'image/svg+xml' }),
    decode: () => { decoded++; return { width: 100, height: 50, originClean: true }; }
  }), error => error.assetCode === 'unsafe-svg' && error.cause instanceof TypeError);
  assert.equal(decoded, 0);
});

test("valid SVG prepares immutable original bytes and decodes without network resources", async () => {
  const bytes = encode(drawing); let image;
  const asset = await prepareImageAsset(input(bytes), {
    load: async () => ({ bytes, mimeType: 'image/svg+xml' }),
    decode: async ({ bytes: data }) => { image = await loadImage(Buffer.from(data)); return { width: image.width, height: image.height, originClean: true }; }
  });
  assert.equal(asset.width, 100); assert.equal(asset.height, 50);
  assert.equal(asset.contentHash, digest(bytes));
  assert.deepEqual(Buffer.from(asset.payload.data, 'base64'), Buffer.from(bytes));
  const canvas = createCanvas(100, 50), ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
  assert.equal(ctx.getImageData(0, 0, 1, 1).data[3], 0);
  assert.equal(ctx.getImageData(50, 25, 1, 1).data[3], 255);
});

test("host error accessors cannot hang preparation or execute user code", async () => {
  const bytes = encode(svg('')); let calls = 0;
  const error = { get name() { calls++; throw new Error('accessor'); } };
  const host = failure => ({ load: () => { throw failure; }, decode: () => {} });
  for (const failure of [error, null, 'offline', new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('trap'); } })]) {
    await assert.rejects(prepareImageAsset(input(bytes), host(failure)), actual => actual.assetCode === 'load-error' && actual.cause === failure);
  }
  await assert.rejects(prepareImageAsset(input(bytes), host(new DOMException('cross-origin', 'SecurityError'))), actual => actual.assetCode === 'cors');
  assert.equal(calls, 0);
});
