# Roadmap 2 — Phase 2 Goal

## 목표

Cars line chart를 canonical oracle로 사용해 backend-neutral path command, curve interpolation,
line mark editing, series reassignment, stroke-dash vocabulary, aggregate 확장과 top/bottom composite
legend를 구현한다.

완전한 chart와 variant 계약은 다음 문서에서 관리한다.

- [`../chart/cars-line-chart-variants.md`](../chart/cars-line-chart-variants.md)

## 진행 상태

- [x] Phase 2 범위, variant와 approval gate 확정
- [x] Canonical baseline audit와 gallery pair
- [x] Concrete path-command 기반과 기존 path chart parity
- [x] Curve primitive 승인과 public implementation
- [x] Dash/reassignment primitive 승인과 public implementation
- [x] Aggregate scalar와 parameterized operation 구현
- [ ] Composite legend primitive 승인과 public implementation
- [ ] Public docs, contract 승격과 Phase closeout

## 구현 범위

- `ConcretePathCommand`: `M | L | C | Z`
- `createLineMark({ curve })`
- `editLineMark({ target?, strokeWidth?, curve? })`
- `encodeGroup` reassignment
- Field/constant `encodeStrokeDash`와 reassignment
- `solid | dashed | dotted | dashdot` 및 direct dash pattern
- Scalar aggregate vocabulary
- Parameterized `quantile`, ordered `first | last`
- Top/bottom point-composite categorical legend

Curve는 graphical materialization 설정이며 semantic field, grouping, coordinate와 scale을 바꾸지 않는다.
Aggregate는 semantic grain을 바꾸므로 `semanticSpec`에 저장하고 pure grammar가 값을 계산한다. Renderer는
curve token이나 aggregate를 읽지 않고 final path commands와 concrete appearance만 실행한다.

## 실행 순서

```text
STEP1   canonical baseline audit와 Phase contract
STEP2   concrete path-command 기반과 existing path migration
STEP3   curve primitive batch
  ↓ Gate A: curve visual confirmation
STEP4   curve grammar, createLineMark.curve와 editLineMark
STEP5   dash와 series reassignment primitive batch
  ↓ Gate B: dash/reassignment visual confirmation
STEP6   named/constant dash와 series reassignment
STEP7   aggregate primitive batch
  ↓ Gate C: aggregate visual confirmation
STEP8   scalar aggregate vocabulary
STEP9   parameterized aggregate operations
STEP10  top/bottom composite legend primitive batch
  ↓ Gate D: composite legend visual confirmation
STEP11  top/bottom composite legend implementation
STEP12  integration, docs, contract promotion과 cleanup
```

Gate가 있는 STEP은 `primitive.png`와 expanded target chain metadata만 먼저 만든다. 사용자 승인 전에는
해당 variant의 user-facing action 구현이나 `user-facing.png`를 만들지 않는다.

## Visual variant와 machine coverage

Phase 2 gallery는 baseline을 포함해 13개 variant를 목표로 한다.

- Baseline 1개
- Curve 2개
- Dash와 reassignment 4개
- Aggregate 4개
- Composite legend 2개

8개 curve token, 4개 named dash, direct dash boundaries와 전체 scalar aggregate vocabulary는 exhaustive
machine coverage를 가진다. Gallery에는 command geometry, series partition, summary grain 또는 layout이
실제로 달라지는 대표 equivalence class만 둔다.

## 완료 조건

- 기존 line/area/density/regression path output이 command migration 전과 시각적으로 동일하다.
- 모든 primitive/public pair의 `graphicSpec`, drawing order와 Canvas calls가 정확히 같다.
- Curve, dash, grouping과 aggregate 변경은 affected mark/scale/guide를 deterministic plan으로 갱신한다.
- Public action은 target, scale, coordinate와 guide를 안전한 경우 infer하며 ambiguity는 오류다.
- Aggregate numeric result는 renderer/PNG와 독립된 deterministic fixture로 검증한다.
- Earlier program과 caller-owned arrays/objects는 변경되거나 retain되지 않는다.
- TypeScript, examples, tutorials, API reference, LLM docs와 action catalog가 구현 상태와 일치한다.
- Unit, contract, chart, docs, coverage, render, desktop/mobile gallery와 remote CI가 통과한다.

## STEP 문서

- [`STEP1.md`](STEP1.md)
- [`STEP2.md`](STEP2.md)
- [`STEP3.md`](STEP3.md)
- [`STEP4.md`](STEP4.md)
- [`STEP5.md`](STEP5.md)
- [`STEP6.md`](STEP6.md)
- [`STEP7.md`](STEP7.md)
- [`STEP8.md`](STEP8.md)
- [`STEP9.md`](STEP9.md)
- [`STEP10.md`](STEP10.md)
- [`STEP11.md`](STEP11.md)
- [`STEP12.md`](STEP12.md)
