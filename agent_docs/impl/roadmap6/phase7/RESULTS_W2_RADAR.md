# Phase 7 W2 결과 — Radar long-form과 explicit Fold facade

## 결과

- `createRadarPlot`을 Full chart facade로 추가했다. Long form은 `category`와 `value`를 명시하고,
  wide form은 최소 세 개의 `wide.fields`를 명시해 내부 `createFoldData` owner를 거친다.
- Long form의 category는 nominal/ordinal, value는 quantitative로 고정했다. `order`는 관측한 모든
  category를 중복 없이 정확히 한 번 포함해야 하며 최소 세 category가 필요하다.
- Wide form은 선택한 field 이름과 순서를 그대로 차원으로 사용한다. 기본 Fold ID와 alias는
  `${id}FoldData`, `${id}Dimension`, `${id}Value`로 결정적이며 caller field를 추론하지 않는다.
  여러 wide row에는 명시적 `groupBy`가 필요하고 한 row만 있을 때 임의 series ID를 만들지 않는다.
- 모든 series는 동일한 category 집합을 정확히 한 번씩 가져야 한다. 누락, 중복, order 밖 category,
  유한하지 않은 value를 오류로 거부하며 값을 자동 정규화하지 않는다.
- Radar path는 항상 닫힌다. Public facade가 W1의 `createPolarLinePlot`을 child owner로 호출하면서
  `line.closed: true`를 강제하고 `line.closed: false`는 원자적으로 거부한다.

## 계층과 시각 동등성

- Trace는 long form에서 `createRadarPlot → createPolarLinePlot → createLineMark/encodeTheta/encodeR`,
  wide form에서 `createRadarPlot → createFoldData + createPolarLinePlot → lower owners`를 보존한다.
- 기존 `examples/jobs-radar-chart`와 chart manifest를 새 facade로 마이그레이션했다. 승인된 primitive
  program과 semanticSpec, graphicSpec, Canvas draw order, decoded PNG pixel이 정확히 같다.
- 기존 primitive baseline에는 `createRadarPlot`이나 `createPolarLinePlot`이 들어가지 않으며, displayed
  call과 executable public trace는 같은 Radar call을 사용한다.
- Theme reconciliation과 scale/Canvas replay가 Radar facade와 그 Polar line child를 인식한다.

## 타입·발견성·오류 계약

- `CreateRadarPlotOptions`는 long/wide union으로 선언했다. Wide branch에서 category/value를, long
  branch에서 wide를 사용할 수 없고, wide fields와 order는 타입 수준에서도 최소 세 항목을 요구한다.
  `line.closed`는 literal `true`만 허용한다. Full declaration만 노출하며 Basic runtime/type에는 없다.
- Intent taxonomy의 기존 `radar chart → createLineMark` 추론을 `createRadarPlot` 단일 owner로 교체했다.
  Resolver는 실행 가능한 category/value 기본 호출을 만들고 Polar line과 Radar intent를 분리한다.
- Unknown option, long/wide 혼합 또는 누락, 잘못된 field role·scale, alias 충돌, 불완전 series와
  모호한 wide identity는 child state를 남기지 않고 실패한다. 이전 program과 caller data/options는
  성공과 실패 모두 immutable하다.

## 계약·시나리오·검증

- Current contract, action index/catalog/card, intent taxonomy, task resolver, API/reference/search/LLM 문서,
  generated declarations와 gallery metadata를 실제 surface와 동기화했다.
- Public inventory는 206 actions, 7,164 option paths, 10,329 requirements다. Radar의 category/value/color/
  strokeDash 중첩 scale은 전체 99 paths와 382 literal witness에 포함되어 각 literal을 실제 실행한다.
- `action-direct-polar-parts` 현실 lifecycle recipe가 `createRadarPlot`을 직접 실행한다. 동일 recipe의 기존
  linear theta scale과 Radar의 discrete theta scale은 명시적으로 다른 scale ID를 사용해 의미 충돌을
  숨기지 않는다. Phase 7 strict 현실 inventory 전체 감사는 W3 schedule과 기존 누적 deficit을 함께
  닫는 X 작업에 남겨 두며, W2에서 통과했다고 기록하지 않는다.
- 누적 normal suite **3,128/3,128**, browser **65/65**, render **208/208**가 통과했다. Coverage는
  lines **95.43%**, branches **92.36%**, functions **98.91%**이며 critical floor 88개를 모두 통과했다.
- Installed package consumer는 long/wide Radar runtime, strict TypeScript, Basic 부재, Node/SVG/PNG/PDF,
  browser bundle과 MCP를 통과했다. [artifact 원장](package-radar-results.json)은 475 entries,
  555,417 packed bytes, 2,662,843 unpacked bytes, SHA-256
  `471257b8c3be84da17c0c0cc1da5142241b5716aa1adc61b70231b86ca92ff57`다.
- Browser gzip은 Full **281,004** / Basic **149,834** / SVG **6,437** bytes다. 새 source와 facade에 맞춰
  entry ceiling을 474→475, packed ceiling을 554,000→556,000, Full gzip ceiling을
  280,000→282,000 bytes로 실제 증가량만큼 조정했다. Basic, SVG와 unpacked ceiling은 유지했다.

## 다음 작업

- R6-P7-W3에서 `createRugPlot`과 `createStripPlot`의 placement와 edit 경계를 구현한다.
- W3 뒤 기존 20개 direct action deficit과 W1–W3 option/literal schedule을 모두 배정해 strict realistic
  audit를 통과시키고 Phase 7 X 결과를 닫는다.
