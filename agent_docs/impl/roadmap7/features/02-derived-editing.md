# R02 — 파생 데이터 정의 편집과 종속 갱신

원래 감사 번호: **2**. Primary owner: **Phase 4**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

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

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
