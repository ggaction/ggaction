# Bounded route native update 경계 감사

## 상태

2026-11-02 [bounded 실행안](route-bounded-worker-design.md)의 B 방향을 root가 기존
[remainingApproval](../AUTHORIZATION.json) 안에서 채택했다. 아래는 실제 source `fa943e864`의
호출 감사와 구체 선택안이다. **제품 API/저장 schema/worker policy를 구현한 문서가 아니다.**
모든 최초 실패·큰 입력·기존 guard는 유지한다.

## 실제 route 계산 call-site

| 계산 owner | 현재 들어오는 native 의미 | 준비에 재사용할 owner |
|---|---|---|
| `actions/graphs/routeClosure.js:reviseEdgeRouteResource` | 변경된 graph/layout/hierarchy refs 및 viewport로 route 재계산 | `edgeRouteJob` / `completedEdgeRouteResource` |
| `routeClosure.js:prepareEdgeRouteRevisions` | graph/hierarchy/layout 편집에서 모든 입력을 확정한 뒤 route→GeoRoute→projection DAG | `orderResourceDependencies`, `prepareGeoResourceRevisions`, exact resource refs |
| `actions/data/resourcePlan.js:planSourceResourceRevision` | source/derived/parameter의 data logical ID 교체→graph/layout/route DAG | `buildRevisionPlan`/`buildParameterRevisionPlan` 및 `withPreparedDataResourceResults` |
| `actions/graphs/screenRoutes.js:prepare` | Canvas의 달라진 실제 graphic bounds | 현재 class-scoped Canvas prepare/apply registry와 `withPreparedScreenRouteResults` |
| `resources/graphRoutes.js:prepareGraphEdgeRoutes` | 명시 create/edit route | 기존 Full constructor 검사, exact base/token/signal handle, executor |

이 다섯 계산 위치에서 외부 completion을 공통 검증하되 의미/ID/revision을 새로 추정하지 않는다.
Route 결과가 필요한 소비자는 해당 native owner의 private plan에서만 기다리며, old route와 new
layout의 조합을 유효 ChartProgram처럼 반환하거나 stale ref를 위조하지 않는다.

## 직접 편집 entry 전수 목록

아래는 직접 route/resource/source/viewport closure로 들어오는 현재 public entry다.
`editGraphLayout`과 `refreshScreenEdgeRoutes`는 내부 helper/action이므로 공개 요청 이름으로
노출하지 않는다. 생성 action은 기존 ID를 대체할 수 없으므로 direct revise 목록과 구분한다.

1. Graph/Flow/Hierarchy: `editGraphData`, `editInferredGraphData`, `editFlowData`,
   `editHierarchyData`, `editLayout`. `editLayout({node})`가 node 이동의 native owner다.
2. Source: `reviseData`, `editParameter`, `applyDataUpdate`의 revise/parameter 요청.
3. Derived22개: `editDerivedData`, `editComputedData`, `editFilteredData`, `editFlattenData`,
   `editLookupData`, `editFoldData`, `editSummaryData`, `editBinData`, `editTimeUnitData`,
   `editWindowData`, `editDensityData`, `editStackData`, `editRegressionData`, `editSortedData`,
   `editIntervalData`, `editECDFData`, `editNormalizedData`, `editCompleteData`, `editPivotData`,
   `editImputedData`, `editBin2DData`, `editRegressionStatisticsData`.
4. Graph view: `filterMarks`의 recompute:true 적용/교체, 기존 recompute를 해제하는
   `filterMarks` 및 `removeMarkFilter`. 내부 `filterGraphPlotView`/`restoreGraphPlotView`는
   원 source를 복원하는 중에도 route를 계산한다.
5. Viewport: `editCanvas`, `fitCanvas`, `navigateProjection`의 resize operation.
6. Route 자체: `bundleGraphEdges`, `editEdgeRoute`는 현재 create/edit prepare 요청을 유지한다.

특히 `editBin2DData`와 `editRegressionStatisticsData`는 공통 focused editor 목록 밖에서
`reviseDerivedData`를 직접 부르므로 빠뜨릴 수 없다. `reviseDerivedData`의 기존 speculative
branch와 실제 branch 두 번 실행도 한 prepared job의 동일 결과를 재사용해야 한다.

## 간접 viewport 소비자와 composition

`materialization/guides/layout.js`는 responsive/exact-plot 과정에서 `prepareCanvasResourceRevision`을
호출한다. 다음은 direct route action이 아니어도 **실제 bounds가 달라지면** 계산에 들어오는
현재 경계다. 이것을 단순히14개 native entry만으로 모두 지원했다고 기록하면 안 된다.

- Guide의 create/edit/remove axis·tick·label·title·legend actions와 그 aggregate facade.
  `withGuideLayoutValidation` 및 `withGuideLayoutTransaction`이 실제 연결 owner다.
- `editScale`와15개 channel scale editors, encoding/mark 변경의
  `applyMaterializationPlan`→guide transaction.
- `applyTheme`/`removeTheme`, `applyTextMetrics`/`removeTextMetrics`, font 교체가 실행하는
  `rematerializeTypography` 또는 guide geometry 재배치.
- `editCompositionLayout`/`editCompositionScales` 및 composition child/plot alignment가
  unit child에 호출하는 `editCanvas`; `editFacetSource`/facet 투영이 호출하는 data-resource revision.
- Session의 setViewport/moveNode/filter 명령은 위 native owner에 위임한다. 별도 session route
  solver나 camera projection의 암묵 screen rebundling을 추가하지 않는다.

`responsiveLayout.js`는 guide뿐 아니라 실제 전체 concrete occupied bounds를 읽는다. Route
geometry를 임시로 지우거나 endpoint 직선으로 대체해서 최종 viewport를 확정하는 shortcut은
현재의 fitting 결과를 바꾸므로 제외한다. 기존 responsive pass limit와 fitCanvas iterationLimit를
보존한 async 준비 상태가 필요하다. 실패한 pass도 그때 실제 계산한 work/time에 포함한다.

## 최소 closed 요청안

첫 worker native revision union을 다음14개 canonical operation으로 제안한다. 각 `args`는
현재 해당 public action의 기존 input schema를 그대로 쓰며 arbitrary function/method를 받지 않는다.

```text
editGraphData | editInferredGraphData | editFlowData | editHierarchyData | editLayout |
reviseData | editDerivedData | editParameter | applyDataUpdate |
filterMarks | removeMarkFilter | editCanvas | fitCanvas | navigateProjection
```

- `navigateProjection`은 route update 요청에서 resize만 허용한다. pan/zoom/rotate는 현재
  GeoLine projection만 바꾸며 geographic GraphRoute를 다시 bundling하는 새 의미를 만들지 않는다.
- Derived focused alias21개는 기존 validation/normalization owner로 canonical `editDerivedData`
  정의를 준비할 수 있다. 최종 native trace에 원 alias를 보존할지 canonical 호출로 명시할지는
  signature 선택과 함께 고정한다. 현재 alias를 몰래 동기 계산하거나 silent downgrade하지 않는다.
- `applyDataUpdate`는 이미 준비된 authentic source handle만 받는다. URL/named source I/O는
  기존 `prepareDataUpdate`가 담당한다. Route executor에 fetch/CSV/임의 resolver를 넣지 않는다.
  동일 base/token/source identity를 확인하고 원 handle의 AbortSignal도 확인한다.
- Existing prepared inference handle도 같은 방식으로 독립 graph owner의 검증을 유지한다.
- Child target은 현재 `TargetedOptions`의 exact childPath/target resolution을 사용한다. Root와
  대상 child/모든 affected refs를 준비 시 확정하고 동일 receiver에서만 commit한다. 임의 namespace
  문자열로 child를 재추정하지 않는다. Facet source action union은 기존 facet owner의 closed 검증을 따른다.

이14개는 **직접 원 source/layout/resize 요구의 최소 union 제안**이며 위 간접 viewport 소비자
전부를 인수한 목록이 아니다. 최종 지원 전에 해당 consumers의 explicit native action 목록을
같은 closed union에 포함하거나 기존 facade prepared dispatch로 연결해야 한다. 누락을 N/A로
바꾸지 않고 단계별 의무로 유지한다.

### Commit 표면 두 안의 구체 차이

A. 각 기존 native action에 `{prepared, requestToken}` 대안을 추가한다. 원 action 이름은 보존하지만
최소14개와 후행 guide/encoding 등 모든 affected action의 options/declarations가 넓어진다.
`applyDataUpdate`의 같은 필드가 다른 opaque handle도 받게 되어 두 authentic brand를 구분해야 한다.
Composition target dispatch 전에 prepared request의 원 args/target을 복원할 공통 action seam도 필요하다.

B. 기존 `prepareGraphEdgeRoutes`에 kind:update를 넣고 전용 Full
`applyGraphEdgeRoutesUpdate({prepared,requestToken})` 하나가 보관된 closed native action을 호출한다.
기존 native argument type과 일반 action entry는 바뀌지 않는다. Top-level trace에는 이 apply action,
하위에는 실제 native action과 기존 primitive trace가 남는다. Scope는 '기존 bounded route에 영향을
주는 위 closed native edit'뿐이며 일반 action 실행기나 transaction/plugin API가 아니다.

**현재 권고는 B**다. Prepared reader/abort/Full·exact constructor는 현재 route preparation owner,
resource write 권한은 `preparedResourceContext.js`를 재사용한다. 다만 root가 이 새 public apply
이름·반환/trace 및 요청 union을 채택하기 전에는 source/types에 추가하지 않는다.

## 준비와 원자 commit 계획

1. 기존 native validator와 source revision planner로 원 request, exact receiver, constructor,
   모든 source/graph/layout refs, data ID/row namespace를 한 번 확정한다. Raw args 또는 output을
   얕게 freeze한 것만으로 proof를 만들지 않는다.
2. 현재 native resource DAG를 topological 순서로 준비한다. Route 앞의 graph/layout 계산은
   그 원 owner를 사용한다. Bounded route job는 기존 executor worker 하나로 직렬 실행하고
   complete 결과를 입력/출력/header/hash/byte/endpoint/order/provenance와 함께 검증한다.
3. Route 이후 GeoRoute/projection/GraphPlot/GeoLine 소비자도 실제 candidate로 preflight한다.
   Responsive/fit pass가 새 bounds를 요구하면 그 exact viewport의 새 job를 만든다. 전체 prepare
   deadline/work/buffer ledger는 pass마다 초기화하지 않는다.
4. Prepared handle는 base+constructor+request kind+token+refs+resolved identity plan+complete
   result proof에 결합한다. 외부 clone/다른job/교체된 ref/취소된 source handle은 거부한다.
5. Apply는 기존 private resource context를 사용해 native owner가 미리 검산한 결과를 쓰게 한다.
   기존 primitive/data binding/metric validation과 final materialization을 유지한다. 이전 source
   row namespace를 새로 배정하거나 raw native action을 처음부터 재실행해 다른 ID를 만들지 않는다.
6. 준비·실패·취소·late worker는 원 committed program/selection/history/trace를 바꾸지 않는다.
   Final 검증 실패 시 worker와 모든 staged 결과를 해제한다. 결과 없는 순환 retry는 하지 않는다.

## 구현 전 남은 결정과 증거

- 원 density20회 실제 S/T 및 final packet bytes. 초기 count 또는 최악 산식을 실제 완료로 쓰지 않는다.
- FDEB8,145,000 compatible pairs를 보유하는 typed upper-triangle layout와 fixed maxBufferBytes.
- 전체 prepare deadline과 main bytewalk/hash의 yield 경계. Worker terminate만으로 main abort100ms를
  보장한다고 주장하지 않는다.
- 위14개 이후 간접 viewport/facet/composition native union의 완전한 범위 및 commit 표면 채택.
- 선택한 request별 실패 원자성, repeated responsive job, exact row/revision/token, Full/Basic/constructor,
  stale/abort/late/completion bytes와 실제 동일 archive 검증.

새 제품 API나 guard 숫자를 이 감사만으로 채택하지 않았다. AT82·큰 size support·P95 완료는 계속 미완료다.
