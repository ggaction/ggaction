# Roadmap 2 — Phase 1 Step 4: Encoding Reassignment Primitive

## 목표

기존 point encoding을 같은 action 재호출로 교체하는 최종 output을 primitive로 먼저 작성한다.

## 진행 상태

- [x] Reassignment input row validation과 independent reference values
- [x] X=`Displacement`, Y=`Acceleration` concrete positions
- [x] Color=`Cylinders`, size=`Weight_in_lbs`, shape=`Origin` concrete appearance
- [x] Reused scale IDs와 replacement semantic binding fixture
- [x] Inferred guide title 갱신 target; custom title 보존은 STEP5 machine fixture로 검증
- [x] `encoding-reassignment/primitive.png`
- [x] Expanded target user-facing call chain metadata
- [x] Browser/high-resolution PNG 확인
- [ ] Gate B 사용자 visual confirmation
- [x] STEP 상태, conceptual commit와 push

## Target flow

Canonical baseline과 같은 concrete output을 inferred axis titles로 만든 뒤 다음 action을 호출한다.

```javascript
program
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Acceleration" })
  .encodeColor({ field: "Cylinders", fieldType: "nominal" })
  .encodeSize({ field: "Weight_in_lbs" })
  .encodeShape({ field: "Origin" });
```

Primitive semantic state는 기존 channel을 대체하고 각 child의 graphical geometry/style을 새 field에서
계산한다. 이전 scale resource를 임의로 삭제하지 않는다.

## 검증 기준

- Reassignment 전 program도 기존 결과를 그대로 유지한다.
- Omitted scale ID는 current channel scale ID를 재사용한다.
- Explicit new scale ID case는 별도 machine fixture로 계획하고 visual target에는 섞지 않는다.
- X/Y guide는 field 변경에 따라 rematerialize되며 custom title/style은 보존된다.
- Appearance action 호출 순서가 달라도 같은 final point children을 만든다.

## 승인 게이트

Gate B 승인 전에는 existing encoding action behavior를 변경하거나 user-facing PNG를 만들지 않는다.

## Primitive 결과

- Rows: canonical baseline과 같은 392개
- X domain/ticks: `[68, 455]`, `100 / 200 / 300 / 400`
- Y domain/ticks: `[8, 24.8]`, `10 / 15 / 20`
- Color domain: Cylinders first appearance `[8, 4, 6, 3, 5]`
- Size domain/range: Weight `[1613, 5140]` → logical area `[24, 196]`
- Shape domain/range prefix: `USA / Japan / Europe` → `circle / square / diamond`
- Axis titles: `Displacement`, `Acceleration`
- Gallery: primitive-only, `Awaiting visual confirmation`; desktop/mobile Chromium에서 image와 responsive
  layout을 확인했다.
