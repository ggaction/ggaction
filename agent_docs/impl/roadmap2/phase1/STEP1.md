# Roadmap 2 — Phase 1 Step 1: Canonical Baseline

## 목표

현재 cars scatterplot primitive/public의 color와 grid 차이를 제거하고 이후 variant가 의존할 하나의
승인된 graphical baseline을 만든다.

## 진행 상태

- [x] Existing primitive/public semantic, graphic, render-call diff 기록
- [x] Intended axes, grids, ticks, colors와 rendering order 결정
- [x] Raw primitive chain으로 canonical baseline 재작성
- [x] `baseline/primitive.png`와 target call chain metadata 갱신
- [x] Browser와 high-resolution PNG 확인
- [x] Gate 0 사용자 visual confirmation
- [x] Canonical public program을 승인된 primitive와 일치시킴
- [x] Provisional exact graphic/order/Canvas-call equivalence test
- [x] Immutability와 existing scatterplot regression
- [x] STEP 상태, conceptual commit와 push

## Baseline audit

변경 전 두 program은 392개 point의 x/y/radius는 같았지만 다음이 달랐다.

| 항목 | 기존 primitive | Existing public |
|---|---|---|
| Horizontal grid | 없음 | y tick 위치의 4개 line |
| Origin order/color | 이름별 수동 map, Japan green | first appearance `USA → Japan → Europe`, blue/orange/red |
| Graphic IDs/order | legacy axis/tick names, points가 ticks 뒤 | guide materialization IDs, grid → points → axes |
| Y axis endpoint order | top → bottom | bottom → top |
| X title rotation | property 없음 | concrete `0` |

Canonical primitive는 existing public의 완성된 visual contract를 목표로 선택했다. Production scale/guide
resolver를 호출하지 않고 independent extent, tick, categorical first-appearance color와 concrete grid 값을
raw `editSemantic`, `createGraphics`, `editGraphics` chain에 저장한다.

Gate 0에서 이 primitive가 승인되었다. 두 program의 전체 `graphicSpec`, graphic order와 Canvas spy
calls는 정확히 같으며 Roadmap 2 gallery에 `primitive.png`와 `user-facing.png` pair를 생성한다.
기존 flat public/primitive PNG regression도 계속 실행한다.

## 작업 순서

1. 현재 두 program을 같은 normalized comparison으로 실행해 graphic IDs, order, properties와 Canvas calls의
   차이를 고정된 test output으로 확인한다.
2. 기존 public 결과를 무조건 정답으로 간주하지 않는다. Raw primitive chain에서 목표 baseline을 명시하고
   `primitive.png`만 생성한다.
3. 사용자 승인 뒤 canonical public chain과 primitive가 같은 concrete 결과를 만들도록 조정한다.
4. 이후 모든 variant가 같은 row filter, Canvas layout, position scales와 guide policy를 재사용하게 한다.

## 검증 기준

- Primitive와 public은 representative color 존재 여부가 아니라 전체 `graphicSpec`, graphic order와
  Canvas spy calls가 일치해야 한다.
- Dataset row selection과 first-appearance categorical domain도 같다.
- Renderer는 `graphicSpec`만 읽어 같은 logical Canvas와 2× PNG를 만든다.
- Baseline metadata의 target call chain은 canonical public program과 동일하다.

## 제외 범위

- `editScale` 또는 새 edit action 구현
- Shape/palette vocabulary 확장
- Encoding reassignment와 continuous appearance

## 승인 게이트

승인 전에는 corrected `user-facing.png`를 확정하지 않는다. Gate 0 승인 뒤 exact pair를 복원했으며
STEP2의 primitive batch를 시작할 수 있다.

## 완료 결과

- Rows/points: 392
- Horizontal grid lines: 4
- X/Y ticks: 각 4
- Origin domain/color: `USA → Japan → Europe`, `#4c78a8 → #f58518 → #e45756`
- Logical Canvas: `640×400`, PNG pixel ratio 2
- Primitive/public `graphicSpec`, order와 Canvas spy calls: exact match
- Gallery status: `Ready for equivalence review`
