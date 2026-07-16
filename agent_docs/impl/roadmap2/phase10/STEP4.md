# Roadmap 2 — Phase 10 Step 4: Transformed Position Public Integration

## 목표

Approved Gate A를 `encodeX`, `encodeY`와 atomic `editScale({ type })`로 재현하고 transformed position consumers를
통합한다.

## 진행 상태

- [x] Position scale option unions and semantic definitions
- [x] Log/pow/sqrt/symlog scale materialization
- [x] Atomic type transition, parameter cleanup and consumer preflight
- [x] Point/axis/grid rematerialization and authoring-order convergence
- [x] Primitive/public semantic, graphic, trace, Canvas and pixel equivalence
- [x] Error, immutability and shared-consumer coverage
- [ ] STEP status, conceptual commits and pushes

## 구현 결과

- Quantitative point position은 `linear | log | pow | sqrt | symlog`와 type별 parameter를 저장하고
  같은 mapping을 point, axes와 grid에 적용한다.
- `editScale({ type })`는 complete next definition과 every consumer를 먼저 검증한 뒤 stale parameter를
  제거하고 shared point/guide consumers를 deterministic하게 rematerialize한다.
- Approved Gate A primitive와 public example은 semantic/graphic state, order, Canvas calls와 decoded pixels가
  exact하게 일치한다. 아직 transformed mapping이 없는 non-point mark는 명시적으로 거부한다.

## 검증

- `test/unit/actions/scales/transformed-position-scale.test.js`
- `test/charts/gapminder-transformed-scales/public.test.js`
- `test/charts/gapminder-transformed-scales/png.render.js`

## 완료 조건

Gate A public program exactly matches the approved primitive and scale type edits never leave partial state.
