# Bounded route v2: sample·memory·취소·native update의 수치 근거

## 상태와 승인 범위

- [x] 기본 v1의 FDEB typed neighbors `61ddab0aa`와 density packed samples `90ae73151` 보존
- [x] 기존 sample charge 식과 buffer/object 수명 대조
- [x] 생산 density orchestration/helper를 사용하는 유한 진단 도구의 소형20회 결과·hash를 실제 public 결과와 exact 검산
- [x] 직접 edit 외 guide/encoding/composition 후보를 source-pinned 명시 목록으로 기록
- [x] 원100의20회 진단: root CPU 슬롯에서 단1건, work1B와 host30초 제한으로 완료
- [ ] 실제 ledger를 근거로 제품의 hard maxima와 완전한 native adapter union 채택
- [ ] v2 제품 구현·원100/1k/10k 기능 검증·최종 합산 P95/heap/100cycle

이 기록은 [전체 승인](../AUTHORIZATION.json)의 remainingApproval와 root의2026-11-02 연구 지시에
따른 **제품 변경 전 수치 선정안**이다. 앞선 [B 준비/원자 commit 방향](route-native-update-boundary.md)은
채택됐지만 아래 새 policy·wire 수치·async core 경계는 구체 검토 대상이다. 사용자의 재승인을
요청하지 않는다. Runtime/API/schema/types/Current/공통 animation4/benchmark 도구 변경은0이다.

## 1. maxSamples를 기존 단위로 명시한다

이전 execution4개 숫자만으로는 원10k density의 첫 `6S+2E=13,400,000`을 기존10M에서
받을 수 없다. Packed storage는 객체를 없앴을 뿐 이 counter를 바꾸지 않았다. 다음5개 숫자와
닫힌 policy discriminator를 제안한다.

```js
execution: {
  policy: 'bounded-route@1',
  maxWork,            // 모든 기존 charge의 누적값
  maxCandidatePairs,  // 검토 pair의 누적값; live pair 저장량이 아님
  maxSamples,         // 아래 기존 보수 sample charge의 최대값
  maxBufferBytes,     // 직접 소유한 numeric buffers의 동시 byte 예약량
  maxBytes            // canonical encoded job/completion 각각의 byte 한도
}
```

모든 숫자는 own positive safe integer이며 undefined/Infinity/자동 추정은 거부하는 안이다.
각 필드의 **제품 hard maximum은 아직 정하지 않았다**. 숫자를 크게 적으면 지원된다는 뜻이
아니다. 기본 v1 `maxSamples=10M`/work10M·edge4096·candidate10M과 오류는 그대로 유지한다.
수학 algorithmVersion과 scalar 순서·20/165회·모든 edge/row/seed도 바꾸지 않는다.

중복 정책값을 피하는 wire 제안은 v2에서 `options.limits`가 maxNodes/maxEdges만 소유하고,
execution이 work/candidate/sample/buffer/bytes를 단독 소유하는 것이다. v2의 limits 아래
maxSamples/maxCandidatePairs를 다시 주면 명시 거부한다. v1은 기존4필드 limits를 그대로
읽는다. v2 job input의 effective limits는 검증된 intent에서 private owner가 계산하며 wire에
두 번째 권위로 저장하지 않는다. 따라서 reader가 min/max/last-write로 불일치를 숨기지 않는다.
이 변경은 **아직 구현하지 않은 schemaVersion2 선택안**이다. 기존 hash bytes/v1 reader를
바꾸지 않으며 v2 input hash에는 policy가 포함된다.

E=간선 수, S=이번 iteration 입력 point 수, T=다음 iteration 출력 point 수,
C=실제 field Map entry 수일 때 기존 코드는 다음을 검사한다.

| 단계 | 현재 sample charge | 근거 |
|---|---:|---|
| 초기 resample | `2E + S` | old endpoint + 새 sample |
| weights 준비 전 | `6S + 2E` | density의 기존 보수 charge |
| field 새 entry 추가 | `6S + C + 2E` | field의 `S+C`와 호출자의 `5S+2E` 합 |
| resample | `C + 4S + T + 2E` | held(`C+3S+2E`) + smoothed S + 새 T |
| final controls/commands | 누적 `2T` | 두 vector의 기존 합 |

`maxSamples`는 이 식들의 최대를 승인한 값으로 검사한다. `6S`를 실제 typed slot2S로
다시 정의하지 않는다. Directed field는8channel이고 C≤524,288, undirected는 C≤65,536이다.
각 edge4096이므로 S,T≤4096E다. [산술 script](density-schedule-evidence/bounds.mjs)와
[결과](density-schedule-evidence/bounds.json)는 BigInt 교차검산한 **보수적 ceiling**이다.
예컨대 E10k의 directed sample ceiling246,304,288은 실제20회 peak도 권장 제품 limit도 아니다.
이 ceiling을 모두 허용하면 coordinate 객체만 최대122,888,192개가 한 iteration에서 도달할 수
있어 memory 안전성을 설명하지 못한다. 실제 ledger 없는245M급 상향은 채택 근거가 아니다.

## 2. 메모리는 bytes와 객체 개수를 구분한다

현재 packed sample owner는 좌표를 복사하지 않는다. Weight/angle 각 Float64[S]와
Uint32[E+1] offset만 유지하고 preparation에서 length Float64[L]을 한 번 사용한다.
L≤4095다. Typed live=`16S+4(E+1)`, preparation peak=`16S+4(E+1)+8L`이다.
각 할당 앞 abort/예약 검사는 유지하고 finally에서 참조를 해제한다. 좌표 x/y는 기존 JS object다.

| 소유 단계 | 실제 동시 구조와 보수 개수 | 이 표에 없는 것 |
|---|---|---|
| field | old point S + packed numeric + Map C | Map bucket/allocator/GC residency |
| advection/smoothing | old S + 완료한 smooth≤S + 현재 edge next/smooth≤2P | gradient의 짧은 임시 객체·channel 배열 |
| resample | old S + smooth S + 새≤T + edge scratch≤2P | cumulative length 숫자 배열·validation stack |
| finalization | old final T + 완료 controls/commands≤2T + 현재 edge restore≤2P | 뒤 clone의 control objects, bounds/route wrappers |
| immutable clone | old T + raw result≤2T + cloned controls≤T | 이미 owned commands는 재사용; plain controls는 복사 |
| encode/hash/transport | native result + tagged tree + canonical text + UTF8 + SHA padding + packet copy | host structured-clone/GC의 실제 resident bytes |

여기서 P4096, 보수 iteration point-object 상계는 `2S+T+2P`이며 최종 restore/clone은
`4T+4P`를 안전한 별도 상계로 둘 수 있다. Wrapper/array/Map entries와 원 data/model/index는
별도 cardinality ledger가 필요하다. 한 JS object를 임의로32/64bytes라고 곱해 portable heap
상한으로 주장하지 않는다. Numeric reservation은 위 표의 직접 buffer에만 적용된다.

현재 `encodeValue`는 tagged 배열·entry pair를 생성하고 `canonicalJSON`은 subtree 문자열을
join한다. 이어 TextEncoder의 B bytes와 SHA의 `ceil((B+9)/64)*64` bytes가 함께 존재한다.
UTF16 문자열의 payload 상계는2B지만 intermediate string 총량/엔진 표현은 별도다. 따라서
maxBytes는 **job/completion 각각의 encoded quota**이며 단독으로 최대 JS heap을 보장하지 않는다.
큰 v2를 구현할 때는 tagged tree를 먼저 전부 만드는 방식 대신 descriptor/length/UTF8 escape
preflight→같은 canonical byte stream→incremental digest로 whole-value copy를 제거하는 안이다.
원 owner와 독립 native byte/hash oracle를 공유해야 하고 hash 알고리즘을 이곳에 복제하지 않는다.

Object/descriptor quota는 새 public 숫자를 임의 추가하기 전에 `maxNodes/maxEdges/maxSamples`
및 기존 own-data depth/row-key 한도에서 phase별로 유도해 할당 전에 검사하는 안이다. 그러나
coordinate cardinality만으로 caller가 보유한 program와 host 전체 heap을 제한하지 못한다.
그 한계는 제품 설명에도 남겨야 한다. 원 native update의 복수 route와 fit pass는 request 전체
reservation을 공유하고 pass마다 누적 work/time을 초기화하지 않는다.

FDEB의49,995,000 candidate·8,145,000 compatible pair는 이미 전수 scalar 감사됐다.
Upper-neighbor typed chunk의 정적 상계106,150,020B와 전체 fixed schedule6,887,850,000work는
서로 다른 값이다. Pair×17을 더한7,737,765,000도 input/finalize 밖 부분합이다. Density100 결과를
10k나 FDEB의 지원·heap·시간 근거로 선형 확대하지 않는다.

## 3. main validation/hash 취소100ms의 구체 준비안

Worker terminate만으로 큰 main validation/clone/hash의100ms 취소를 보장할 수 없다. 다음
private async owner가 필요하며, source-neutral core 추출은 root가 구체 채택한 뒤 별도 개념으로
수행한다. 현재 파일은 수정하지 않았다.

1. 입력 descriptor/array length/문자열 escape byte를 작은 cursor로 검사한다. 대형
   Object.entries/Object.getOwnPropertyDescriptors/JSON.stringify를 한 chunk에서 호출하지 않는다.
   Closed record key 수는 작고, vector index는 하나씩 native descriptor로 읽는다.
2. canonical encoder와 SHA block owner를 begin/update/finalize로 추출한다. 기존 sync helper와
   v2 async helper가 같은 scalar owner를 사용한다. Number/±0/tagged values·key order·hash bytes는
   동일하다. 중간 SHA state는 private이고 program/job transport에 저장하지 않는다.
3. model/result/binding 검증과 deep-owned clone도 cursor 형태로 준비한다. exact job+receiver+
   refs+constructor+token의 검증이 모두 끝난 뒤에만 private proof를 등록한다. clone/freeze만으로
   권한을 주지 않는다. Final apply는 작은 identity 비교와 이미 검산한 native plan을 소비한다.
4. 20ms 목표의 elapsed checkpoint와 최대1024 descriptor/4096UTF16/64KiB byte chunk를 함께
   사용하고 매 chunk 실제 macrotask로 yield한다. Microtask만 반복하는 것은 abort event를 못 받는다.
   이 chunk 숫자는 **초기 구현 후보**이지 아직100ms 달성 증거가 아니다. 실제Chromium 모든
   stage에서 abort→terminal 지연을 측정하고100ms를 초과하면 더 작은 bounded 작업으로 나눈다.
5. Abort를 message.data/cache/proof lookup보다 먼저 검사한다. timeout/abort/dispose/late 결과는
   terminal1회·commit0, timers/listeners/workers/staged buffers 해제. 본인이 별도로 취소된 prepared
   data/inference/image/font handle도 그대로 거부한다.

Host JS callback이나 hostile Proxy의 임의 trap 실행 시간을 라이브러리가 선점할 수 있다는
주장은 하지 않는다. 지원된 native own-data 입력의 실제 stage에 대한 responsiveness 계약이다.
Getter는 기존 own-data 경계에서 실행0으로 거부하고, explicit undefined/unknown props/byte quota
실패의 순서를 검증한다. Main final materialization이나 responsive pass가 아직 큰 동기 loop라면
그 단계도 미완료이며 worker만100ms 통과했다고 전체취소를 닫지 않는다.

## 4. native update union: 직접14개 이후도 기존 owner로 닫는다

기존 B 표면 `prepareGraphEdgeRoutes({kind:'update',edit:{action,args},...})`와
`applyGraphEdgeRoutesUpdate({prepared,requestToken})` 방향을 유지한다. 새로운 generic callback/
plugin 실행기나 저장 transaction을 추가하지 않는다. 각 args는 원 native action validator를
사용하며 typed childPath, source-row namespace, UUID/ID, alias trace를 그대로 보존한다.

[명시 후보 목록](density-schedule-evidence/native-union.json)은 source90ae의 ACTION_INDEX를
고정해서332개 실제 이름과 원 Current contract를 열거한다. [검산 script](density-schedule-evidence/native-union.mjs)는
모든 action의 implemented 상태와 contract 존재, 중복과 raw primitive 제외를 확인한다. 이것은
**완전성 누락을 찾기 위한 후보 상위집합**이며332개가 전부 필요한 최소 union 또는 이미 지원하는
runtime dispatch라는 뜻이 아니다. Domain 이름 wildcard로 미래 action을 자동 허용하지 않는다.

구체 구현은 action이 아니라 다음 기존 계산 phase의 private resumable plan을 먼저 재사용한다.

| phase | 원 native owner | 요구되는 positive/실패 증거 |
|---|---|---|
| data/derived/parameter | data/resourcePlan + 기존22 derived editors | 원 row IDs, dependency order, alias trace, source 수정 원자성 |
| graph/layout/hierarchy/view | graphs/routeClosure | 정확 refs, induced restore/filter, force pins, HEB anchor |
| Canvas/fit/resize | graphs/screenRoutes + canvasResourceRevision | 실제 viewport, 변경 없는 route 재사용, fit 반복 전체 charge |
| guide/scale/encoding/mark | materialization/guides/layout + planner | 간접 screen route 변화, 현재 실제 route로 occupied bounds 계산 |
| typography/theme/assets | native typography/theme와 guide transaction | exact prepared asset/metrics identity, source handle 취소, fitting |
| composition/facet | native child resize/source revision owner | 실제 child ID·facet source·shared scale·guide 수집·scope 격리 |
| remove/cascade | native resource/mark removal plan | 남은 DAG/route/GeoRoute refs, 실패 시 원 program/trace 보존 |

정확한 action allowlist는 이 phase별 실제 positive fixture와 native call-site에 따라332 후보에서
선택해 닫는다. Request는 기존 bounded route가 해당 exact child/resource/viewport/removal closure에
실제로 참여해야 한다. 관계없는 action은 ordinary 경로를 안내하는 닫힌 오류이며 arbitrary action을
대신 실행하지 않는다. `bundleGraphEdges/editEdgeRoute`는 기존 create/edit prepare 경로를 사용한다.

`navigateProjection`의 resize는 해당 viewport 경계로 들어가지만 Geo pan/zoom을 암묵적으로
screen bundling으로 바꾸지 않는다. `applyDataUpdate`는 기존 authentic prepared data handle만
사용한다. 새로운 URL/network resolver를 route에 넣지 않는다. 준비 중 ID를 한 번 확정한 native
plan을 재개하며 예외를 던지고 action 전체를 새UUID로 다시 실행하는 방식은 제외한다.

간접 guide/composition까지 full positive closure·실패 원자성을 확인하기 전에는14개나332개
목록이 있다는 이유로 closed union 완성이라고 세지 않는다. 이 후보의 검토/최소화는 다음 제품
설계 결정이며 아직 public schema에 열거하지 않았다.

## 5. 허용된 숫자 선정 진단과 재현

[observe.mjs](density-schedule-evidence/observe.mjs)는 production density source의 정확6개
observation seam만 확인해 temp module로 만들고, 모든 scalar helper는 실제 production import를
사용한다. Schedule/좌표/순서/샘플/field/최종 hash는 그대로다. Product 파일은 쓰지 않는다.
원 입력 준비는 기존 default guard이며 worker 내부 orchestration의 **진단 work만1B**로 검사한다.
Native maxSamples10M/edge4096와 기타 guard는 그대로다. Host30초 timer가 독립 worker를
terminate하고 중간 iteration/field progress를 남긴다. Guard disable/무한 deadline은 없다.

```sh
node agent_docs/impl/roadmap9/chart/density-schedule-evidence/bounds.mjs
node agent_docs/impl/roadmap9/chart/density-schedule-evidence/native-union.mjs
node agent_docs/impl/roadmap9/chart/density-schedule-evidence/observe.mjs --small
# root가 CPU 슬롯을 배정한 뒤 단1건만:
node agent_docs/impl/roadmap9/chart/density-schedule-evidence/observe.mjs --original100
```

소형은3edge의 directed/undirected·zero-length/±0 입력으로20회 완주한다. 실제
`computeRouteJob` 및 public `bundleGraphEdges`의 전체 결과·원 hash를 exact 비교했다.
Work1B 초과와 samples10M 초과의 원자 거부 probe도 있다. 첫 harness 실패는 pure result의
options와 public 저장 envelope의 inputHash/resultHash/viewport를 잘못 직접 비교한 것이었고,
기존 native envelope 의미로 비교를 바로잡았다. Product 결함/수정이 아니며 최초 로그를 보존한다.

보고서는 S_i/T_i, fieldCells, sample/channel candidate 슬롯 수, 모든 phase의 원 charge 합,
peakSamples, packed bytes, 최종 command/control 수와 canonical encoded job/completion bytes,
source hash를 기록한다. Density candidatePairs는0이고 field candidate slots와 구분한다.
Observation counter/메시지·30초에 setup/hash도 포함되므로 결과 시간은 제품 solver/P95가 아니다.
Default original100/1000 work 거부와 original10k sample 거부의 [stable90ae 증거](density-storage-evidence/qualification.json)는
그대로다. 이번 진단이 성공해도 public admission·큰 size support·SLO pass로 바꾸지 않는다.

다음 채택 숫자는 실제 ledger가 있는 범위와 없는 범위를 분리해 제시한다. 전체20회를 못 끝내면
부분값과 최초 guard/deadline을 보존하고, iteration/size를 줄인 결과를 원 입력 완료로 대체하지 않는다.


## 6. 원100 한 건의 실제20회 결과

Root가 R Chromium 종료 뒤 단독 large 슬롯을 배정했고 PID92791의 worker를 한 번 실행했다.
[원본 report](density-schedule-evidence/original100-22.json.gz)와 [종료 log](density-schedule-evidence/original100-22.log.gz)를
보존한다. Apple M4/arm64/16GiB/macOS27.0.1, Node22.23.1이며 root small pack/docs만 병행했다.
Worker는20회 뒤 자연 종료했고 large 슬롯을 즉시 반환했다. 전역/제품 코드·guard 변경은0이다.

| iteration | 입력 S | 출력 T | fieldCells | candidate-channel slots | field work |
|---:|---:|---:|---:|---:|---:|
| 0 | 22,200 | 22,400 | 43,848 | 10,115,328 | 10,652,170 |
| 1 | 22,400 | 22,800 | 42,980 | 8,471,656 | 8,965,730 |
| 2 | 22,800 | 23,100 | 42,084 | 7,147,084 | 7,605,580 |
| 3 | 23,100 | 23,452 | 41,204 | 5,995,392 | 6,418,824 |
| 4 | 23,452 | 23,732 | 40,528 | 5,034,580 | 5,426,348 |
| 5 | 23,732 | 24,256 | 39,860 | 4,210,412 | 4,571,676 |
| 6 | 24,256 | 24,728 | 39,312 | 3,554,272 | 3,890,834 |
| 7 | 24,728 | 25,500 | 38,684 | 2,987,728 | 3,300,232 |
| 8 | 25,500 | 26,064 | 38,236 | 2,542,516 | 2,836,552 |
| 9 | 26,064 | 26,500 | 37,776 | 2,140,968 | 2,415,050 |
| 10 | 26,500 | 26,972 | 37,304 | 1,792,104 | 2,046,290 |
| 11 | 26,972 | 27,304 | 36,316 | 1,499,868 | 1,735,984 |
| 12 | 27,304 | 30,572 | 34,968 | 1,250,596 | 1,469,152 |
| 13 | 30,572 | 34,640 | 33,368 | 1,151,544 | 1,375,446 |
| 14 | 34,640 | 39,484 | 31,372 | 1,071,874 | 1,304,134 |
| 15 | 39,484 | 45,120 | 29,384 | 1,002,664 | 1,245,280 |
| 16 | 45,120 | 51,940 | 27,776 | 938,850 | 1,193,159 |
| 17 | 51,940 | 60,463 | 26,028 | 886,040 | 1,155,239 |
| 18 | 60,463 | 68,177 | 24,911 | 911,991 | 1,209,700 |
| 19 | 68,177 | 72,355 | 24,845 | 1,026,889 | 1,362,445 |

각 행의 field work는 `S + y행 방문 + candidate-channel slots`와 정확히 같다. Native
`candidatePairs`는0이며 이 field 슬롯과 혼동하지 않는다. 전체 S합649,404, T합699,559,
y행합5,798,065, candidate-channel 슬롯합63,732,356이다. 모든 원 charge의 합은 다음과 같다.

| phase | 실제 work |
|---|---:|
| 원 prepare/index/order | 62,820 |
| 초기 resample | 22,200 |
| 기존 weight/advection 보수 S×24 | 15,585,696 |
| field | 70,179,825 |
| resample | 699,559 |
| finalization | 578,840 |
| **전체** | **87,128,940** |

PeakSamples434,107은 마지막 field의 `6×68,177+24,845+200`과 같다. 최종 commands/controls는
각72,355개이며 줄이거나 버린 edge는 없다. 관측된 iteration 입력의 최대 한 edge는740 samples다.
최종 edge별 count 최대는 별도 보고값을 만들지 않았으나 기존4096 guard가 실제 resample에서
검사됐다. Packed preparation의 실제 최대는1,097,148B다. 마지막 iteration의 point object
보수 ceiling216,901은 측정 heap이 아니고 기존 수명식 `2S+T+8192`의 산술값이다.

Canonical encoded job은80,439B, 완료 packet은9,821,768B이며 결과 hash는
`0a988991ea0252b1cb7bf65f4592bf4c252956cf745b399b5e50238e387802b3`다.
총5,276.246417ms에는 observer import/setup·counter·progress 메시지·hash/byte encoding이 들어간다.
하나의 source 진단이고 browser worker·같은 archive·P95·SLO·retained heap 증거가 아니다.
기존 public work10M은 첫 iteration에서 실패하는 채로다. 이번 결과를 v2 제품 지원으로 세지 않는다.

Sample 수는 초기22,200→마지막72,355로 커졌고 bandwidth floor에 가까운13회 이후 증가가
더 빨라졌다. 그러므로 초기 sample을20회에 그대로 곱하거나 원100 값을1k/10k로 비례 확대해
policy 상한/시간을 확정할 수 없다. 이 한 입력을 위한 관측 하한은 work87,128,940,
maxSamples434,107, 직접 packed 준비1,097,148B, completion9,821,768B다. 이는 전체 transaction의
model/input/copy/field/object/다중 fit 비용을 포함하는 권장 maxBufferBytes/제품 hard cap이 아니다.

다음 숫자 선정은 이 완주값과 원1k/10k의 아직 미관측 ledger를 분리해서 root에 제시한다.
본 checkpoint 뒤 추가 큰 loop를 임의 시작하지 않는다. V2 single-authority limits, async validation,
완전 native update union과 actual buffer/packet의 전체 수명 증명은 계속 미완료다.

## 7. 후속 구체 수치·API 제안

[Route v2 구체 제안](route-v2-proposal.md)은 private cursor 제품207e18ac7을 바탕으로
다섯 hard maximum 후보, 명시 기본값 부재, v1 보존·v2 header/worker entry·native proof 순서와
복수 route/fit aggregate policy를 구체화한다. 소형8job×3Node만 새로 실행했고 제품 변경은 없다.
원 density1k/10k 후반 ledger와100ms/native union 완료는 계속 미증명이다. 이 링크가 위 역사적
수치 또는 당시 미채택 상태를 바꾸지는 않는다.
