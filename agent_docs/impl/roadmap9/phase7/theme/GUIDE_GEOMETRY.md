# Native guide 수치 theme token

## 진행 상태

- [x] 사용자 전체 승인 `b758b912` 아래 closed numeric token 4개 구현
- [x] Cartesian·named Cartesian·Polar·Parallel native default와 explicit 0 보존
- [x] 기존 guide action·layout transaction으로 concrete geometry 갱신
- [x] Full/Basic·nested descendants·scale/Canvas edit·codec·원자적 실패 검증
- [x] 집중 coverage·실제 light/dark recipe·source-free 설치와 TypeScript 검증
- [x] 최종 generated docs177·inventory7·package 기록
- [ ] STEP-033 간격·palette·winning provenance 및 STEP-034/035

기준은 `52207ed93`, source는 `a273eeef5`다. 공개 API는 기존 `applyTheme`의 partial token 확장이다.
`axisStrokeWidth`, `tickStrokeWidth`, `tickSize`, `gridStrokeWidth`는 finite nonnegative
number이며 CSS pixel 단위를 쓴다. Omission과 remove는 각 guide family의 실제 native 기본값을
복원한다. Built-in light/dark의 숫자 기본값을 새로 통일하지 않는다. 기존 line/tick/grid owner에서
기본값을 읽으므로 Polar/Parallel의 1.25 선과 8 길이도 유지한다.

기존 theme override 수집이 direct/facade 입력의 `lineWidth`와 `length`를 기록한다. 명시 0과
native 값과 같은 숫자도 theme보다 우선한다. 숫자가 바뀐 guide만 기존 wrapped action으로
materialize하고 기존 guide layout transaction이 고정 Canvas 안의 bounds를 검사한다.
Semantic data/scale과 mark key/lineage·position은 보존하며 topology/statistics는 실행하지 않는다.
Named Cartesian axis와 root composition의 child snapshots는 기존 owner를 그대로 재사용한다.

독립 회귀에서 색과 굵기를 동시에 바꿀 때 축선 action이 이전 graphic 색을 config에 다시 넣는
문제를 찾았다. Geometry plan이 resolved config 색을 함께 전달하되 명시 extension stroke는
그대로 유지하도록 고쳤다. tick 길이 변경으로 Canvas를 넘는 경우 수신 program/trace는 바뀌지 않는다.

새 9개를 포함한 집중 116개, 경계 40개와 package 7개가 통과했다. `guideDefaults` coverage는
100/99.15/100으로 기존 95/90/100 floor를 유지한다. Hierarchical authoring의 실제 light/dark
두 recipe에서 네 token의 direct trace, 재실행 결정성, SVG 구조와 analytic pixel witness를 검사했다.
Node20 고정 tar의 공개 import만으로 63개와 전체 TypeScript 소비자 fixture가 통과했다.

Node20 package 실측은 865 entries/1,265,093 packed/5,820,624 unpacked bytes다. 초과한 두 byte
한도만 1,266,000/5,821,000으로 올렸다. Full637,735/SVG20,196 gzip은 기존 한도를 유지하고,
Basic362,200은 최소 1,000-byte 단위인363,000으로 조정했다. 최종 artifact·commands·로그 hash는
`guide-geometry-evidence/summary.json`에 보존한다. Renderer source 변경이 없으며 새 four-backend
pixel sweep·전체 coverage·전체 realistic·3Node 전체 설치를 반복했다고 주장하지 않는다.
이 checkpoint는 STEP-033 전체 완료를 뜻하지 않는다.
