# Roadmap 2 — Phase 1 Step 1: Canonical Baseline

## 목표

현재 cars scatterplot primitive/public의 color와 grid 차이를 제거하고 이후 variant가 의존할 하나의
승인된 graphical baseline을 만든다.

## 진행 상태

- [ ] Existing primitive/public semantic, graphic, render-call diff 기록
- [ ] Intended axes, grids, ticks, colors와 rendering order 결정
- [ ] Raw primitive chain으로 canonical baseline 재작성
- [ ] `baseline/primitive.png`와 target call chain metadata 갱신
- [ ] Browser와 high-resolution PNG 확인
- [ ] Gate 0 사용자 visual confirmation
- [ ] Canonical public program을 승인된 primitive와 일치시킴
- [ ] Exact graphic/order/Canvas-call equivalence test
- [ ] Immutability와 existing scatterplot regression
- [ ] STEP 상태, conceptual commit와 push

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

승인 전에는 corrected `user-facing.png`를 확정하지 않는다. 승인된 baseline pair가 완성되어야 STEP2로
진행한다.
