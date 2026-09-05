# Planned shared authoring contracts

상태: Planned, accepted, NOT IMPLEMENTED. 2026-09-05 사용자의 “ㄱㄱ”는
[검증·push된 계약](https://github.com/ggaction/ggaction/blob/e06b57db5624a5b0d66cea425cff4aa5f5f4caad/agent_docs/impl/roadmap6/phase2/CONTRACT_REVIEW.md)의 구현 승인이다.
아래는 활성 Planned inventory의 owner다. 정확한 검토 signature·수치·migration·consumer matrix는 위 고정 ref에 있다.
구현된 부분은 해당 Current owner로 이동하고 이 원장의 상태를 갱신한다. 아직 새 시각 target 승인을 받은 것은 아니다.

## `editRuleMark`

`editRuleMark({ target?, stroke?, strokeWidth?, strokeDash?, opacity? })`는 선택한 Rule의 scalar style을 기존
`encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`, `encodeOpacity` child로 작성한다. 적어도 한 변경이
필요하고 active field encoding과 scalar edit는 충돌한다. Default entry 전용이며 별도 위치/통계 owner를 만들지 않는다.
Create Rule도 같은 scalar 옵션을 기존 owner에 위임한다. Width는 non-negative finite logical pixels,
opacity는 [0,1], stroke는 non-empty color, dash는 기존 DashStyle/DashPattern이다.

## Guide reuse

Complete facade는 자기 layer의 compatible axes/grid/legend를 재사용하고 없는 component만 생성한다.
Coordinate/scale/channel·legend recipe·명시적 style 충돌은 atomic error다. Low-level create strictness,
Box의 guides omitted=false, Box/Gradient의 deferred completion은 유지한다. 생성은 기존 wrapped guide owner가 담당한다.

## Series identity

Line/ordinary ranged Area의 `encodeGroup`은 기존 `{ field }`와 mutually exclusive한 `{ fields: [first,...rest] }`를
지원한다. 단일 배열은 기존 single-field state로 정규화한다. 명시적 group은 identity, color/dash/width/opacity는
final-series appearance이며 한 series에 field 값이 여러 개면 거부한다. 기존 implicit color/dash grouping을 유지하고
specialized transform/layout의 owned group은 해당 owner의 범위를 유지한다.

## Appearance

Line은 encodeStrokeWidth/encodeOpacity의 constant·field 모드를 지원한다. Scalar editor의 field 충돌을 검증하고
명시적 `{ value }` assignment는 field·해당 legend를 정리한다. ErrorBand fill, Point opacity, Line width의
잘못된 scalar 성공을 교정한다. ErrorBand `fill:false`는 constant override를 제거하며 투명색을 뜻하지 않는다.
Scatter `point.radius`는 encodePointRadius로 전달하며 size와 충돌한다. 기존 root encodePointRadius를 basic에도 공개한다.
Rule editor/creation style은 위 계약을 따른다. Root-only 통계·Rule·일반 opacity를 basic에 추가하지 않는다.

## Inference

createRegression/encodeDensity/encodeHorizon에 `groupBy:false`를 추가한다. 기존 omission·explicit undefined·editor
보존 규칙은 검토 matrix대로 유지한다. Temporal binding과 관련 transform에 `temporalUnit: "auto" | "year" | "timestamp"`를
추가하고 timestamp는 Unix milliseconds다. 기존 생략 parser, nominal numeric color, mean Bar는 유지한다.
Source schema API는 이번 계약에 포함하지 않는다. Temporal consumer와 stored encoding/transform을 함께 동기화한다.

## Incomplete bars

Bar width-first와 measure-first를 유효한 partial state로 보존한다. Missing field/invalid value는 즉시 거부하고
geometry는 필요한 role pair가 완성될 때 기존 owner가 생성한다. Width·aggregate 기본값과 histogram/Box 전용
grain 제약은 유지한다. 최종 의미와 graphics는 반대 작성 순서와 같고 trace는 실제 순서를 기록한다.
