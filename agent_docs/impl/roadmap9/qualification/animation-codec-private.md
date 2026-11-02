# Animation private lossless codec 및 scoped 자원 검증

## 상태와 승인 근거

- 2026-11-02 root가 [remainingApproval](../AUTHORIZATION.json)의 기존 전체 승인 범위로
  아래 fixed quotas와 private proof 연결을 채택했다. 공개 options/plan4는 별도 checkpoint다.
- 현재 공개 entry와 선언은 그대로이며 모두 생략한 기본 경로는 기존 version3다.
  이 문서의 private `scoped-transition` version1은 공개 plan4 스키마가 아니다.
- 원 100000 native/offline/sample/rebase 제품 경로가 모두 전수 검산을 통과했다.
  원 point100000·partition10000의 최종 직렬 receipt와 기존 capacity/renderer 회귀도 통과했다.
  owning·critical coverage·동일 archive 3Node 소비자 검증을 아래 검증 표에 고정한다.
- [초기 capacity 제안](animation-capacity.md)과 [중단·재개 기록](animation-codec-resume.md)의
  과거 진단 및 당시 미해결 경계는 역사다. 채택된 현재 private 정책은 이 문서가 소유한다.

## 서로 다른 work 단위와 고정 상계

Canonical planner work는 값 방문마다1, 문자열 UTF-16 길이, 모든 own key의 UTF-16 길이를
합산한다. 배열 index의 문자열 길이도 포함한다. 기존 `MAX_WORK_ITEMS=10000000`과 이 수학은
바꾸지 않는다. Column의 expandedValues는 반복 참조를 포함한 복원 값의 발생 수이며 key나
문자열 길이를 세지 않는다. 처음 WIP에 둔 column logical10M은 이 새 표현의 자체 경계였고
기존 planner10M과 같은 계약이 아니었다.

명시 node 한도를 가진 authentic private scope만 다음 fixed 상계를 선택한다.

| 자원 | 상계 | 적용 경계 |
| --- | ---: | --- |
| preparedTraversalWork | 140000000 | planner 준비·strict restore, partition track 준비의 기존 charge |
| expandedValues | 12000000 | 복원될 모든 값 발생 수, 반복 constant/ref 포함 |
| descriptors | 16000000 | column 준비·독립 검산 descriptor 방문 |
| cells | 16000000 | column 준비·독립 검산 field/selection cell 방문 |
| physical decoded / encoded values | 각각1000000 | 기존 envelope walk |
| JSON UTF-8 bytes | 67108864 | tag/escape 포함 encode 전 및 decode 전 검사 |
| depth | 128 | 기존 envelope 및 column 구조 |

원 native raw plan의 canonical work는97911711, sampled rebase는133456501이다.
128000000은 실제 rebase를 수용하지 못한다. 140000000은 기존10M 단위의 정수 배수 중 이
실측을 포함하는 최소값이다. 문자열은 공짜가 아니며 private 준비에서도 serialize 전에
독립 envelope byte/physical walk를 실행한다. 모든 constant 곱·run count 합·ref length와
logical expansion은 복원 output/rank 배열 할당 전에 검사한다. 기존 literal subtree는10M
회계를 유지한다. 임의 string/descriptor/cell payload가 fixed 경계를 넘으면 거부한다.

Partition track의 기존 group work×4 charge도 바꾸지 않았다. Identity, geometry/path,
native sample, partition frame, timeline, batch의 기존10M은 그대로다. Batch weighted64와
frame work 제한도 그대로다. 원100k에50개 frame을 요청하면 기존 export work guard가 거부한다.

## 정확한 private closed format

Root는 정확히 `{kind:"animation-columns",version:1,root,vectors}`다. Vectors는 dense scalar
배열의 dense 배열이다. Scalar는 기존 value codec의 undefined/BigInt/nonfinite/-0까지
원타입을 보존한다. Native encoder의 vector 재사용은 length/첫값/끝값 bucket 후보의 모든
cell을 Object.is로 검산한다. Bucket만으로 값을 같다고 취급하지 않는다.

2026-11-02 root는 같은 remainingApproval로 JSON intern key 전체를 없애는 수리를 채택했다.
Shape는 private 종류 marker·array length·원순서 key 전체·각 discriminator의 존재와 scalar를
정확 primitive Map trie로 한 번씩 방문한다. 문자열의 실제 값 동등성을 Map이 검증하며
SameValueZero에서 Object.is와 다른 -0는 private Symbol로 구별한다. NaN/undefined/키순서와
상이한 discriminator도 구별한다. 이 marker/trie는 wire나 plan에 저장하지 않는다.

Intern probe/전수 비교에는 별도 work counter가 있다. 값 방문1+문자열 UTF-16 길이를 실제
방문마다 합산하고 private explicit scope의140M/default10M에서 검사한다. 원 planner counter와
charge는 그대로다. Map/bucket metadata도 생성 전에 기존 physical1M 상계를 검사한다.
새 unique vector 및 실제 저장 shape만 각 envelope physical/encoded/bytes 합의 lower bound에
넣어 다음 retain 전에1M/64MiB를 검사한다. Discriminator는 wire에 별도 저장하지 않으므로 이
바이트 합에 넣지 않는다. Duplicate는 합에 다시 넣지 않아 유효 압축 입력을 오거부하지 않는다.
전체 compact는 이후 독립 byte/physical/depth/logical 검산을 다시 통과해야 한다.

400000개 NUL 문자열을 가진16개 unique vector의 누적64MiB 초과, 같은 문자열의16개 duplicate
field가 유효한 반례, 충돌 vector·NaN/-0·키순서·상이한 discriminator, 정확10M/default와
explicit140M 분리 회귀를 둔다. 상속된 hole/keys/array/from/items/work getter는 읽지 않으며
scope work counter도 own Map으로 발급한다. Wide shape의 membership Set은 검산한 key 집합을
한 번만 만든다. 원5000개 field·순서·값·descriptor5000/cell5001 회귀가 이를 검증한다.

Node는 정확히 한 variant만 갖는다.

- `{literal:value}`: 기존 literal codec으로 무손실 보존한다.
- `{object:[[key,node],...]}`: unique key와 원 key 순서를 보존한다.
- `{array:[node,...]}`: dense node 배열이다.
- `{records:{length,shapes,shape,columns}}`: row shape별 dense columns다.

Shape는 `{keys:[...]}`, array row의 `{length,keys:[...]}`, `{literal:null|undefined}` 또는
`{hole:true}`다. Array shape의 keys는 length 안의 canonical index만 허용한다. Row shape
selection은 constant/vector/runs의 정수 shape index이며 각 shape의 실제 빈도를 검산한다.
Columns는 `[shapeIndex,[[field,column],...]]`이고 각 shape field와 정확히 일치해야 한다.
같은 key 목록이라도 concrete type/kind/reason의 값에 따라 다른 column group을 가질 수 있다.
이는 값 생략이나 의미 추론이 아니며 원 field를 그대로 저장한다.

Column은 `{constant:value}`, `{vector:index}`, `{runs:[[count,scalar],...]}` 또는
`{node:node}` 중 하나다. Runs는 양의 safe integer count의 정확 합이 해당 shape row 수와
같아야 한다. Nested node는 정확히 그 row 수인 array를 복원해야 한다. Unknown/extra field,
중복 field, 누락 column, 범위 밖 ref/shape, 길이 불일치, overflow는 거부한다.

Absent property, own undefined, actual hole, null, key 순서, 배열 길이를 구별한다. 지원하지
않는 sparse/mixed 구성은 기존 literal fallback으로 보존한다. Literal fallback이 적용 owner의
기존 dense 검증을 우회하지 않는다. 원 좌표·style·clip·ID·identity·meaning·scale·family와
timeline 값을 저장하며 graphic에서 값을 역추정하거나 semantic compiler를 실행하지 않는다.

## 출처와 권한 경계

`animation/resources.js`가 opaque WeakMap scope를 소유한다. Native 입장은 exact ChartProgram과
retained child의 closed state를 검증하며 shared graphic-capacity selector로 실제 items 및 point
raw rows를 함께 확인한다. Point만 기존 owner maxItems에 따라 최대100000을 허용한다. 다른
family의 실제 collection owner 한도10000은 보존한다. Endpoint 합과 출력의 명시 한도는 별도로
검사하며 서로 다른 owner가 장식을 포함해 총10000을 넘는 혼합 scene을 불필요하게 막지 않는다.

Authentic sample은 기존 canonical frame provenance만 전달한다. Rebase는 그 현재 native owner
집합을 다시 검증하고 명시 한도를 새로 받아 scope를 만든다. 별도 frame scope나 이전 scope를
저장하지 않아 과거 target program이 누적되지 않는다. 서로 다른100개 target으로 반복 rebase한
회귀가 현재 owner만 row 권한을 갖고 최초 source/target은 거부됨을 검증한다. Caller shallow
freeze·복사·JSON은 이 권한을 만들지 못한다.

Offline은 동일 closed descriptor/length/ref/bytes/expansion을 모두 검산한 다음 기존 strict
endpoint/typed meaning/actual graphic·forward geometry validator를 통과해야 authentic plan이
된다. Offline resource token은 원 native program/source의 권한을 복원하지 않으며 accounting의
native=false를 유지한다. Typed point identity의 지원 grain과 owner별 개수는 검산하지만 저장된
animation state를 native authoring program으로 승격하지 않는다.

## 원100k 제품 경로 receipt

[Raw receipt](animation-codec-evidence/product-100000.json),
[실행 log](animation-codec-evidence/product-100000.log),
[실행 script 원문](animation-codec-evidence/raw-product-100000.mjs.txt),
[증거 SHA256](animation-codec-evidence/hashes.json)에 원 결과를 보존한다.
원 fixture SHA256은 b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f다.
Node24.22.1, instrumentation/임시 label/index 우회0, 제품 모듈 직접 호출이다.

| 항목 | Native | Sampled rebase |
| --- | ---: | ---: |
| full raw canonical work | 97911711 | 133456501 |
| logical expansion | 7600057 | 10100086 |
| preparation descriptor / cell visits | 7600056 / 7600004 | 11500070 / 11500023 |
| decoded / encoded physical values | 604540 / 608452 | 804915 / 809470 |
| column JSON bytes | 33703134 | 41204291 |
| 전체 private envelope bytes | 33703431 | 41204588 |
| native 준비 또는 rebase ms | 23055.5 | 44498.2 |
| offline 복원·sample·전수 비교 ms | 47401.0 | 136050.7 |

Native sample2788.8ms, 원100000 좌표와 cartesian-point decision 전수, rebase의100000 좌표,
native/offline frame 전체 deepEqual, rebase t=0의 exact frame identity를 검증했다.

이 첫 실행은 heap 상한6GiB에서 네 plan 참조를 동시에 보유했다. 최종 heapUsed3635867824B,
RSS3399499776B이며 장비 swap 압박이 있었다. 기능 진단이며 retained heap/P95/SLO 통과가
아니다. 다음 대형 검증은 full 입력·oracle·phase 의무를 그대로 두고 별도 함수 scope에서 계획
참조를 단계별 해제한 뒤 직렬로 한 번씩 실행한다. Heap 상한을 더 높이지 않는다. Node22의
151초/113초·22분 rebase 중단 자료와 엔진 차이도 보존하며 전체 성능 의무는 남아 있다.


## 감사 후 최종 직렬 제품 경로

첫 네 plan 동시 보유 receipt는 위에 그대로 보존한다. 이후 `Object.prototype` optional getter,
누적 intern JSON key, wide shape membership 및 과거 frame scope 소유자 누적을 감사·수리했다.
최종 [point100000 receipt](animation-codec-evidence/product-100000-phased.json)와
[partition10000 receipt](animation-codec-evidence/product-partition-10000-phased.json)는 각각
별도 함수 scope에서 계획 참조를 해제한 Node24.22.1 실행이다. 두 receipt의 `sourceSHA256`
11개가 byte-identical이다. 원 fixture/행/ID/state/scale/수학·oracle 의무를 줄이지 않았고,
임시 label/index 우회와 instrumentation 없이 실제 제품 모듈을 호출했다. Heap 상한6GiB는
증가시키지 않았다. Pre-audit 단계화 receipt는 `pre-audit/`에 분리 보존한다.

| 최종 point100000 | Native | Sampled rebase |
| --- | ---: | ---: |
| full raw canonical work | 97911711 | 133456501 |
| logical expansion | 7600057 | 10100086 |
| preparation descriptor / cell visits | 7600056 / 7600004 | 11500070 / 11500023 |
| independent intern work / metadata nodes | 93556546 / 208 | 130934738 / 328 |
| decoded / encoded physical values | 604540 / 608452 | 804915 / 809470 |
| column / 전체 envelope bytes | 33703134 / 33703431 | 41204291 / 41204588 |
| native 준비 ms | 17853.1 | 18391.2 |
| offline 복원·전수 비교 ms | 42831.9 | 41688.8 |

Point sample3554.6ms이며 native/rebase 모든100000 좌표와 decision, offline frame 전체
`deepEqual`, rebase t=0 exact frame identity가 통과했다. 준비의 원 work 최대는78333686,
rebase46333687이며 독립 strict restore는 원 raw97911711/133456501을 그대로 과금한다.
원 envelope bytes와 raw canonical work가 첫 receipt와 정확히 같은지도 assertion으로 확인했다.
Phase별 GC 뒤 heapUsed는717740176 →726489624 →734013352 →733973216B, 최종RSS2284978176B다.
이 수치는 참조 수명 진단이며 retained heap/P95/50ms SLO 통과가 아니다. 작은 coverage 소비자가
겹친 timing도 benchmark로 사용하지 않는다.

| 최종 partition10000 | Native | Sampled rebase |
| --- | ---: | ---: |
| full raw canonical work | 12785727 | 15770738 |
| 원 partition track work | 16950544 | 16950544 |
| logical / descriptor / cell visits | 720136 / 560067 / 560006 | 1090200 / 1010082 / 1010026 |
| independent intern work / metadata nodes | 9914328 / 139 | 12412455 / 273 |
| decoded / encoded physical values | 220712 / 541986 | 241191 / 563300 |
| column / 전체 envelope bytes | 8753321 / 8753616 | 9476860 / 9477155 |
| native 준비 ms | 4447.7 | 3686.8 |
| offline 복원·전수 비교 ms | 6213.6 | 5334.5 |

Partition 원 root+9999 children SHA256은
e204dd2c1ab81f7c75b8d32aa006841fcda7e1e140ffd6a983dc1d5b448e1a1e다. Labels=false,
strokeWidth=0의 원10000 cell 모든 path command를 native/rebase plot width460/510의 독립
oracle로 검산했다. Sample1655.1ms, offline frame 전체 deepEqual, rebase t=0 exact identity도
통과했다. 최종 heapUsed121808800/RSS524075008B다. Point50frame의 endpoint work10000100과
partition500frame의10001000은 기존 batch10M guard에서 거부된다. 처음 partition 하네스가
유효한50frame을 오류로 기대한 실패는 `product-partition-10000-first.log.gz`에 보존하고
기존 guard를 넘는500frame으로 하네스만 바로잡았다.

Canonical capacity 선택은 실제 own `materializationConfigs.marks`를 먼저 읽고 기존 plain
structural state의 own `markConfigs` fallback을 유지한다. ChartProgram의 read-only alias를
버리지 않는다. `maxItems`는 own일 때만 읽어 absent/own undefined의 기존 default50000과
명시100000 계약을 보존한다. 처음 alias를 누락해 native100k 생성이50000에서 거부된 중간
수리는 `product-100000-canonical-alias-first.log.gz`로 남겼다. 상속 getter0 및 실제 native
maxItems3 회귀와 기존 Full/Basic100k·edit/remove·raw/source/rebind·retained nested/facet·codec
14건, 원100k 네 backend1건이 최종 소스에서 통과했다. SVG100000 circles/Canvas100000 arcs,
PNG/PDF 및 대표 pixels와 원100000 좌표를 보존하며 hit100001과 기본 animation10k는 여전히
독립 경계에서 거부된다.

## Private checkpoint 검증

공개 entry의6개 export, 선언, plan3 기본 실패 순서·literal/v3 회계는 변경하지 않았다.
패키지 내부 source를 명시적으로 찾아가는 진단 소비자만 private helper에 접근하며
`ggaction/animation/planner` package path는 계속 차단된다.

같은 canonical archive SHA256은
`d6853f5b0bba332ecfd59a8a9a0ac2f6d7c39e8dbed1b0231a7ba33d4807f582`다.
1246 entries/packed1793093B/unpacked8084102B이며 두 private owner와 좁은 guard 수리 증가분에
맞춰 caps1246/1793100/8084200만 적용했다. 원본 및 실제 canonical staging 계측은
[package receipt](animation-codec-evidence/private-package.json)와
[계측 원문](animation-codec-evidence/measure-package.mjs.txt)에 남겼다. Raw npm pack 대신
기존 canonical staged minification을 그대로 사용했다.

Same-tar 소비자는 Full20point/Basic1point/partition10cells의 native/offline/rebase,
undefined/hole/NaN/-0/BigInt literal oracle, unchanged publicv3, private export rejection,
locked optional peers, public TypeScript 및6browser entry bundle을 검사한다. Generic 소비자는
원50k를 포함하는 사실을 확인한 뒤 제 child만 SIGTERM했고361 partial case는 완전 통과로
계산하지 않는다. 첫 하네스의 `.plan` 추출 누락과 Basic에 없는 editScale 사용도 수정하고
로그를 보존했다. Basic의 공개 표면은 늘리지 않았다.

Node20/24 Full gzip784381B/Basic424715B의 실제 최소100B 단위 cap784400/424800으로 정합했다.
SVG/graph/animation/interaction cap은 그대로다. 첫 Node20 초과 receipt도 보존하며 cap 수정은
제품 코드·fixture·archive bytes를 바꾸지 않았다.

| 최종 동결 검증 | 결과 |
| --- | --- |
| animation owning + core/selector, affected coverage | 748/748 |
| affected critical owner11개 | 모든 floor 충족; aggregate98.96/96.37/99.60 |
| 새 codec / resources | 100/98.05/100 및100/97.73/100 |
| planner / partitionTracks / selector | 100/93.40/100 및100/94.29/100 및100/100/100 |
| architecture/package/discovery/types boundary | 45/45 |
| docs | 242/242 |
| existing offline browser / animation render | 1/1 및52/52 |
| canonical capacity / 원100k 네 backend | 14/14 및1/1 |
| 같은 archive Node20.20.2 /22.23.1 /24.22.1 | native/offline/rebase·TS·peers·6bundle 모두 통과 |

[Critical metrics](animation-codec-evidence/private-frozen-critical.json)는 affected owner만 검산한
범위를 명시한다. 전체 repository coverage 통과를 대신하지 않는다. `hashes.json`은 최종
raw receipt·script 원문·압축 실행 log·같은 archive 소비자 기록을 각각 고정한다. Source pin은
제품 commit 이후 별도 metadata commit으로 현재 provenance와 생성 LLM 문서를 갱신한다.

Public plan4/options와
50ms/P95/retained-heap 성능 의무는 이 private checkpoint의 완료 주장에 포함하지 않는다.
