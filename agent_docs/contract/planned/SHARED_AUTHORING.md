# Shared authoring 계약의 Current 이관 기록

상태: 구현되어 활성 Planned inventory에 남은 항목 없음. 2026-09-05 사용자의 “ㄱㄱ”는
[검증·push된 계약](https://github.com/ggaction/ggaction/blob/e06b57db5624a5b0d66cea425cff4aa5f5f4caad/agent_docs/impl/roadmap6/phase2/CONTRACT_REVIEW.md)의 구현 승인이다.
아래는 기존 승인 항목과 현재 계약 owner를 연결하는 이관 기록이다. 정확한 최초 검토 signature·수치·migration·consumer matrix는 위 고정 ref에 있다.
구현 계약은 각 Current owner가 소유한다. 시각 target 6개는 R6-P2-V에서 사용자의 “승인한다”로 승인되었다.

## `editRuleMark`

구현되어 Planned inventory에서 제거했다. 현재 계약은 [Rule styles](../current/MARKS.md#editrulemark)가 소유한다.

## Guide reuse

구현되어 Planned inventory에서 제거했다. 현재 동작과 검증은
[공통 facade guide 계약](../current/BASIC_CHARTS.md#facade-guide-reuse)이 소유한다.

## Series identity

구현되어 Planned inventory에서 제거했다. 현재 계약은 [encodeGroup](../current/ENCODINGS.md#encodegroup),
[createLinePlot](../current/BASIC_CHARTS.md#createlineplot)이 소유한다. Stable 증거는 `test/charts/series-identity/`다.

## Appearance

구현되어 Planned inventory에서 제거했다. [Encodings](../current/ENCODINGS.md),
[Marks](../current/MARKS.md), [ErrorBand](../current/STATISTICS.md#editerrorband),
[Scatter](../current/BASIC_CHARTS.md#createscatterplot)가 현재 계약을 소유한다.

## Inference

구현되어 Planned inventory에서 제거했다. [Temporal input units](../current/ENCODINGS.md#temporal-input-units)와
[TimeUnit data](../current/CORE.md#createtimeunitdata)가 현재 동작을 소유한다. Phase 2의 활성 Planned API는 없다.

## Incomplete bars

구현되어 Planned inventory에서 제거했다. 현재 동작과 검증은
[position 순서 계약](../current/ENCODINGS.md#encodex)과 [width 계약](../current/ENCODINGS.md#encodebarwidth)이 소유한다.
