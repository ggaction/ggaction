# Theme 간격·palette·출처 checkpoint

## 진행 상태

- [x] 전체 승인 `b758b912`와 [공개 설계](PUBLIC.md)의 남은 STEP-033 계약 구현
- [x] 기존 guide 간격·automatic categorical color/pattern·read-only winning provenance
- [x] native/default/style/explicit/named overlay 우선순위·typed identity·원자적 실패
- [x] source 집중 검사와 Canvas/PNG·SVG·scene·offline snapshot 소비
- [ ] generated docs·inventory·package 한도 실측·source-free 설치 qualification
- [ ] 최종 증거 hash·commit/push
- [ ] 후속 STEP-034 responsive guides/layout·STEP-035 nested facet/shared guides

## 결정과 구현

기준은 `e3abd57d9`다. 새 public action/entry/state owner는 없다. 기존 ThemeTokens에
`axisLabelGap`, `axisTitleGap`, `legendItemGap`, `palette`, `patternPalette`를 추가하고
기존 inspection 반환에 `appearance`를 붙인다. 저장 frame과 trace가 기존 의미를 계속 소유한다.

Axis gap은 native offset이며 Cartesian automatic title은 선호 offset을 기존 label/canvas
placement에 전달한다. Explicit 0·동일 기본값·label-relative offset은 보존한다. Item legend gap은
기존 positive 계약을 따르며 continuous gradient bar는 별도로 유지한다. Omission/remove는
각 family의 native 값을 복원한다. Scoped-axis typography 두 기존 테스트는 removeTheme를
light theme와 비교하던 오래된 기대값만 수정했으며 그 두 실패에 대한 runtime 수리는 없다.

Palette는 ordinal auto color/stroke만 갱신하고 semantic range나 position은 바꾸지 않는다.
Pattern은 ordinal typed domain으로 선택해 기존 fillPaint가 origin/clip/budget을 검증한다.
색 scale range에 pattern을 넣지 않는다. Named highlight는 기존 baseline 재계산 뒤 마지막으로
적용한다. 실제 source revision, conditional literal/field branch, reorder, nested reset을 검사했다.

Appearance source는 defaults/family/theme/style/explicit/interaction/unknown이다. 기존 override
수집에서 동일값 authored 입력도 찾아내며 native action catalog와 immutable trace를 읽는다.
Theme owner/token, action, named selection, scoped item key를 연결한다. Parallel 각 차원의 실제
primitive 구성, Graph edge stroke→arrow fill, resource node override를 분리한다. 범례 selection은
원래 pure exact membership/style helper를 추출해 materializer와 inspection이 공유한다.
Legacy·whole-item extension replacement·baseline-dependent property selector는 unknown이다.
별도 provenance history나 hidden action/layout solver는 없다.

Theme definition normalizer는 structured paint 검증 경계에 맞게 actions/theme/definition.js로
옮겼다. theme/defaults.js는 defaults/vocabulary만 유지한다. 순환 dependency 검사를 통과했다.

## 검증 범위

집중 semantic/immutability/typography/palette/inspection 회귀와 source boundary/discovery를 실행한다.
Hierarchical authoring light/dark 실제 recipe는 5개 새 token을 direct trace로 실행하며 pattern pitch64로
기존 vector command budget을 유지한다. Budget를 늘리지 않았고 default pitch8에서 해당 큰 fixture가
초과한 최초 실패를 local log에 보존한다. 최종 removeTheme 결과의 analytic pixels도 검사한다.

Representative categorical patterns는 실제 Native Canvas/PNG 전체 pixel equality, scene endpoint,
SVG concrete colors와 program/graphic offline restore equality를 검증한다. Renderer source를 바꾸지
않았으며 기존 승인된 pattern backend matrix를 재사용한다. 이 checkpoint에서 새로운 PDF/browser
전체 pixel sweep이나 전체 realistic corpus를 실행했다고 주장하지 않는다.
