# Polar·Parallel facet/repeat chart 구현 계약

상태: Proposed. Primary Phase 10. API·기본값·stored-result·오류는 [R43](../features/43-polar-parallel-facets.md)가 canonical이고 이 문서는 실행 chart matrix를 소유한다.

## 차트와 공개 저작 의도

한 source program에서 그룹별 Polar scatter/line/sector/Rose/Pie/Radar/Parallel panels를 만들고, 한 field role을 여러 변수로 바꿔 반복한다. 현재 Cartesian facet/repeat의 provenance·소유권 규칙을 유지한다. 입력 chart는 그대로 보존되고 별도의 composition program을 반환한다.

권장 public chain 표기(아직 실행 가능한 새 지원이라고 주장하지 않음):

```text
기존 createPolarScatterPlot/createRadarPlot/createRosePlot/createPiePlot 또는
기존 createParallelCoordinates로 원본 source 생성
→ source.facet(기존 field/values/layout 옵션 + 새 scale resolution)
→ editFacetHeaders(role,labelMap,side)
→ applyTheme(custom theme,descendants)
→ editCanvas(기존 크기 옵션)
```

정확한 현재 facade 이름/필수 field options는 ACTION_INDEX와 types에서 가져와 Gate V의 **실행 가능한 fixture**로 확정한다. 이 pseudocode를 그대로 public example로 복사하지 않는다. 낮은 계층 variant는 data → coordinate → mark → encode → axes/legend의 현재 public chain을 사용한다.

## 필수 family matrix

| variant | source provenance | facet resolution | repeat | 필수 검증 |
| --- | --- | --- | --- | --- |
| Polar point | raw/computed/filter | theta/r 각각 shared, independent | theta, r | local frame, empty category, stroke/size legend |
| Polar line | ordered grouped rows/window | theta/r 각각 shared, independent | theta, r | group/order/break, local endpoints |
| Arc native | raw 또는summary | theta/r compatible policies | compatible field theta/r | annulus/padAngle, source labels |
| Rose facade | category aggregation/weighted source | theta category union, r shared/independent | compatible measure role r | bins/category gaps, radial mapping |
| Pie facade | partition-local grouped sums | categorical legend shared;theta local shares | explicit reject raw theta/r replacement | each panel total360°, zero mass policy |
| Radar facade | ordered dimension roles | dimension compatibility, r policy | explicit reject raw theta/r replacement | closed path, dimension labels/order |
| Parallel | raw/computed/window | each dimension shared/independent | exact one parallelDimension | dimensional units, axis titles, selection |

모든 facet은 single-field와 grid row×column을 검증한다. 표의 repeat 제외 cell은 facade-specific role API를 이번에 추가하지 않기 위한 명시 경계다. Pie/Radar의 facet 지원은 필수이며 repeat subset을 이유로 facet 전체를 미루면 안 된다. row-preserving와 statistical transform은 둘 다 source grain에서 partition한 뒤 replay하는 policy를 확인한다.

## action 계층

facet/facetGrid/repeatCharts → retained source/partition/repeat request → derive/replay transform → local coordinate + layer/scale refs → family materializers → local guide/compatible shared legend → header+composition occupied layout. chart graphics를 복사하고 좌표만 translate하는 방식은 public facet 의미를 충족하지 않는다.

## stored result

각 child의 원본 partition key/role substitution가 recipe에 남는다. generated IDs는 parent namespace에서 결정적으로 생성한다. Parallel dimension.field/scale refs와 Polar coordinate frame 요청은 clone/replay에서 보존된다. shared domain은 의미 데이터로 공유하고 pixel ranges는 child frame에서 각각 materialize한다. original source와 주변 concat sibling은 불변이다.

## 데이터 및 시각 oracle

A/B 두 그룹을 사용한다. 각 family는 unequal magnitudes, missing category, one empty partition, shared appearance scale을 포함한다. R43 수치 oracle와 theme/header/selected-label replay를 같이 검사한다. A panel의 data edit가 B independent domain을 건드리지 않아야 하며 shared domain에서는 두 panels이 같이 갱신된다. plot-region ink와 axis/label bounds를 child별 측정한다.

Primitive fixture 하나마다 exact target public chain+manifest+PNG를 제출한다. V 승인 뒤 public 구현을 같은 실행에서 생성하여 decoded pixel parity를 확인한다. unsupported outer axes 오류를 regression으로 고정한다. Canvas/SVG/PDF 전체와 installed consumer가 Phase 10 X의 required evidence다.
