# Current architecture map

이 문서는 [`SECOND_ARCHITECTURE.md`](../SECOND_ARCHITECTURE.md)의 내용을 복제하지 않고 작업별로 필요한
section에 연결한다. `SECOND_ARCHITECTURE.md`가 현재 macro-architecture의 canonical owner다.

## 최소 읽기 원칙

- Ordinary action 구현에서는 action contract와 가까운 기존 source family를 먼저 읽는다.
- Ownership, stored state, materialization flow, renderer 또는 package boundary를 바꿀 때만 관련 architecture
  section을 읽는다.
- 전체 architecture를 처음부터 끝까지 읽는 대신 아래 경로에서 시작하고, 연결된 전후 section이 필요할
  때만 범위를 넓힌다.

## 작업별 경로

| 작업 | Architecture section |
| --- | --- |
| 전체 모델을 처음 파악 | [핵심 결론](../SECOND_ARCHITECTURE.md#핵심-결론), [전체 계층](../SECOND_ARCHITECTURE.md#전체-계층) |
| Public export 또는 package entry 변경 | [Public package boundary](../SECOND_ARCHITECTURE.md#public-package-boundary) |
| Program state 또는 immutable update 변경 | [`ChartProgram` canonical state](../SECOND_ARCHITECTURE.md#chartprogram의-canonical-state), [Immutability와 ownership](../SECOND_ARCHITECTURE.md#immutability와-ownership) |
| Semantic resource/schema 변경 | [`semanticSpec`](../SECOND_ARCHITECTURE.md#semanticspec), [Selector와 resource identity](../SECOND_ARCHITECTURE.md#selector와-resource-identity) |
| Concrete graphic/tree 변경 | [`graphicSpec`](../SECOND_ARCHITECTURE.md#graphicspec), [Shared concrete-graphic contract](../SECOND_ARCHITECTURE.md#shared-concrete-graphic-contract) |
| Action, trace 또는 primitive 변경 | [Action과 trace](../SECOND_ARCHITECTURE.md#action과-trace), [API의 세 층](../SECOND_ARCHITECTURE.md#api의-세-층), [Primitive action](../SECOND_ARCHITECTURE.md#primitive-action) |
| Scale 또는 mark 계산 변경 | [Scale resolution과 materialization](../SECOND_ARCHITECTURE.md#scale-resolution과-materialization), [Mark materialization policy](../SECOND_ARCHITECTURE.md#mark-materialization-policy) |
| Cross-cutting 재계산 변경 | [Cross-cutting rematerialization plan](../SECOND_ARCHITECTURE.md#cross-cutting-rematerialization-plan) |
| Canvas, guide 또는 title layout 변경 | [Canvas와 layout](../SECOND_ARCHITECTURE.md#canvas와-layout), [Axis, grid, legend, title](../SECOND_ARCHITECTURE.md#axis-grid-legend-title) |
| Statistical/composite action 변경 | [Aggregate action hierarchy](../SECOND_ARCHITECTURE.md#aggregate-action-hierarchy) |
| Canvas, SVG, PNG 또는 PDF 변경 | [Canvas renderer](../SECOND_ARCHITECTURE.md#canvas-renderer), [SVG renderer](../SECOND_ARCHITECTURE.md#svg-renderer), [PNG adapter](../SECOND_ARCHITECTURE.md#png-adapter), [PDF adapter](../SECOND_ARCHITECTURE.md#pdf-adapter) |
| Module ownership 변경 | [Source ownership](../SECOND_ARCHITECTURE.md#source-ownership) |
| Test evidence 또는 coverage 변경 | [Test architecture](../SECOND_ARCHITECTURE.md#test-architecture) |
| 새 capability의 적절한 계층 판단 | [새 기능을 추가하는 기준](../SECOND_ARCHITECTURE.md#새-기능을-추가하는-기준), [현재 범위 밖 또는 제한된 부분](../SECOND_ARCHITECTURE.md#현재-범위-밖-또는-제한된-부분) |

## 역사적 기준점

[`INITIAL_ARCHITECTURE.md`](../INITIAL_ARCHITECTURE.md)는 최초 설계 의도를 보존한다. 현재 구현과 충돌하거나
원래 의도를 조사할 때만 읽으며 현재 observable behavior의 계약으로 사용하지 않는다.
