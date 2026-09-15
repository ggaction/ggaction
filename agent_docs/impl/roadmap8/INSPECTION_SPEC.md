# Roadmap 8 조회·검사·성능 상세 제안 — 개정 2

이 문서의 공개 API는 아직 구현되지 않았다. [PROPOSED_TYPES.d.ts](PROPOSED_TYPES.d.ts)가 반환 shape를,
[IMPLEMENTATION_MAP.json](IMPLEMENTATION_MAP.json)이 구현 작업 순서를 소유한다.
프로그램을 읽는 함수는 어떤 domain action도 호출하지 않고 trace/context/cache의 observable state를 바꾸지 않는다.

## 1. package와 target

새 entry는 `ggaction/inspection`이다. exports는 getDatasetSchema, describeAction, comparePrograms,
inspectProgram 네 개다. package.json의 type/default export map과 installed/browser consumer를 함께 추가한다.
private schema helper는 Phase1에서 작성하고 이 entry는 Phase5에서 연결한다. TypeScript 선언의 proposed prefix는
검토용 파일 구분이며 최종 function 이름 앞에는 붙이지 않는다.

input program은 Full/Basic/core class와 등록된 subclass만 허용하는 기존 persistence/accessibility 검사 방식을 따른다.
open actionStack은 완성된 결과가 아니므로 거절한다. 비슷한 object shape만 가진 plain object는 program으로 받지 않는다.
extension 의미는 descriptor가 없으면 unsupported/unverified로 기록한다. source import, 임의 code execution은 없다.

target 주소는 `{kind,id,childPath?}`다. kind는 data/mark/scale/coordinate/guide다.
childPath는 outer→inner child ID 배열이며 매 단계 정확한 child를 선택한다. 명시되지 않은 sibling을 찾지 않는다.
같은 string ID의 dataset과 mark는 별개다. target omission의 의미는 함수별로 아래에 정한다.

## 2. getDatasetSchema

`getDatasetSchema(program,{data,childPath?})`는 실제 data owner/current revision을 resolve한 뒤
DatasetSchema와 resolved dataset ID를 반환한다. data는 필수이므로 첫 dataset fallback은 없다.
새 dataset은 stored schema를 공유 가능한 frozen view로 반환한다. legacy nonempty는 local inference 결과를 반환하고
program에 쓰지 않는다. unknown schema는 completeness unknown으로 반환하며 fields=[]를 known-empty로 오해하지 않는다.
값 통계, type confidence, unit normalization, column picker ranking은 이 함수에 넣지 않는다.

## 3. describeAction

### 3.1 입력과 반환 의미

`describeAction(program,{action,target?,options?})`는 **현재 문맥의 정적 전제조건**을 검사한다.
action은 현재 class에 실제 등록된 operation 이름이다. options는 해당 액션의 proposed call options다.
target을 주면 descriptor가 선언한 target/source 역할에 연결한다. options의 같은 role ID와 다르면 reject한다.
target 없는 createData/createCanvas 같은 액션에 불필요한 target을 받지 않는다.

return은 action name, applicability, parameterDefinitions, requirements, checks, findings를 가진다.
applicability는 supported/needs-input/incompatible/unsupported/unverified다.
- unsupported: 이 entry/class/family에서 제공하지 않는 action 또는 조합.
- needs-input: 가능한 액션이나 필요한 parameter/resource 결정이 빠짐.
- incompatible: 주어진 target/schema/옵션이 계약에 모순됨.
- supported: 문서화한 preflight 검사 통과. 아직 통계 실행·렌더 검증 성공을 뜻하지 않음.
- unverified: extension/미지원 분석 때문에 정적 가능성을 확정하지 못함.

### 3.2 registry 구성

실제 validator와 같은 closed option normalizer, resource resolver, field-role constraints를 descriptor에 연결한다.
기존 action-card metadata는 name/layer/routes 등 정적인 label의 source로만 사용한다.
Node fs를 사용하는 knowledge/task-resolver를 browser inspection entry에서 import하지 않는다.
source descriptor에서 docs schema와 browser descriptor를 생성할 수 있으나 prose를 runtime parser로 읽지는 않는다.

각 built-in action descriptor는 targetKinds/optionDefinitions/requirements/preflight 함수를 가진다.
한 family의 validator를 전체 복제하지 않고 순수 검증 부분을 추출해 실행 액션과 공유한다.
numeric computation이나 graphic allocation이 필요한 부분은 execution check not_run으로 반환한다.
잘못된 입력에서 실행 throw와 preflight finding의 code/optionPath가 일치하는 paired test를 만든다.

### 3.3 parameter definitions

각 definition은 path, kind, required, active, choices?,minimum?,maximum?,unit?,fieldRole?를 가진다.
required는 실행 필요 여부만 뜻한다. UI의 사용자 확인 필요 여부/explicit ledger는 포함하지 않는다.
현재 options 문맥에서 평가된 active/required를 반환하므로 브라우저에서 임의 predicate code를 실행할 필요가 없다.
enum choices와 compatible field choices는 stable order다. field 목록은 schema order를 유지하며 추천 순위처럼 점수화하지 않는다.
비활성 parameter의 잘못된 explicit 입력을 조용히 무시하는 것은 실제 액션의 계약이 허용할 때만 가능하다.
default가 전제조건 판정에 사용됐다면 finding의 reason으로 해당 library rule을 식별한다.
별도 default 추천 목록이나 corpus support count는 이번 반환 schema에 추가하지 않는다.

### 3.4 coverage 완료 기준

현재 전체 built-in inventory의 모든 op가 descriptor 표에 있어야 한다. Full/Basic, primitive/internal scope도 구분한다.
shared validator로 결정 가능한 조건을 전부 unverified로 회피하면 미완료다. 최소 baseline paired fixtures는
모든 op의 valid-first/invalid-option/invalid-target(해당 시)이며 새 11개 기능에는 추가 semantic/schema 조건을 준다.
정적 검사로 알 수 없는 ill-conditioned fit, elapsed timeout, 실제 raster visibility만 not_run으로 남긴다.
등록된 extension에 대한 자동 descriptor plugin protocol은 이번 범위에 추가하지 않고 unverified로 보고한다.

## 4. comparePrograms

### 4.1 identity와 포함 범위

`comparePrograms(before,after,{target?}={})`는 두 완성된 program의 변화 사실을 반환한다.
target omission은 전체 tree다. target을 주면 해당 resource와 연결된 changed consumers를 포함한다.
result의 completeProgramComparison boolean으로 전체 비교인지 명시한다. 부분 view를 전체 no-op 판정에 사용하면 안 된다.
childPath는 양쪽 program의 같은 path를 가리킨다. target이 한쪽에만 있으면 add/remove, 양쪽 모두 없으면 missing-resource다.

semantic datasets/layers/scales/coordinates/guides/title, composition intent, 사용자 appearance intent를 비교한다.
derived 계산 결과 data revision과 bindings, layer order, explicit title/text/color를 보존한다.
trace/actionSequence/context, 계산 시각, UI viewport는 semantic equivalence에 포함하지 않는다.
materializationConfig 내부의 의미 없는 cache identity만 제외하고 user-authored graphical settings는 포함한다.

### 4.2 알고리즘

1. before/after class와 closed state를 검증한다.
2. kind+ID+childPath로 기존 resource identity를 매핑한다. 같은 값이라고 다른 원본 field를 합치지 않는다.
3. own properties를 순서와 무관하게 비교하되 ordered layer/pipeline/window keys 배열 순서는 유지한다.
4. builtin-generated resource는 검증된 owner+role+dependency 구조로만 canonicalize한다.
   이를 모르는 extension/resource는 원래 identity로 비교하고 equivalence unknown을 기록한다.
5. 데이터 rows는 먼저 immutable reference identity로 비교, 다르면 typed deep comparison한다.
   digest를 도입한다면 canonical UTF-8/tagged values와 version을 고정하며 hash 충돌만으로 동등 판정하지 않는다.
6. changes를 kind/childPath/id/role의 deterministic order로 반환한다. before/after 값은 작은 scalar metadata만,
   큰 배열은 count/changed flag로 요약한다.
7. typed resource collector로 shared scale/derived consumers 영향을 수집한다. scope 외 대상은 별도 affected 목록에 둔다.

equivalence는 equal/different/unknown이다. builtin 의미가 다르면 different, 모든 포함 의미가 같고 미확인 부분이 없으면
equal, 나머지는 unknown이다. unknown을 false/true로 강제 변환하지 않는다.
effect classification은 data/binding/structure/scale/guide/style이고 사용자의 intended/automatic 구별은 하지 않는다.
raw object diff를 그대로 semantic delta라고 부르지 않는다. field mapping과 owned guide update의 연관성을 resource로 표시한다.

## 5. inspectProgram

### 5.1 검사 단위

`inspectProgram(program,{target?}={})`는 전체 tree 또는 명시 resource의 concrete 결과를 검사한다.
기존 accessibility와 selection final-item adapters의 ownership/grain 정보를 재사용한다.
여기서 private selector helper를 공유할 수 있지만 accessibility export가 성공해야만 inspection 가능한 구조는 아니다.

report는 checks/findings, per-owner views, 계산 report 목록, coverage를 가진다.
view count는 rawRows?,logicalDataItems?,drawablePrimitives?,visibleCandidates?다.
모르는 수치는 null로 표현하고 coverage finding을 붙인다. 0은 실제로 0임을 검사한 경우만 반환한다.
line/area의 logicalDataItems는 series count이며 view에 grain="series"를 적는다. point/bar 등은 grain="item"이다.
composite owner는 children을 묶고 동일 underlying item을 parent+child로 두 번 더하지 않는다.

### 5.2 concrete traversal

graphicSpec.order에서 시작해 named children을 순회하며 cycle/없는 child/중복 참조를 검사한다.
node/item의 finite numeric geometry, transforms, clipping을 누적 좌표로 계산한다.
현재 graphic contract가 지원하지 않는 transform을 임의 적용하지 않고 not_applicable/failed로 표시한다.
plot bounds와 canvas bounds를 구별한다. 누적 translation과 scale이 있으면 해당 계약대로 world bounds로 변환한다.
stroke width/cap/join을 무시한 fill-only bounds를 exact ink bounds라고 부르지 않는다.

visibleCandidates는 supported geometry의 AABB/opacity/size/clip 검사를 통과한 후보 수다.
다른 mark에 가려진 occlusion, anti-aliasing pixel, 실제 font glyph ink를 검증하지 않는다.
checks에 pixel-visibility:not_run을 명시한다. host의 실제 raster 검사와 합쳐도 이 API가 실행한 검사처럼 기록하지 않는다.
outside clip, opacity0, zero-size, missing-skipped는 서로 다른 flags이며 중복될 수 있다.
각 flags count를 합쳐 hidden total로 계산하지 않는다. visibleCandidates는 실제 검사 가능한
concrete item key union에서 geometry/opacity/clip으로 제외한 집합을 빼서 계산한다.
missing-skipped는 concrete item을 만들기 전에 제외한 입력에 대한 별도 count이며 그 union에 다시 넣지 않는다.

### 5.3 source 연결과 오류

sourceRefs는 childPath+ownerId+role과 가능하면 dataset/field를 가리킨다.
aggregated item은 members/provenance가 있는 범위에서만 원본과 연결하고 모든 raw row 배열을 반환하지 않는다.
source가 없는 extension path에 가장 가까운 mark ID를 추측해서 붙이지 않는다.
unsupported owner 하나 때문에 나머지 report를 실패로 버리지 않고 coverage.partial=true를 반환한다.
하지만 malformed program/graph는 입력 오류이며 valid partial inspection으로 위장하지 않는다.

조회마다 checks 상태가 현재 결과에서 새로 계산된다. 별도 mutable global ready flag를 재사용하지 않는다.
mayCommit/mayPreview는 반환하지 않는다. 0행 허용·warning 차단 등의 제품 정책은 host 책임이다.

## 6. F12 구현과 측정

Phase0 baseline 측정은 기존 scripts/benchmark-runtime.js의 환경/결과 형식을 재사용한다.
새 workload를 능력 기준 이름으로 추가하며 roadmap directory를 runtime import하지 않는다.

| workload ID | 고정 실행 | 측정 |
| --- | --- | --- |
| candidate-branches | same base → 독립 parameter 조합20개 | per candidate/전체 execution, heap/RSS |
| parameter-revisions | same base에서 range endpoint100개 | execution/inspection/cache 비용과 base 불변 |
| bounded-trajectories | slots6, maxDepth4, deterministic fixed params, evaluation budget 고정 | 평가수/실패수/전체 elapsed |
| source-revisions | 원본→edit된 source를 순차200회, 중간 reference 유지/해제 두 variant | retained memory/trace/snapshot bytes |
| empty-recovery | nonempty→empty→nonempty20회 | domain/owner 보존, 비용과 stale graphics 없음 |
| snapshots | final program serialize/deserialize | 시간/bytes/복원 후 edit와 결과 동등성 |

data rows1k/10k/50k tier를 사용하되 cap 초과 출력은 expected reject로 측정한다.
기존 함수에서 current cap을 제거하거나 사용자 값을 sampling해서 workload를 성공 처리하지 않는다.
elapsed와 samples는 warmup10/measured100 원칙을 따르고 긴 사례의 횟수 변경은 결과에 명시한다.
runtime/hardware가 다른 수치를 performance improvement로 비교하지 않는다.

최적화 순서는 profiler hotspot 확인 → 필요한 정보만 계산 → owned references 공유 → 안전한 WeakMap cache →
추가 알고리즘 개선이다. cache key가 data revision/definition/Canvas 의미를 빠뜨리면 사용하지 않는다.
검사되지 않은 API의 async/cancellation 지원을 광고하지 않는다. host Worker는 task의 실제 physical cancellation과
late result discard를 별도로 관리한다. 새로운 async/batch API는 이번 상세안에 포함되지 않는다.

## 7. schema와 문서 동기화

조회 반환 shape는 version:1로 versioning하고 typed immutable arrays/objects를 반환한다.
version은 action semantic version을 대신하지 않는다. 신규 option은 types/current contract/cards가 같은 owner descriptor를
사용하도록 연결한다. 변경 비교와 inspection 의미는 별도 current contract에 기록한다.
docs의 examples는 알려진 valid/invalid/unknown을 각각 보이며 unsupported 조합을 숨긴 예제로 끝내지 않는다.
