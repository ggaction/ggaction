# Planned shared authoring contracts

상태: Planned, accepted, NOT IMPLEMENTED. 2026-09-05 사용자의 “ㄱㄱ”는
[검증·push된 계약](https://github.com/ggaction/ggaction/blob/e06b57db5624a5b0d66cea425cff4aa5f5f4caad/agent_docs/impl/roadmap6/phase2/CONTRACT_REVIEW.md)의 구현 승인이다.
아래는 활성 Planned inventory의 owner다. 정확한 검토 signature·수치·migration·consumer matrix는 위 고정 ref에 있다.
구현된 부분은 해당 Current owner로 이동하고 이 원장의 상태를 갱신한다. 시각 target 6개는 R6-P2-V에서 사용자의 “승인한다”로 승인되었다.

## `editRuleMark`

`editRuleMark({ target?, stroke?, strokeWidth?, strokeDash?, opacity? })`는 선택한 Rule의 scalar style을 기존
`encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`, `encodeOpacity` child로 작성한다. 적어도 한 변경이
필요하고 active field encoding과 scalar edit는 충돌한다. Default entry 전용이며 별도 위치/통계 owner를 만들지 않는다.
Create Rule도 같은 scalar 옵션을 기존 owner에 위임한다. Width는 non-negative finite logical pixels,
opacity는 [0,1], stroke는 non-empty color, dash는 기존 DashStyle/DashPattern이다.

## Guide reuse

구현되어 Planned inventory에서 제거했다. 현재 동작과 검증은
[공통 facade guide 계약](../current/BASIC_CHARTS.md#facade-guide-reuse)이 소유한다.

## Series identity

구현되어 Planned inventory에서 제거했다. 현재 계약은 [encodeGroup](../current/ENCODINGS.md#encodegroup),
[createLinePlot](../current/BASIC_CHARTS.md#createlineplot)이 소유한다. Stable 증거는 `test/charts/series-identity/`다.

## Appearance

Line의 encodeStrokeWidth/encodeOpacity constant·field 모드와 scalar editor 충돌 검증은 구현되었다.
현재 계약은 [Encodings](../current/ENCODINGS.md)와 [Marks](../current/MARKS.md)가 소유한다. 남은 범위는 다음과 같다. ErrorBand fill, Point opacity, Line width의
잘못된 scalar 성공을 교정한다. ErrorBand `fill:false`는 constant override를 제거하며 투명색을 뜻하지 않는다.
Scatter `point.radius`는 encodePointRadius로 전달하며 size와 충돌한다. 기존 root encodePointRadius를 basic에도 공개한다.
Rule editor/creation style은 위 계약을 따른다. Root-only 통계·Rule·일반 opacity를 basic에 추가하지 않는다.

## Inference

createRegression/encodeDensity/encodeHorizon에 `groupBy:false`를 추가한다. 기존 omission·explicit undefined·editor
보존 규칙은 검토 matrix대로 유지한다. Temporal binding과 관련 transform에 `temporalUnit: "auto" | "year" | "timestamp"`를
추가하고 timestamp는 Unix milliseconds다. 기존 생략 parser, nominal numeric color, mean Bar는 유지한다.
Source schema API는 이번 계약에 포함하지 않는다. Temporal consumer와 stored encoding/transform을 함께 동기화한다.

## Incomplete bars

구현되어 Planned inventory에서 제거했다. 현재 동작과 검증은
[position 순서 계약](../current/ENCODINGS.md#encodex)과 [width 계약](../current/ENCODINGS.md#encodebarwidth)이 소유한다.
