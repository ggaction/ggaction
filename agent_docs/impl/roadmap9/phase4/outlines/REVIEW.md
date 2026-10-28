# Mark·text outline와 halo primitive 검토

## 진행 상태

- [x] 기존 mark stroke/bounds owner 재사용과 독립 literal
- [x] 동일한 font bytes의 native/browser strokeText·SVG text stroke·PDF probe
- [x] Mark/text outline·halo·opacity·clip·zero-width의 실행 source와 이미지
- [x] 검증된 review source/evidence의 원격 checkpoint
- [ ] 사용자의 rendered target 확인
- [ ] 공개 text stroke/schema/bounds/action 연결

상태 `ready-for-review`. Roadmap 9 전체 실행 승인과 부모 agent의 private 조사 위임으로 준비했다. 이 이미지의 시각 승인이나 STEP-017 완료를 뜻하지 않는다. Pattern/radial/shadow/blend 검토의 승인도 별도다.

## 실행 source와 시각 의미

`test/gates/outline-paints/fixture.js`, `primitive.program.js`, `manifest.js`가 정확한 source다. 실행 예는 `drawOutlinePrimitive(context, outlineFixture("text-halo"), optionalAttenuatedGlyphPNG)`다. Opaque target은 PNG 인자 없이 vector stroke 뒤에 fill을 그린다. `text-opacity`만 같은 source glyph를100×70 surface에 그린 뒤 alpha를 .5배 한 PNG를 전달한다.

| variant | 정확한 목표 |
|---|---|
| rectangle-outline | rect 경계에 보라색8px centered stroke, fill이 안쪽 stroke를 덮음 |
| circle-halo | circle 경계의 흰색16px stroke; blur 없는8px 바깥 halo |
| path-outline | 닫힌 triangle의 round join8px stroke |
| text-outline | 같은 font의 `strokeText`→`fillText`,8px stroke |
| text-halo | 같은 text geometry의 흰색16px stroke |
| text-opacity | stroke+fill을 완성한 glyph에 opacity .5를 한 번 적용 |
| clip | fill과 outline을 동일 rectangle로 clip |
| zero-width | strokeWidth0에서 stroke 호출 없이 fill만 출력 |

Frame은280×200이고, 회색 배경 panel은(20,45)부터240×135다. Fill RGB [34,139,180], outline [92,42,115], halo white다. LineJoin/LineCap은 round다. Halo는 이번 검토에서 명시 stroke이며 shadow blur와 혼동하지 않는다. Public halo/outline 옵션 이름·저장 형식을 새로 확정한 것은 아니다.

## 고정 font와 text 경계

부모 agent의 private font checkpoint `e17a8255`에서 `test/fixtures/fonts/`를 그대로 재사용한다. SHA256은 `cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878`, family는 `ggaction Metric Fixture`다. 원본 MIT geometric test font이며 생성기·README·binary를 함께 보존했다. 이 font의 A/B는 사각형이므로 이미지에서 글자가 사각형으로 보이는 것은 의도한 numeric fixture다. 실제 서체의 미관, 한글/emoji/shaping 지원을 대신하지 않는다.

Units/em1000, A advance600/B800이며60px `AB`의 advance는84px다. Native/browser Canvas에서 이를 exact 확인한다. SVG도 같은 font bytes를 data URL `@font-face`로 포함한다. Native PDF는 같은 등록 font를 사용한다. 신규 font-outline provider나 font parser를 추가하지 않았다.

Oracle는 font parser/renderer에서 기대 geometry를 읽지 않는다. 사전에 선언한 glyph A [50,0,550,700], B [50,0,750,700]와 advances600/800을 사용한다. Baseline(80,130),60px에서 fill의 union은 [83,88]–[161,130]이다.8px outline bounds는 left79/right165/top84/bottom134다. 실제 opaque strokeText/SVG text stroke는 이 literal bounds와 interior colors를 만족한다.

현재 공개 text schema는 stroke/strokeWidth를 받지 않고 `resolvePrimitiveGraphicBounds("text")`는 fill text bounds를 사용한다. 이 상태를 unit test에 명시하며 지원을 이미 추가한 것처럼 보고하지 않는다. 공개 연결 때 schema·bounds/hit·rotation/lines/alignment·metric/font resource binding을 함께 확장해야 한다.

## 수치·alpha·renderer 증거

기존 `src/grammar/strokeStyle.js`와 `schemas/graphicBounds.js`가 mark stroke의 cap/join/bounds를 소유한다. 새 production 계산을 복제하지 않았다. Normal test는 rect bounds [76,76]–[204,144], circle [96,66]–[184,154], triangle [76,66]–[204,144]를 literal로 확인한다. 별도 oracle는 rect/circle/triangle 거리와 text glyph literal로 fill/바깥 stroke 색을 정한다.

최종204개 interior 표본은8 variants의 Native Canvas/PNG, browser Canvas, browser SVG, native PDF72dpi를 비교한다. RGB±1 byte, alpha exact다. Stroke와 fill이 겹치는 text pixel(84,110)도 포함한다. `text-opacity` 기대값은 fill [130,186,210,255], stroke [159,137,178,255]다. 두 paint에 .5를 각각 적용하는 중복 alpha 대신, opaque로 합성한 glyph alpha를 한 번 줄인다.

Opaque7 variants는 PDF image 수0으로 vector output을 확인한다. `text-opacity`만100×70 image/SMask를 갖고 frame 전체를 rasterize하지 않는다. Shared source glyph는28,000 RGBA bytes이며 같은 PNG bytes를 네 경로에 전달한다. 동적 allocation policy나 전체 renderer 기능을 이 고정 fixture로 대체하지 않는다.

각 경로에서 panel 전체의 background와 다른 ink를 검사한다. 수치 geometry bounds는 바꾸지 않고, **closed pixel cell이 그 bounds와 교차하는지** 확인한다. PDF는 정확한 경계 x204에 닿는 pixel을 칠할 수 있어 처음의 half-open pixel 검사에서 차이가 났다. 이 관측은 `.artifacts/outline-review/first-bounds-render/render.log`에 보존한다. 최종 evidence는 boundaryTouchPixels를 따로 기록하며 bounds와 교차하지 않는 outside pixel은0이다. Antialias edge의 exact equality를 주장하지 않는다.

## 재현과 남은 범위

```sh
node scripts/run-tests.js gates gates/outline-paints/primitive.test.js
node scripts/run-tests.js render gates/outline-paints/backends.render.js
node scripts/run-tests.js unit unit/grammar/graphic-bounds.test.js unit/grammar/stroke-style.test.js unit/renderers/canvas-stroke-details.test.js unit/renderers/normal-glyph-opacity.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js
npm run package:check
```

Atlas는 `.artifacts/test/png/review/outline-paints/contact-sheet.png`다. 각 variant에 primitive.png/svg/pdf, pdf.png, browser-canvas.png, browser-svg.png, 공용 variant.json과 별도 evidence.json을 만든다. Text-opacity에는 isolated-glyph.png도 있다. [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)에 inputs/output/log hashes를 기록한다.

Primitive2/2, render1/1, 기존 stroke/opacity16/16, contracts38/38과 package check가 통과했다. Runtime/public schema/source 변경은0이며 package dimensions는681 entries/1,014,128 packed/4,727,468 unpacked bytes다. Font fixture는 STEP019 소유자의 같은 bytes이며 별도 provider를 만들지 않는다.

전체 mark/text consumers, real font outlines/holes/complex scripts, fractional geometry·HiDPI, stroke color alpha·glyph opacity 조합, strict color validation, inspection/hit/clip bounds, scene/codec, rematerialization, Full/Basic/types와 public/primitive parity가 남아 있다. Pattern/radial/shadow/blend 지원표와 함께 공개 integration을 마쳐야 한다. Source/evidence revision은 metadata 기록에서 고정한다.
