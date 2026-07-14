# Roadmap 2 — Phase 2 Step 1: Canonical Baseline and Phase Contract

## 목표

Existing cars line-chart primitive/public pair를 재감사하고 모든 Phase 2 variant가 공유할 canonical baseline과
executable chart contract를 고정한다.

## 진행 상태

- [x] Existing semantic, graphic, order와 Canvas-call diff audit
- [x] Valid row filter, series order, aggregate grain과 guide policy 고정
- [x] Baseline primitive/public exact equivalence
- [x] `baseline` metadata와 expanded target chain 확인
- [x] Roadmap 2 gallery pair 재생성
- [x] Browser와 high-resolution PNG 확인
- [x] Gate 0 사용자 baseline confirmation
- [x] Phase 2 chart/variant contract link와 status 갱신
- [x] Conceptual commit와 push

## Baseline audit

변경 전 primitive는 older hand-authored appearance를 유지하고 public program은 이후 확정된 guide와 theme
기본값을 사용해 다음 차이가 있었다.

| 항목 | 기존 primitive | Canonical public |
| --- | --- | --- |
| Horizontal grid | 없음 | y tick 위치의 6개 line |
| Auto dash | `[]`, `[6, 4]`, `[2, 3]` | `[]`, `[8, 4]`, `[3, 3]` |
| Graphic order | x/y guide component가 교차됨 | grid → mark → complete x axis → complete y axis |
| Axis title position | x `y=444`, y `x=22` | x `y=442`, y `x=28` |
| Chart title style | 20px/700, subtitle 13px | 22px/600, subtitle 14px |
| Canvas calls | 415개 | 463개 |

Horizontal grid는 모든 chart type에 공통인 `createGuides()` default이고 현재 theme/dash 값도 shared public
contract이므로 canonical baseline은 public 결과로 선택했다. Raw primitive가 production materializer를 호출하지
않고 이 concrete state를 직접 명시하도록 교정했다.

## 고정된 data와 guide 정책

- Valid rows: parseable string `Year`, finite `Acceleration`, non-empty string `Origin`을 가진 406개 row
- Series order: first appearance 기준 `USA → Europe → Japan`
- Aggregate grain: `Year × Origin`, 총 36개 group, 각 series 12개 point
- Y aggregate: `mean`
- Guide: complete x/y axes, y tick과 같은 위치의 horizontal grid, color+dash composite legend
- Logical Canvas: `720×460`; PNG는 pixel ratio 2의 `1440×920`

Baseline primitive/public의 complete `semanticSpec`, `graphicSpec`, order와 463개 Canvas spy call은 정확히 같다.
Roadmap 2 gallery의 expanded public chain과 두 PNG가 Gate 0 사용자 승인을 받았다.

## 작업 범위

Baseline은 current public result를 무조건 정답으로 가정하지 않는다. Raw primitive와 public output의 path,
series order, dash/color, axes, legend, title과 rendering order를 비교한 뒤 하나의 승인된 visual을 선택한다.
이 STEP에서는 curve, edit, reassignment 또는 aggregate vocabulary를 구현하지 않는다.

## 완료 조건

Baseline pair의 complete `graphicSpec`, order와 Canvas spy calls가 같고 gallery가
`Ready for equivalence review` 상태가 된다.
