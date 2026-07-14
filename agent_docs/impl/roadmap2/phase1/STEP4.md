# Roadmap 2 — Phase 1 Step 4: Encoding Reassignment Primitive

## 목표

기존 point encoding을 같은 action 재호출로 교체하는 최종 output을 primitive로 먼저 작성한다.

## 진행 상태

- [ ] Reassignment input row validation과 independent reference values
- [ ] X=`Displacement`, Y=`Acceleration` concrete positions
- [ ] Color=`Cylinders`, size=`Weight_in_lbs`, shape=`Origin` concrete appearance
- [ ] Reused scale IDs와 replacement semantic binding fixture
- [ ] Inferred guide title 갱신과 custom title 보존 fixture
- [ ] `encoding-reassignment/primitive.png`
- [ ] Expanded target user-facing call chain metadata
- [ ] Browser/high-resolution PNG 확인
- [ ] Gate B 사용자 visual confirmation
- [ ] STEP 상태, conceptual commit와 push

## Target flow

Canonical baseline encoding 뒤에 다음 action을 호출한다.

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
