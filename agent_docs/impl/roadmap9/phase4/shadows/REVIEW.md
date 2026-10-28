# Shadow primitive 시각 검토

## 진행 상태

- [x] Pixel-space alpha mask 계산과 독립 oracle
- [x] Blur·offset·alpha·clip·circle의 실행 source/manifest
- [x] 동일 sublayer PNG와 PDF 내부 payload 검증
- [x] 최종 검증·source/evidence revision 원격 기록
- [x] 사용자의 rendered target 확인
- [ ] 공개 paint/action/renderer flow 연결

상태 `approved`. Roadmap 9 전체 실행 승인과 부모 agent의 private 구현 위임으로 준비했다. 새 시각 목표를 승인한 것으로 기록하지 않는다. STEP-017과 AT-13 완료가 아니다. Pattern/radial의 승인과도 별도다.

## 사용자 승인 기록

현재 대화에서 사용자가 **“표시한 그림자와 처리 방식 승인”**라고 명시 승인했다. Parent `/root`가 해당 답변과 정확한 대상 revision `10f04609160998a54e969ea909b89b48cf42aa3e`을 전달했다. 이 기록은 그 rendered target과 설명한 처리 방식의 승인이다. 앞의 private 구현 범위 설명은 해당 source checkpoint의 사실이며, 현재 Gate 상태는 approved다. 같은 시각 목표의 중복 승인을 요청하지 않고 공개 연결을 진행한다. 공개 API·persisted schema의 아직 정해지지 않은 중요한 선택은 별도 명시하며 STEP017 전체 완료로 기록하지 않는다.

## 승인 대상의 정확한 source

순수 계산과 한도는 [PRIVATE.md](PRIVATE.md), kernel checkpoint는 source/evidence `91a973fcbb67a0452f2f5f2ef55a569bca1924e5`다. 이번 target의 실행 source는 `test/gates/shadow-paints/fixture.js`, `primitive.program.js`, `manifest.js`다. 예를 들어 `drawShadowPrimitive(context, shadowFixture("alpha-once"), decodedSublayerPNG, prepareShadowGlyph(shadowFixture("alpha-once")))`를 실행한다. PNG는 같은 `prepareShadowGlyph` 결과로 한 번 encode하고, Canvas/SVG/PDF가 그 **동일 bytes**를 사용한다. 공개 ChartProgram paint API를 추가한 것은 아니다.

Frame은260×200 logical px다. Source mask는70×60 physical px, 원점(80,80), rectangle 또는4×4 subpixel coverage의 circle이다. BlurRadius0 또는8, sigma=radius/2, support=ceil(3sigma), 정규화된2pass Gaussian을 사용한다. Color parsing은 하지 않고 이 fixture에 명시한 RGB bytes만 사용한다.

| variant | 의미 |
|---|---|
| zero-blur | blur0 identity, offset(14,10), 날카로운 shadow 경계 |
| soft-shadow | blur8, offset(14,10), 양의 방향으로 번지는 shadow |
| negative-offset | blur8, offset(-14,-10), source 왼쪽·위쪽 bounds 확장 |
| alpha-once | fill alpha .6, shadow alpha .5, 최종 glyph opacity .65 |
| clip | source와 shadow를 함께 명시 rectangle로 clip |
| circle |4×4 coverage circle mask에 같은 blur 적용 |

Shadow 계산의 입력 alpha에는 authored fill alpha를 포함한다. Shadow color alpha를 곱한 mask 뒤에 source를 source-over로 합치고, 합쳐진 glyph alpha에 mark opacity를 한 번 적용한다. `alpha-once`의 중심 glyph RGBA는 [180,68,53,119], 배경 위 기대값은 [205,155,153,255]다. Opacity를 blur input과 최종 source에 중복 적용하지 않는다.

이번 후보는 **효과가 적용된 glyph 하나를 raster sublayer로 만든다**. Source와 shadow를 한 번 합성하기 위한 명시 lowering이다. 해당 glyph까지 vector로 보존했다고 주장하지 않는다. Chart 전체 raster는 없으며 노란 sibling rectangle과 text/background는 별도 vector로 남는다. Sublayer는 zero-blur84×70, 나머지96×84로 frame보다 작다. Native PDF에 포함된 image와 soft mask의 dimension을 모두 검사해 이를 확인한다.

## 검증 결과와 PDF 샘플링 한계

Independent oracle는 source mask에 direct2D convolution을 적용한다. 분리된 kernel 계산을 호출하지 않는다.8개 고정 logical pixel은 source interior, blur 경사, tail, 음수 offset 쪽, clip 밖, vector sibling, 빈 배경을 포함한다. Canvas/PNG, browser Canvas, browser SVG는 RGB±1 byte와 alpha exact를 사용한다.

PDF는 두 증거를 나누어 확인한다.

1. 실제 PDF image stream과 SMask를 inflate해 **모든 alpha byte가 원본 glyph와 exact**이고, alpha가0보다 큰 pixel의 RGB byte가 decoded common PNG와 exact인지 검사한다. Payload와 dimensions가 같음을 직접 확인한다.
2. PDF를288dpi로 rasterize하고 같은8개 logical pixel의 physical index `(x*4+2,y*4+2)`를 읽는다. 같은 원래 oracle의 RGB±1/alpha exact를 그대로 적용한다. 경사 표본을 지우거나 RGB tolerance를 넓히지 않았다.

72dpi PDF에서는 soft-shadow와 circle의 (158,115) 두 표본이 달랐다. 처음에는 각각 expected [136,153,171]→actual [133,150,169], [211,219,228]→[206,215,225]였다. ImageSmoothing=false만으로 해결되지 않았다. 공통 alpha stream은 정확했고 더 높은 해상도의 중앙 physical 표본은 일치하므로 이미지의 raster sampling 차이를 구분한다. 원래72dpi `pdf.png`와 모든 diagnostics를 계속 저장하며 **72dpi full-image/pixel equality를 주장하지 않는다**. 최초 실패 log/results는 `.artifacts/shadow-review/first-render/`에 보존한다.

최종 fixture는6 variants×8 samples×4 paths=192 accepted samples를 검사한다. PDF72dpi의2개 diagnostic failure는 성공 수에 포함하지 않는다. Text antialias나 전체 backend pixel equality도 이 검토의 성공 조건으로 주장하지 않는다. 추후 공개 primitive/action의 same-run equality는 별도로 반드시 검증한다.

## 재현·잔여 범위

```sh
node scripts/run-tests.js gates gates/shadow-paints/primitive.test.js
node scripts/run-tests.js render gates/shadow-paints/backends.render.js
node scripts/run-tests.js unit unit/grammar/shadow.test.js unit/grammar/paint.test.js unit/grammar/patterns.test.js unit/grammar/radial-gradient.test.js unit/support/coverage-policy.test.js
node --experimental-test-coverage --test-coverage-include=src/grammar/shadow.js --test test/unit/grammar/shadow.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js
npm run package:check
```

검토 atlas는 `.artifacts/test/png/review/shadow-paints/contact-sheet.png`다. 각 variant는 sublayer.png, primitive.png/svg/pdf, browser-canvas.png, browser-svg.png, pdf.png, pdf-4x.png, 공용 variant.json, 별도 evidence.json을 만든다. Artifact tree는 gitignored이며 실행 source·manifest·hash receipt를 commit/push한다. 최종 명령·hash는 [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)에 기록한다.

Public schema/strict color·glyph mask preparation·fractional placement·HiDPI·all mark/text consumers·halo/outline·blend·bounds/hit·inspection·refs·scene/codec·rematerialization·Full/Basic/types·preflight와 public/primitive parity는 남아 있다. 현재 private opaque source mask나 caller-owned Uint8Array를 자동으로 저장 형식으로 승격하지 않는다. Blur의 finite-support tail policy도 공개 계약에 명시되어야 한다. Pattern/radial을 포함한 전체 paint 지원표와 unsupported action/export 진단을 끝내기 전에는 모든 renderer 지원 완료라고 보고하지 않는다.

최종 확인: focused unit37/37, primitive2/2, render1/1, contracts38/38, 새 kernel coverage100/100/100과 package check가 통과했다. Package dimensions는 kernel checkpoint와 동일한681/1,014,128/4,727,468이다. 이번 review는 runtime source 변경이 없고 test/oracle/manifest와 증거만 추가한다. Source/evidence revision은 `10f04609160998a54e969ea909b89b48cf42aa3e`다. 후속 metadata-only 기록은 실행 source와 출력 내용을 바꾸지 않는다.
