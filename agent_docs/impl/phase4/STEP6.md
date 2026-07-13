# Phase 4 — Step 6: `encodeBarWidth`와 grouped rect materialization

## 목표

Group slot에서 bar가 차지하는 비율을 설정하고 완성된 grouped semantics를 concrete
rect collection으로 materialize한다.

```javascript
.encodeBarWidth({ band: 0.72 })
```

## 진행 상태

- [x] `band` default와 validation
- [x] Immutable mark graphical config 저장
- [x] Complete grouped semantic prerequisite 검증
- [x] year × color mean cell derivation
- [x] x/xOffset band 중심과 concrete width 계산
- [x] y baseline과 concrete height 계산
- [x] Color scale 기반 fill 계산
- [x] 누락된 category 조합 생략
- [x] Canvas/scale 변경 rematerialization
- [x] Action program의 raw rect block 제거
- [x] Unit, acceptance, PNG regression
- [x] 사용자 문서 갱신
- [x] 전체 regression과 commit/push

## API

```javascript
encodeBarWidth({
  band?: number, // 0 < band <= 1, default 0.72
  target?
})
```

`band`는 semantic meaning이 아니라 graphical layout config다. Context나
semanticSpec에 저장하지 않고 immutable mark config에 저장한다. Renderer는 여전히
완성된 graphicSpec만 읽는다.

## Action 구조

```text
encodeBarWidth
└─ rematerializeBarMark
   ├─ rematerializeScale(x)
   ├─ rematerializeScale(y)
   ├─ rematerializeScale(color)
   ├─ rematerializeScale(xOffset)
   └─ editGraphics(rect collection)
```

## Geometry

- 한 x category band를 xOffset domain별 slot으로 나눈다.
- `width = xOffset.bandwidth × band`다.
- Bar는 각 slot 중앙에 정렬한다.
- y domain의 첫 값을 baseline으로 사용한다.
- 관측되지 않은 x × color 조합은 placeholder 없이 생략한다.

## 검증 결과

- `npm test`: 303 passed
- `npm run test:render`: 11 passed
- Primitive baseline과 semanticSpec, graphicSpec, Canvas call sequence가 동일함
- High-level action program에서 bars 대상 raw `editGraphics` 호출이 제거됨
- Explicit color domain 순서가 xOffset slot과 fill 순서에 함께 적용됨
- 1440 × 920 PNG를 직접 확인함
