# G-DATA 공개 준비·적용 경계 제안

상태: `ready-for-review`. [전체 실행 승인](../../AUTHORIZATION.json)에 따라 다음 구현 checkpoint의 구체적인 계약을 정리한다. 이 문서는 공개 API와 저장 연결의 **제안**이며 구현 완료 기록이 아니다. 기존 [private resolver 계약](DESIGN.md), [G-PARAM P1–P6](../parameter/DESIGN.md), STEP-013/016의 데이터 의존성 요구를 연결한다. 이 문서 작성에서는 runtime을 변경하지 않는다.

## 현재 구현과 채택할 경계

`grammar/dataSource.js`는 순수 파싱, `resources/resolveData.js`는 명시 host callback을 호출하는 비동기 준비를 이미 소유한다. `createDataSourceRequest`, `prepareDataSource`, `validatePreparedDataSource`는 private 함수다. 공개 등록, source metadata, revision/parameter 연결, codec 검증은 다음 구현 대상이다.

현재 저장소에는 `prepareTextMetrics`라는 공개 또는 private 함수가 없다. 실제 선례는 host가 측정한 plain profile을 만든 뒤 `applyTextMetrics({profile})`가 동기 검증·명시 materialization을 실행하는 경계다. 데이터도 준비 중에는 program을 반환하거나 수정하지 않고, 준비된 자료를 검증한 하나의 동기 action이 완성된 새 program을 반환한다.

`editParameter({target,value})`는 승인된 그대로 유지한다. `prepared`, `resolver`, `dependents` 등의 옵션을 여기에 추가하지 않는다. URL source가 없는 기존 parameter 편집은 현재 동작 그대로이며, 필요한 외부 자료가 없는 URL 의존 편집은 원래 program과 trace를 보존한 채 실패한다.

## 공개 표면

제안하는 이름과 호출은 다음으로 고정한다. 임의 action/patch/transaction 목록은 받지 않는다.

```typescript
type DataUpdateRequest =
  | { kind: "create"; id: string; source: DataSource;
      keyField?: string; keyFields?: readonly string[] }
  | { kind: "revise"; target: string; id: string;
      rowMap?: readonly (number | null)[] }
  | { kind: "parameter"; target: string; value: number | string | boolean | null };

type DataUpdateHost = {
  requestToken: string;
  baseURL?: string;
  load?: (input: { url: string; signal?: AbortSignal }) => Promise<DataPayload>;
  resolveNamed?: (input: { name: string; signal?: AbortSignal }) => Promise<DataPayload>;
  signal?: AbortSignal;
};

prepareDataUpdate(program, request, host): Promise<PreparedDataUpdate>;
program.applyDataUpdate({ prepared, requestToken }): ChartProgram;
```

`DataSource`와 `DataPayload`의 내용은 [private 계약](DESIGN.md)의 closed schema를 그대로 사용한다. 모든 option record는 own data property 검사와 unknown-key 거부를 먼저 적용한다. `request.id`와 `target`은 필수이며 첫 dataset/resource를 추정하지 않는다.

| 요청 | target/id 의미 | 동기 child action | 지원 entry |
|---|---|---|---|
| `create` | `id`는 새 original dataset이자 새 source binding의 ID | `createData` | Full, Basic |
| `revise` | `target`은 정확한 `data-source` resource ID, `id`는 새 dataset snapshot ID | `reviseData` | Full |
| `parameter` | `target`은 정확한 parameter ID | 기존 `editParameter({target,value})` | Full |

`ggaction`과 `ggaction/basic`의 기존 browser-safe entry에 `prepareDataUpdate`를 export한다. Basic의 선언·준비·action 등록은 `create`만 허용하고 Full 편집 planner를 import하지 않는다. 별도 package subpath, Node I/O entry 또는 renderer export는 만들지 않는다. 기존 `createData({values,...})`와 `reviseData({values,...})`는 동기 rows API로 유지한다.

새 source 생성은 재사용 가능한 `keyField`/`keyFields` 또는 기존 generated-key 정책을 사용한다. 두 field 옵션은 상호 배타적이다. 이 경로는 한 번의 payload 길이에만 대응하는 `keys`를 받지 않는다. 기존 rows API의 explicit `keys` 지원은 그대로다. Field key는 refresh에도 같은 identity 규칙으로 계산하며 generated key는 명시 `rowMap`이 없는 새 행에 새 token을 배정한다. Parameter 요청에 행 대응 option을 추가하지 않는다. Selection 등의 기존 identity 검증이 실패하면 전체 적용을 거부한다.

### 최소 host 호출

아래 코드는 제안 API의 정확한 호출 예이며 아직 실행 가능한 current example이 아니다. `load`는 host가 정한 adapter다. 라이브러리가 기본 `fetch`를 제공하지 않는다.

```javascript
import { chart, prepareDataUpdate } from "ggaction";

let program = chart().createParameter({ id: "region", value: "north" });
let currentRequestToken;
const load = async ({ url, signal }) => {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
  return { bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type"), encoding: "utf-8" };
};

currentRequestToken = crypto.randomUUID();
const initial = await prepareDataUpdate(program, {
  kind: "create", id: "rows", keyField: "id",
  source: { kind: "url", format: "csv", url: {
    version: 2, registry: "standard@1", root: {
      type: "call", name: "concat", args: [
        { type: "literal", value: "/data/" },
        { type: "parameter", id: "region" },
        { type: "literal", value: ".csv" }
      ]
    }
  } }
}, { requestToken: currentRequestToken, baseURL: "https://example.test/", load });
program = program.applyDataUpdate({ prepared: initial,
  requestToken: currentRequestToken });

currentRequestToken = crypto.randomUUID();
const changed = await prepareDataUpdate(program, {
  kind: "parameter", target: "region", value: "south"
}, { requestToken: currentRequestToken, load });
program = program.applyDataUpdate({ prepared: changed,
  requestToken: currentRequestToken });
```

동시에 진행하는 요청마다 host는 새로운 token을 발급하고 해당 편집 영역의 **현재 token**을 따로 보유한다. 완료된 응답에서 token을 복사해 `applyDataUpdate`에 넣으면 최신 요청이라는 증거가 되지 않는다. 위 예제의 마지막 `program`과 `currentRequestToken`은 await 이전 값을 되돌려 쓰지 않는 host 소유 변수다.

## Live source의 단일 owner와 저장 모양

제안은 `semanticSpec.resources`에 typed `data-source`를 추가하는 것이다. Dataset마다 URL 의존성을 저장하면 `reviseData`가 보존한 과거 original snapshot까지 현재 parameter의 consumer가 된다. 따라서 **현재 source intent와 현재 output binding**은 resource 한 개가 소유하고, dataset에는 그 snapshot을 만든 확정 자료의 receipt만 둔다.

```javascript
// 새 typed resource: 기존 generic stored-resource envelope를 재사용한다.
{
  kind: "data-source", id: "rows", revision: 0, algorithmVersion: "1",
  ownership: { mode: "authored" },
  inputs: [{ kind: "parameter", id: "region", revision: 0 }],
  options: { source: /* normalized DataSource */, baseURL: /* optional absolute URL */,
    keyField: /* optional; mutually exclusive with keyFields */ },
  result: { data: /* exact {kind:"data",id,logicalId,revision} */, inputHash: "..." },
  provenance: { origin: "authored" }
}

// original dataset에 추가하는 optional source receipt.
sourceReceipt: {
  sourceId: "rows",
  parsing: /* normalized format/delimiter/parse/schema only */,
  resolvedURL: /* URL source only; named source uses name instead */,
  original: /* {kind:"text",text} or {kind:"rows",values} */,
  provenance: /* private resolver의 actual content hash/MIME/encoding/parser version */
}
```

`sourceReceipt`는 dataset의 기존 `source` 필드와 다르다. 기존 `source`는 derived dataset의 입력 ID이며 이 의미를 바꾸지 않는다. `parsing`은 그 과거 snapshot을 재검증하는 불변 parser 입력이다. Live URL AST와 parameter 값 복사본을 receipt에 저장하지 않는다. Parameter scalar의 canonical owner는 계속 parameter resource 한 곳이다. `original.kind: rows`를 실제 수신 bytes로 표현하지 않는다.

재사용할 key 정책의 authored owner는 `data-source.options.keyField` 또는 `keyFields`다. 둘 다 없으면 generated 정책이다. Dataset의 기존 `keySpec`은 그 정책을 적용한 concrete identity이며 shared key validator로 일치 여부를 확인한다. `rowMap`은 이번 refresh의 이전 행 index/null 대응이고 source 정책으로 저장하지 않는다.

`data-source.inputs`는 URL AST의 모든 branch에서 추출한 exact ordered parameter refs다. `result.data`는 소비할 입력이 아니라 이 source가 현재 소유하는 output이다. 이를 일반 dependency edge로 되돌려 cycle을 만들지 않고, resource validator와 제거 collector가 각각 exact output binding을 검사한다. `sourceId`는 receipt의 역사적 label이며 삭제된 resource의 live 참조로 검사하지 않는다.

Source refresh 후 resource의 ID는 유지하고 revision, inputHash, output ref를 갱신한다. 이전 original dataset과 receipt는 기존 revision 계약대로 보존한다. Parameter 변경이 만드는 새 original ID는 기존 revision planner의 deterministic collision 검사 규칙을 확장하여 배정하고, 여러 source의 ID/row identity를 preflight에서 한 번만 배정한다. Dry run과 실제 적용에서 다시 발급하지 않는다.

### 제거와 명시 rows 수정

- `removeParameter`와 primitive resource 제거는 `data-source.inputs`도 consumer로 계산한다. 살아 있는 URL source를 두고 parameter만 제거할 수 없다.
- 현재 output dataset의 `removeData`는 기존 외부 consumer 검사를 통과한 경우 자신의 source binding을 먼저 해제하고 dataset을 제거한다. 자신의 output binding만으로 영구 제거 불가능한 self-dependency를 만들지 않는다. 과거 snapshot은 기존 dataset 참조 규칙으로 제거한다.
- 기존 `reviseData({source,id,values,...})`를 live source output에 직접 실행하면 명시 rows가 새 source intent다. 전체 revision을 성공시킨 뒤 해당 live binding을 해제한다. 이전 snapshot의 receipt는 보존하고 새 rows가 과거 URL에서 왔다고 기록하지 않는다. 이후 그 source ID로 refresh하려면 새로운 source 생성이 필요하다. 이 detach 정책은 문서·trace·tests로 드러낸다.
- Resource 생성·삭제·복사 primitive는 fetch나 URL 계산을 실행하지 않는다. 최종 domain action과 persistence가 현재 output/ref의 일관성을 검증한다.

## 비동기 준비와 원자적 적용

1. 준비 helper는 현재 program의 정확한 scope를 읽고 request와 host options를 검증한다. Parameter 요청은 변경 후 scalar/revision을 **순수 값으로** 계산한다. 아직 `editParameter`나 materialization action을 호출하지 않는다. 동일 값은 기존 `Object.is` 규칙이며 외부 load가 필요 없다.
2. 변경될 source와 기존 computed/data closure의 합집합을 모은다. Missing ID, overflow, cycle, duplicate, dependency/work budget, 예상 revision ID 충돌을 loader 호출 전에 거부한다. URL AST는 inactive branch의 type/dependency도 검사한다.
3. 필요한 source마다 private `createDataSourceRequest`로 normalized source, resolved URL, exact parameter refs, scalar environment, token/inputHash를 고정한 뒤 `prepareDataSource`를 호출한다. Parameter 요청은 미래 revision의 값을 사용한다. Source binding에 저장된 baseURL을 사용하고 새 create만 host baseURL을 채택한다. Refresh 중 다른 baseURL로 source intent를 몰래 바꾸지 않는다.
4. 필요한 모든 payload가 준비되어야 `PreparedDataUpdate`를 반환한다. 단일 source는 한 번만 load한다. 여러 source의 합류점도 한 번만 계산하도록 closure를 보존한다. Callback은 program/parameter resource를 받지 않으며 URL 또는 name과 signal만 받는다. Abort는 load 전·후와 최종 반환 전 검사한다.
5. `applyDataUpdate`는 아래의 freshness 검사를 먼저 실행하고 동기 preflight를 수행한다. 검증된 prepared payload는 정확한 child argument object에만 결박한 private context로 전달한다. 기존 `withPreparedDatasetIdentity`와 같은 `try/finally` 수명이며 global current payload나 queue가 아니다.
6. Wrapped child `createData`, `reviseData` 또는 고정된 `editParameter`가 기존 data planner를 통해 source→computed→통계→scale→mark/guide→selection closure를 명시적으로 갱신한다. Parameter 요청은 여러 source와 computed root의 합집합을 한 번에 계획한다. Source마다 개별 `reviseData`를 끝까지 돌려 중간 stale program을 외부로 내보내지 않는다.
7. 최종 schema/refs/resource/output/materialization 검증을 통과한 완성 program만 반환한다. 성공 trace에는 `applyDataUpdate`와 실제 domain/primitive children이 남는다. 실패 시 이전 program/trace, host input 및 pending payload를 변경하지 않는다. Loader를 재호출하거나 부분 결과를 commit하지 않는다.

Direct `editParameter({target,value})`가 URL source를 변경하지만 private prepared context가 없으면 `prepared-data-required`로 실패한다. URL 문자열이 우연히 같아도 dependency revision이 달라지는 요청은 명시 prepare를 거친다. 같은 parameter 값의 편집은 기존 no-op이고, 같은 URL을 다시 읽고 싶으면 명시 `kind: "revise"`를 사용한다. named/static URL source의 refresh도 이 요청을 사용한다.

## Stale response와 ABA 차단

`PreparedDataUpdate`는 library가 만든 frozen handle이다. Handle의 enumerable 값은 `kind: "data-update"`와 요청 설명용 `request`뿐이다. 설명은 create `{kind,id,sourceKind,format?}`, revise `{kind,target,id}`, parameter `{kind,target}`의 닫힌 모양이며 정확한 ID를 보존한다. 전체 normalized request·base program identity·payload·refs·검증 결과는 private WeakMap에만 연결한다. 원문 source.text/values, URL/AST, parameter value, rowMap, key policy, loader, signal은 handle에서 노출하지 않는다. 구조가 같은 plain object를 만들거나 serialize/deserialize한 handle을 적용할 수 없다. Action trace는 기존 argument summarizer로 이 요청과 적용 시 전달된 token을 완료 이력으로 기록한다. Pending payload, authoritative current token, callback 또는 signal은 ChartProgram에 저장하지 않고 이력 token을 복원 후의 pending 상태로 취급하지 않는다.

적용할 때 다음을 모두 확인한다.

1. Host가 전달한 **현재** `requestToken`과 준비 시 token이 일치한다. Input hash 자체에는 token이 포함되지 않으므로 token을 hash로 대신하지 않는다.
2. 적용 대상 program이 prepare의 base instance와 동일하다. 중간에 unrelated action만 수행했어도 보수적으로 stale 처리하고 다시 prepare한다. 제거→재생성으로 ID/revision/value가 같아지는 ABA도 새로운 instance이므로 거부한다.
3. 대상 source, parameter, dataset의 exact identity/revisions가 고정한 baseline과 일치한다. Parameter 요청은 동일한 scalar type/value와 예상 다음 revision을 다시 검증한다. Source별 현재/예상 request를 재구성한 inputHash가 prepared hash와 같아야 한다.
4. Private `validatePreparedDataSource`가 실제 original, contentHash, rows, schema, MIME/encoding/parser version을 재검증한다. 모든 payload가 성공해야 적용 가능하다. Abort된 handle은 적용하지 않는다.

현재 `core/action.js`는 `_enterAction()`으로 clone한 program을 implementation에 전달한다. Base instance 검사는 **그 clone 이전의 원래 public receiver**를 확인해야 한다. Root가 확인한 구현 방향은 같은 파일의 작은 private WeakMap과 `actionSource(program)` accessor다. Wrapped invocation이 `entered → original receiver`를 등록하고, 기존 implementation/dispatch/completion hook/exit를 실행한 뒤 `finally`에서 삭제한다. Prepared boundary만 `actionSource(this)`를 사용하여 base와 비교한다. Public callback signature, metadata 또는 hook 옵션은 바꾸지 않는다. 등록이 없는 instance나 `invokeWrappedActionImplementation` 직접 호출에서 원래 receiver를 추측하지 않고 실패한다.

중첩 action은 각각 다른 entered key를 사용하므로 자신의 finally가 부모의 결박을 삭제하지 않는다. Normal return, implementation 오류, completion hook 오류 모두 정리해야 한다. WeakMap은 source identity의 임시 증거이며 program property나 codec state가 아니다.

### Opaque handle, trace 요약과 scoped dispatch

`summarizeArgs`는 own property descriptor를 읽고 array는 count로 요약한다. Implementation에는 요약본이 아니라 원래 `args`가 전달되므로 valid handle의 WeakMap identity는 보존된다. Frozen handle의 request descriptor에는 큰 원문을 넣지 않는다. `summarizeArgs`는 배열을 count로 바꾸지만 긴 문자열은 그대로 복사하므로 normalized request 전체를 handle에 넣으면 inline text와 URL literal이 trace로 복제된다. 정확한 normalized request는 private payload에만 두고 trace는 위 descriptor와 호출 시 token만 설명한다. ID/target은 기존 identifier 계약을 유지하며 임의 길이 절삭이나 생략 정책을 추가하지 않는다. Trace의 요약본은 의미를 설명할 뿐 적용 권한이 없으며 복사·복원한 handle은 registry lookup에서 거부한다. Forged getter는 호출하지 않고, circular argument는 기존 summarizer가 거부한다. Prepared validation 뒤에 callbacks를 재실행하지 않는다.

현재 action dispatcher는 top-level `args.target`이 object/array이면 closed implementation의 key 검사보다 먼저 child scope로 전환한다. `applyDataUpdate`에는 `target` 옵션이 없으므로 기존 dispatch 제외 집합 `UNSCOPED_PRIMITIVES`에 이 op를 추가한다. 이 집합은 현재도 domain action `createData`를 포함한다. 새 public dispatch 정책은 만들지 않는다. 잘못 추가한 top-level target은 closed-key 오류가 되고, `prepared.request.target`은 중첩 값이므로 dispatcher에 관여하지 않는다. Concat child를 준비한 handle을 parent에 넣거나, context clone을 만든 scoped dispatcher로 전달하여 원래 child identity를 우회할 수 없다. Host가 정확한 child를 직접 적용한 뒤 교체하는 호출만 사용한다.

오래된 immutable base에 고의로 적용하는 것은 사용자가 만든 별도 branch다. 라이브러리는 host 변수의 최신 값을 관찰할 수 없다. 따라서 latest program과 latest token을 전달해야 한다는 host 계약을 명시하고, token을 준비 결과에서 그대로 가져오는 예제를 제공하지 않는다. 동일 base에 병렬 요청을 보냈다가 늦게 끝난 응답은 현재 token 검사로 거부한다. 전역 cache나 pending request registry 없이 이 두 종류의 stale을 구분한다.

## Facet/repeat, concat, 복원 및 renderer

- Unit은 자기 namespace만 읽는다. Concat은 명시 child를 prepare/apply한 후 기존 `replaceCompositionChild`로 교체하며 sibling parameter/source를 찾지 않는다.
- Facet/repeat는 현재 parameter 편집처럼 retained source를 원본 scope로 사용한다. 준비는 retained source의 live bindings를 모으고 commit은 새 source를 recipe로 재생성한다. Child adoption은 필요한 parameter와 source binding을 exact refs로 복사하며 이전 retained revision으로 현재 값을 덮지 않는다. Historical receipt를 새 live source로 승격하지 않는다.
- Full serialization은 현재 live source와 확정 dataset의 `sourceReceipt`를 저장한다. 실제 UTF-8 text 또는 parsed rows가 포함되므로 fresh process, 네트워크 차단 환경에서도 복원·검사가 가능하다. Codec은 loader, callback, signal, Promise, handle 또는 pending token을 저장하지 않는다.
- Restore는 retained 원본을 같은 version의 pure parser로 검증하고 rows/schema/contentHash를 대조한다. Current binding만 현재 parameter refs/inputHash/output ref와 대조한다. 오래된 original snapshot의 당시 parameter 값을 현재 revision에 맞추지 않는다. 검증은 계산된 graphic을 다시 materialize하거나 action을 replay하지 않는다.
- 복원 뒤 로컬 computed-only parameter 편집은 현재처럼 동기 실행한다. URL source를 바꾸는 편집은 host가 다시 prepare해야 하며, offline host가 보유한 bytes를 loader로 공급할 수 있다. 과거 snapshot bytes를 새 URL의 응답으로 숨겨 재사용하지 않는다.
- `serializeGraphic`에는 기존 concrete output만 남는다. Canvas/SVG/PNG/PDF와 scene은 계속 `graphicSpec`만 읽으며 data parsing, URL 평가, fetch 또는 parameter 조회를 하지 않는다.

## 다음 구현의 확인 항목

공개 호출·선언·등록·current contract·guide/example·inspection·source boundaries·package consumer를 한 checkpoint로 연결한다. 저장 구조가 추가되므로 SECOND_ARCHITECTURE에는 live source/receipt 소유 경계만 기록하고 옵션 계약은 current CORE/DATA owner에 둔다.

필수 시험은 inline rows/text, named, absolute/relative URL, CSV/JSON MIME·UTF-8·parse 오류, URL AST의 inactive dependency, 여러 source/diamond, abort와 loader reject, out-of-order 완료, 같은 input의 두 token, 변경 후 재변경 및 제거/재생성 ABA, forged handle/receipt/hash, row identity·selection, facet/repeat·scoped concat, source/parameter 제거, manual rows detach, 기존 program/trace equality다. Installed Full/Basic의 fresh-process offline restore와 복원 후 refresh, renderer/scene의 prepared update 전후 concrete parity도 포함한다.

Adoption 시험은 facet child의 source output/ref와 key 정책이 새 retained source에 일치하는지, 같은 이름의 concat sibling은 그대로인지, 오래된 child resource가 현재 parameter를 덮지 않는지를 확인한다. Detach 시험은 URL output에 직접 rows revision을 적용한 후 live binding만 없어지고 과거 receipt가 유지되는지, 이후 parameter 편집이 그 URL을 재요청하지 않는지, closure 실패 시 binding/receipt/trace가 모두 이전 그대로인지 확인한다.

Root 검토에서 확정할 consequential 선택은 위에 구체화한 세 가지다: (1) `prepareDataUpdate`/`applyDataUpdate` closed union과 Basic create-only, (2) typed `data-source` live owner + dataset receipt, (3) 직접 rows revision의 명시 detach와 field/generated key 정책. 전체 실행 승인을 재사용하되 이 제안의 채택 기록과 실제 구현 완료를 구분한다. 새 feature runtime 작업은 이 문서 검토 뒤 시작한다.

## 실제 파일 소유권과 병렬 분할

다음 표는 현재 파일을 확인한 구현 분할 제안이다. 이 문서 작성으로 파일 소유권을 실제 재배정하거나 runtime 구현을 시작하지 않는다. Public entry·declaration·contract·docs·generated catalog·package limits는 root가 통합하며 agent는 자기 파일만 편집한다.

| 담당 | 전용 구현 파일 | 책임 |
|---|---|---|
| A — host 준비 | 새 `resources/dataUpdate.js`, 새 `resources/dataUpdateFull.js`, 새 `grammar/dataSourceRequest.js`; 기존 `resources/resolveData.js` | closed request/host 정규화, URL/named load, abort, opaque handle registry, request token/hash/base proof; core/action.js lifetime은 root 소유 |
| B — 저장 상태·참조·복원 | 새 `materialization/dataSourceState.js`; 기존 `materialization/resourceState.js`, `actions/primitives/resourceState.js`, `actions/primitives/semanticAction.js`, `grammar/schemas/semanticPath.js`, `actions/primitives/semanticValidation/dataset.js`, `core/resourceReferences.js`, `actions/resources/remove.js`, `persistence/validation.js` | typed source/receipt의 read-only validation, primitive 저장·adoption, 정확한 output ref 수집, 제거와 source-free restore |
| C — 동기 생성·갱신 closure | 새 `actions/data/sourceCreate.js`, 새 `actions/data/sourceEdit.js`; 기존 `actions/data/create.js`, `actions/data/revise.js`, `actions/data/edit.js`, `actions/parameters/edit.js`, `actions/facets/actions.js`, `actions/data/basic.js`, `actions/data/index.js` | prepared context의 명시 child action 연결, 한 번의 source/parameter DAG 계획, source receipt의 생성 시 저장, manual detach, facet/repeat 재생성, Full/Basic 등록 |

표의 파일 경로는 `src/` 기준이다. A/B/C 각각의 focused unit·lifecycle test는 같은 owner가 별도 capability 파일에 작성한다. Root는 installed consumer/type/browser/renderer evidence를 통합한다. `selectors/resources.js`는 이미 generic typed lookup과 exact data reference를 제공하므로 원칙적으로 바꾸지 않는다. 특별한 source lookup이 필요하면 B의 source state helper가 그 selector를 호출하며 첫 source를 고르지 않는다.

Basic의 `resources/dataUpdate.js`와 `actions/data/sourceCreate.js`는 생성 경로만 import한다. Full의 `resources/dataUpdateFull.js`와 `actions/data/sourceEdit.js`가 C의 revision/parameter planner를 import한다. 기존 `actions/data/basic.js`에 create-only wrapped op를 등록하고, `actions/data/index.js`에는 같은 op 이름의 Full 구현을 등록한다. 이로써 `recordBuiltinActions`의 class별 metadata/trace 등록을 유지한다. Full helper를 common module에 import하고 런타임 branch만 나누는 방식은 Basic bundle에 편집 lifecycle을 끌어들이므로 사용하지 않는다.

### 반드시 먼저 합의할 내부 연결

- **A↔B: source proof.** B는 source shape/receipt 파싱 검증과 finalized program의 live source validation을 소유한다. A는 `grammar/dataSourceRequest.js`의 `createDataSourceRequest`와 `dataSourceRequestHash`를 공유하며 B가 소유하는 `grammar/dataSourcePayload.js`의 payload proof를 재사용한다. Hash는 canonical baseURL도 포함하고 requestToken/inputHash만 제외한다. B의 restore는 URL AST shape/type/dependency를 검사하되 평가하지 않고 확정 receipt의 resolvedURL로 hash를 재구성한다. B의 read-only module은 callback을 호출하는 resolver를 import하지 않고 grammar·digest·selectors를 사용한다. `result.data` 검증은 input DAG와 분리한다.
- **A↔C: 준비 계획.** C의 Full planner가 정확한 source IDs, baseline refs, parameter 다음 revision, 새 dataset IDs/row identity를 정하고 A가 그 고정 계획에 필요한 payload만 준비한다. Common create helper는 Full planner를 import하지 않는다. A Full helper가 C의 `planDataUpdate(program,request)` → 모든 source request 고정 → 병렬 load → `finalizeDataUpdatePlan(plan,preparedSources)` 순서를 따른다. Common helper의 `readPreparedDataUpdate(enteredProgram,prepared,requestToken)`은 actionSource의 original receiver·현재 token·abort·payload proof를 검증한 뒤 private payload를 C apply에 반환한다. Create payload는 `{base,request,requestToken,signal?,prepared,identity,options}`, Full 수정은 `{base,request,requestToken,signal?,plan}`이며 options는 B의 normalizeDataSourceOptions 결과다. Plain object로 복제한 handle을 신뢰하지 않는다.
- **B↔C: receipt를 쓰는 시점.** `semanticPath.js`는 현재 dataset 속성으로 source/transform/schema/values만 허용한다. B가 sourceReceipt 경로·검증을 추가하더라도 materialized dataset의 정의는 이후 편집할 수 없다. C는 `createData`의 중복 ID 검사 뒤, values를 쓰기 전에 exact private prepared argument에 연결된 receipt를 저장한다. 공개 createData 옵션을 늘리거나 완성 후 snapshot을 직접 수정하지 않는다.
- **B↔C: parameter write의 source revision.** 현재 `replaceStoredResource`는 dependent inputs를 자동 rebind하며 resource revision을 올린다. 새 source를 그 경로에 넣고 다시 일반 replace하면 두 번 증가하고, refs만 최신인 옛 payload를 완성 결과로 오인할 수 있다. C가 새 raw snapshots를 immutable 후보에 먼저 만들고, parameter primitive에 전달할 exact argument object의 private context에 최종 source envelopes를 결박한다. B의 `semanticAction.js`가 원래 args를 private resource writer에 전달하고 그 writer는 envelope의 expected prior identity/revision을 확인하여 dependency rebind 때 함께 저장한다. 한 source revision은 한 번만 증가하며 primitive가 URL을 평가하거나 load하지 않는다. 구체적인 private context helper는 B가 소유하고 C만 호출한다.
- **Final freshness와 primitive graph.** Generic graph shape/exact dependency 검증과 source request hash/output/receipt의 finalized 검증을 구분한다. Extension primitive의 중간 상태에서 parameter refs만 변경했더라도 이를 새 응답으로 인정하지 않는다. `applyDataUpdate`와 serialize/restore는 B의 최종 validator를 반드시 호출하며 stale payload가 밖으로 성공 반환되지 않게 한다. 과거 receipt는 live parameter ref 검사를 받지 않는다.
- **제거와 detach.** `core/resourceReferences.js`는 현재 resource.inputs/ownership의 data 참조를 수집하지만 result.data는 모른다. B가 live output 참조를 정확한 path로 추가하고 `actions/resources/remove.js`에서 자신의 binding만 해제할 수 있게 한다. C의 direct rows revision은 같은 B helper로 live binding을 해제한다. `core/programState.js`의 기존 statistics data-owner cache와 source resource를 혼합하지 않는다.
- **Facet adoption.** `actions/facets/actions.js`가 recipe 재생성과 primitive `adoptSelectionResources`를 호출한다. `deriveFacetChildren`는 원래 datasets를 가진 base 위에 cell filter/derived dataset을 추가하므로 live source output은 계속 그 raw original을 가리킨다. Source output을 `cell.data` 같은 filtered dataset으로 바꾸면 원본 CSV/JSON과 subset을 잘못 비교하게 되므로 금지한다. C가 새 retained raw source의 exact ID/revision을 정하고 B가 그 참조로 live source output·parameter refs를 adoption한다. Receipt의 sourceId만 보고 resource를 복원하거나 과거 child resource가 현재 것을 덮도록 하지 않는다.

`persistence/validation.js`는 기존 `validateResourceGraph` 직후 final source validation을 추가하고 dataset property loop는 새 semantic validator를 재사용한다. `persistence/codec.js`는 이미 generic tagged values를 처리하므로 source receipt만을 위한 새 wire format을 만들지 않는다. Pending handle은 trace summary 이상으로 인코딩되지 않으므로 codec 복원 결과가 적용 가능한 handle이 되지 않는다. `inspection.js`의 현재 generic resource summary가 새 kind/receipt를 충분히 표시하는지 root가 확인하고, 필요할 때만 명시 descriptor를 추가한다.

위 coupling 때문에 B의 state shape와 C의 final envelope handshake를 먼저 고정한 뒤 A의 plan→prepare→apply를 연결한다. 공통 파일을 두 agent가 번갈아 수정하거나 중간 상태 검증을 임시 해제하지 않는다. 이 분할에는 새 generic transaction engine, public action hook 또는 renderer I/O가 없다.

## STEP-014 선행 inventory

아래는 현재 source에서 확인한 차이이며 STEP-014 완료 판정은 아니다. 기존 summary/bin/bin2d/stack/window/fold/flatten/lookup/impute/regression/density/ECDF/timeUnit owner를 재사용한다.

| 영역 | 현재 근거 | 보강할 범위 |
|---|---|---|
| Pivot | 공개 action/transform owner가 없고 regression 내부 선형계 풀이의 `pivot` 변수만 존재 | 새 transform과 duplicate-cell aggregate 필수·missing-cell 정책, schema/lineage/revision 연결 |
| LOESS degree | `grammar/regression/parameters.js`는 loess의 degree를 거부하고 `models.js`는 local linear를 계산 | 기존 기본값을 유지하며 explicit degree 1/2 계약과 수치 oracle 추가 |
| LOESS singular/empty | local variance 0은 weighted mean으로 fallback; 전체 n<2 또는 동일 x는 오류 | n=0/1·동일 x의 기존 오류와 local constant fallback을 구분하여 시험·문서화하고 degree 2 singular 정책 결정 |
| LOESS robust weights | tricube, stable input-order ties, 기본 span .75, robustIterations 0; residual weight가 모두 0이면 ordinary neighbors로 복귀 | 작은 span·ties·all-zero robust weights·exact-line 독립 fixture; observation-weight 공개 옵션은 현재 없음 |
| Quantile | aggregate/box/scale의 linear 결과 및 서로 다른 invalid-input 정책을 `quantile-policies.test.js`가 이미 고정 | 기존 기본값 변경 없이 q25=1.75/q50=2.5·endpoint·empty fixture와 stats 전체 matrix 보강 |
| Lookup | `grammar/lookup.js`는 right key 중복을 거부하는 1:1 contract | 현행 1:1/nullable unmatched를 명시하고 1:many는 지원으로 주장하지 않음; 카드 요구와 정확한 추가 범위를 다음 설계에서 확정 |
| 독립 oracle | `test/oracles/numeric.js`, `bin2d.js`, `window.js`, `regression-statistics.js`, `categorical-density.js` 등이 존재 | 기존 owner에 summary variance, Gaussian f(0), pivot/LOESS 경계 literal을 더하고 production kernel import 없이 계산 |

## 공개 경계 통합 중 확인한 보정

- Source receipt와 inline source text는 저장 상태에 그대로 보존하고 primitive trace에서 textLength로 요약한다. Core의 private exact-argument summary context는 callback/metadata/public action 옵션을 늘리지 않으며 nested·오류 종료 뒤 복원된다.
- Prepared revise는 준비 단계에서 확정한 iterative union과 revision IDs를 적용 때 재사용한다. 재귀 legacy planner로 다시 선택하여 logical owner 이름과 충돌하거나 깊은 DAG에서 stack overflow가 나는 경로를 제거했다.
- Facet source 교체에서는 replacement unit의 source bindings가 authoritative하다. Selection/computed의 명시 exact ref closure만 채택하며 이전 child에 raw 역사 snapshot이 남았다는 이유로 독립 data-source를 되살리지 않는다. Manual row revision의 detach는 action/program 두 교체 경로에 유지된다.
- Type의 opaque handle descriptor와 private brand는 사용자 작성 option이 아니다. Public required prepared/requestToken coverage는 유지하고 nested descriptor를 생성 option inventory로 확장하지 않는다.
- Focused public/lifecycle·offline installed consumer fixture·문서 예제는 통과했다. 통합 정상 suite/coverage, 실제 설치 artifact, renderer/browser 및 원격 CI 확인은 별도 증거가 완료될 때까지 남아 있다.
