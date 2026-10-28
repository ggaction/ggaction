# Blend primitive 시각 검토

## 진행 상태

- [x] 독립 수식·literal·순서·alpha·양자화 검증
- [x] Native opaque blend와 공통 isolated group 실행 source
- [x] Canvas·SVG·PNG·PDF의 출력 및 bounded payload 증거
- [x] 검증된 source/evidence를 원격 checkpoint로 보존
- [x] 사용자 rendered target 확인
- [ ] 공개 paint/action/renderer flow 연결

상태 `approved`. Roadmap 9 전체 실행 승인과 부모 agent의 private 조사 위임으로 준비했다. 일반 구현 승인을 이 새로운 rendered target의 시각 승인으로 기록하지 않는다. STEP-017 완료가 아니다. 기존 공개 `normal`/`difference`의 지원 범위도 변경하지 않았다.

## 사용자 승인 기록

현재 대화에서 사용자가 **“두 검토 대상 모두 승인”**라고 명시 승인했다. Parent `/root`가 해당 답변과 정확한 대상 revision `90f5f67ec080003dd3606ed78bbb9bfbfd3beafe`을 전달했다. 이 기록은 그 rendered target과 설명한 처리 방식의 승인이다. 앞의 private 구현 범위 설명은 해당 source checkpoint의 사실이며, 현재 Gate 상태는 approved다. 같은 시각 목표의 중복 승인을 요청하지 않고 공개 연결을 진행한다. 공개 API·persisted schema의 아직 정해지지 않은 중요한 선택은 별도 명시하며 STEP017 전체 완료로 기록하지 않는다.

## 정확한 실행 source와 대상

실행 source는 `test/gates/blend-paints/primitive.program.js`, `lowered-group.js`, `group-png.js`이며 fixture/manifest가 크기·색·순서·호출을 소유한다. `drawBlendPrimitive(context, blendFixture("multiply"), isolatedGroupPNG)`에서 PNG는 `prepareBlendGroup(fixture)` → `encodeGroupPNG(group)` → decode 순서로 만든다. 브라우저에도 동일 PNG bytes를 전달한다. 공개 ChartProgram call chain을 추가하지 않았다.

Frame은300×280 logical px다. 각 variant의 위쪽은 native opaque backdrop의 vector blend이고, 아래쪽은 투명한260×90 isolated group을 회색 배경 위에 올린다. Source RGB는 [210,70,45], alpha는 .6×.65=.39, backdrop RGB는 [40,150,200], isolated alpha는 .5다. 위쪽은 backdrop alpha1을 사용한다.

| variant | 의미 |
|---|---|
| source-over | 앞에서 그린 색 위에 뒤 source를 합성 |
| multiply | 겹친 두 색을 곱함 |
| screen | 두 색의 보색을 곱한 뒤 보색을 취함 |
| difference | 기존 지원 mode의 참고·보존 대상 |
| source-over-reversed | 반대 drawing order에서 달라지는 겹침 |
| multiply-reversed | 투명 그룹에서 교환해도 같은 multiply 결과 |
| group-opacity | screen 합성이 끝난 그룹에 opacity .65를 한 번 적용 |

Canvas primitive의 native mode명 `source-over`는 fixture 용어다. 공개 계약의 `normal`을 rename하지 않았다. multiply/screen의 public enum·지원 primitive 확장은 시각 확인 뒤 별도 연결할 범위다.

## 공통 isolated group과 수치 정책

아래 그룹은 Float64 premultiplied RGBA로 계산한다. `s=Cs·As`, `b=Cb·Ab`일 때 alpha는 `As+Ab−As·Ab`다. 색 채널은 source-over `s+b(1−As)`, multiply `s·b+s(1−Ab)+b(1−As)`, screen `s+b−s·b`, difference `s+b−2min(s·Ab,b·As)`를 사용한다. Group opacity는 합성된 결과 alpha에 한 번 적용한다.

그 뒤 straight RGB와 alpha를 RGBA8에 한 번 반올림한다. PNG는 이 RGBA8 bytes를 직접 encode한다. Encode 전에 Canvas를 경유하면 premultiplication과 재양자화가 추가되므로 사용하지 않는다. 소비 renderer의 image decode 과정에는 여전히 그 renderer의 byte 표현이 적용된다.

Independent oracle는 `test/oracles/compositing.js`의 일반 straight-alpha blend 식이다. 구현의 premultiplied 축약식을 호출하지 않는다. Red .5 / blue .5의 multiply [1/3,0,1/3,.75], screen [2/3,0,2/3,.75], source-over 순서 반전 literal로 기준을 고정한다. Alpha grid와 commutativity/bounds도 검사한다.7개 group의163,800 pixels ×4 channels가 oracle 대비 최종 양자화 오차 **0.5 byte 이하**임을 확인하고, PNG IDAT의 모든 RGBA byte가 계산 결과와 exact인지 검사한다.

Group opacity .65의 겹침 alpha는115 byte다. 두 source opacity를 각각 .65배 하는 잘못된 결과와 구분한다. 배경 합성 oracle는 명시한 RGBA8 group을 다시 straight alpha로 읽은 뒤 회색 위에 합성한다. 예를 들어 front-only의 [210,70,45,65]는 최종 [222,191,190,255]다. 양자화 전의 연속값 결과 [222,191,191,255]와 혼동하지 않는다.

현재 group은 고정260×90, RGBA93,600 bytes다. 다른 크기는 실행 fixture가 거부하며 chart 전체를 rasterize하지 않는다. SVG 아래쪽에는 동일 PNG의 image만 포함하고 위쪽은 native mix-blend-mode vector로 남긴다. PDF의 native blend dictionary와 image dimensions를 검사하며, 모든 SMask alpha163,800 bytes가 canonical RGBA8와 exact다. PDF의 visible RGB도 decoded common PNG와 exact다. Public materializer의 동적 bounds·pixelRatio·work/bytes budget은 아직 구현하지 않았다.

## 검증 결과와 보존한 차이

최종 검토 출력은7 variants×2 panels×5 interior samples×4 paths=280 samples다. Native Canvas/PNG, browser Canvas, browser SVG, native PDF72dpi를 같은 oracle의 RGB±1/alpha exact로 검사한다. Source-over/multiply/screen의 raw transparent native groups도 독립 oracle와 비교한다.

별도 raw group diagnostics70개 중69개는 alpha±1/255, premultiplied RGB±1/255 안에 있다. Native Canvas `difference` 겹침 한 점은 이 기준 밖이다. Expected straight [124.1727,107.9137,143.8849]와 actual [124,109,146], alpha177이며, 최대 premultiplied 차이는 약1.29 byte다. 이 실패는 최종 공통 lowering의280개 성공에 포함하지 않고 `results.json.rawGroupDiagnostics`에 보존한다. Native difference 자체를 수정하거나 허용폭을 넓히지 않았다.

첫 PDF native-group 후보는 back rectangle의 정확한 오른쪽 경계 x160에서6개 차이가 있었다. 경계 실패는 `.artifacts/blend-review/first-render/`에 보존하고 검토용 interior sample을 x175로 명시했다. Canvas 경유 PNG 후보와 양자화 이전의 final oracle를 썼을 때 group-opacity PDF2개 차이가 있었다. 각각 `first-lowered-render/`, `unquantized-final-oracle/`에 보존했다. 최종은 RGBA8 저장 정책을 명시한 oracle이며 허용오차는 그대로다. Native/image 경계나 전체 backend pixel equality는 주장하지 않는다.

## 재현·남은 범위

```sh
node scripts/run-tests.js gates gates/blend-paints/primitive.test.js
node scripts/run-tests.js render gates/blend-paints/backends.render.js
node scripts/run-tests.js unit unit/renderers/normal-glyph-opacity.test.js
node scripts/run-tests.js contracts contracts/source-boundaries.test.js contracts/test-discovery.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js contracts/bar-blend.test.js
npm run package:check
```

Atlas는 `.artifacts/test/png/review/blend-paints/contact-sheet.png`다. 각 variant는 primitive.png/svg/pdf, pdf.png, browser-canvas.png, browser-svg.png, isolated-group.png, native/browser-isolated-group.png, 공용 variant.json과 별도 evidence.json을 만든다. Gitignored 출력은 [REVIEW-EVIDENCE.json](REVIEW-EVIDENCE.json)의 hashes와 실행 source로 재현한다.

Primitive4/4, render1/1, 기존 opacity6/6, contracts50/50, package check가 통과했다. Runtime source 변경은 없고 package dimensions는681 entries/1,014,128 packed/4,727,468 unpacked bytes다. 이번 검토는 production native/group renderer 구현을 대신하지 않는다. Strict color·공개 schema·object/plot anchoring·pixelRatio·동적 budget·clip/bounds/hit·모든 mark/text·resource/codec/scene·rematerialization·Full/Basic/types·primitive/public parity가 남아 있다. Pattern/radial/shadow와 text/mark halo·outline의 필수 범위도 유지한다. Source/evidence revision은 `90f5f67ec080003dd3606ed78bbb9bfbfd3beafe`다. 후속 metadata-only 기록은 실행 source와 출력 내용을 바꾸지 않는다.


## Public blend 연결 후 위치

승인된 native/group oracle slice는 `test/charts/bar-compositing/variants/native/`로 이동한다.
Public per-item mode는 기존 bar-compositing slice와 추가 circle/rect/line/Text glyph pair에서 검증한다.
Group fixture는 한 번 양자화하는 순수 수치 기준이며 새 public group transaction을 노출하지 않는다.
과거 위 명령과 review artifact 경로는 최초 승인 기록이다. 현재 명령은
`node scripts/run-tests.js all capability:blend-paints` 및
`node scripts/run-tests.js render capability:blend-paints`다.
