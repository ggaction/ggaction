# G-CORE — ID·lineage·resource·schema 4 검토안

상태: **D1–D8 승인, 제품 구현·통합 검증 완료**. [Gate 기록](G-CORE.json)이 승인과 검증 revision을 소유한다.
기존 [core 원안](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/core.ko.md)을 현재 코드와 대조하여
빠져 있던 옵션·분기·이전 형식 처리를 구체화했다. 이 문서는 승인 당시의 설계 기록을 보존한다.
아래의 기존 동작과 미구현 설명은 검토 code revision `129a506d` 기준이다.
통합 이후의 현재 동작은 [CORE 계약](../../../contract/current/CORE.md)과 [Phase 상태](GOAL.md)를 따른다.

## 승인된 결정

| 결정 | 권고안 | 현재와의 차이 |
|---|---|---|
| D1 입력 key | `keyField` / `keyFields` / 별도 `keys` 중 하나 | source 생성에 선택 옵션 추가 |
| D2 값 교체 | keyed는 key로 연결; unkeyed는 새 ID, 명시 `rowMap`만 이전 항목 유지 | 값 비교로 추측하지 않음 |
| D3 분기 | source별 opaque `logicalId`, 새 snapshot별 `allocationId`; 생성 token은 allocation namespace 포함 | 별개 프로그램·편집 분기의 새 행 충돌 방지 |
| D4 lineage | dataset에 행별 key와 공유 기여 행 table; 최종 grain에서 item key 결정 | 행 번호 중심 참조 확장 |
| D5 선택 | 논리 predicate/key는 `semanticSpec.resources`; target/projection과 highlight intent는 기존 config | 같은 선택 의미를 두 위치에 저장하지 않음 |
| D6 리소스 | kind/id/revision, typed inputs, explicit ownership, versioned result; domain 액션이 변경 책임 | generic public resource writer는 추가하지 않음 |
| D7 복원 | editable 4 writer + 검증 후 1/2/3 migration; graphic envelope 1 유지 | 이전 snapshot의 그래픽과 선택 대상 보존 |
| D8 진단 | 기존 error code 유지, 필요한 code/metadata만 추가 | 기존 code 이름 변경 없음 |

승인은 STEP-004–009의 아래 구체적 결정에 한정된다. 후속 family의 수치 옵션·새 시각 결과·runtime·release Gate까지 승인하는 것이 아니다.

## 정확한 호출과 옵션

다음은 **승인된 구현 대상 호출**이다. 검토 당시 런타임에서는 신규 옵션이 거부되었으며 이후 제품 경로에 연결했다.

```js
const before = chart().createData({
  id: 'rows', keyField: 'id',
  values: [{ id: 'a', v: 1 }, { id: 'b', v: 2 }]
});
const after = before.reviseData({
  source: 'rows', id: 'rowsNext',
  values: [{ id: 'b', v: 3 }, { id: 'a', v: 1 }]
}); // a/b identity 유지; before의 b.v는 2

const generated = chart().createData({ id: 'samples', values: [{ v: 1 }, { v: 2 }] });
const appended = generated.reviseData({
  source: 'samples', id: 'samplesNext',
  values: [{ v: 20 }, { v: 1 }, { v: 3 }], rowMap: [1, 0, null]
}); // output→source 대응. null만 새 행; rowMap 생략은 전부 새 행

const dated = chart().createData({
  id: 'daily', values: [{ label: 'first', v: 1 }], keys: [new Date(0)]
}); // Date는 key 입력에서 epoch로 정규화; rows에는 Date 객체를 저장하지 않음
```

| 액션·옵션 | 타입·기본값·실패 |
|---|---|
| `createData({id?,values,schema?,keyField?})` | non-empty own field 이름. 각 row의 scalar 값. 누락/null/invalid/duplicate 오류 |
| `keyFields` | 1개 이상의 중복 없는 field 이름 배열. 순서 있는 tuple; `keyField`와 단일 원소 tuple은 별도 namespace |
| `keys` | `readonly RowKey[]`, values와 길이 동일. scalar 또는 non-empty scalar tuple; keyField/keyFields와 배타적 |
| key 옵션 전부 생략 | 내부 token 생성; 빈 values 허용, next counter=0 |
| `reviseData({source,id,values,schema?,keys?,rowMap?})` | 기존 source/id 필수 규칙, schema override, facet 처리와 concat 명시 child 규칙 유지 |
| revise: field 방식 | 원본 key 정의 상속. keyField/keyFields 재지정과 keys/rowMap 혼용 거부 |
| revise: 별도 keys 방식 | 매번 완전한 keys 배열 필수. 누락을 generated로 해석하지 않음 |
| revise: generated 방식 | rowMap 생략은 전부 신규. 제공 시 values와 길이 동일; 각 원소는 source 행 index 또는 null. 중복 index·범위 밖·희소 배열 거부 |
| key 방식 변경 | revision 안에서 변경 거부. 새 createData로 별개의 논리 데이터 생성 |

`RowKeyScalar = string | finite number | bigint | boolean | valid Date`.
number 1 / bigint 1 / string '1' / Date(1)은 다르며 -0=0이다. 빈 문자열 key는 허용한다.
tuple 안의 tuple/object/null/undefined/nonfinite는 거부한다. 타입 순서는 boolean<number<bigint<string<date,
string은 UTF-16, tuple은 lexicographic 뒤 길이 순서다. 전체 비교에서는 scalar가 tuple보다 앞선다.
인코딩은 type/length를 보존하고 delimiter join을 쓰지 않는다. 실제 opaque 문자열 spelling은 공개 계약이 아니다.
명시 key 삭제 후 같은 key의 재등장은 같은 논리 항목이다. generated token은 삭제 후 재사용하지 않는다.

**Date 조정 근거:** 현재 immutable owner와 codec는 class instance를 거부한다.
이를 전역 완화하면 mutable Date가 state에 들어간다. 별도 keys는 Date를 곧바로 `[date, epochMs]` 값으로
정규화하여 key 지원을 보존하고 기존 row-cell 타입·저장 계약을 유지한다. Date가 들어 있는 values 자체는 계속 오류다.
다른 선택지는 모든 Date cell의 새 immutable 표현을 도입하는 것이지만 이 단계의 요구보다 넓다.

**한도:** production은 기존 source-row/work budget을 재사용한다. tuple은 최대 64개 scalar,
generated counter와 revision은 safe integer이고 증가 전 overflow를 거부한다. 독립 oracle의 10,000행 제한은 시험 도구만의 제한이다.

## Source identity와 분기

원본 dataset에 `logicalId`, `revision`, `allocationId`, `keySpec`, `rowKeys`, `nextGeneratedKey`를 추가한다.
`id`는 기존 공개 snapshot ID다. logicalId는 최초 생성에서 배정한 opaque UUID이며 revision에서 상속한다.
revision은 첫 snapshot 0, 이후 parent+1이다. allocationId는 새 snapshot의 opaque UUID다.
각 generated key는 allocationId와 단조 counter를 함께 포함한다. keyField/keys 방식은 typed key를 보존한다.
snapshot별 UUID는 새 행을 서로 다른 불변 편집 분기 사이에서 잘못 연결하는 것을 막는다.
두 분기가 동일한 공개 id와 revision 정수를 사용해도 새 generated 행은 다른 key다. 기존 행은 rowMap으로 유지된다.
독립적으로 createData한 두 dataset은 같은 공개 id·값이어도 다른 logicalId다.

UUID를 만드는 경계는 wrapped action이다. pure kernel은 명시 namespace와 counter를 받고 결정론적으로 계산한다.
현재 reviseData는 speculative apply와 최종 apply를 두 번 실행하므로, namespace를 preflight 전에 한 번 준비하여
두 apply가 같은 값을 사용하게 해야 한다. 실패 시 program·trace·cache를 쓰지 않는다. UUID 자체를 trace에 큰 배열과 함께 복사하지 않는다.
crypto 제공이 없는 host는 명확한 오류를 반환하며 시각·Math.random·row hash로 대체하지 않는다.
같은 저장 program의 reload는 namespace를 보존한다. 별도 저작 실행 간 byte-identical snapshot은 약속하지 않으며 그래픽 수치는 같다.

rowMap은 입력 편의용 position이며 즉시 source row key로 해석한다. 저장된 선택·lineage의 정체성으로 index를 남기지 않는다.
기존 `materializationConfigs.data`의 logical **편집 owner→현재 snapshot binding**은 유지한다.
새 logicalId는 행 계보 namespace이고 binding의 current snapshot을 중복 저장하지 않는다.

## 최종 grain과 lineage

derived dataset에도 stable logicalId와 rowKeys를 주되, key 계산은 transform의 의미를 따른다.
기여 행은 dataset별 `lineage: { entries: InputRowRef[][], rowRefs: number[] }`에 공유한다.
`InputRowRef = { data, logicalDataId, revision, rowKey, role }`이며 data는 정확한 저장 snapshot id다.
각 rowRefs는 그 dataset의 entries index이고 범위·cycle·참조 존재를 검사한다. 기여 행의 생략/summary count 대체는 허용하지 않는다.
추가 revision branch가 같은 정수를 쓸 수 있으므로 refs는 반드시 data와 logicalDataId까지 함께 검사한다.
runtime inverse lookup은 WeakMap cache이고 snapshot에는 넣지 않는다.

| 계산 | 결과 key와 기여 행 |
|---|---|
| filter/sort/computed/timeUnit/window/normalize | surviving input row key; 입력 role 보존 |
| fold | sourceKey + output field role |
| flatten | sourceKey + stable element key; key 없는 array의 교체는 새 element namespace. 단순 index로 교체 전후를 연결하지 않음 |
| summary/aggregate | typed grouping tuple + measure role; 정확한 기여 행 집합 |
| bin/bin2d | resolved 경계 tuple + grouping; 경계 변경은 다른 item |
| stack | input/final cell identity 유지; endpoint는 속성 |
| lookup | 현재 row-preserving API 유지, left와 실제 right 기여를 각각 기록. 향후 fan-out은 leftKey/rightKey |
| density/regression/interval/box/ECDF 등 통계 | 그룹 + 명시 output role + sample/grid 위치의 의미; 모든 실제 기여 행 |
| line/area | series key와 ordered member keys 분리. topology 변경 시 path morph 대신 crossfade |
| facet/concat | logical row identity 보존; childPath 변화는 기본 enter/exit |

정확한 통계별 adapter는 기존 transform registry 전체를 열거한 coverage 시험으로 누락을 거부한다.
STEP-005가 기존 final-grain resolver·field schema lineage와 결합한다. field lineage는 열의 의미이며 row lineage와 별개다.
지원되지 않은 provenance를 값 hash로 채우지 않는다. extension transform은 명시 lineage 제공 또는 structured unsupported 오류다.

semantic item key는 `[childPath, ownerId, role, finalGrainKey]`; finalGrainKey에 논리 데이터 namespace를 포함한다.
graphic primitive의 item metadata에 이 key와 lineage ref를 materializer가 저장한다. renderer는 graphicSpec만 읽는다.
그래픽 child의 identity는 item key+primitive role로 정하고 array index를 사용하지 않는다.
기존 mark ID와 사용자 target API는 유지한다. private child ID가 포함된 golden 변경은 의미·수치 검증 후에만 반영한다.
현재 scene return shape(SVG version 1 / Canvas version 2)는 유지하고 opaque key/topology 생성만 교체한다.
기존 scene drawing reader는 그대로다. 새 필드를 추가해야 하면 별도 version 결정을 다시 검토한다.

## 선택과 resource 저장

기존 `selectMarks`, `editMarkSelection`, `removeMarkSelection`, `highlightMarks` 이름과 현재 인자 유지.
row indices 입력은 저장 시 row key 집합으로 바꾼다. field/channel/property predicate는 현재처럼 동적으로 평가한다.
predicate를 호출 시점의 선택 목록으로 고정하지 않는다. 삭제된 key는 논리 선택에 남고 현재 표시 membership은 비어 있을 수 있다.
key가 재등장하면 다시 선택된다. 무관한 새 행으로 선택을 이동하지 않는다.

```ts
type InputRef =
  | { kind: 'data'; id: string; logicalId: string; revision: number }
  | { kind: ResourceKind; id: string; revision: number };
type Resource = {
  kind: ResourceKind; id: string; revision: number; algorithmVersion: string;
  ownership: { mode: 'authored' } | { mode: 'generated'; owner: InputRef };
  inputs: InputRef[]; options: SerializableValue; result: SerializableValue;
  provenance: { origin: 'authored' | 'observed' | 'inferred'; sourceRows?: LineageRef[] };
};
```

ResourceKind의 계획 union은 hierarchy/graph/layout/edge-route/geometry/projection/image/font/pattern/parameter/persistent-selection/annotation.
기존 data/layer/scale/coordinate/guide 배열은 이동하지 않는다. 신규 배열은 `semanticSpec.resources` 한 곳이다.
kind+id가 고유하며 ref는 현재 program 안의 정확한 revision과 일치해야 한다. 순서상 첫 후보나 저장된 latest 포인터를 쓰지 않는다.
public 옵션은 data/hierarchy/graph/layout/route 등 역할 ID이고 selector가 typed ref로 resolve한다.
각 kind의 options/result는 그 domain의 closed validator가 소유한다. 아직 구현되지 않은 kind의 임의 payload를 허용하지 않는다.
STEP-007–009에서는 persistent-selection을 실제 소비자로 연결하고, 후속 kind는 각 카드에서 validator와 domain action을 함께 등록한다.

persistent-selection의 options는 `{ mode: 'predicate', predicate }` 또는
`{ mode: 'row-keys', logicalDataId, rowKeys }`다. result는 `{}`이며 현재 membership은 derived 값이다.
materializationConfigs.selections에는 target, grain/projection, resource ref, composite sourceSelection 관계만 둔다.
predicate/key 중복 저장은 제거한다. highlight 스타일은 기존 config에 남긴다.

create는 중복 ID, edit는 missing/빈 patch 오류. prepared result는 replace lifecycle을 사용한다.
remove는 restrict 기본; cascade는 명시 소유된 generated closure와 consumer를 사전 계산한다.
다른 authored resource에 의존하면 cascade도 오류다. 사용자가 그 consumer를 먼저 제거/재연결해야 한다.
기존 removeMarkSelection의 highlight 동반 제거와 label-dependent 거부는 현재의 명시적 예외를 유지한다.
기존 removeData 등의 옵션을 자동으로 넓히지 않는다. 새 family의 domain remove 액션이 cascade 옵션을 소유한다.
generic public createResource/editResource나 직접 state patch API는 만들지 않는다.

수정은 immutable 새 revision을 만들고 live inputs와 consumer refs를 한 transaction에서 rebind한다.
resource dependency DAG의 계산 뒤 기존 scales→marks→guides→layout→highlights 계획을 명시 호출한다.
node 위치 편집은 route/hit/scene만, feature 편집은 inference부터 다시 계산한다. parent composition까지 영향을 닫는다.
prepared result의 sourceRevisionVector와 inputHash를 적용 시 확인한다. stale 결과·cycle·budget·consumer 실패는 전체 거부한다.
buffer는 복사한 plain scalar array로 정규화하고 detached/공유 mutable view를 저장하지 않는다.

## Schema 4와 이전 입력

새 writer는 editable version 4, tagged shared-array encoding은 현재 version 3 의미를 재사용한다.
1/2/3은 **각 원래 validator로 먼저 검증**한 뒤 1의 dataset schema migration → identity/lineage → selection resource로 진행한다.
복원은 저장 graphics를 그대로 채택하며 action replay나 숨은 rematerialization을 하지 않는다.
이전 malformed reference/선택/불일치 derived data를 migration이 고쳐서 수락하면 실패다.

old schema는 명시 row key 선언이 없으므로 id라는 열을 자동 key로 추정하지 않는다.
각 저장 source의 행 순서대로 generated key를 배정하고 stored selector index를 그 key로 치환한다.
같은 old snapshot을 별도 프로세스에서 읽어도 같은 namespace를 얻도록 **원본 envelope의 canonical bytes digest + childPath + dataset id**를 migration namespace로 사용한다.
이는 같은 저장 문서를 식별하는 일회성 namespace이며 행 내용의 유사성으로 다른 snapshot을 연결하는 정책이 아니다.
이후 schema 4는 저장된 namespace를 읽는다. old snapshot끼리 데이터 revision 관계가 입증되지 않으면 별개 lineage로 둔다.
sourceRevision 추적이 없는 옛 행을 자동으로 재연결한다고 주장하지 않는다.
named derived owner·source DAG·rowProvenance가 증명하는 대응만 전파하고 ambiguous unknown transform은 명시 오류다.

| 고정 입력 | 승인 후 migration의 필수 결과 |
|---|---|
| selection-v1 | schema 추론 후 rows 0/1에 token, picked는 b의 token; graphics 동일 |
| selection-v2 | 기존 schema 보존, 위와 같은 선택; missing schema 거부 |
| selection-v3 | shared arrays의 alias 보존, undefined/NaN/-0/bigint 보존; picked=b |
| 각 입력의 index=2 / missing data / missing target | migration 전 거부 |
| filter/sort/fold/aggregate/lookup + retained composition | 실제 증명 가능한 lineage만 복원, child scope 분리; 승인 후 추가 fixture 필수 |

[고정 입력](../../../../test/fixtures/persistence/legacy-selection/manifest.json)은 0.0.26의 실제 writer 출력 및
그 codec로 만든 v1/v2 형식이다. 옛 npm 버전에서 수집한 archive라고 주장하지 않는다.
[생성 source](fixture-source.mjs)는 **입력만** 생성하며 expected는 독립 literal assertion이다.
[호환성 시험](../../../../test/unit/persistence/legacy-selection.test.js)은 현재 reader의 restore/edit/remove/fresh-process를 검증했다.
schema 4 migration은 아직 구현·실행하지 않았고 위 표의 후속 closure가 남는다.

graphic-only envelope는 version 1 유지. renderer가 읽을 새 metadata에는 concrete schema 검증을 추가하되
editable provenance가 없는 graphic-only 상태를 저작 program으로 복원하지 않는다.

## 진단·경계·완료 조건

기존 invalid-value/missing-resource/ambiguous-resource/incompatible-resource/resource-in-use/resource-limit 등을 유지한다.
신규 duplicate-id/ambiguous-identity/cyclic-dependency/stale-result만 필요한 지점에 추가한다.
원안의 unknown-resource/wrong-resource-kind/budget-exceeded는 각각 기존 missing-resource/incompatible-resource/resource-limit에 대응한다.
ErrorDetails에 optional ownerId, expected, dependencies를 추가한다. 기존 actual은 number를 유지하고 row/key 원문은 오류에 복사하지 않는다.
후속 layout/asset 전용 code는 해당 단계가 소유한다.

Full/Basic의 createData 둘 다 key 생성과 저장을 지원한다. reviseData 및 편집은 현재처럼 Full 전용이다.
public signature는 types/program.d.ts와 entry declaration에 동기화하고 current CORE/SELECTION·persistence/inspection/scene 문서를 갱신한다.
source/semantic/graphic metadata 도입 시 SECOND_ARCHITECTURE의 실제 ownership을 갱신한다.
이번 검토에는 현재 runtime/API/exports/package budget 변경이 없다.

승인 후 각 카드가 독립 oracle actual 비교, atomic failure, frozen input, reload/edit/remove,
명시 참조 preflight, 타입·현재 계약·generated docs·package consumer를 구현한다.
Phase 종료에는 일반/browser/render/package/docs 검사와 네 renderer의 geometry/selection metadata 정합성을 실행한다.
AT-06–10 및 후행 hit/animation 통합은 해당 closure 카드까지 열린 의무다.
