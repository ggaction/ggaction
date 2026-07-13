# Phase 4 — Step 8: Grouped bar legend

## 목표

Grouped ordinal bar의 color encoding과 resolved scale을 읽어 right-side categorical
swatch legend를 생성한다.

```javascript
.createLegend()
```

## 진행 상태

- [x] Grouped bar legend target inference
- [x] Color field/scale/domain 검증
- [x] Right-side default layout
- [x] Swatch, label, title 기존 component 재사용
- [x] Explicit appearance와 optional border
- [x] Canvas/domain 변경 rematerialization
- [x] Histogram bottom legend regression 유지
- [x] Action program의 raw legend block 제거
- [x] Unit, acceptance, PNG regression
- [x] 사용자 문서 갱신
- [x] 전체 regression과 commit/push

## 기본 배치

- Grouped ordinal bar color legend: `position: "right"`
- Histogram color legend: `position: "bottom"` 유지
- Grouped legend item gap: `28`
- Swatch: `14 × 12`, white stroke `0.5`
- Border: default off

Legend symbol recipe와 component action은 mark별로 fork하지 않고 기존 categorical
legend 구조를 그대로 사용한다.

## 검증 결과

- `npm test`: 310 passed
- `npm run test:render`: 11 passed
- Grouped legend는 right, histogram legend는 bottom default를 유지함
- Primitive baseline과 semanticSpec, graphicSpec, Canvas call sequence가 동일함
- Action program의 raw legend block이 `createLegend`로 교체됨
