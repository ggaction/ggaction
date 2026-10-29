# Native theme·provenance 구현 경계

## 진행 상태

- [x] STEP-033과 geometry-design/core, 기존 theme·inspection·font 경계 대조
- [x] 사용자 전체 STEP-077 승인 `b758b912` 재사용; 아래 구체 선택을 기록
- [x] closed token 확장·실제 winning source inspection
- [x] paint-only / typography / guide geometry dependency 연결
- [x] nested composition·named selection·codec·renderer·설치 소비자 검증
- [x] 타입·Current·public docs·generated inventory 동기화 및 checkpoint

기준은 font/GraphPlot 통합 source `e412fe55e`, evidence `36349d6b1`다.
아래 guide·palette token 확장과 inspection source는 [completion checkpoint](COMPLETION.md)에 구현했다. 최종 qualification 상태는 해당 기록이 소유한다. Global
`fontSize`/`fontWeight`는 [typography checkpoint](TYPOGRAPHY.md)로 구현·검증한다. 먼저 기존 token의
Graph/Tree/Treemap role 적용과 descriptor safety를 별도 [기반 checkpoint](RESOURCE_PLOTS.md)로 검증한다. STEP-034/035의 responsive solver와
nested guide 배치까지 별도 후속 의무로 유지한다.
Native guide 색 복원과 composition snapshot 소유권 수리는 [별도 checkpoint](GUIDE_DEFAULTS.md)에 기록한다.
Flow native role과 exact typography 연결은 [Flow checkpoint](FLOW.md)에 기록한다.
Guide 선·tick·grid의 네 수치 token은 [geometry checkpoint](GUIDE_GEOMETRY.md)로 구현한다.

## 공개 흐름과 저장 owner

기존 `applyTheme({theme,scope?})` / `removeTheme()`를 유지한다. 새 theme resource, transaction,
renderer callback은 만들지 않는다. `materializationConfigs.theme.frames`가 요청·owner·partial tokens를
유일하게 소유하고, resolved graphics·measurements는 기존 owner에 남긴다. Built-in light/dark를
유지하며 custom partial은 base에 overlay되고 다음 apply 때 이전 partial과 합치지 않는다.

우선순위는 defaults < chart-family defaults < theme < plot/mark style < explicit channel/mark/guide
< named interaction overlay다. Omission은 기존 action 의미를 따르고 null은 universal reset이 아니다.
명시적인 0은 stroke width·tick length·spacing 등 기존 option이 허용하는 곳에서 보존한다.
false는 기존 outline/guide enable option의 명시값으로 보존한다. 임의의 color token 빈 문자열은
현재대로 거부한다. getter/symbol/non-enumerable/prototype 값을 option으로 읽지 않는다.

## Token 선택

기존 23개 token은 그대로 유지한다. 추가하는 optional token은 다음 기존 결정을 한 번만 표현한다.

- `fontSize`, `fontWeight`: 전역 text typography. Role별 explicit style과 기존 axis role token이 우선한다.
- `axisStrokeWidth`, `tickStrokeWidth`, `tickSize`, `gridStrokeWidth`: 기존 guide line/tick/grid의 수치 기본값.
- `axisLabelGap`, `axisTitleGap`, `legendItemGap`: 기존 guide·legend 간격의 기본값. Resolved x/y 또는 Canvas size를 저장하지 않는다.
- `palette`: 비어 있지 않은 color string 배열. 명시 range/palette가 없는 categorical color 소비자에만 적용한다.
- `patternPalette`: 비어 있지 않은 normalized pattern fill 배열. Categorical fill의 auto appearance만 순서대로
  정하며, line/rule/tick의 stroke color는 `palette` 정책을 따른다. Scalar color scale range에 structured paint를
  넣거나 continuous color interpolation을 pattern으로 바꾸지 않는다. Explicit fill/channel palette는 보존한다.

Numeric/array의 상한은 기존 work/generated budget owner를 재사용한다. Pattern normalization·origin·alpha·clip은
승인된 공통 fillPaint owner를 재사용하며 별도 tile kernel을 만들지 않는다. Pattern category 선택은 원래
scale domain의 typed category identity를 사용하며 현재 glyph 순서나 highlight reorder를 사용하지 않는다.

## Inspection과 provenance

기존 `inspectProgram` / `getMarkItems`에 read-only appearance provenance를 연결한다. 반환 정보는 semantic
owner, item key 또는 component role, property, resolved value와 winning source다. Source는 위 여섯 단계와
해당 theme owner/token, explicit action 또는 named selection ID를 구분한다. Raw private graphic ID를 새로운
일반 authoring 옵션으로 노출하지 않는다. 값이 default와 같더라도 authored 입력은 explicit로 표시한다.

기존 trace와 theme override 수집을 재사용한다. 별도 독립 mutable provenance history를 쌓지 않는다.
Inspection은 theme를 적용하거나 통계/layout을 실행하지 않는다. Legacy/extension concrete state에서 출처를
입증할 수 없으면 default라고 추측하지 않고 명시적인 unknown을 반환한다. Codec 후에도 같은 의미를 유지한다.

## Dependency와 소비자

Color/paint만 바뀌면 position·statistics·graph/hierarchy/layout resource 결과를 재계산하지 않는다.
Typography는 기존 rematerializeTypography와 exact text metrics 준비 요구를 사용한다. 준비된 profile에 새
size/weight/family 측정이 없으면 metrics-required로 원자적으로 거부하며 추정 width로 통과시키지 않는다.
Guide width/tick length/gap은 owning guide부터 occupied bounds·ancestor composition까지 갱신한다.
Named highlight는 새 baseline에서 다시 계산해 opacity를 누적하지 않는다.

GraphPlot nodes/labels/edges와 Tree/Treemap의 역할별 style에 기존 token을 연결하고 저장 layout
identity가 유지되는 것을 기반 checkpoint에서 검사한다. Resource-backed hierarchy·image, facet/repeat의 retained source와
composition self/descendants scope를 분리하지 않고 같은 frame/consumer 정책으로 검사한다.

독립 literal precedence·descriptor safety → 실제 public create/edit/reset → selection/codec/composition →
같은 concrete source의 Canvas/SVG/PNG/PDF/scene → installed package 순서로 검증한다. 단계별 checkpoint는
진행 증거이며 STEP-033 또는 이후 card 전체 완료를 대신하지 않는다.
