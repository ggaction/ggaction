# Animation 원 용량·실제 반복 비용 검토안

## 진행 상태

- [x] 원 point100000·partition10000의 입력·전수 geometry·현행 guard·codec 실측
- [x] 반복 scale 저장과 partition 그룹 비교 비용 분리
- [x] 실제 concrete graphic을 복원하는 lossless column 후보 검산
- [x] 구체 API·closed schema·restore·batch·rebase·호환안 작성
- [x] root의 기존 remainingApproval 범위 정합 검토 및 구체안 채택
- [x] private lossless codec·scoped 자원 검증과 원 fixture 전수 checkpoint
- [x] 공개 v4/options·원 point100000/partition10000·동일 archive3Node 소형 checkpoint
- [ ] 원 SLO/P95/retained heap 및 전체 통합 qualification

2026-11-02 채택 후 단계 구현의 현재 private fixed quotas·권한 경계·원100k 제품 receipt는
[private codec 기록](animation-codec-private.md)에 있다. 아래는 최초 검토안이며 당시10M logical
제안과 진단 실행을 현재 공개 지원으로 해석하지 않는다. 후속 [공개v4/options checkpoint](animation-v4.md)는
별도의 원 fixture·소형·같은 archive3Node 검증을 기록하며 성능 미완료 의무를 보존한다.

기준 `def731fe2`와 partition 동일성 비용만 수정한 `4e399b325`.
이 자료는 [remainingApproval](../AUTHORIZATION.json#remainingApproval)의 이미 승인된
원 point1k/10k/100k·partition100/1k/10k 지원을 구체화한다. 새 사용자 질문은 없다.
Root가 채택하기 전 capacity/schema 제품 구현은 하지 않는다. 아래 version4와
압축 표현은 **제안**이며 Current 지원이 아니다. 정확한 구현 소유권은
[현재 architecture](../../../SECOND_ARCHITECTURE.md)에 따른다.

## 현재 제품 경계와 실제 결과

원 fixture를 줄이거나 sample/drop하지 않았다. 진단은 esbuild `onLoad`에서
`Animation ...`, `Partition animation ...`, `Native partition animation nodes` label에만
200002 nodes/200M work의 임시 ceiling을 적용했다. 저장소 제품 source의
전역 generated10000/work10M·codec64MiB/depth128/values1M은 수정하지 않았다.
이 ceiling은 측정을 위한 우회이며 제품 구현안이 아니다.

| 원 입력 | 현재 제품 첫 거부 | 진단 endpoint 합 / output | 진단 준비 / sample | 현행 raw transport |
| --- | --- | --- | --- | --- |
| point100000 | preparation work >10M | 200002 / 100001 | 151150ms / 112715ms | 142546785B, decoded7600057 / encoded24000213 |
| partition10000 | guide endpoint >10000 | 20002 / 10001 | 116959ms / 1104ms | 18341824B, decoded720136 / encoded2320474 |

[point100k 원 결과](animation-capacity-evidence/points-100000.json),
[partition10k 원 결과](animation-capacity-evidence/partition-10000.json).
Node22 단발 진단이고 병렬 작업이 있었으므로 P95·엔진 간 비교나 SLO 증거가 아니다.
10k point는 별도 root 진단에서 preparation7773686, endpoint20002/output10001,
raw plan14227165B였다. 기본 endpoint합 guard 때문에 일반적으로 동일 장면의
5000개 항목부터 background를 포함한 합10002로 거부된다.

point100k는 모든100000 raw row의 중간 x/y와 typed cartesian-point 결정을 검산했다.
양 끝은 원 graphicSpec 객체를 그대로 반환했다. preparation work78333686,
scale400000 occurrences/400000 objects에 실제 정의는3개였다.
준비 normalize400000/prepare200000이며 중간 sample은 normalize0/prepare0,
sample200000/proofHit200000이다. 즉 root의 exact-owned position proof가 작동해도
큰 비용이 남는다. 그 proof나 수식을 복제하지 않는다.

sample 후 heapUsed 약1.84GB, 전송 측정 후 약2.05GB였다. 첫 진단의 sampled rebase는
최소22분01초 관측 후에도 CPU-bound여서 root 지시에 따라 중단했다.
[중단 기록](animation-capacity-evidence/interruption.json),
[초기 OS sample](animation-capacity-evidence/native-sample.txt.gz),
[후기 OS sample](animation-capacity-evidence/native-sample-late.txt.gz)을 보존했다.
후기 메인723/723 표본이 WeakSet.add/WeakCollectionSet/rehash였지만 JIT 심볼이 없어
JS source owner를 특정하지 않는다. 이 결과만으로 row lookup 등 원인을 단정하거나
제품을 수리하지 않는다. Node22/Chromium/Node24의 native 대형 state 비용을 각각
측정하고 정확한 source owner를 찾는 후행 성능 의무가 남는다.

partition은 독립 `Partition animation track work`16950544도10M을 넘는다.
준비 pair의 immutable 그룹 동일성만 재사용하는 [별도 checkpoint](partition-equality.md)는
원 guard 부과량을 바꾸지 않고 준비를 약3799ms로 줄였다. 이 최적화로
partition10k capacity나 SLO가 해결됐다고 주장하지 않는다.

## 제안하는 명시 API와 native admission

```js
planTransition({ from, to, options: {
  durationMs: 100, easing: "linear",
  maxEndpointNodes: 200002,
  maxOutputNodes: 100001
}});
```

- `TransitionOptions`에 flat 두 옵션만 추가한다. 각각 safe integer
  `1..200002`, `1..100001`이다. 생략은 각각 기존10000이며 명시undefined는 거부한다.
  한 옵션의 생략으로 다른 옵션을 자동 승격하지 않는다. point의 maxItems는
  animation 한도에 자동 전달하지 않는다. 정확히 두 endpoint의 실제 scene 합과
  각 endpoint 및 모든 sampled output을 검산한다. background, guides, labels,
  clips에 따른 출력과 weighted source를 제외하지 않는다.
- 두 옵션 모두 생략하면 version3와 기존 모든 한도·실패 순서를 보존한다.
  하나라도 명시하면 version4의 명시 limits를 사용한다. 낮은 명시값도 동일하게 검산한다.
- high count는 native ChartProgram의 resource-aware owner가 증명한 point100000 또는
  native partition10000에만 적용한다. point owner config/raw/items, retained-child scope,
  identity/lineage/row membership를 전수 검산한다. config·owner·type·namespace를 위조한
  primitive나 다른 family가 이 옵션만으로 권한을 얻지 않는다. 일반 generated guard와
  다른 family10000, path/weighted-source64/frame count10000 한도는 그대로다.
- native exact-owned 인증과 외부 restore의 모든 검사를 같은 정책 owner로 모은다.
  caller input의 freeze/직렬화 key/hash는 인증이 아니다. authentic sampled frame은
  이미 전수 검증한 현재 concrete/meaning의 flat private proof를 통해 admission을 받는다.
  포인터가 같은 immutable scale·partition group의 검증 재사용만 허용하고 새 객체나
  caller-owned 객체는 전수 검사한다. native endpoint 객체 반환 정책은 그대로다.

## 전역10M 보존과 실제 비용 정책

숫자 guard만 높이면 point78M work와 partition16.95M work가 남는다. 현재 preparation의
일반 재귀 walk는 같은 긴 identity 문자열과 scale 객체를 반복 계산한다. 다음은
명시 resource-aware v4 경계에 한정한 **work 회계 변경 제안**이다.

1. 일반 literal/legacy v3 경계의 현재 `budget` 및 전역10M은 그대로 둔다.
2. v4의 알려진 closed column 형식은 각 물리 cell·배열 길이·field descriptor·identity·
   raw value·scale·출력 node를 한 번씩 검산하며 cell 방문 한 번당1 work를 부과한다.
   scale definition과 같은 immutable group의 실제 전수 검증은 정확히 한 번 부과한다.
   문자열 byte는 기존64MiB envelope 검사로 따로 제한하며, 이미 검증한 identity/scale
   문자열을 거대한 재귀 객체로 다시 펼쳐 재부과하지 않는다. 개별 identity와 namespace,
   family별 실제 의미 검사는 생략하지 않는다.
3. column의 **물리 count**만 보고 expansion을 허용하지 않는다. 복원 전 실제
   logical array/node 수와 각 materialized value occurrence의 합도10M work 안인지
   미리 계산하고 `validateWorkLimit`로 거부한다. literal fallback은 현행 재귀 work를 쓴다.
   압축을 통해 작은 DAG가 무제한 출력으로 확장되는 경로를 만들지 않는다.
4. partition의 현재 *4 계수를 이유 없이 낮추지 않는다. 같은 group의 normalization,
   topology/key/row 검증, geometry 준비를 authentic immutable 한 그룹당 한 번 수행한
   실제 operation 목록을 계측한 뒤 그 방문량을 기존10M guard에 부과한다. 복원된 새
   group은 최초 한 번 전수 검사한다. 의미 검사를 지우거나 중복 계수만 제거하지 않는다.

이 정책은 아직 제품에서 계측하지 않았다. 원100k/10k가10M 아래에서 모두 검산되는
receipt가 나와야 지원으로 승격한다. 부족하면 임의 전역 상향 대신 원인과 추가 구체안을
root에 제시한다. work 한도는 event-loop50ms나 full-frame50ms를 보장하지 않으며
151초/113초 native 비용, 약2GB 준비 상태와22분 rebase는 별도 미해결이다.

## version4와 closed lossless column 표현

기존 `animation` envelope schemaVersion1과 tagged value codec·digest·64MiB/depth128/
encoded 및 decoded 각각1M occurrence 검사는 그대로 둔다. payload의 plan만 아래
closed v4로 구별하며 v3 import/export/restore를 그대로 지원한다. 기존 position@1,
appearance/partition 등 수학 kernel version은 유지하고 transition discriminator만4다.

```ts
Plan4 = {
  kind: "transition-plan"; version: 4;
  limits: { maxEndpointNodes: number; maxOutputNodes: number };
  kernels: CurrentKernelVersionsWithTransition4;
  durationMs: number; easing: ExistingEasing;
  from: Node; to: Node;
  vectors: ExistingCodecDenseArray[];
  timeline?: Node;
};
Node = { literal: ExistingCodecValue }
     | { object: [string, Node][] }
     | { array: Node[] }
     | { records: {
         length: number;
         shapes: string[][];
         shape: ConstantOrVector;
         columns: [string, Column][];
       } };
Column = ConstantOrVector | { node: Node };
ConstantOrVector = { constant: ExistingCodecValue } | { vector: number };
```

각 union은 한 개의 own field만 허용한다. 모든 object는 unknown/누락/중복 field를
거부한다. `vectors`는 codec plain dense array만 담고 Node/ref를 해석하지 않는다.
ref는 safe integer이며 같은 plan vectors 범위 안이어야 한다. 뒤쪽 ref도 순환을
만들 수 없는 literal vector 참조일 뿐이며 다른 plan/state에 대한 참조는 없다.

`object` entry는 원 own key의 정확한 순서를 보존하고 중복 key를 거부한다.
`array`는 dense array만 표현한다. sparse/특수 값은 literal로 보존한다.
`records`는 dense plain-object 배열용이다. length는 실제 logical item 수,
shapes는 각 row의 정확한 key 순서 목록이다. shape는 각 row의 shape index를
보관하며 constant 또는 길이length의 vector여야 한다. columns는 shape들의 field
합집합과 정확히 일치해야 하고 field 중복을 거부한다. 각 column은 constant,
길이length vector, 또는 길이length 배열을 복원하는 nested Node다. shape에 없는
field는 absent이며 shape에 있으면서 값이undefined인 경우와 구별된다.

모든 배열·column 길이와 ref, 중첩 depth, shape index·논리 expansion·실제 node 수를
할당 전 검산한다. count 감소나 짧은 vector로 item을 잘라 맞추지 않는다. columns는
전체 값 vector 참조만 지원하고 범위 slice/암묵 fill/반올림은 없다. intern은 같은
이미 검증한 immutable 참조 또는 값의 정확한 비교로만 한다. hash만 같다고 합치지 않는다.
`__proto__` 같은 own key도 기존 codec의 안전한 property 정의 경계를 유지한다.

### 실제 graphical 값이 권위다

from/to Node의 복원 결과는 **현재 v3 export endpoint와 정확히 같은 구조**다.
Native endpoint는 실제 `graphicSpec`과 현재 명시 positions/family state를 담는다.
Sampled endpoint는 실제 scene/identities/backgrounds/view 및 현재 meaning을 담는다.
이를 현재 closed validator와 v4 limits에 전달하며 data action/solver/compiler를 실행하지
않는다. x/y/raw/scales로 graphic을 다시 만드는 방법은 허용하지 않는다.

실제 graphic item의 ID, type, properties, optional style/paint/clip/clips/offset,
객체 order와 children, 모든 typed identity와 namespace 및 lineage의 logicalId/revision/
rowKeys/resource/screen 구별을 원 값대로 압축한다. 스타일 필드나 rowKeys 구조가
항목마다 다르면 shape/column/nested-record 또는 literal로 그대로 보관한다.
임의 graphic 편집 때문에 semantic raw value와 실제 pixel이 다르면 현재의
`edited-position` fallback을 보존한다. 원 raw value를 actualgraphic에서 역산하지 않는다.

literal fallback까지 넣은 전체 payload가64MiB/1M 또는 expansion10M을 넘으면
명확한 resource-limit로 거부한다. 고유 긴 문자열/복잡한 paint/임의 clips100k가
무조건 들어간다고 약속하지 않는다. 원 benchmark의100k는 그대로 지원 검산 대상이며
일반 편집을 조용히 단순화하거나 누락해 이 대상으로 맞추지 않는다.

### 원100k 후보의 검증 범위

[prototype](animation-capacity-evidence/point-columns.mjs)은 실제 native graphic의
source/target200000 items 전체를 column에서 복원해 원 graphicSpec과 deepEqual했다.
원 raw x/y와 모든 scale의 forward mapping400000개도 별도로 검산했다.
8개 vector×100000 cells, payload37398625B/envelope37399666B,
decoded800158/encoded800510으로 **현재 codec 그대로** 왕복했다.
[receipt](animation-capacity-evidence/point-columns-100000.json).

이 prototype는 일정한 item/properties shape의 point fixture만 구현했고 kernel map,
일반 optional columns, sampled scene/view, 모든 family state를 갖춘 완전한 Plan4
roundtrip이 아니다. 현행 restoreTransitionPlan이 이 candidate를 지원한다고 주장하지
않는다. 위 closed schema는 그 제약을 명확한 일반 lossless fallback으로 완성하는
제안이다. 추가 field의 실제 물리 count까지 전체 원100k codec receipt를 새로 받아야 한다.
후보 decode 후에도 약1.2GB resident이므로 byte 압축이 runtime 메모리 해결은 아니다.

## sample/rebase·history·batch 정책

- position raw value와 정규화한 전체 scale(type/domain/range/clamp와 base/exponent/
  constant 포함)은 graphics와 독립적으로 정확히 유지한다. numeric 계산은 기존
  positions kernel owner를 재사용한다. 구간/비선형/log 부호/축 방향/opaque edited fallback을
  새 interpolation formula로 바꾸지 않는다. 같은 scale 정의는 준비 한 번, 값 검산은
  모든 row에 수행하며 proof는 정확한 immutable 결과에만 붙인다.
- sample output에는 현재 실제 graphic/scene과 현재 raw meaning·scale·identity/lineage의
  flat proof만 남긴다. 이전 plan/frame/controller나 압축 history를 저장하지 않는다.
  반복 중단은 기존 weighted-source flattening64를 유지하고 source를 삭제하지 않는다.
- rebase는 새 request에서 maxEndpointNodes/maxOutputNodes를 다시 명시해야 한다.
  이전 plan의 숫자를 자동 상속하거나 limit 권한을 숨기지 않는다. 생략 시 기존10000으로
  거부할 수 있다. exact sampled endpoint의 graphic 객체와 표시된 현재 좌표를 보존한다.
  offline은 digest와 모든 primitive/semantic-forward/identity 검산 뒤 새 authentic plan을
  준비하되 native 원 ChartProgram이나 실행 권한을 만들어 내지 않는다.
- deserialize v3는 기존 validator/limit 그대로, v4는 closed compact 구조와 limits를 먼저
  검산한다. version/kernels/limits/column count/IDs/lineage/meaning을 위조하면 거부한다.
  v4를 현행 v3 decoder가 읽게 하는 compatibility shim은 만들지 않는다.
- batch frame schedule10000, preflight `times.length * max(1, endpoint합) <=10M`,
  실제 모든 output 합의10M accounting과 atomic failure는 그대로다. 예를 들어
  endpoint200002의 원100k plan은49시점까지 preflight 후보이고50시점은10000100으로
  거부한다. 실제 추가 output/clip 계산이 넘으면49 이하도 원자적으로 거부한다.
  fps/time grid를 줄이거나 frame/node를 drop하지 않는다.

## 채택 후 필수 검증과 완료 조건

1. point1k/10k/100k, partition100/1k/10k 원 benchmark fixture·SHA·SLO를 고정한다.
   장식 포함 실제 endpoint/output, 원 row/모든 item/typed decision·각 좌표·원 value·전체
   scale을 검산하고 모든 graphicSpec 및 native/offline/sample/rebase를 비교한다.
2. default/명시 경계·undefined/부정확 숫자·unknown fields·sum·enter/exit·nested/facet·
   graphic-only/primitive/owner forgery·caller-owned shallow freeze를 검사한다.
3. v3 fixtures 무변경 import와 v4 packed roundtrip, optional style/clips/offset/IDs/lineage/
   mixed shape/literal fallback·missing vs undefined·특수 숫자·악성 ref/length/폭발확장을 검사한다.
   원100k 전체 payload의 encoded와 decoded 각각1M/64MiB 보존을 입증한다.
4. 동일 archive를 source-free Full/Basic/animation 소비자와 supported Node engines에서
   재사용하고 브라우저/render/hit owning 담당과 실제 모든 item의 경계를 검증한다.
5. global10M·다른 family10k·codec64MiB/1M·weighted64·batch atomic 경계와 critical source
   coverage를 유지한다. 대형 원 입력의 engine별 CPU profile·heap·event-loop slice 및
   P95를 따로 기록한다. guard 통과를 animation50ms/hit100k/sync50ms 완료로 세지 않는다.

## 재현

repo root에서 현재 dependency를 설치한 뒤 다음을 실행한다. 제품 source를 수정하지 않으며
출력은 ignored `.artifacts/animation-capacity-audit/`에 쓴다. 원본 receipt는 위 source SHA를
가진 point/native positions 구현에서 얻었다. 이후 source 변경 시 새 source SHA를 함께 기록한다.

```sh
node --max-old-space-size=6144 --expose-gc agent_docs/impl/roadmap9/qualification/animation-capacity-evidence/audit-without-rebase.mjs points 100000
node --max-old-space-size=6144 --expose-gc agent_docs/impl/roadmap9/qualification/animation-capacity-evidence/audit-without-rebase.mjs partition 10000
node --max-old-space-size=6144 agent_docs/impl/roadmap9/qualification/animation-capacity-evidence/point-columns.mjs
```

[원 파일 hashes](animation-capacity-evidence/hashes.json). 제품 지원 완료는 마지막 구현·검증
체크박스가 충족된 뒤에만 기록한다.
