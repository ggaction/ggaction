# STEP-034 공개 반응형 가이드 검증

## 진행 상태

- [x] 전체 승인 `b758b912`에 따라 public 옵션·저장 결과·primitive target 구현
- [x] Full/Basic 고정 Canvas·label wrap/skip/rotate·4회 solve·원자적 실패
- [x] Current·declarations·inspection·program/graphic codec·scene
- [x] 실제 native Canvas/SVG/PNG/PDF, browser DPR 1/2, 실데이터 15개
- [x] 담당 5개 critical coverage floor 및 source boundaries
- [ ] 동일 최종 tar Node 20/22/24 설치·타입·browser bundle 자격
- [ ] 최종 docs source/build/built/browser 및 원격 evidence 기록

이 문서는 STEP-034의 공개 후보를 기록한다. STEP-035의 nested facet/root shared-guide
재배치와 STEP-050 single-Y admission은 별도 소유자이며 전체 AT-20 완료를 주장하지 않는다.
기준과 정확한 결정은 [RESPONSIVE.md](RESPONSIVE.md), durable 동작은 Current CORE/AXES다.

## 구현 경계

`createCanvas`/`editCanvas.responsive`와 Cartesian labels의 `responsive` 옵션을 기존 Full/Basic
surface에 더했다. 새 action·public entry·layout resource는 만들지 않았다. Canvas intent를
편집하는 유일한 domain 경계는 기존 `editCanvas`이며 같은 retained intent는 동일 그래픽으로
수렴한다. 고정 width/height와 authored margin을 유지하고, derived plot의 유일한 reader는
`layout/canvas.js resolveGraphicBounds`다. 별도 mutable solver나 renderer 측정은 없다.

명시 guide transaction이 Canvas plan을 최대 네 번 실행한다. 이전 프로그램의 최종 reservation을
초기값으로 쓰지 않아 800→400→800과 해당 intent의 직접 materialization이 같다. 원래 axes,
font/profile, source revision 및 appearance 경계가 같은 plan을 사용한다. 측정 profile에 wrapping
query가 없으면 기존 exact metrics-required 오류로 종료하고 receiver/trace를 보존한다.

Canvas false는 원래 margin을 복구하고 label fallback result를 제거하되 label intent를 보존한다.
Persistence는 intent/result의 닫힌 shape·bounds만 검증하며 solver/provider를 실행하지 않는다.
`inspectProgram.layouts`는 실제 선택 stage, raw tick indices, reservation과 convergence를
childPath별로 읽는다. Scene과 각 renderer는 이미 materialize된 text lines/rotation만 소비한다.

## 검증 범위

- 기존 Canvas/axis-label/title/pure 회귀 54개, 새 public 9개 통과.
- lifecycle 7개: 네 legend 방향과 title 순서, source revision과 explicit scale range,
  mark stroke occupied bounds, dormant reset, 명시 concat child 교체, exact prepared font,
  Polar/Parallel의 같은 owner·서로 다른 edge lane identity.
- state/boundary 6개 및 pure reducer 15개, Full/Basic 타입 1개 통과.
- critical 37개 실행: grammar Canvas/labels/guide helper 100/100/100,
  layout reducer 100/98.57/100, materialization 100/92.86/100. 기존 floor를 내리지 않았다.
- literal primitive/public 그래픽 동등성 1개; PNG/PDF72dpi pair 2개; browser Canvas/SVG
  DPR1/2 pair 1개. 400×320 target의 네 막대와 8개 줄, plot bounds를 독립 수치로 확인했다.
- pinned 실데이터 5종의 세로/가로/grouped bar 15개가 resize/revise/codec/SVG까지 통과했다.
  전체 50-profile realistic 재실행 대신 변경된 capability만 canonical runner로 실행했다.
- discovery/type 17개, source boundary/type 12개. 최초 count40→41 누락을 실제 신규파일로 정정했다.

명시적인 child 교체가 부모 snapshot을 갱신하는 것은 검증했다. nested responsive root/facet의
재배치와 shared legend/header/footer closure는 STEP-035 책임이며 아래 후속 작업에 남겨둔다.
Graph-only source의 facet projection에서 same-source proof를 잘못 요구하는 기존 결함도
STEP-035에서 독립 재현하고 고친다.

## 최종 자격 및 실패 기록

현재 원 로그는 `.artifacts/responsive-kernel/`에 있다. 최종 source revision과 tar hash,
설치/문서 결과는 자격 완료 뒤 `responsive-public-evidence/summary.json`에 보존한다.
처음 browser factory에 data 인자가 전달된 fixture 오류, 실데이터 cache 경로 누락,
문서 catalog 순서 중복/count 누락, source 예제의 미커밋 Git 링크 실패는 각각 구분하여
보존한다. 구현 회귀 통과로 이 초기 실패를 덮거나 미실행 전체 suite를 성공으로 세지 않는다.
