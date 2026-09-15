# 11개 기능의 구현 방향과 인수 조건

상태: **미구현 제안**. 아래 API 이름·옵션은 검토용 후보이며 0.0.16 API가 아니다.
각 API 결정은 [DECISIONS.md](DECISIONS.md), 독립 기대값은 [VALIDATION.md](VALIDATION.md)를 따른다.
정확한 제안 타입은 [PROPOSED_TYPES.d.ts](PROPOSED_TYPES.d.ts), 알고리즘·저장 계약은
[IMPLEMENTATION_SPEC.md](IMPLEMENTATION_SPEC.md), 조회 계약은 [INSPECTION_SPEC.md](INSPECTION_SPEC.md)를 따른다.
이 요약보다 구체적인 개정 2 상세 명세가 제안의 세부 의미를 소유한다. F06은 사용자 요청으로 제외됐다.

## F01 — 필드/schema 계약 (Phase 1, D01/D02)

**이유:** 필드 없음과 값 없음은 다르다. 빈 행 배열만으로는 필드 목록과 타입을 복구할 수 없다.

- `createData({id, values, schema?})` 확장과 read-only `getDatasetSchema(program,{data})`를 제안한다.
- schema는 순서 있는 field descriptor 목록을 가진다. 필수 정보는 name, storage type, nullable,
  행에서의 optional 여부다. `unknown`과 `mixed`를 number/string으로 억지 승격하지 않는다.
- source 값에서 추론한 schema와 명시한 schema의 출처를 구분한다. 값 검증은 모든 행에서 수행한다.
  표시용 sample profile이나 70% 휴리스틱은 ggaction 책임이 아니다.
- 기존 field-name binding을 stable UUID로 강제 전환하지 않는다. 앱 field ID는 adapter가 매핑한다.
  파생 field의 lineage는 source dataset/field, transform owner, output role로 재현 가능하게 기록한다.
- 모든 transform policy가 input requirements/output fields를 제공한다. filter/sort는 fields 유지,
  summary는 group key와 output만, window 등은 확정된 새 field를 추가한다.
- 데이터 0행이어도 known schema에 없는 field 참조는 missing-resource 계열 finding과 field 경로로 거절한다.
  과거 schema 없는 빈 source는 unknown이며 유효한 field를 임의로 만들어내지 않는다.
- source revision에서 schema도 다시 검증한다. field 삭제로 소비자가 무효해지면 원본 전체를 보존한다.

**구현 위치:** `src/grammar/transforms.js`와 family grammar, `src/actions/data/create.js`,
`src/actions/data/edit.js`, `src/actions/data/revise.js`, semantic dataset validator, persistence/types.
새 schema helper는 이 기존 경로가 공유하며 별도 앱용 transform executor를 만들지 않는다.

**완료 조건:** V01–V04. 모든 등록 transform의 출력 schema coverage를 검사하고 fallback `any`로 통과시키지 않는다.

## F02 — 빈 결과와 nullable 소비 (Phase 1, D03)

**이유:** 유효한 0행을 계산 실패로 보거나, 축만 그려 놓고 데이터가 있다고 보고하면 안 된다.

- 세 상태를 구분한다: valid-empty, unresolved-domain, invalid-schema. empty boolean 하나로 합치지 않는다.
- domain 정책 제안은 `emptyDomain: "preserve" | "require-explicit"`이다. 정확한 옵션 소유 위치는
  scale/encoding의 기존 공통 definition에 하나만 두고 facade는 전달한다.
- preserve는 같은 dataset 의미/field/type/unit 관계의 이전 유효 domain만 재사용한다. 다른 필드로
  reencode한 뒤 이전 숫자 범위를 그대로 쓰지 않는다. categorical domain도 같은 원칙이다.
- 새 차트에 explicit domain이 있으면 데이터 mark 0개인 정상 결과를 만들 수 있다. 이전/명시 domain이
  모두 없으면 domain-required 진단으로 거절한다. 기존 throw 계약을 유지하되 이유를 구별하고 caller가 explicit domain을 제공하게 한다.
- 빈 결과 뒤 데이터가 채워지면 새 입력에서 domain·mark·guide·selection을 다시 계산한다.
- nullable summary 출력은 각 mark의 명시적 missing 처리로 소비한다. 점의 skip과 선의 break는
  다르며 null→0 치환으로 모든 renderer를 통과시키지 않는다. 지원 불가 조합은 명시 거절한다.
- 기존 filterMarks의 domain 보존/selection grain을 일반 filterData로 덮어쓰지 않는다.

**구현 위치:** scale domain/field readers, mark missing policy, `src/actions/data/filter.js`,
materialization planner, facet empty-cell 경로. renderer는 이미 생성된 0-item graphics만 그린다.

**완료 조건:** V05–V08. 빈 결과와 복구를 Cartesian/Polar/Parallel 및 composite owner별로 판정한다.
0행으로 추정할 수 없는 의미는 조용히 성공 처리하지 않고 명시적인 제약으로 기록한다.

## F03 — 결측·빈 통계·계산 보고 (Phase 2, D04)

**이유:** 같은 '평균'을 facade, derived dataset, source revision에서 다르게 계산하면 안 된다.

- 해당 수치 transform에 `missing: "error" | "drop"`을 제안한다. missing은 null/absent/undefined이며
  NaN/Infinity/잘못된 숫자 문자열은 별도 invalid input이다. 자동 숫자 변환은 수행하지 않는다.
- 원본 행 자체는 보존하고 해당 계산의 eligibility에만 정책을 적용한다. 회귀는 x/y pair 단위로 drop한다.
- summary에 `empty: "null" | "identity"`를 제안한다. omission은 기존 동작을 보존한다.
  유효 수치가 없는 경우 identity는 sum=0, mean/median/min/max 등 값 정의가 없는 통계=null이다.
  count는 항상 실제 행 수, valid는 유효 값 수다. 두 null 행의 그룹은 count=2, valid=0이다.
  null 정책에서도 count/valid/missing 같은 개수 연산은 정수 의미를 유지하고 값 통계는 null이다.
- bin drop은 계산에서 제외한 null count를 보고한다. explicit boundary 밖 finite 값과 null을 다른 이유로 센다.
- report는 inputRows, usedRows, excludedRows 및 서로 중복되지 않는 이유별 count를 가진다.
  group별 보고가 있는 경우 전체 count와 합산 규칙을 정의한다. weight의 0 기여와 행 제외는 같지 않다.
- 계산 정책은 의미 상태에, 실제 count는 그 입력 revision에 결합된 계산 결과 metadata에 둔다.
  snapshot/inspect가 오래된 report를 현재 결과로 재사용하지 않아야 한다.
- summary/bin/density/regression/interval과 weighted 경로의 적용 표를 작성한다. 기존 ECDF/window/mark
  missing token은 무조건 rename하지 않고 동등성·차이를 기록해 공통 의미만 공유한다.

**구현 위치:** aggregate/summary/bin/density/regression/interval/weighted grammar, transform registry,
family create/edit, facade option forwarding, serialization validation.

**완료 조건:** V09–V13. 각 family의 default 유지와 명시 policy, 전부 결측/일부 결측/정상 입력을 모두 검사한다.

## F04 — 회귀 적합·구간·예측 위치 (Phase 3, D06)

**이유:** 직선의 존재와 신뢰 구간의 계산 가능성, band의 표시 여부는 서로 다르다.

- `interval: false | "mean" | "prediction"`을 제안한다. false는 구간 계산 자체를 요청하지 않는다.
  기존 band:false는 graphical visibility이며 기본 interval 계산 의미를 소급 변경하지 않는 안을 권장한다.
- 새 2점 사례는 `interval:false, band:false`로 실행한다. 구간 요청과 band 요청이 충돌하면 reject한다.
  기존 band:false만 호출하는 예제의 2점 실패가 유지되는지 바뀌는지를 문서에 분명히 적는다.
- linear interval false는 유효 쌍 2개 이상, 서로 다른 x, finite 계수/예측이 필요하다.
  mean/prediction interval은 잔차 자유도와 선택된 분포의 요구조건을 검사한다.
- interval false의 dataset은 lower/upper field를 만들지 않는다. 이를 참조하는 downstream 소비자가
  있으면 edit 시 reject 또는 명시적인 종속 수정 계획을 요구한다. 허위 0폭 band를 만들지 않는다.
- 평가 위치 후보 `predict: { values: number[] } | { domain:[number,number], steps:number }`를 제안한다.
  explicit values는 finite strictly ascending unique, grid는 양 끝 포함, steps는 정수 2 이상이다.
  omission은 기존 observed unique x를 유지한다. grouping별 공유 grid 여부는 요청 형태 그대로 기록한다.
- polynomial/loess는 같은 옵션명을 받더라도 수학적으로 가능한 범위를 별도 검사한다.
  새 구간법/회귀 방법을 이번 기능의 부수 작업으로 추가하지 않는다.
- domain 밖 예측은 명시 predict 요청일 때만 허용하고 extrapolation 사실을 report에 기록한다.

**구현 위치:** regression parameters/models/derive, data/aggregate regression actions와 edit, band consumers.

**완료 조건:** V14–V18. 수치 oracle, 구간 on/off, 모든 방법의 unsupported 조합, style/guide/revision을 검증한다.

## F05 — 파생 표현 source-follow (Phase 3, D07)

**이유:** “이 점들의 추세선”과 “이 필드 조합의 독립적인 회귀선”을 둘 다 표현할 수 있어야 한다.

- create/editRegression에 `sourceBinding: "fixed" | "follow"`를 제안한다. omission은 fixed로 현재 recipe 의미를 유지한다.
- follow는 source point target ID, input dataflow, x/y 의미 역할을 따른다. 고정 필드 이름의 단순 복사로 구현하지 않는다.
- groupBy는 resolved explicit recipe를 유지한다. source color 변경으로 grouping이 자동 바뀌지 않는다.
  grouping도 따라가는 기능은 별도 명시 parameter 계약 없이 숨겨 추가하지 않는다.
- follow에서 source 역할과 다른 explicit x/y override는 충돌로 거절한다. fixed 전환은 현재 유효 recipe를 확정한다.
- source의 최종 data membership 또는 x/y binding이 바뀌면 하나의 domain-action 결과 안에서 dependency를
  계산하고 wrapped edit/rematerialization을 실행한다. createRegression을 반복해 중복 layer를 추가하지 않는다.
- 회귀/구간의 appearance, 사용자 axis title, 관계없는 mark의 필드·데이터를 보존한다.
- dependency cycle, source 삭제, shared scale 충돌, 통계 실패를 preflight하고 전체 원자적 실패로 반환한다.
  source가 삭제되었는데 follow 결과만 살아 있는 orphan을 만들지 않는다.
- 회귀에서 먼저 구현하고 기존 statistical reference·attached label 관계와 공통 불변조건을 맞춘다.
  기존 모든 composite를 범용 reactive engine으로 다시 쓰는 작업은 범위가 아니다.

**구현 위치:** regression owner recipe, typed resource references, encoding/data revision plans,
mark source-dependent consumer discovery, facet/repeat/child replacement/persistence.

**완료 조건:** V19–V22. fixed와 follow의 의도된 차이, chain order, rollback, 삭제·복원 후 관계를 증명한다.

## F07 — 필터 표현과 일관된 수정 (Phase 2, D05)

**이유:** 한 범위 조건을 여러 임시 dataset으로 표현하면 경계 한쪽 수정·제거와 provenance 관리가 복잡해진다.

- 기존 oneOf/predicate/range union을 확장한다. 새 범주 mode 후보는 `noneOf:[...]`이며 타입 비교를 유지한다.
- range의 min/max는 적어도 하나 필요하다. 있는 경계에만 minInclusive/maxInclusive를 허용한다.
  기존 inclusive와 새 경계별 option을 함께 주면 중복 의미를 거절한다. omission의 양 끝 포함은 유지한다.
- min/max는 동일 타입 finite number 또는 이미 정규화된 string이다. 시간대/date parsing을 filter에 숨기지 않는다.
- null 포함/제외는 명시 policy로 표현하고 neq가 null을 포함하던 기존 경로의 default를 무단 변경하지 않는다.
- 빈 oneOf/noneOf는 값 미지정 UI와 혼동하지 않도록 기존 oneOf처럼 reject를 권장한다.
  앱의 “모두 제외”는 명시적 false 조건 또는 승인된 별도 match-none 표현으로 번역하며 empty array로 추정하지 않는다.
- editFilteredData와 mark selector의 경계 계약을 동기화하되 row/item grain은 분리한다.
  generic AND/OR AST 전체는 이번 작업의 필수 범위가 아니다.

**완료 조건:** V26–V29. 기존 두 filter 합성과 새 단일 범위의 row 동등성, 반대 경계 보존, schema/replay.

## F08 — 독립적인 행 정렬 (Phase 4, D09)

- `createSortedData({id,source,sortBy:[{field,order?,nulls?}]})`와 matching edit를 제안한다.
- sortBy는 non-empty, field 중복 reject, order 기본 ascending, nulls 기본 last다.
  동점은 해당 입력 revision의 source row index로 깨는 stable sort다.
- numbers는 numeric, strings는 locale와 무관한 고정 lexical ordering, booleans는 false/true다.
  시간은 temporalUnit year/timestamp를 명시해 기존 normalizer로 해석한다. 날짜 문자열은 먼저 정규화하고 표시 label로 정렬하지 않는다.
- mixed incompatible scalar/structured sort key는 오류다. null/undefined는 null placement를 따른다.
- source.values를 in-place sort하지 않는다. field 값과 row membership은 바뀌지 않아야 한다.
- 새로운 derived dataset이므로 downstream window/line/aggregate-first-last의 입력 순서와 facet replay를 검사한다.
  기존 pathOrder나 category domain order를 자동 교체하지 않는다.

**완료 조건:** V30–V32. 다중 key, tie, null, temporal, 정렬 idempotence, edit/revise/snapshot.

## F09 — Action capability 조회 (Phase 5, D10)

- 새 browser-safe read-only entry 후보 `ggaction/inspection`에서
  `describeAction(program,{action,target?,options?})`를 제안한다.
- 반환 후보: action, entrySupport, applicability, parameterDefinitions, requirements, findings, coverage.
  applicability는 supported/needs-input/incompatible/unsupported/unverified를 구분한다.
- parameterDefinitions는 conditional required, enum choices, field roles, bounds/unit을 구조화한다.
  일반 코드나 임의 callback을 schema에 넣지 않는다. type 문자열만 제공하고 완료라고 하지 않는다.
- stable structural support와 실제 numeric execution 가능성을 구분한다. 아직 실행하지 않은 회귀의
  conditioning이나 resource 사용을 passed로 기록하지 않는다. 필수 검사를 못 하면 unverified다.
- 실제 action과 같은 option normalizer/resource resolver를 재사용한다. inference/default의 근거는
  library rule 사실까지만 반환하고 corpus 확률/사용자 explicit 여부를 만들어내지 않는다.
- 전체 built-in action의 coverage 표를 생성한다. Full/Basic의 available surface를 구분하고 extension은
  등록된 descriptor가 없으면 unverified다. 모든 조합을 무조건 supported로 채우지 않는다.

**완료 조건:** V33–V35. describe/실제 실행의 예측 관계, runtime state 불변, package browser 안전성.

## F10 — 변경 범위와 효과 조회 (Phase 5, D11)

- `comparePrograms(before,after,{target?})`를 read-only entry에 제안한다.
- 추가/삭제/수정된 dataset, transform, binding, mark/owner, scale, guide, style과 영향을 받은 참조를 반환한다.
- 순서가 의미 있는 layer/pipeline 배열은 보존한다. trace action ID, transient context 변경만으로
  semantic change라고 판단하지 않는다. 기존 dataset/field ID를 이름이 비슷하다고 합치지 않는다.
- 결과 동등성은 conservative다. 동일 역할의 새 생성 ID를 안전하게 정규화할 수 있는 builtin owner만
  비교하고, 알 수 없는 extension 의미는 unknown을 반환한다. 전체 수학적 동등성 증명기는 아니다.
- 사용자가 의도한 변화/부수 변화 분류는 앱 action plan이 소유한다. comparePrograms는 실제 변경 사실을 제공한다.
- scope 밖 변경을 감지할 수 있도록 shared resource consumer를 보고한다. 공유 scale 갱신을 자동 오류라고 하지는 않는다.
- 큰 values 전체를 보고서에 복제하지 않는다. row count/field set/입력 identity와 필요 시 deterministic digest를 이용한다.

**완료 조건:** V36–V38. 단순 reencode·style-only·data change·composition reorder·trace-only·extension unknown.

## F11 — graphic inspection (Phase 5, D12)

- `inspectProgram(program,{target?})`를 제안한다. canonical graphic과 owner 관계에서 데이터를 나타내는
  item 수, finite geometry, plot/canvas bounds, clipping/opacity 상태, supported checks를 읽는다.
- rawRows, logicalDataItems, drawablePrimitives, visibleCandidates를 구분한다. 한 polyline을 원본 row 수나
  점 수로 잘못 세지 않으며 축 tick/legend symbol을 data item에 합치지 않는다.
- 각 check는 not_run/passed/failed/not_applicable과 evidence path를 가진다. unsupported owner도 검사 범위에 기록한다.
- opacity=0, zero-size, outside-clip을 분리해 보고한다. AABB 검사만으로 path ink나 occlusion을
  pixel-visible이라고 단정하지 않는다. 실제 pixel 검사는 host renderer의 추가 증거다.
- source map은 가능한 builtin owner/item 역할에 대해 제공하고 field/row 수준 exact mapping이 없는
  aggregate/custom path는 그 한계를 표시한다. 임의 원본 row ID를 발명하지 않는다.
- render 실패와 의미적으로 유효한 data item 0개는 다른 finding이다. mayCommit 판단은 앱 policy다.

**완료 조건:** V39–V42. axis-only, opacity0, clipped, empty, composite, text/custom, bounds, SVG/Canvas parity.

## F12 — 반복 실행과 자원 계약 (Phase 6, D13)

- 1k/10k/50k source row tiers와 연산별 output cap을 분리한다. 출력 제한을 넘는 경우 reject도 정상 측정 결과다.
- 실험은 plan/default/ranking 시간을 포함한 앱 전체와 ggaction execution만의 시간을 분리한다.
- immutable dataset 공유를 유지하고 candidate마다 raw dataset create를 반복하지 않는다.
  snapshot은 공유 메모리 identity와 달리 직렬화 크기를 별도 측정한다.
- cache는 input revision/transform policy/geometry dependencies를 key에 반영한다. global mutable registry로
  이전 program의 결과가 바뀌는 최적화는 금지한다.
- cooperative cancellation/worker/scheduler는 host 책임이다. 내부 동기 루프를 실제 중단하지 않는데
  AbortSignal 지원으로 표시하지 않는다. 새 async/batch API 필요성이 측정으로 확인되면 별도 concrete D13 변경이다.
- resource-limit diagnostics를 각 family의 수동 limit 검사에도 연결한다. limit 증가 자체를 성능 개선으로 계산하지 않는다.

**완료 조건:** V43–V46 및 성능 표. cap 내 workload와 예상 reject workload 모두 설명 가능한 결과를 낸다.
