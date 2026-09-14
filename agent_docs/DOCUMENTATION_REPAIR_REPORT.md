# 문서 전수 감사 수정 기록

대상은 2026-09-14 문서 감사의 D01–D50 전체이다. 감사 기준은 `d4f372fe01694c932707db241b32c6f04019d813`이다. 사용자의 “싹다 완벽하게 고쳐” 지시에 따라 기존 runtime을 기준으로 문서, 생성기, 예제, 검색·탐색 및 검증 경로를 함께 수정했다. 이 기록은 문서 감사의 완료 기록이며 새 라이브러리 API나 Roadmap 7의 구현 상태를 변경하지 않는다.

## 결과와 재현 범위

- 276개 exact action entry와 독립 anchor, 31개 H0 chart picker, 14개 focused scale editor 안내.
- 75개 example 디렉터리 / 78개 실행 variant의 catalog. 기존 chart-family 69개와 교육 workflow 9개를 구분하며 모두 gallery·이미지·browser inventory에 포함한다.
- tutorial 17개, recipe 27개, 추가 API 실행 프로그램 1개를 합한 45개 exact 문서 프로그램.
- 개발 계약과 v0.0.13의 차이, 42개 추가 action, runtime 및 example source의 서로 다른 immutable revision을 명시한다.
- 문서용 workflow는 기존 액션 조합을 설명한다. 기존 차트의 primitive/public 검증을 대체하거나 면제하지 않는다.

## 검증

| 검사 | 결과 |
| --- | --- |
| `npm run test:docs` | 116개 통과 |
| `npm run test:contracts` | 489개 통과 |
| `npm run test:browser` | 84개 통과 |
| `npm run test:package` | 설치 패키지 소비자 검사 통과; 문서 프로그램 45개 포함 |
| `npm run docs:build` | fresh Jekyll build 성공 |
| `npm run test:docs:built` | 149개 HTML의 링크·anchor·asset·image policy 통과 |
| `npm run test:docs:browser` | 전체 페이지 320/390/768px 및 대표 desktop/mobile Axe·keyboard·no-JS 통과 |
| `git diff --check` | 공백 오류 없음 |

로컬에서는 Node 22.23.1, Ruby 3.3.12와 저장소의 locked bundle을 사용했다. preflight는 호환되는 Ruby이며 CI의 고정 버전 3.2.6과는 다름을 권장 메시지로 알렸다. 새 workflow의 9개 이미지와 desktop/mobile 사이트 화면을 직접 확인했다. 실패했던 검사도 수정 후 재실행했으며, 최종 결과의 원본 로그는 `.artifacts/docs-repair-20260914/`에 있다. 해당 경로는 gitignored 산출물이며 위 명령과 저장소의 테스트가 재현 근거다.

## 항목별 수정

### D01 · ECDF 튜토리얼의 완성 예제가 범례 여백 오류로 중단된다

ECDF 완성 예제를 실제 가이드 정책과 일치시켰다. 문서 코드를 그대로 실행하고 canonical 예제와 graphicSpec을 비교한다.

변경·검증 소유 파일: [docs/tutorials/ecdf.md](../docs/tutorials/ecdf.md), [test/docs/executable-programs.test.js](../test/docs/executable-programs.test.js).

### D02 · Gradient 레시피가 지원하지 않는 축 단축 표기를 사용한다

지원하지 않는 축 단축 표기를 제거하고 실제 position fieldType 및 guide option 객체를 사용한다.

변경·검증 소유 파일: [docs/recipes/gradient-plot.md](../docs/recipes/gradient-plot.md), [test/docs/executable-programs.test.js](../test/docs/executable-programs.test.js).

### D03 · Error-band·Path-ordering 레시피가 범례를 만들면서 필요한 여백을 제공하지 않는다

범례가 필요한 두 레시피에 명시적인 Canvas 여백을 제공했다. 렌더링 단계까지 실행한다.

변경·검증 소유 파일: [docs/recipes/error-band.md](../docs/recipes/error-band.md), [docs/recipes/path-ordering.md](../docs/recipes/path-ordering.md).

### D04 · Horizon 레시피의 temporal 입력과 축 여백 전제가 빠져 있다

시간 필드 종류와 축 여백을 명시해 fixture를 입력하면 그대로 실행되는 프로그램으로 고쳤다.

변경·검증 소유 파일: [docs/recipes/horizon.md](../docs/recipes/horizon.md), [test/support/docs-inputs.js](../test/support/docs-inputs.js).

### D05 · Concat 편집 예제에 facet 전용 columns 옵션이 섞여 있다

hconcat 편집 예제에서 facet 전용 columns를 제거했다. concat과 facet 편집 설명을 분리했다.

변경·검증 소유 파일: [docs/api/composition/editing.md](../docs/api/composition/editing.md), [docs/recipes/composition.md](../docs/recipes/composition.md).

### D06 · Filtering 페이지의 새 프로그램에 Canvas 생성이 빠졌다

독립적으로 시작하는 filtering 프로그램에 Canvas를 생성하고 실행 registry에 포함했다.

변경·검증 소유 파일: [docs/api/data/filtering.md](../docs/api/data/filtering.md), [docs/_data/snippet_programs.json](../docs/_data/snippet_programs.json).

### D07 · Troubleshooting의 빈 필터 예제가 필수 dataset id를 생략한다

빈 필터 예제의 원본 dataset ID를 명시했다. 예상하는 빈 결과와 잘못된 selector 오류를 구분한다.

변경·검증 소유 파일: [docs/troubleshooting.md](../docs/troubleshooting.md), [test/docs/documented-behavior.test.js](../test/docs/documented-behavior.test.js).

### D08 · Ordinal bar 표가 fieldType과 scale.type을 혼동한다

ordinal fieldType과 band/point scale의 역할을 분리했다. Bar 너비에 필요한 band scale 조건을 실제 fixture로 확인한다.

변경·검증 소유 파일: [docs/api/position/ordinal-bars.md](../docs/api/position/ordinal-bars.md), [docs/_data/action_capabilities.json](../docs/_data/action_capabilities.json).

### D09 · LLM authoring의 common-task 코드가 서로 다른 차트를 한 프로그램에 누적한다

서로 다른 common task를 독립 프로그램으로 실행하도록 바꾸어 같은 객체에 mark와 guide가 누적되는 문제를 제거했다.

변경·검증 소유 파일: [docs/llm-authoring.md](../docs/llm-authoring.md), [test/docs/documented-behavior.test.js](../test/docs/documented-behavior.test.js).

### D10 · Extension의 JavaScript 사용 예제가 존재하지 않는 graphics를 편집한다

extension 사용 예제에서 편집할 graphics를 먼저 생성하고 JavaScript 실행 및 strict TypeScript 소비자 검증을 추가했다.

변경·검증 소유 파일: [docs/extension/action-authoring.md](../docs/extension/action-authoring.md), [examples/extension-typescript/program.ts](../examples/extension-typescript/program.ts).

### D11 · Troubleshooting이 일부 과거 authoring 순서를 필수 materialization 조건으로 설명한다

현재 지원되는 숫자 Line, radius 및 stroke-width 추론을 과거의 필수 호출 순서와 구분해 설명했다.

변경·검증 소유 파일: [docs/troubleshooting.md](../docs/troubleshooting.md), [test/docs/documented-behavior.test.js](../test/docs/documented-behavior.test.js).

### D12 · Fonts 페이지가 backend의 실제 글꼴 측정을 사용한다고 잘못 약속한다

글꼴 측정은 backend-neutral 근사치임을 명시하고 renderer의 실제 font 측정처럼 약속하던 문구를 제거했다.

변경·검증 소유 파일: [docs/fonts.md](../docs/fonts.md), [src/core/textMetrics.js](../src/core/textMetrics.js).

### D13 · Text 페이지의 facet 제한이 현재 지원을 부정하고 잘못된 순서를 권한다

facet이 지원하는 attached labels와 source-relative text를 구분하고 올바른 저작 순서를 안내했다.

변경·검증 소유 파일: [docs/api/marks/text.md](../docs/api/marks/text.md), [docs/api/marks/labels.md](../docs/api/marks/labels.md), [docs/api/composition/facets.md](../docs/api/composition/facets.md).

### D14 · 축 숫자 format 설명이 linear로 과도하게 제한되어 있다

숫자 formatter가 linear만의 기능이 아님을 반영하고 numeric scale 및 temporal formatter 조건을 정리했다.

변경·검증 소유 파일: [docs/api/axes/complete.md](../docs/api/axes/complete.md), [docs/advanced/axis-components.md](../docs/advanced/axis-components.md).

### D15 · Package-level composition 함수가 trace를 기록하지 않는다는 설명이 틀렸다

package-level hconcat/vconcat도 trace를 유지한다는 현재 동작으로 수정했다.

변경·검증 소유 파일: [docs/concepts/actions-and-trace.md](../docs/concepts/actions-and-trace.md), [docs/api/composition.md](../docs/api/composition.md).

### D16 · Supported Features가 이미 제공하는 기능을 미지원 또는 제한적이라고 표시한다

Supported Features의 중복·과거 지원표를 작업별 안내와 canonical compatibility 표로 교체했다. 이미 지원하는 공유 데이터, 선택 및 통계 기능을 미지원으로 표시하지 않는다.

변경·검증 소유 파일: [docs/supported-features.md](../docs/supported-features.md), [docs/_data/action_capabilities.json](../docs/_data/action_capabilities.json).

### D17 · 공개 derived transform union의 목록이 여러 문서에서 과거 상태다

공개 DatasetTransform union의 18개 tag를 정확히 열거하고 nested type alias까지 따라가 선언과 표의 집합 일치를 검사한다. ecdf 및 statisticalReference도 포함한다.

변경·검증 소유 파일: [docs/api/data/source-and-derived.md](../docs/api/data/source-and-derived.md), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D18 · Data 진입 페이지가 새 데이터 연산과 확장된 expression/time-unit 계약을 안내하지 못한다

Data 진입 페이지에서 새 데이터 연산, 표현식·정규화·누락값·시간·수정·삭제의 목적별 페이지로 바로 이동하게 했다.

변경·검증 소유 파일: [docs/api/data.md](../docs/api/data.md), [docs/api/data/expressions-and-normalization.md](../docs/api/data/expressions-and-normalization.md), [docs/api/data/policies.md](../docs/api/data/policies.md).

### D19 · Channel/mark 호환성 표가 페이지마다 다른 지원 범위를 제시한다

position, stroke, appearance 호환성의 canonical metadata와 생성 표를 통일했다. Stroke의 8개 mark 소비자와 field/constant 및 scale family를 실행 검사한다.

변경·검증 소유 파일: [docs/_data/action_capabilities.json](../docs/_data/action_capabilities.json), [scripts/generate-doc-capabilities.js](../scripts/generate-doc-capabilities.js), [test/docs/action-capabilities.test.js](../test/docs/action-capabilities.test.js).

### D20 · Continuous legend 설명이 채널과 표시 샘플의 mark grain을 충분히 분리하지 않는다

legend 채널, 실제 허용 mark, sample glyph와 grain을 나누어 설명했다. 특히 Rule의 opacity encoding 지원이 opacity legend 지원을 뜻하지 않음을 양성·음성 fixture로 고정했다.

변경·검증 소유 파일: [docs/api/legends/continuous.md](../docs/api/legends/continuous.md), [test/docs/action-capabilities.test.js](../test/docs/action-capabilities.test.js).

### D21 · Focused scale editor를 complete family라고 소개하면서 세 연산을 누락한다

14개 focused scale editor를 선언에서 생성하고 각 selector 및 exact reference 링크를 제공한다.

변경·검증 소유 파일: [docs/api/scales.md](../docs/api/scales.md), [scripts/generate-doc-scale-editors.js](../scripts/generate-doc-scale-editors.js).

### D22 · Text source 허용 목록에서 Line이 누락되어 같은 페이지와 충돌한다

Text/attached-label source 설명에 Line을 포함하고 series/final-item grain의 제약을 소유 페이지로 옮겼다.

변경·검증 소유 파일: [docs/api/marks/text.md](../docs/api/marks/text.md), [docs/api/marks/labels.md](../docs/api/marks/labels.md).

### D23 · Advanced axis components의 label 옵션과 format 표가 상위 축 페이지보다 뒤처졌다

축 컴포넌트의 label·format 옵션 설명을 상위 축 API와 맞췄다. 정확한 전체 옵션은 선언에서 생성한 reference를 이용한다.

변경·검증 소유 파일: [docs/advanced/axis-components.md](../docs/advanced/axis-components.md), [docs/reference/types.md](../docs/reference/types.md).

### D24 · 여러 API fragment의 변수·ID·데이터 전제가 암묵적이다

API·advanced·extension의 JavaScript 블록에 fragment/alternative/expected-error 분류와 receiver·resource selector 전제를 표시하고 hash 기반 inventory를 생성한다. 완성 프로그램의 실행 metadata와 구분한다.

변경·검증 소유 파일: [scripts/generate-doc-snippet-contracts.js](../scripts/generate-doc-snippet-contracts.js), [docs/_data/snippet_contracts.json](../docs/_data/snippet_contracts.json).

### D25 · Derived-data 수정 예제의 의도된 예외가 후속 성공 사례 실행을 끊는다

의도된 derived-data 수정 오류는 catch하고 뒤의 성공 사례가 실행되게 했다. immutable source 교체와 지원되는 owner revision 경로를 구분한다.

변경·검증 소유 파일: [docs/api/data/revisions-and-removal.md](../docs/api/data/revisions-and-removal.md), [docs/recipes/repair-missing-observations.md](../docs/recipes/repair-missing-observations.md).

### D26 · ID 선택·생략·reset·교체 규칙을 작업별로 비교하는 안내가 부족하다

ID namespace, unique candidate, explicit selector, omission/false/auto/empty/reset, no-op, 실패 및 의존성 규칙을 family별로 비교한다.

변경·검증 소유 파일: [docs/concepts/authoring-conventions.md](../docs/concepts/authoring-conventions.md).

### D27 · 통계·누락값·시간 데이터의 전제와 출력 grain을 비교하기 어렵다

14개 데이터 family의 입력·출력 grain과 누락값·가중치·시간 정책을 비교한다. 결측 보완 결과 [2,4,6], 이동 평균 [2,3,5]→[4,5,7], histogram mass 및 KDE/ECDF를 숫자로 확인한다.

변경·검증 소유 파일: [docs/api/data/policies.md](../docs/api/data/policies.md), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D28 · 현재 문서와 설치 릴리스의 계약 차이가 버전 숫자만으로 구분되지 않는다

development와 v0.0.13을 구분하고 runtime fingerprint, runtime commit, example commit 및 baseline을 공개한다. 전 페이지, action availability, 검색, full LLM bundle와 manifest에서 같은 계약을 식별한다.

변경·검증 소유 파일: [docs/version.md](../docs/version.md), [docs/doc-provenance.json](../docs/doc-provenance.json), [scripts/doc-provenance.js](../scripts/doc-provenance.js).

### D29 · Unreleased changelog가 현재 릴리스 이후 변경 범위를 충분히 설명하지 않는다

v0.0.13 이후 42개 액션과 동작 변경을 Unreleased에 정리하고 migration을 추가했다. 새 액션 이름이 모두 changelog에 존재하는지 검사한다.

변경·검증 소유 파일: [CHANGELOG.md](../CHANGELOG.md), [docs/version.md](../docs/version.md), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D30 · 86개 action이 13개 공동 anchor를 공유해 exact action 참조가 불완전하다

276개 선언 액션마다 중복 없는 canonical anchor를 생성했다. 기존 공유 anchor도 alias로 유지한다.

변경·검증 소유 파일: [scripts/doc-action-entries.js](../scripts/doc-action-entries.js), [docs/_data/action_reference_links.json](../docs/_data/action_reference_links.json), [test/docs/action-reference.test.js](../test/docs/action-reference.test.js).

### D31 · 정확한 edit 액션 검색이 생성 액션 설명 또는 페이지 루트로 연결된다

정확한 action name 검색은 exact action entry를 최우선으로 반환한다. 276개 모두 기대 URL과 일치하는지 실제 검색 UI에서 확인한다.

변경·검증 소유 파일: [scripts/generate-doc-search-index.js](../scripts/generate-doc-search-index.js), [docs/assets/js/docs-search.js](../docs/assets/js/docs-search.js), [test/docs/interaction-regressions.test.js](../test/docs/interaction-regressions.test.js).

### D32 · 검색 결과에서 첫 ArrowUp이 마지막에서 두 번째 항목을 선택한다

초기 ArrowUp은 마지막 항목, ArrowDown은 첫 항목으로 이동한다. 결과 0/1/2/8개, 순환 및 active descendant 초기화를 검사한다.

변경·검증 소유 파일: [docs/assets/js/docs-search.js](../docs/assets/js/docs-search.js), [test/docs/interaction-regressions.test.js](../test/docs/interaction-regressions.test.js).

### D33 · Action 필터와 페이지 목차가 동기화되지 않아 숨겨진 절로 연결된다

action filter, 중첩 본문, TOC와 count를 함께 갱신한다. 숨겨진 action으로 hash가 바뀌면 필터를 풀고 목적지에 도달한다.

변경·검증 소유 파일: [docs/assets/js/docs-content.js](../docs/assets/js/docs-content.js), [docs/assets/js/docs-toc.js](../docs/assets/js/docs-toc.js), [test/docs/interaction-regressions.test.js](../test/docs/interaction-regressions.test.js).

### D34 · 목차가 HTML heading level을 action 분류로 오인해 개수를 잘못 표시한다

heading level 대신 canonical action metadata로 action과 일반 section을 구분하여 목차 개수를 계산한다.

변경·검증 소유 파일: [docs/assets/js/docs-toc.js](../docs/assets/js/docs-toc.js), [test/docs/interaction-regressions.test.js](../test/docs/interaction-regressions.test.js).

### D35 · All Chart Examples가 모든 maintained example을 보여준다는 설명과 catalog 범위가 다르다

75개 maintained example 디렉터리를 catalog에 포함했다. 78개 실행 variant, 9개 교육 workflow 및 문서 전용 2개 제외 사유를 명시하고 전체 파일 inventory와 집합을 비교한다. 기존 2개 차트 variant는 primitive/public 검증에도 연결했다.

변경·검증 소유 파일: [docs/_data/chart_examples.yml](../docs/_data/chart_examples.yml), [examples/registry.js](../examples/registry.js), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D36 · 튜토리얼 16개 중 3개가 튜토리얼 index 경로에서 빠져 있다

기존 누락 tutorial을 연결하고 hierarchy lesson까지 더해 17개 tutorial 모두 index에서 발견된다.

변경·검증 소유 파일: [docs/_data/chart_examples.yml](../docs/_data/chart_examples.yml), [docs/tutorials/index.md](../docs/tutorials/index.md), [test/docs/documentation.test.js](../test/docs/documentation.test.js).

### D37 · All gallery의 curated gallery 링크가 홈으로 향한다

All gallery의 curated gallery 링크를 올바른 curated 목적지로 수정했다.

변경·검증 소유 파일: [docs/gallery/all.md](../docs/gallery/all.md), [test/docs/documentation.test.js](../test/docs/documentation.test.js).

### D38 · Area-layout의 canonical example 링크가 기능 브랜치에 고정되어 있다

Area-layout을 포함한 example 링크를 해당 canonical program이 존재하는 immutable example commit에 연결한다. runtime commit과 example commit을 혼동하지 않으며 링크한 코드의 byte 일치도 검사한다.

변경·검증 소유 파일: [docs/tutorials/area-layout.md](../docs/tutorials/area-layout.md), [scripts/doc-provenance.js](../scripts/doc-provenance.js), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D39 · 핵심인 hierarchical authoring이 첫 학습 경로에서 충분히 드러나지 않는다

완성 차트→mark/encoding 조합→focused style/guide라는 계층을 동일 데이터·동일 geometry 비교로 가르치는 첫 tutorial을 추가했다. H0–H4와 package layer를 분리한다.

변경·검증 소유 파일: [docs/tutorials/hierarchical-authoring.md](../docs/tutorials/hierarchical-authoring.md), [examples/hierarchical-authoring/program.js](../examples/hierarchical-authoring/program.js).

### D40 · Basic Charts 진입점과 user-facing/advanced/extension 분류가 전체 H0 선택을 안내하기 어렵다

31개 H0 action을 입력 형태, 사용자 목적, 연산 층위, lower-level 구성 및 후속 editor로 비교하는 chart picker를 선언·action card에서 생성한다.

변경·검증 소유 파일: [docs/api/chart-picker.md](../docs/api/chart-picker.md), [docs/_data/chart_picker.json](../docs/_data/chart_picker.json), [scripts/generate-doc-chart-picker.js](../scripts/generate-doc-chart-picker.js).

### D41 · 새 API의 조합을 보여주는 실제 차트 수정 recipe가 부족하다

결측 보완, 가중 분포 비교, atomic encoding 모드 전환, scale/guide 수정, label 선택·배치, custom theme, facet source, 의존 자원 제거의 8개 recipe를 완성 프로그램·전후 이미지·실행 검사와 함께 추가했다.

변경·검증 소유 파일: [docs/recipes/repair-missing-observations.md](../docs/recipes/repair-missing-observations.md), [docs/_data/snippet_programs.json](../docs/_data/snippet_programs.json), [scripts/generate-doc-workflows.js](../scripts/generate-doc-workflows.js).

### D42 · Related 뒤에 새 계약 설명이 누적되어 문서의 결말과 본문 경계가 무너졌다

Related 뒤에 누적되었던 계약을 본문으로 이동하고 Related를 마지막 section으로 유지하는 회귀 검사를 추가했다.

변경·검증 소유 파일: [docs/api/marks/rect.md](../docs/api/marks/rect.md), [docs/api/legends/editing.md](../docs/api/legends/editing.md), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D43 · 몇몇 장문 API 페이지가 사용자 작업·계약·예제를 한꺼번에 담는다

data, composition, attached labels 및 axes의 큰 페이지를 목적별 페이지로 분리했다. 기존 heading anchor는 원래 경로에 routing stub으로 유지하고 navigation/LLM 순서도 갱신했다.

변경·검증 소유 파일: [docs/api/data/source-and-derived.md](../docs/api/data/source-and-derived.md), [docs/api/composition.md](../docs/api/composition.md), [docs/api/marks/text.md](../docs/api/marks/text.md), [docs/api/axes.md](../docs/api/axes.md), [docs/_data/pages.yml](../docs/_data/pages.yml).

### D44 · 읽기용 signature와 call pattern이 exact type보다 뒤처져 exact reference 기대를 깨뜨린다

정확한 signature와 도달 가능한 named option declaration을 생성하고 nested type으로 직접 연결한다. 축약 call pattern을 전체 계약과 구분한다.

변경·검증 소유 파일: [scripts/generate-doc-signatures.js](../scripts/generate-doc-signatures.js), [scripts/doc-action-entries.js](../scripts/doc-action-entries.js), [docs/reference/types.md](../docs/reference/types.md).

### D45 · Generated라는 표시는 현재 동작의 정확성을 보장하지 않으며 중복 계약의 drift가 전파된다

생성 freshness 외에 실제 API 실행, literal numeric expectation, capability 양성·음성 조합 및 exact displayed-program 비교를 추가했다. overview의 중복 규격 표는 canonical owner 링크로 대체했다.

변경·검증 소유 파일: [test/docs/action-capabilities.test.js](../test/docs/action-capabilities.test.js), [test/docs/documented-behavior.test.js](../test/docs/documented-behavior.test.js), [test/docs/documentation-coverage.test.js](../test/docs/documentation-coverage.test.js).

### D46 · 검색 index 일시 로딩 실패 후 복구 경로가 부족하다

검색 실패를 live status와 Retry로 표시한다. 연속 실패에서 재시도당 1회 요청만 보내고 최신 query, Escape, 바깥 클릭 뒤 늦은 응답이 상태를 되돌리지 않는지 검사한다.

변경·검증 소유 파일: [docs/assets/js/docs-search.js](../docs/assets/js/docs-search.js), [test/docs/interaction-regressions.test.js](../test/docs/interaction-regressions.test.js).

### D47 · 공통 chart figure include가 모든 이미지에 eager/high priority를 부여한다

lead figure만 eager/high, 나머지는 lazy/auto로 설정한다. raw Markdown 이미지도 img에 속성과 실제 크기가 붙도록 고쳤으며 빌드 HTML에서 페이지당 high priority ≤1, 모든 PNG 크기·loading을 검사한다.

변경·검증 소유 파일: [docs/_includes/chart-example.html](../docs/_includes/chart-example.html), [scripts/check-built-docs.js](../scripts/check-built-docs.js).

### D48 · 문서 예제 검증이 syntax/등록된 목록 중심이라 현재 실행 오류를 놓친다

45개 문서 프로그램을 exact Markdown code에서 읽어 native Canvas와 설치 패키지의 Chromium에서 실행한다. 모든 tutorial/recipe가 metadata에 등록되어야 하며 canonical program이 있는 경우 graphicSpec도 정확히 일치해야 한다.

변경·검증 소유 파일: [scripts/doc-snippets.js](../scripts/doc-snippets.js), [scripts/tutorial-consumer.js](../scripts/tutorial-consumer.js), [test/docs/executable-programs.test.js](../test/docs/executable-programs.test.js).

### D49 · 브라우저 검증에 exact action 검색과 기능 간 상태 조합이 필요하다

fresh Jekyll의 149개 페이지를 320/390/768px에서 확인한다. exact 검색, 초기 키보드 상태, filter/hash/TOC, mobile focus/Escape, no-JS 및 Axe를 검증하고 desktop/mobile 이미지를 직접 검토했다.

변경·검증 소유 파일: [scripts/test-built-docs.js](../scripts/test-built-docs.js), [test/docs/interaction-regressions.test.js](../test/docs/interaction-regressions.test.js).

### D50 · 문서 개발 환경의 exact version 설명과 preflight 통과 기준이 다르다

Node 20+/Ruby 3.2+의 필수 조건과 CI Ruby 3.2.6 권장을 구분한다. CI의 full Git history와 Chromium 설치 순서를 맞추고 preflight를 소스 검사 전에 실행한다.

변경·검증 소유 파일: [docs/README.md](../docs/README.md), [scripts/check-docs-environment.js](../scripts/check-docs-environment.js), [.github/workflows/ci.yml](../.github/workflows/ci.yml).

## 통합 기록

- `fc5167b2`: 잘못된 현재 동작·실행 예제 수정 및 exact snippet 실행 검사.
- `4b8c0a9c`: 276개 exact action reference, 검색·필터·목차 및 사이트 회귀 검사.
- `640aebe7`: 9개 canonical authoring workflow와 browser registry, 누락 chart variant의 기존 primitive/public 검증 연결.
- 이 문서를 포함하는 문서 checkpoint: 전체 catalog·학습 경로·계약 표·provenance·이미지·설치 소비자·최종 검증 동기화.

수정 범위는 감사에서 식별한 50개 항목이다. 모든 가능한 결함이 없다는 의미로 해석하지 않는다. package publish, 문서 deployment 또는 main merge는 이 문서 수정 작업의 결과로 실행하지 않는다.
