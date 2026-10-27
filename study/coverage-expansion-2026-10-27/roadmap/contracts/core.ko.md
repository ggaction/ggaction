# Identity 리소스와 재계산 계약

## 현행 코드에서 이어받는 경계

src/core/ChartProgram.js의 immutable state, src/core/action.js의 wrapped trace, src/materialization/planner.js의 explicit ordered plan을 유지한다. 현행 planner 순서는 scales → marks → guides → layout → highlights다. 새 topology/layout/resource 계산은 해당 domain action이 먼저 수행하고, 결과에 영향받는 materialization plan을 명시적으로 실행한다. renderer가 program을 보고 빠진 리소스를 계산하지 않는다.

src/scene.js는 현재 row-value token을 만들고 있어 값 변경을 안정적인 동일 항목으로 연결할 수 없다. 신규 identity는 이를 대체하되 기존 createTransitionScene의 공개 return format을 깨지 않는다. scene schema가 확장되면 별도의 version과 legacy reader를 둔다.

## ID와 row key

공개 ID는 기존 validateUserId를 사용한다. 데이터 key는 string, finite number, bigint, boolean, 유효한 Date의 typed scalar 또는 그 tuple을 허용한다. null/undefined/NaN/infinity/object/array 내부 비스칼라는 key로 거부한다. Date는 epoch ms로 정규화한다. number 1과 string '1'은 다른 key이고 -0은 0과 같은 key다. tuple은 길이와 타입을 보존하는 canonical encoding을 사용한다. delimiter로 단순 join하지 않는다. typed value 비교에서 타입 순서는 boolean < number < bigint < string < date, 동일 타입은 값 순서, string은 UTF-16 code unit 순서, tuple은 lexicographic 후 길이 순서로 고정한다.

원본 dataset은 logicalId, revision, rowKeys, nextGeneratedKey를 저장한다. 명시 keyField/keyFields는 duplicate 시 전체 action을 거부한다. 명시 key가 없는 최초 생성은 logical dataset 내부 단조 정수 token을 부여하고 저장한다. 정렬/filter는 기존 token을 보존한다. 기존 row와의 correspondence를 제시하지 않은 전체 values 교체는 모두 새 token이다. 값이 같다는 이유로 다시 연결하지 않는다. append/delete의 기존 row는 유지하며 삭제한 token은 재사용하지 않는다. occurrence identity가 필요하면 사용자가 stable occurrence key를 명시해야 한다. 자동 duplicate occurrence 추정은 제공하지 않는다.

semantic item key는 [childPath, ownerId, role, finalGrainKey]다. graphic child ID는 item key+primitive role이며 현재 배열 index를 정체성으로 사용하지 않는다. partition node key, graph node/edge key, geo feature key도 이 규칙으로 scene/hit/selection에 전달한다. generated ID의 실제 문자열 spelling은 공개 계약이 아니다.

## Lineage

각 derived item은 inputs 배열에 {logicalDataId, revision, rowKey, role}를 보존한다. 1:1 transform은 같은 row key, fold는 [sourceKey, outputField], flatten은 [sourceKey, stableElementKey 또는 원소 index], aggregate는 [typed group tuple, measure role], bin은 [resolved boundary pair, grouping tuple]을 사용한다. flatten 원소가 key 없이 교체되면 해당 원소 identity는 새로 만든다.

lookup은 left/right 기여 row를 role로 구분하고 fan-out 시 [leftKey,rightKey]로 식별한다. stack은 input identity를 유지하며 endpoint는 속성이다. line/area item은 series key와 ordered member keys를 모두 가진다. series identity가 같아도 topology가 바뀌면 일반 path morph를 금지한다. facet 이동은 논리 row key를 유지하지만 childPath가 달라 scene matching은 명시 cross-panel 이동 kernel이 없는 한 enter/exit다.

거대한 기여 집합은 공유 immutable lineage table에 저장하고 item은 ref를 가진다. summary count만 저장하여 provenance를 잃지 않는다. inverse lookup은 runtime index이고 snapshot에 Map 객체를 넣지 않는다. lineage cycle은 생성 시 거부한다.

## 신규 resource schema 제안

~~~ts
type ResourceRef = { kind: ResourceKind; id: string; revision: number };
type Resource = {
  kind: ResourceKind; id: string; revision: number; algorithmVersion: string;
  inputs: ResourceRef[]; options: SerializableValue; result: SerializableValue;
  provenance: { origin: 'authored' | 'observed' | 'inferred'; sourceRows?: LineageRef[] };
};
// ResourceKind: hierarchy | graph | layout | edge-route | geometry |
// projection | image | font | pattern | parameter | persistent-selection | annotation
~~~

semanticSpec.resources는 리소스 배열이다. kind+id가 고유하며 공개 id도 같은 kind 안에서 고유하다. typed ref는 정확한 revision을 가리킨다. public action은 문자열 ID를 현재 program의 유일한 해당 kind로 resolve한다. 단순 'latest' 동적 포인터는 저장하지 않는다. 새 program이 edit로 revision을 올리면 그 program의 모든 live consumer를 함께 rebinding한다. 이전 program과 이전 resource revision은 불변이다.

리소스 result는 source-neutral 수치/정규화 결과이며 immutable이다. geometry 원본, normalized partition intervals, graph adjacency, node positions, edge route controls를 저장한다. materializationConfigs는 그림을 재생성하는 비의미 authoring intent만 소유하고 result 복사본을 소유하지 않는다. graphicSpec에는 concrete path/paint/text/image payload ref와 semantic item metadata를 저장한다. resource와 graphicSpec의 값 일부가 계산 결과로 겹치는 것은 허용하되 독립적으로 편집 가능한 정본을 두 개 만들지 않는다.

기존 materializationConfigs.selections에는 owner target 및 projection intent만 남긴다. 신규 persistent-selection resource는 선택의 논리 key/predicate를 소유한다. migration에서 기존 selection indices를 해당 저장 dataset의 row token으로 변환한다. migration 전에 원본 schema를 검증하고 범위 밖 index나 ambiguous owner는 structured error다. 기존 highlights의 스타일 의도는 기존 owner에 유지한다.

## Create edit remove

각 kind에 create와 의미 있는 edit를 제공한다. 표면적인 edit가 필요 없는 prepared result에는 replace action을 쓴다. create는 existing ID 오류, edit는 missing ID 또는 빈 patch 오류, remove는 기본 restrict다. cascade:true는 소유된 generated resource와 consumer까지 포함하는 삭제 목록을 preflight로 계산하여 한 번에 적용한다. 공유 사용자 resource는 cascade로 암묵 삭제하지 않는다. 참조를 남긴 채 삭제하는 mode는 없다.

검증 순서는 옵션 shape → typed values → resource 존재/kind → reference graph DAG → budget → 계산 → 모든 소비자 호환성 → wrapped mutation → rematerialization이다. 실패하면 source program/trace/외부 cache를 변경하지 않는다. prepared async result는 sourceRevisionVector와 inputHash를 갖고 action 적용 시 현행과 일치하지 않으면 stale-result로 거부한다. worker의 완료 순서가 program 결과를 바꾸지 않는다.

새 데이터 action은 기존 closedAction와 registerDataActions 패턴을 사용한다. 새 family는 actions/<family>/index.js에 registration을 한 번 두고 actions/index.js에서 연결한다. 순수 함수는 grammar 또는 독립 domain kernel에 두며 ChartProgram import를 금지한다. 타입은 types/program.d.ts 및 실제 entry declaration에 추가한다. basic entry에는 새로운 무거운 family를 자동 등록하지 않는다.

## 재계산 표

| 변화 | 재계산할 것 | 유지할 것 |
|---|---|---|
| source 값/feature 변경 | transform, graph inference, affected layout/route, scale/mark/guide | logical ID와 살아 있는 keyed item |
| source 순서만 변경 | explicit order 의존 transform/layout | order-independent keyed topology |
| k/metric/radius 변경 | inferred graph→layout dependency→route→graphics | observed source, surviving edge key |
| node drag | node layout revision→attached route→hit/scene | graph topology 및 inference provenance |
| Canvas resize | plot layout→coordinate mapping→route if screen-space→guides/hit | data-space graph topology, normalized partition |
| theme color만 변경 | paint/legend/highlight | topology, stats, projection |
| font 또는 label 변경 | text metric→guide/layout→affected geometry/hit | 데이터와 추론 |
| parameter edit | AST dependency closure→transforms→scale/marks/guides | 의존하지 않는 sibling |
| geo camera 변경 | projection mapping/clip/labels/hit/scene | 원본 geometry와 join |
| visibility filter | 기본 induced-view mask, scale 정책에 따른 domain, hit/accessibility | 원 graph adjacency; recompute 명시 때만 추론 |

동일 dependent step은 op+canonical args로 deduplicate하고 stable topological order로 실행한다. trace에는 domain resource revision과 wrapped materialization이 보인다. hidden background rematerialization으로 trace를 비우지 않는다. composition ancestor snapshot·shared guides·title occupied bounds까지 transitive closure에 포함한다.

## 저장 복원과 오류

현재 editable envelope schemaVersion은 3이며 graphic envelope는 1이다. 신규 editable은 4로 올리고 1/2/3 reader를 유지한다. 1의 dataset-schema migration을 먼저 수행한 후 4의 identity/resource migration을 적용한다. version3 shared array codec 의미를 변경하지 않는다. graphic-only export는 읽을 수 있지만 editable provenance가 없으면 authoring 복원을 약속하지 않는다.

문자열 JSON 직렬화만 사용하지 않고 기존 tagged codec을 이용한다. source table의 NaN/undefined/bigint 보존과 concrete geometry의 finite 조건을 구분한다. bundle/animation envelope는 editable schema와 별도 version이다. Date/Map/typed arrays는 소유권·codec 계약에 따라 정규화하고 DOM/function/AbortController/Promise/worker/cache는 저장하지 않는다.

진단은 현행 getErrorDetails 체계를 확장한다. 최소 code, operation, optionPath, ownerId, expected, actual, dependencies를 포함한다. 코드: duplicate-id, unknown-resource, wrong-resource-kind, ambiguous-identity, invalid-value, cyclic-dependency, budget-exceeded, stale-result, unsupported-combination, unresolved-asset, layout-unsatisfied. 거대한 data values는 오류에 복사하지 않는다. 각 오류는 원본 program deep equality와 trace equality를 시험한다.

## 독립 기대값

key 있는 행 [{id:'a',v:1},{id:'b',v:2}]를 [{id:'b',v:3},{id:'a',v:1}]로 revise하면 a/b key는 유지하고 b의 값만 3이다. 이전 program의 b는 2다. key 없는 동일 교체는 새 identity다. aggregate A=[r1,r2], B=[r3]의 lineage는 정확히 그 두 집합이며 filter r2 제거 후 A=[r1]이다. 화면 index가 바뀌어도 selection 'b'가 'a'로 옮겨가면 실패다.
