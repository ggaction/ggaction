# Roadmap 6 Phase 8 W2 — Dot, Lollipop, and Dumbbell endpoint plots

## 검증 ref

- Source/remote ref: `4146068c65920ca6a5a48f2008f4af5e72972192`
- Branch: `origin/codex/roadmap6-hierarchical-actions`

## 구현 결과

- `createDotPlot`은 raw row를 기본 grain으로 유지하고 `mean|median|sum|min|max`를 명시한 경우에만
  category별 `createSummaryData`를 만든다. 자동 집계를 추론하지 않는다.
- `createLollipopPlot`은 value Point와 baseline Rule을 같은 materialized source와 quantitative scale에 둔다.
  Baseline은 기본 0이며 finite nonzero와 signed value를 지원한다. Log scale은 positive baseline/value일 때만
  기존 scale validation을 통과한다.
- `createDumbbellPlot`은 start/end를 크기 순서가 아닌 named semantic role로 저장한다. 두 Point와 connector가
  하나의 scale을 공유하고 start>end와 start=end에서도 endpoint style과 label identity가 유지된다.
- `editEndpointPlot`은 source/category/value/start/end/orientation/summary/baseline을 target 종류별로 검증한 뒤
  owned Point·Rule·label·summary dataset을 한 wrapped action에서 교체한다. 실패 branch는 버려져 caller와 trace가
  변하지 않는다. Scale type 변경은 detached named scale을 먼저 갱신한 뒤 새 consumers를 materialize한다.
- Stable owner의 `removeMark` closure에 stem/start/connector와 summary dataset을 연결했다. Attached label은 기존
  source ownership을 따라 재귀적으로 함께 제거된다.
- Full entry에만 네 action을 등록했고 Basic에는 추가하지 않았다. 새 renderer primitive나 chart compiler 대신
  기존 Point, Rule, encoding, summary, label, guide action을 재사용한다.

## 시각·계층 증거

- `examples/dot-plot`, `examples/lollipop-plot`, `examples/dumbbell-plot`은 각각 같은 public program을 브라우저와
  chart acceptance에서 사용한다.
- `test/charts/endpoint-plots/primitive.program.js`의 명시적 lower chain과 facade가 semanticSpec, graphicSpec,
  graphic tree, draw order, Canvas calls에서 정확히 일치한다.
- 같은 실행의 Node PNG primitive/public pixel hash가 세 variant 모두 일치한다. Public browser registry의 63개
  예제 전체도 logical Canvas size, 접근성 이름, browser error 검사를 통과했다.
- [튜토리얼](../../../../docs/tutorials/endpoint-plots.md)은 raw/summary 경계, baseline/log 조건, named endpoint와
  atomic edit를 실행 가능한 public call로 설명한다.

## 검증 결과

| 범위 | 결과 |
| --- | --- |
| focused runtime/type/source/scale | 12/12 pass |
| primitive/public state + PNG | 6/6 pass |
| public browser examples | 63/63 pass |
| nested scale role | 127 paths, 500 literals pass |
| unit | 2,230/2,230 pass |
| contracts | 317/317 pass |
| docs | 47/47 pass |
| generated artifacts | catalog/card/action/reference/signature/metadata/search/machine checks pass |
| package | 478 entries, 566,367 packed bytes, 2,727,969 unpacked bytes |

Package source 한 개와 네 action card/type surface가 추가되어 승인 범위 안에서 ceiling을 478 entries,
570,000/2,750,000 bytes로 실제 증가량에 맞춰 조정했다.

## 판정

F11은 implemented-verified다. F14 label owner, F15 summary owner, F16 composite role-edit 원칙을 재사용해 새로운
중복 계산이나 renderer 분기를 만들지 않았다. W3 ECDF가 남아 있어 Phase 8 전체는 진행 중이다.
