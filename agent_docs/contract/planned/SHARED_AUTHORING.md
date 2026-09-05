# Planned shared authoring contracts

상태: Planned, accepted, NOT IMPLEMENTED. 2026-09-05 사용자의 “ㄱㄱ”는
[검증·push된 계약](https://github.com/ggaction/ggaction/blob/e06b57db5624a5b0d66cea425cff4aa5f5f4caad/agent_docs/impl/roadmap6/phase2/CONTRACT_REVIEW.md)의 구현 승인이다.
아래는 활성 Planned inventory의 owner다. 정확한 검토 signature·수치·migration·consumer matrix는 위 고정 ref에 있다.
구현된 부분은 해당 Current owner로 이동하고 이 원장의 상태를 갱신한다. 시각 target 6개는 R6-P2-V에서 사용자의 “승인한다”로 승인되었다.

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

createRegression/encodeDensity/encodeHorizon에 `groupBy:false`를 추가한다. 기존 omission·explicit undefined·editor
보존 규칙은 검토 matrix대로 유지한다. Temporal binding과 관련 transform에 `temporalUnit: "auto" | "year" | "timestamp"`를
추가하고 timestamp는 Unix milliseconds다. 기존 생략 parser, nominal numeric color, mean Bar는 유지한다.
Source schema API는 이번 계약에 포함하지 않는다. Temporal consumer와 stored encoding/transform을 함께 동기화한다.

## Incomplete bars

구현되어 Planned inventory에서 제거했다. 현재 동작과 검증은
[position 순서 계약](../current/ENCODINGS.md#encodex)과 [width 계약](../current/ENCODINGS.md#encodebarwidth)이 소유한다.
