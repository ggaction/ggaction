# Roadmap 2 — Phase 2 Step 10: Composite Legend Primitives

## 목표

Top/bottom categorical layout에서 line+point layered symbol이 차지할 final bounds와 item grid를 primitive로
고정한다.

## 진행 상태

- [x] `composite-legend-top` primitive
- [x] `composite-legend-bottom` primitive
- [x] Layer order와 shared item-local anchors
- [x] Symbol union bounds와 label offset
- [x] Direction/columns/align/title/border representative layout
- [x] Insufficient-margin target error 정의
- [x] Expanded target chain metadata
- [x] Browser와 2× primitive PNG 생성
- [x] Gate D 사용자 visual confirmation
- [x] Feedback 반영과 primitive 재확인
- [x] STEP 상태, conceptual commit와 push

## 현재 Gate D 결과

- Top: 중앙 정렬, 세로 방향, 2열, 왼쪽 title, 흰 배경과 border
- Bottom: 오른쪽 정렬, 가로 방향, 2열, 위쪽 title, 옅은 배경과 border
- 각 symbol은 같은 item-local anchor를 공유하는 line과 point를 background → line → point → label → title
  순서로 그린다.
- 범례가 지정된 margin 안에 들어가지 않으면 primitive 값 계산 단계에서 오류를 낸다.
- 공개 `createLegend` 지원은 visual confirmation 이후 STEP11에서 구현한다.
- 2026-07-15: 사용자가 top/bottom 결과를 수정 없이 승인했다.

## 완료 조건

Top/bottom primitive의 occupied bounds, ordering과 target appearance가 승인된다.
