# Table·Pyramid·OHLC·Waterfall·Trail 소비자 담당 연결

## 진행 상태

- [x] 다섯 행의 Current, 실제 assertion, primitive/backend 비교, strict types, 설치 fixture와 실행 문서를 대조했다.
- [x] 각 행의 17셀, 총 85개의 기존 담당 경로만 지정했다.
- [x] package와 scene-animation 각 5셀의 미할당 사유를 분리했다.
- [x] 기존 구조 validator와 정확 delta 검사 결과를 고정했다.

2026-11-01 부모의 독립 checkpoint 지시에 따른 owner 지정이다. 시작점은 Geo8셀 후속
`87d528bac`이며 [Geo 기록](../animation/NATIVE_GEO_OWNERS.md)과 그 증거를 보존한다.
정본은 `test/native-capabilities.json`이다. 이 기록은 제품의 실행 의존성이 아니다.

## 실제 시험과 담당 범위

모든 행의 create/edit/source-revise/encodings/scales/guides/composition/selection-highlight/
hit/persistence/accessibility는 해당 `test/unit/<family>-plot.test.js`에 구체 assertion이 있다.
Table의 색 인코딩·스케일·범례에는 `table-consumers.test.js`도 연결한다. encodings는 각
native facade가 허용한 field/color/role/width 계약을 뜻한다. Table·Pyramid에 없는
Cartesian x/y encoder나 자체 누적 위치를 덮는 generic encoder를 지원한다고 확대하지 않는다.

| 행 | 의미·수명·공유 소비자 근거 | 접근성 실제 assertion |
| --- | --- | --- |
| table | typed cell key·column reorder, source revision/resize, clip별 highlight/hit, color legend 재할당, facet/scoped edit, editable/graphic codec | 9개 보이는 cell, 전체 sourceRowCount=2, sparkline 배열 값, footer value=12와 inputRows=2 |
| pyramid | literal trapezoid, width/area·방향·percent patch, revision과 body-label key, 색 scale/legend, facet, coordinate/resize, codec | exportAccessibleData의 실제 stage rows=3 |
| ohlc | low/high/open/close 역할과 doji, 원 행 reorder, yScale/domain·범례, compound hit/highlight, facet/scoped edit, codec | prices:close가 [7,4,5] |
| waterfall | delta/subtotal/total과 running endpoints, reset/connector, source revision·rebind, scale/범례, compound hit, local facet, codec | steps:end가 [5,3,3,7,7] |
| trail | literal tapered ribbon, typed series의 원 행, width/source/scale 변경, gap/filter/labels/hit, color/legend, Polar·facet·nested, codec | trail:width가 원 sample [2,6,4,8] |

각 `test/charts/<family>/renderer.render.js`는 같은 실행의 독립 primitive와 공개 프로그램을
Canvas call sequence, SVG serialization, PDF raster pixels로 비교한다. 각 `png.render.js`는
동일 manifest를 `registerVisualVariantTests`에 전달해 ink와 PNG primitive/public 동등성을
검산한다. 이 경로들을 Canvas/SVG/PDF/PNG 셀에 지정했다. 새 renderer 결과를 생성한 것은 아니다.

각 `test/contracts/<family>-types.test.js`는 실제 TypeScript를 컴파일하고 Full/Basic 경계와
해당 family의 허용·금지 옵션을 검산한다. Table은 설치용 `fixtures/table.ts`를 그대로 소비하고,
나머지는 각각의 명시 타입 프로그램을 실행한다. types 셀의 현재 계약 owner는 해당 family Current다.

## 문서의 닫힌 실행 연결

docs 셀은 단순 링크·AST·coverage 집계를 근거로 지정하지 않았다.
`docs/_data/snippet_programs.json`의 `tutorials/{table,pyramid,ohlc,waterfall,trail}.md`는 각각
`examples/<family>/program.js`의 `createTable/createPyramid/createOHLC/createWaterfall/createTrail`을
canonical owner로 지정한다. `test/docs/executable-programs.test.js`는 실제 문서 code를 import해
semantic/graphic output 존재를 검사하고 canonical example과 `assertEquivalentMeaning`으로
비교하며 코드 hash에 결박된 실행 기록을 남긴다. 따라서 이 discovered test를 docs owner로
연결했다. 등록 사실만으로 현재 candidate에서 실행이 통과했다고 판정하지 않는다.

## 의도적으로 유지하는 pending

- 설치 fixture `scripts/consumers/fixtures/node/<family>-plots.mjs`마다 실제 공개 lifecycle,
  offline 4renderer/scene, fresh process·nested의 세 사례가 있다. 첫 사례는 node_modules의
  설치본 해석과 Full/Basic 경계를 검사하고 전체 runner가 manifest에서 직접 실행한다.
  그러나 현재 discovered test owner 중 이 다섯 fixture를 직접 실행하는 경로는 없다.
  현 native manifest validator는 discovered `test/` owner만 받으므로 scripts 경로를 위장하거나
  generic package/AST 검사로 대체하지 않고 package 5셀을 pending으로 유지한다. 실제 설치
  기능이 없다는 뜻이 아니라 최종 receipt와 허용 owner의 연결이 남았다는 뜻이다.
- 각 설치 fixture와 Table renderer에는 정적 `createTransitionScene`/`renderTransitionScene`
  replay의 픽셀 비교가 있다. 하지만 이 사실만으로 해당 family의 typed semantic transition,
  현재 중간 frame 및 interruption 의미까지 검증했다고 확대하지 않는다. scene-animation
  5셀도 이번에는 pending으로 유지한다.
- 이 checkpoint 당시의 30요구, 79 AT group, 577필수 cell, required/N/A, AT owner, 실제 결과는 변경하지 않는다. 후속 applicability 정합은 [별도 기록](IMAGE_APPLICABILITY.md)이며 이 증거를 소급 변경하지 않는다.
  새 package/public API/schema/test runner를 만들지 않는다. 85개 지정은 완료 결과가 아니다.

## 검사 범위

부모가 예약한 Chromium P95 동안은 읽기·편집만 진행했다. 이 checkpoint는 metadata만
변경하므로 기존 product·renderer·installed·docs 전체를 다시 실행하지 않고, 기존 canonical
native-completion 구조 검사 및 변경 전후 manifest의 정확 85셀 delta만 검증한다. 해당
검사도 성능 측정 종료 뒤 실행했다.

`node scripts/run-tests.js contracts contracts/native-capability-completion.test.js`는
16/16, exit 0, 5.287초였다. 별도 delta 검사는 정확히 85개 assignedOwners를 제거하면
이전 manifest와 완전히 같음을 확인했다. [구조 증거](native-plot-owner-evidence/structure.json)는
감사 입력 62개와 압축 실행 로그의 hash를 보존한다. 실제 candidate는 없고 79 AT group과
577 consumer 결과는 여전히 전부 pending, passed는 0이다.
