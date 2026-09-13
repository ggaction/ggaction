# R02 — 파생 데이터 정의 편집과 종속 갱신

원래 감사 번호: **2**. Primary owner: **Phase 4**. 상태: **Implemented-primary**.
아래 API·revision transaction·16개 family 편집은 `d29287c9`에서 구현됐다. Phase 7의 동적 reference와 Phase 10의 Polar/Parallel facet source replay 통합은 각각 `5832228c`, `ebf3562a`에서 검증됐다. Phase 11의 범용 resource collector 결합은 R25 owner가 검증한다.

## 목적과 현재 연결점

계산식·필터·집계·bin·시간창을 바꾸기 위해 차트를 처음부터 만들지 않도록 한다. 기존 `editBin2DData` revision 모델을 기준으로 확장하며, 종속 재계산은 별도 명시 옵션으로 snapshot 의미를 보존한다. 새 focused 이름은 Gate A에서 create family의 현재 명칭과 대조해 확정한다. 편집 후 source/data에서 logical ID를 재사용하는 계약은 STATE_AND_REPLAY의 공통 data resolver 항목을 따른다.

현재 파일(저장소 root 상대 경로):
- `src/actions/data/bin2d.js`
- `src/actions/data/intervalEdit.js`
- `src/materialization/dataProvenance.js`
- `src/grammar/transforms.js`
- `src/actions/facets/replay.js`

관련 항목: R05, R06, R07, R08, R09, R10. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editDerivedData({target: string,
  definition: RequestedTransform, dependents?: "reject" | "recompute"})
// definition은 같은 transform type의 완전한 requested definition; resolved 금지.
// 사용자가 주로 쓰는 focused entry points. 옵션은 기존 create의 id/source 제외 partial.
editComputedData({target, ...patch})
editFilteredData({target, ...patch})
editFoldData({target, ...patch})
editSummaryData({target, ...patch})
editBinData({target, ...patch})
editTimeUnitData({target, ...patch})
editWindowData({target, ...patch})
editDensityData({target, ...patch})
editStackData({target, ...patch})
editRegressionData({target, ...patch})
editIntervalData({target, ...patch})
editECDFData({target, ...patch})
editNormalizedData({target, ...patch})
editCompleteData({target, ...patch})
editImputedData({target, ...patch})
// 기존 editBin2DData는 호환 유지하고 동일 revision 실행기를 사용.
// focused에도 dependents 옵션을 동일하게 제공한다.
```

## 값·기본값·오류 계약

- target은 명시적인 standalone derived owner 또는 그 current dataset ID. 생략 추론을 새로 추가하지 않는다. source dataset, stale revision, chart-owned 통계의 내부 data를 직접 편집하면 오류다. chart-owned는 기존 chart edit가 owner다.
- 첫 실행 지원 transform은 computed/filter/fold/summary/bin/bin2d/timeUnit/window/density/stack/regression/interval/ecdf/normalize/complete/impute. 기존 public standalone create가 있는 family는 모두 focused edit를 제공한다. 같은 transform이라도 chart-owned dataset은 해당 chart editor만 수정할 수 있다. box/horizon/gradientProfile 등 내부 전용 pipeline은 downstream revision/replay 소비자로만 지원하고 새 standalone create를 추가하지 않는다.
- 신규 editor의 definition은 source/id/type 교체 불가. 기존 editBin2DData의 이미 지원하는 source patch와 target 추론은 호환 예외로 유지하며 그 범위를 새 editor로 자동 확대하지 않는다. original source 교체(#1)와 transform 종류 교환은 범위 밖. focused patch는 omitted 유지; 배열·expression·as object는 통째로 교체. undefined/null을 암묵적 삭제로 해석하지 않는다.
- dependents 기본 reject: 하위 derived dataset이 있으면 기존 Bin2D와 같은 사전 오류. recompute 명시 시 도달 가능한 derived DAG 전체를 topology 순서로 새 revision 생성하고 연결된 consumer를 갱신한다. unsupported transform이면 일부만 처리하지 말고 시작 전에 오류다.
- 편집한 transform의 출력 이름 변경은 semantic output role이 일대일인 binding만 이동한다. 임의 downstream computed/filter 식의 field 이름을 문자열 치환하지 않는다. 하위 식이 깨지면 실패하며 사용자가 기존 이름을 유지해야 한다.
- no-op requested definition은 revision 생성 없이 기존 no-op trace 정책을 따른다. 단계마다 revision을 낭비하거나 자동 source 선택을 바꾸지 않는다.

## 저장 결과와 생명주기

기존 `materializationConfigs.data.<family>.<owner>.current` 소유권 패턴과 `planDerivedDataRevision`을 공통 실행기로 추출한다. 모든 기존 standalone derived create에 current logical owner를 기록하며 기존 program에는 단일 transform/source/독립 소유권을 확인한 뒤 lazy owner를 구성한다. original input은 불변이다.

recompute는 새로운 program에서 downstream snapshots를 새 revision으로 교체하는 명시적 요청이다. 이전 program의 snapshot은 유지된다. 소비자 rebinding 후 이전 datasets는 실제 참조가 없을 때만 release한다. shared source와 영향 없는 branch는 유지한다. 내부 revision 숫자를 public API의 보장된 stable identity로 만들지 않는다. data dependency와 mark/guide/selection/label dependency는 [상태·재실행 계약](../STATE_AND_REPLAY.md)을 따른다.

## 구현 순서와 action 계층

1. 각 create의 requested definition과 resolved 결과를 구분하는 공통 extractor를 구현한다. Bin2D와 interval 소유권 테스트를 먼저 보존한다.
2. target → logical owner → current snapshot, downstream DAG, output roles, mark consumers, retained facet source를 읽기 전용 계획으로 수집한다. cycle/unknown transform/error field를 preflight한다.
3. 새 rows를 topo 순으로 모두 계산하고 final consumer compatibility까지 검증한다. 공개 상태는 아직 commit하지 않는다.
4. wrapped editDerivedData 아래 기존 createDerivedData/materializeXData/rebindLayerData와 planner를 호출한다. focused action은 공통 실행기를 호출하되 자신도 trace node를 가진다.
5. scales → marks → source-owned labels/reference → guides → layout → selection/highlights 갱신은 기존 planner의 실제 dependency edge로 표현한다. data 계산은 planner 앞의 명시적 stage이며 자동 compiler를 만들지 않는다.
6. 구 revision release 후 owner current/context/guide references 검증. context.currentData가 영향받은 old current면 대응 새 revision으로 옮기고, 영향 없는 currentData면 보존한다. 내부 마지막 materializer가 선택한 data를 public context로 누출하지 않는다. facet/repeat source edit와 재생성까지 integration test.

## 독립 oracle와 인수 테스트

- source x=[1,2,3], computed z=x*2, summary mean(z): edit to x*3 + default reject는 summary 때문에 실패; recompute는 z=[3,6,9], mean=6. 이전 program의 z=[2,4,6], mean=4는 동일하다.
- 형제 computed y=x+1은 영향 없이 값과 의미상 ID 유지. 두 mark가 z를 쓰면 둘 다 새 revision을 참조.
- z → w 출력 rename에 downstream field(z) 식이 있으면 recompute도 전체 실패. consumer encoding role만 연결된 경우에는 w로 재연결하고 scale/labels 갱신.
- group shape가 변하는 filter/summary edit 후 top-k selection, labels, explicit legend values, dynamic reference를 검증. 남은 selected index를 무작위로 다른 row에 적용하지 않는다.
- chart-owned data target, unknown owner, resolved 주입, source 교체, cycle, nonfinite 결과, incompatible scale consumer는 trace/semantic/graphic까지 원본 동일.
- create → edit → edit → facet replay → Canvas edit, 기존 Bin2D patch/default/derived-consumer rejection 회귀를 검증.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — revision 실행기와 편집 표면

### 정규화와 저장 형태

새 export 이름은 EditDerivedDataOptions, DerivedDataDependents, RequestedDatasetTransform 및 각 EditComputedDataOptions/…/EditImputedDataOptions로 제안한다. 반환 타입은 모두 ChartProgram이다. 공통 editor는 definition.type을 필수로 받고 현재 transform.type과 같아야 한다. focused editor는 type을 받지 않는다. source/id/resolved/current는 두 입력 모두에서 금지한다. `definition`은 dataset envelope가 아니라 transform 자체이므로 materialized row 배열을 주입할 위치가 없다. 단, Complete transform의 domain option인 `definition.values`와 `editCompleteData.values`는 승인된 transform 필드이므로 허용하고 Complete validator가 scalar type·uniqueness·values/sequence exclusivity를 검사한다. Bin2D의 기존 source 예외는 전용 API에서만 유지한다.

~~~ts
type DerivedDataDependents = "reject" | "recompute";
// 아래 shape를 family별로 같은 owner에 저장한다.
materializationConfigs.data.computed.twice = { current: "twice" };
// 최초 semanticSpec.datasets의 항목
{ id: "twice", source: "raw", transform: [
  { type: "computed", as: "z",
    expression: { op: "multiply", left: {field:"x"}, right:{constant:2} } }
], values: [{x:1,z:2},{x:2,z:4},{x:3,z:6}] }
~~~

수정 후 owner.current만 새 snapshot ID를 가리킨다. source/definition 복사본을 config에도 저장하지 않는다. 새 snapshot.transform이 요청 및 기존 family의 resolved provenance를 소유한다. logical ID는 selector에서 current로 해석하며 semantic dataset.source/layer.data는 해석된 snapshot ID를 기록한다.

| 입력 상태 | 결과 |
| --- | --- |
| target 누락 / 원본 dataset / chart-private dataset | Error; 새 snapshot 없음 |
| 현재 logical owner / 현재 snapshot ID | 해당 owner 편집 |
| 남아 있는 이전 snapshot ID | edit 거부; source로 읽는 기존 의미는 유지 |
| 빈 focused patch | Error; dependents만 바꾸는 호출도 거부 |
| 완전히 같은 canonical requested definition | revision 없음; public action의 기존 no-op trace 규칙 유지 |
| mode 교체 | 이전 mode 전용 키 제거 후 새 mode의 필수 키 검증 |
| arrays, expression, aggregates, as 교체 | 전체 교체; 이전 원소/AST 가지 잔존 금지 |
| 하위 derived + dependents 생략 | 첫 쓰기 이전 reject |
| 하위 derived + recompute | 모든 도달 가능한 transform과 consumer를 완성해야 성공 |

### 실제 작업 단위

1. bin2d.js의 ownerConfig/resolveBin2DOwner/editedTransform/applyBin2DRevision과 dataProvenance.js의 planDerivedDataRevision을 읽는다. 기존 Bin2D target 추론·동일 id 재생성 계약은 회귀 fixture로 잠근다.
2. transforms.js의 policy마다 requested extractor, materializeOp, editable 여부, output role extractor를 연결한다. family 문자열을 여러 파일의 switch로 복제하지 않는다.
3. readonly planning 결과를 {owners, revisions, rebinds, roleChanges, rematerialization, releases}로 둔다. runtime state에 이 plan을 영구 저장하지 않는다.
4. downstream 탐색은 dataset.source와 live retained recipes를 함께 사용한다. DFS visiting/visited로 cycle 검출, 동일 level의 실행 순서는 semantic dataset 순서로 고정한다. 모든 private downstream은 해당 owner replay adapter를 사용한다.
5. 새 값과 출력 필드 유효성 검증 후 사본에서 wrapped createDerivedData → materializer → rebindLayerData를 실행한다. 여러 mark를 먼저 모두 rebind하고 마지막에 shared scale 소비자를 검증한다.
6. literal source field 문자열은 변경하지 않는다. computed.as처럼 단일 output role만 있는 경우 direct encoding field 이동 가능. summary aggregate를 배열 index로 대응시키지 않는다. 안정적 일대일 role이 없는 rename은 기존 field를 유지하거나 오류로 끝낸다.
7. context.currentData가 old current인 경우만 대응 new current로 복구한다. 영향 없는 context.currentMark/currentScale은 내부 호출의 마지막 대상으로 바뀌지 않게 보존한다.
8. 각 retired dataset을 live-ref collector로 검사한다. owner.current 교체 전에 release하지 않는다. 다른 retained source가 참조하면 old snapshot을 남긴다.

### 고정 인수 사례

- R02-N01: raw x=[1,2,3] → twice z=2*x → avg mean(z)=4. z=3*x로 recompute 후 z=[3,6,9], avg=6. 이전 program은 z=[2,4,6], avg=4.
- R02-E01: 같은 입력에서 dependents 생략 → Error, 다섯 canonical state와 resolvedScales/children/compositionSpec까지 동일.
- R02-E02: z를 w로 rename하지만 downstream expression.field="z" 유지 → 전체 실패.
- R02-L01: after에서 source:"twice"로 새 summary 생성 → 6; before의 동일 호출 → 4.
- R02-L02: 두 direct consumers + 영향 없는 sibling → 두 consumer만 새 current 사용, sibling 값/ID 유지.
- R02-L03: 모든 16개 public standalone create family를 표 기반으로 create/edit/edit/no-op/replay한다. 한 family만 구현하고 공통 editor 완료로 표시하지 않는다.

## 완료 조건

- [x] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [x] 현재 존재하는 scale/mark/guide/label/selection/facet/Canvas consumer replay를 검증했다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [x] 아직 제품에 없는 R36/R37/R38/R43/R25 consumer cell은 해당 Primary Phase의 후속 통합으로 남겼다.
- [x] Phase 4 승인과 `d29287c9` 구현, unit 2,344개·contract 333개·docs 47개·installed package 결과를 STEP 원장에 기록했다.
