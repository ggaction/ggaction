# 큰 route의 bounded 실행 구체안 — 검토 초안

## 진행 상태

- [x] 안정 inference `fa943e864`를 보존하고 `codex/roadmap9-route-capacity` 분리
- [x] 기존 감사 `44d400b96`의 [원 제안](route-bounded-execution.md)을 내용 그대로 복원
- [x] 원 edge-bundling/qualification/AT82와 Current EDGE_ROUTES, 실제 worker/복원 owner 대조
- [x] 원 FDEB100/1000 모든 pair와 독립 scalar oracle exact 비교
- [x] 원 density100/1000/10000의 첫 sample 수 및 실제 동시 배열 구조 감사
- [x] root가 B의 native 준비→worker→원자 commit 방향 채택(2026-11-02)
- [ ] 수치 상한·closed edit union·세부 저장/commit signature의 제품 채택
- [x] FDEB10000의49,995,000 pair 전수 scalar 감사 및 원100 ordered-input 중복 감사
- [ ] 큰 정책 제품 구현·동일 archive/3Node·원 큰 입력 완전 계산·최종 합산 P95/heap/100cycle

[전체 승인](../AUTHORIZATION.json)의 remainingApproval 안에서 구체안을 준비한다. 이 문서는
`ready-for-review`인 설계이며 새 정책의 제품 채택·구현·성능 통과 기록이 아니다. 제품 source,
공개 API/types/Current, shared animation4, root benchmark 도구는 변경하지 않았다.

기본 범위 안의 별도 메모리 개선은 [FDEB upper-neighbor 저장](route-upper-neighbor-storage.md)에서
기록한다. 이 개선의 검증과 큰 정책의 미완료 상태를 구분한다.

Density의 다음 최소 후보와 원100/1000 첫 반복 ledger는
[packed sample 설계](density-packed-samples-design.md)에 기록한다. Weight/angle 보관만 바꾸는
제품 후보이며 아직 채택·구현하지 않았다. 이 후보의 현재 work/guard 실패는 그대로 남는다.

## 보존할 계약

원 계약은 `study/coverage-expansion-2026-10-27/roadmap/contracts/edge-bundling.ko.md`,
`qualification-delivery.ko.md`, `acceptance-cases.json`의 AT82다. 현재 계약은
[EDGE_ROUTES](../../../contract/current/EDGE_ROUTES.md)다. 원100/1000/10000 간선,
고정 입력·seed·원행·정렬·반복·좌표·수학·DPR1/2·warmup5/측정30·100cycle을 보존한다.
SLO .5/5/30초 및 abort100ms를 바꾸지 않는다. budget 거부는 안전한 실패이며 큰 입력
지원이나 성능 통과가 아니다. 전역 graphic10k와 일반 work10M도 별개의 기존 경계다.

FDEB는 fixed6cycle/165iteration, 내부 sample1/2/4/8/16/32, 기존 scalar 더하기 순서와
signed zero를 유지한다. Density는256²/20회, arc-length weights, 기존 hypot kernel,
gradient→advection→smoothing→resampling 및 directed8channel 순서를 유지한다.
수학 algorithmVersion은 `force-directed@1`/`density-v1` 그대로다. Approximation,
threshold 조정, sample/edge/iteration drop, GPU 재결합은 이 안에 없다.

## 현재 증거와 막힌 경계

[소형 감사](route-capacity-evidence/audit.json)는 Node22 source `fa943e864`에서 수행했다.
[재현 script](route-capacity-evidence/audit.mjs)는 기존 production compatibility 함수와 별도로
작성한 scalar formula를 모든 pair에 `Object.is` 비교한다. 전체 solver를 guard 없이 실행하지 않는다.

| 원 간선 | 검토 pair | 정확0 | 양수 | threshold≥.6 | 고정 schedule charge |
|---|---:|---:|---:|---:|---:|
|100|4,950|1,700|3,250|750|1,090,500|
|1000|499,500|167,000|332,500|80,500|72,225,000|
|10000|49,995,000|16,670,000|33,325,000|8,145,000|6,887,850,000|

10k의49,995,000 pair도 독립 scalar와 전수 exact였다. 이6.633초 단발은 compatibility만의
진단이며 전체 solver/P95가 아니다. Schedule과 기존 pair×17을 합하면7,737,765,000이고
input/index/finalize는 여기에 더해진다. 1k 비율을10k 증명으로 쓰지 않았다.
지금 `candidatePairs`는 누적 검토 수이며 동시 보유 수가 아니다. 이를 live-memory로 재해석해
같은10M 한도를 통과시키지 않는다. Compatibility가 확실히0인 경우만 pruning 후보이며,
threshold 미만인 양수를 버리는 식으로 candidate cap 문제를 숨기지 않는다.

| 원 density 간선 | 초기 S | 현재6S+2E live charge | 한 좌표 buffer bytes |
|---|---:|---:|---:|
|100|22,200|133,400|355,200|
|1000|223,000|1,340,000|3,568,000|
|10000|2,230,000|13,400,000|35,680,000|

기존 `44d400b96` 감사는 첫 field만으로100/1000의 padded chord candidate가
10,115,328/101,634,772임을 확인했다. sample×24는 역사적 보수 charge이지 정확한24개
JS primitive 목록이 아니다. 기존 charge를 낮춰 통과시키지 않는다. 표의 초기 S를 이후20회에
그대로 대입한 수치를 실제 누적 비용·상한·메모리 측정으로 사용하지 않는다.

## 최소 실행 소유권

새 executor를 만들지 않고 기존 `createGraphRouteExecutor`/`prepareGraphEdgeRoutes`를 확장한다.
기존 prepare의 exact Full receiver·action kind·token·signal 및 native revision binding을 유지한다.
기본 경로는 현재 limits/work/job schema와 동기 fallback을 그대로 유지한다.

검토용 구체 저장안은 route numeric options와 분리된 optional `options.execution`이다:

```js
execution: {
  policy: 'bounded-route@1',
  maxWork,             // 기존 work 단위의 전체 누적 허용량
  maxCandidatePairs,   // 누적 검토 pair; 현재 의미 유지
  maxBufferBytes,      // 직접 소유한 typed numeric buffers의 동시 byte
  maxBytes            // canonical encoded job와 completion 각각의 byte
}
```

모든 값은 명시 positive safe integer다. 기본10M 한도는 그대로다. 새 수치 상한은 아직
제품 채택하지 않는다. 필요한 최소 후보 용량은 FDEB1000의72.225M schedule + 실제
input/pair/finalize work, 10k의49,995,000 pair다. Work 상한은 원 입력의 실제 pair count와
고정 schedule의 `sum(iterations*internalSamples)=840` 및 density 각 iteration의 실제 S/field
update 수를 확인해 정한다. 수학이 허용하는 거대한 worst bound를 곧바로 제품 허용량으로
삼지 않는다. 원10k pair 감사와 streaming의20회 sample ledger가 다음 채택 숫자의 근거다.

`maxBytes`는 JS heap 보장이 아니다. 기존 inference128MiB를 근거 없이 복사하지 않는다.
현재 density10k 초기 old/new 좌표 payload만71.36MB이고, commands/controls 및 canonical
tagged JSON은 그보다 크다. 초기72.61MB 모형은 tangent를 다시 계산하는 모형이었다. 동일한
처음 tangent를 그대로 보유하는 보수적 모형은90,451,976B/6,796,016 live slots다. 모두 다음 S가
이전 S와 같다는 가정의 설계치이며 실제 heap·20회 peak·final completion byte가 아니다.
[배열별 ledger](route-capacity-evidence/buffer-ledger.json)에 두 모형과 각 수명/누락 경계를 구분한다.

명시 policy job는 schemaVersion2로 읽고, 생략한 v1은 byte/hash/저장 shape를 보존하는 안이다.
Input hash에는 실행 policy가 포함된다. 시간제한·host 객체는 hash/저장값에 넣지 않는다.
새 diagnostics의 policy/counter shape도 v2에 한정하고 v1 strict reader를 그대로 둔다.
수학 결과의 좌표/원행과 전체 diagnostics hash의 의미를 구분한다. 새 live-buffer 계측이
기존 보수 peakSamples와 다르면 metadata 변경으로 정확히 기록한다.

## 실제 할당을 없애는 density 순서

1. 원 route 순서로 각 간선의 weights/tangent를 준비하고 field에 바로 누적한다. 전체
   `routes.map(routeDensitySamples)`와 `flat()` 동시 보유를 없앤다. bounds는 같은 모든
   좌표의 min/max pass로 구한다. Sample-major 및 channel 덧셈 순서는 그대로다.
2. Field를 완성한 뒤 원 old route 전체를 읽으며, 한 간선씩 advection/smoothing/resampling을
   처리한다. 새 route를 분리해 보관하고 old를 in-place 갱신하지 않는다.
3. 좌표는 Float64 저장, offset은 명시 integer 저장이다. Field가 dense buffer로 바뀌면
   기존 Map의0값 삽입까지 보존하는 presence bitmap이 필요하다. `fieldCells`를 임의로 바꾸지 않는다.
4. old/new/field/한 간선 scratch/offset/pair buffer를 할당 전에 reserve하고 해제 시 반환한다.
   기존 maxSamples10M과 edge4096은 그대로 검사하며, 실제 live 구조를 바꾼 뒤에만 charge를 바꾼다.
   final controls+commands 누적 sample guard도 남긴다. 나중 S 증가를 사전 성공으로 간주하지 않는다.
5. Typed buffer에서 public object 결과를 만드는 동안 중복된 buffer/object/JSON/hash copy가
   남는지를 별도 검사한다. Solver만 줄이고 finalization peak를 무시하면 bounded 지원이 아니다.

원100/1k/10k 출력은 old scalar owner의 작은 완주 결과와 독립 field oracle를 먼저 대조하고,
큰 입력에서는 전 간선/endpoint/order/provenance/유한수/전체 schedule을 검사한다. 좌표 부동소수점
누적을 재배열하는 합산/FFT/반경식 전개는 exact 개선으로 넣지 않는다.

## Worker 수명과 main 준비

Bounded 실행은 실제 worker factory가 있는 기존 executor를 요구하고 묵시 sync fallback하지 않는
안이다. 큰 job는 pending1, cache 없음으로 제한하고 기존 작은 cache는 시작 전 evict한다.
이 한도는 executor instance 단위이며 전역 JS heap 총량 보장이 아니다. 기존 작은 작업 정책은 유지한다.

Host의 명시 `deadlineMs`는 prepare→post→검증→종료에 걸린 elapsed budget으로 검사하고 worker를
terminate한다. 최대 허용시간은 최종 정책에서 명시하며 SLO를 늘리기 위한 값으로 사용하지 않는다.
Main의 bytewalk/validation/hash도 큰 동기 구간이면 abort100ms를 막을 수 있으므로 stage별
bounded chunk/yield와 deadline 확인이 필요하다. Cancellation은 cache lookup/event.data 접근보다
우선하며 완료·error·abort·dispose의 terminal은 한 번, listener/timer/worker 참조는 즉시 해제한다.

기존 `canonicalJSON(encodeValue(value))` 전체 문자열/byte 할당을 그대로 두고 managed-buffer만
제한했다고 주장하지 않는다. 동일 byte/hash를 streaming으로 계산하는 공통 hash owner 추출이
실제로 필요하면 core 변경의 별도 구체안과 독립 byte oracle를 먼저 제시한다. 아직 core를 수정하지 않았다.

## 채택된 B 방향과 아직 결정하지 않은 native union

Root는2026-11-02 기존 remainingApproval 아래 **B**를 채택했다. 큰 opt-in route가 붙은
source/layout/viewport 편집은 준비→worker→원자 commit으로 닫는다. 임의의 sync closure
확대(A)는 채택하지 않았다. 이후 root는 기존 remainingApproval 아래 route 전용 apply 표면의
방향도 채택했다. 수치 cap과 간접 guide/composition까지 포함하는 closed edit union은 아직 미완성이다.

[실제 호출 경계와 최소안](route-native-update-boundary.md)에 직접 graph/hierarchy/source/
filter/Canvas owner의 전수 call-site와22 derived editors를 기록한다. 단순한4-action union은
충분하지 않다. `guides/layout.js`의 responsive/exact-plot 재배치는 guide/theme/font/encoding
편집에서도 screen route를 다시 계산한다. `responsiveLayout.js`는 전체 concrete occupied bounds를
읽으므로 route를 빼고 가짜 viewport를 먼저 확정할 수도 없다.

예상 요청은 기존 `prepareGraphEdgeRoutes`의 `{kind:'update',edit:{action,args}}`다. 임의 callback,
현재 원본과 다른 worker receiver, 임시 stale program, 외부가 만든 prepared data/route를 허용하지
않는다. 기존22 derived editor의 정의/ID 배정 및 `prepareDataUpdate`가 확정한 source identity를
재사용해야 한다. 단순 예외 후 action 전체를 새 UUID로 반복 실행하는 구현은 제외한다.

여러 기존 facade에 동일 prepared union을 추가하는 안과 비교하여 route 전용 apply action 하나를
두는 방향을 선택했다. Generic plugin/transaction API는 만들지 않으며,
`editSemantic`/`createGraphics`/`editGraphics`는 ordinary prepared update 허용 목록에
들어가지 않는다. 준비되지 않은 큰 closure는 이전 program/trace를 보존하며 명시 실패한다.
기존작은 입력의 native 편집, 기존 worker cache 및 action trace 의미는 그대로다.

## 동일 숫자 입력 재사용 연구

[소형 전 schedule 감사](route-capacity-evidence/force-repeat-audit.json)는 원100의165회 전체에서
spring+원 neighbor 순서 operand84,000개를 binary64 bytes로 비교했다. Signed zero를 구분하며
서로 같은 전체 sequence는0개다. 더 좁은 `(dx,dy,compatibility)`630,000회에서도 같은 iteration의
중복1회, 직전 iteration과 같은 입력0회였다. 모든 iteration의 기존 scalar/symmetric 결과와 cap
count는 deepEqual였다. 1k/10k의 보지 않은 iteration에 이를 확대하지 않는다. 이 증거로 범용
memo cache를 만들지 않는다. 원10k work6.88785B의 과금을 줄이는 근거로도 사용하지 않는다.

FDEB의 다음 독립 후보는 upper-triangle typed neighbors다. 현재 symmetric loop가 실제 읽는
`edge` 오름차순→상대 edge 오름차순→sample 오름차순을 그대로 저장하면 reverse-side 덧셈
순서도 보존된다. target Uint32+compatibility Float64+reverse Uint8에13A bytes, offset/degree에
8E+4 bytes이며 원10k A=8,145,000에서105,965,004B다. 작은 oracle와 raw signed-zero/overflow를
먼저 고정하고, 최종 byte cap/배열 chunk 소유 정책 채택 전에는 제품 결과에 연결하지 않는다.

### 원100 typed storage prototype

[실행 코드](route-capacity-evidence/force-buffer-prototype.mjs)와
[검산 결과](route-capacity-evidence/force-buffer-prototype.json)는 제품 밖 연구다. 원100의750개
compatible pair를 upper triangle 순서로 target/weight/reverse typed arrays에 넣고, offset와
양방향 degree를 보존한다. 원165 iteration마다 모든 좌표·endpoint·displacement cap count를
기존 ordered scalar 및 symmetric kernel 모두와 deepEqual로 비교했다. 최종 hash도 앞선 원100
감사와 동일하다. 별도17-record chunk 경계, directed/반대방향, ±0/동일위치, threshold1,
epsilon 이하 입력 및 overflow를 검증했다. Abort와 byte reservation 거부 후 부분 buffer는 해제된다.

Prototype의 reserve는 각 typed array 묶음 할당 전에 수행한다. Chunk는 append 후 연결된 채로
소비하며 마지막에 큰 연속 배열로 복사하지 않는다. 이 연구에서 사용한32768-record chunk를
원10k의 이미 검산한 A=8,145,000에 산술 적용하면249chunks, 이웃 buffer106,150,020B다.
이는 마지막 chunk의185,016B 빈 공간을 포함한 **정적 상계**이며 실제10k 할당/solver 검증이 아니다.
원100은 candidate 상계4950에 맞춘 첫 chunk를 사용하여65,154B이고,17-record chunk는10,749B다.
Chunk 크기는 아직 제품 정책으로 채택하지 않았다.

원100 candidate+schedule charge1,174,650은 그대로다. 새 storage가 후보·수학 work를 줄인다고
계산하지 않는다. Source/index/finalization/신규 buffer write 계측을 포함한 전체 정책 ledger는
후행이며 이 수치를 전체 job cost라고 부르지 않는다. 현재 prototype는 point 배열을 기존 객체로
유지한다. Old/new point buffers, caller 입력, JS wrapper, oracle 보조 배열, encode/hash/completion
packet은 이웃 buffer ledger 밖에 명시적으로 남아 있다. 16MiB prototype reserve ceiling은 작은
연구의 실패 검사용이며 제품 상한 제안이 아니다. 제품 source와 default guard는 변경하지 않았다.

## 구현 순서와 완료 판정

1. 이 문서·원 소형 계측을 검토하고,완료된10k pair audit 및 density streaming ledger의 제한된 계측을
   CPU 조율 뒤 수행한다. 아직 default guard를 끄거나 unbounded full solver를 실행하지 않는다.
2. Density 간선별 stream/typed numeric buffer와 FDEB pair storage를 별도 private 개념으로 구현한다.
   작은 scalar full output·독립 oracle·signed zero/overflow/abort/order/immutability를 먼저 검증한다.
3. 채택한 policy/job/diagnostics/restore/bytes와 native B 경계를 한 coherent 공개 checkpoint로 연결한다.
   All getters/holes/ref/limits/forgery/changed revision/token/lateworker/Basic는 실패 원자성을 검사한다.
4. 실제 worker·main validation·commit·codec의 원100/1k/10k 전체 입력을 같은 archive3Node와 Chromium에서
   검증한다. 최초 budget/bytes/timeout 실패를 보존하고, 성공한 input을 성능 성공으로 확대하지 않는다.
5. Root 최종 combined archive에서만 DPR1/2 warmup5+30 P95, 원100cycle/retainedheap 및 네 renderer를
   수행한다. 계산 완료가 되어도 graphic10k/GraphPlot 한도는 별도 미완료로 남는다. 이 안은 AT82 완료가 아니다.

제품 파일 예상 범위는 `grammar/graph/routes/{budget,options,job,result,resultProvenance,common,density,
densityField,forceDirected}.js`, `materialization/graph/{routeInput,routeResource,routeState,routeRequest}.js`,
`resources/{graphRoutes,graphRouteExecutor}.js`와 선택한 native revision owner, 관련 types/Current/docs다.
Shared animation4와 benchmark 도구는 root 소유로 수정하지 않는다.
