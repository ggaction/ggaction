# Route v2: 명시 policy와 중단 가능한 native 준비 제안

## 진행 상태와 권한

- [x] source `207e18ac7e87aab25ff2c56f8e3eeacf10186d81`의 private cursor·job·result·host 경계 대조
- [x] 기존 scalar ledger로 다섯 숫자의 구체 후보와 적용 단위 계산
- [x] 원 native job 본문에서 hash만 iterator로 연결한 소형8종, Node20/22/24 검증
- [x] 공개 API·저장 header·proof/게시·복수 route 정책의 구체 제안
- [ ] root의 제안 채택 기록 및 제품 구현
- [ ] 원 density1k/10k ledger, native update 전체 union, 실제100ms·heap·SLO 검증

상태는 **ready-for-review**, 제품 미채택 제안이다. [remainingApproval](../AUTHORIZATION.json)의
기존 사용자 승인 아래 root가 구체안을 검토·채택한다. 사용자에게 같은 승인을 다시 요청하지 않는다.
이번 checkpoint는 문서와 연구용 도구만 바꾸며 API/types/Current/runtime/package 변경은0이다.
[기존 수치 ledger](route-bounded-policy-ledger.md), [B native 준비 방향](route-native-update-boundary.md),
[private cursor의 제품 증거](strict-value-cursor.md)를 이어받는다. 완성된 primitive와 route v2 지원은
구분한다. STEP/AT 완료나 원10k 성공을 이 제안만으로 올리지 않는다.

## 1. 사용자 표면: 명시 v2 선택, 동기 v1 보존

`BundleGraphEdgesOptions.options.execution` 및 `EditEdgeRouteOptions.options.execution`에 다음
닫힌 own-data record가 있을 때만 v2를 선택한다. 필드 누락, own undefined/null, unknown property,
Infinity, noninteger,0,음수,hard maximum 초과를 거부한다. 모든 숫자를 호출자가 명시한다.

```js
execution: {
  policy: 'bounded-route@1',
  maxWork: 8_000_000_000,
  maxCandidatePairs: 50_000_000,
  maxSamples: 16_777_216,
  maxBufferBytes: 134_217_728,
  maxBytes: 134_217_728
}
```

위 값은 **제안 hard maxima를 전부 사용하는 예시**이며 숫자 기본값이 아니다. Execution을 생략하면
현재 v1 default/동기 API/hash/오류/guard 그대로다. `editEdgeRoute`의 기존 persisted option 유지 규칙은
보존한다. 이미 v2인 resource의 같은 method 부분 edit에서 execution을 생략하면 원 v2 policy를 유지하며, 옵션
생략을 v1 downgrade로 해석하지 않는다. V2 resource의 method를 바꾸면 execution을 다시 명시하도록 요구한다. V2→v1 전환은 이 제안의 암묵 기능으로 만들지 않는다.
일반 동기 `bundleGraphEdges`가 raw v2 request를 받으면 prepare 경로를 요구하는 명시 오류다.
V2도 최종 apply는 기존 authentic prepared create/edit 표면을 쓴다.

V2 `options.limits`는 기존 `maxNodes=100_000`, `maxEdges=1_000_000` 두 필드와 그 hard maxima만
소유한다. 두 값은 현재와 같이 생략 가능하다. V2의 limits 아래 maxSamples/maxCandidatePairs는
중복 권위이므로 거부한다. V1의 기존4필드 limits는 바꾸지 않는다. Policy의 숫자는 수학 옵션이
아니며 `routeNumericOptions`의 **v2 branch만** execution을 제외한다.

`ggaction/graph`의 구체 추가/변경 제안:

- 현재 `computeGraphEdgeRoutes(jobV1, signal?)`의 sync 반환과 v1 허용 범위를 그대로 유지한다.
- `computeGraphEdgeRoutesAsync(jobV2, signal?): Promise<GraphRouteCompletionV2>`를 별도 추가한다.
  V2 전용이며 v1을 새 비동기 의미로 조용히 바꾸지 않는다. Worker entry도 이 함수를 await한다.
  Pure solver는 private iterator를 제공하고 실제 macrotask drain은 host/worker adapter가 소유한다.
- 현재 exported `GraphRouteJob`/`GraphRouteCompletion` v1 interface는 유지하고 `GraphRouteJobV2`와
  `GraphRouteCompletionV2`를 추가한다. Executor/worker의 인자는 두 job의 union, executor.compute는
  job version별 completion overload로 선언한다. Existing sync function의 인자는 v1 그대로다.
- `prepareGraphEdgeRoutes(program, request, host)`의 create/edit 표면은 유지한다. V2 host는 현재
  authentic executor와 `deadlineMs`를 필수로 받는다. Deadline은 positive safe integer≤30_000ms,
  **기본값 없음**이다. V1 host는 deadlineMs를 받지 않는 현재 contract를 유지한다.
- V2 executor는 real createWorker가 설정된 경우만 허용한다. 암묵 동기 fallback은 없다. V2 요청 중
  같은 executor의 다른 v1/v2 요청을 거부하며, 이미 pending v1이 있을 때도 v2를 거부한다. V2 시작에
  기존 cache를 비우고 v2 완료는 cache에 보관하지 않는다. V1-only pending8/cache8 정책은 그대로다.
- B 방향의 `kind:'update', edit:{action,args}`와 Full 전용
  `applyGraphEdgeRoutesUpdate({prepared,requestToken})`를 사용한다. Update의 exact typed args/alias/
  childPath는 원 action owner가 해석하며 일반 함수·callback·미래 wildcard action은 받지 않는다.
  이 표면의 완전 union은 아래7절 증거 없이는 구현 완료로 셀 수 없다.

Deadline은 전체 prepare 시작부터 snapshot·worker·검증·native 계획 완료까지 한 번만 측정한다.
30초는 원10k의 기존 성공 SLO와 기존 bounded 진단의 외곽 제한에서 고른 후보이며 성공 허용 시간을
늘리지 않는다. 원100500ms/1k5000ms/10k30000ms benchmark와5warmup/30measured를 그대로 적용한다.
Deadline timer 자체가 main thread를 선점하지 못하므로100ms 증거를 대신하지 않는다.

## 2. 다섯 hard maxima의 근거와 한계

[산술 도구](route-v2-proposal-evidence/numeric.mjs)는 새 큰 solver를 돌리지 않고 이전 전수
compatibility 감사와 현재 schedule을 사용한다. BigInt 산술 및 고정 크기 route1개의 canonical bytes를
검산한다. [고정 결과](route-v2-proposal-evidence/numeric.json)는 다음 후보를 산출한다.

| 필드 | 제안 hard maximum | 단위·선정 근거 | 아직 보장하지 않는 것 |
|---|---:|---|---|
| maxWork | 8,000,000,000 | 원 force10k solver 보수 상계7,750,485,000 위의 명시 ceiling | 전체 native transaction·복수10k job·density1k/10k 완료 |
| maxCandidatePairs | 50,000,000 | 원10k의49,995,000 모든 pair 포함 | 원 pair charge 또는165회 축소 허용 |
| maxSamples | 16,777,216 | 기존 단위 유지, 원 density10k 초기13,400,000을 넘는 다음2의 거듭제곱 | density 후반20회 peak·완주 |
| maxBufferBytes | 134,217,728 | force10k typed neighbors106,150,020B와 bounded hash scratch 여유; density10k 초기35,752,764B | 객체/Map/engine/transport 전체 heap 상한 |
| maxBytes | 134,217,728 | 원 force10k completion 구조 상계60,851,065B 위 여유 | 임의 속성 job·다른 method·density1k/10k packet 크기 |

8B는 기능 허용 후보이고 성능 약속이 아니다. 모든 후보는 root 채택 전이며 source guard를 바꾸지
않았다. Density100의 실제20회 work87,128,940, peakSamples434,107, packed 준비1,097,148B,
completion9,821,768B는 원 ledger 값 그대로다. 이를10/100배로 늘려 원1k/10k 완료라고 계산하지 않는다.
16Mi samples와128MiB packet은 후반 density에서 거부될 수 있다. 원1k/10k 전체 ledger가 이 cap을
넘으면 숫자만 올리는 대신 저장 수명/실행 비용을 조사하고 새 근거로 제안을 다시 구체화해야 한다.

Force에서 E=edge 수, C=모든 pair, A=실제 compatible pair라 할 때 원 schedule work는
`sum(E*(internal+2) + iterations*(2E + 5E*internal + A*internal))`다. 기존 pair charge는 C+16C이며
finalization은34points×2vectors×4×E다. 기존 native 입력 preflight10M을 보수 상계로 더했다.

| 원 E | C | A | schedule work | solver 상계(10M prepare+17C+schedule+272E) |
|---:|---:|---:|---:|---:|
| 100 | 4,950 | 750 | 1,090,500 | 11,201,850 |
| 1,000 | 499,500 | 80,500 | 72,225,000 | 90,988,500 |
| 10,000 | 49,995,000 | 8,145,000 | 6,887,850,000 | 7,750,485,000 |

10M prepare는 실제값이 아닌 느슨한 상계다. Host의 반복 job/result 검증·다중 fit work는 이 표 밖이며
전체 request ledger에 추가한다. Original graph/model guard는 이 제안으로 완화하지 않는다.
Force neighbor upper는 `8E+4 +13*ceil(A/32768)*32768`이다. 마지막 chunk가 candidate remainder로
줄어드는 작은 case에도 보수 상계로 사용한다. 원10k peakSamples는700,000이다.

60,851,065B는 원 fixture의 numeric row keys0..9999, 모든 finite coordinate의25-character JSON
표현 상계, force의34controls/34commands, 제안 v2 header+최대 diagnostics를 적용한 구조 상계다.
한 route6084B와 route 사이 comma9999개를 사용한다. 임의 graph attribute나 job 크기 증거가 아니다.
원 fixture의 nondegenerate force provenance를 대상으로 하므로 다른 입력의 reason/key 폭을 추정하지
않는다. 모든 route/iteration/scalar 순서·±0·canonical 문자열은 그대로다.

## 3. policy 한 곳, 요청 ledger 한 곳

Persisted resource intent의 execution이 해당 route policy의 유일한 권위다. V2 job input에 limits를
다시 저장하지 않는다. Solver에 필요한 effective input은 검증된 intent에서 private owner가 만들어
전달하며 raw 요청의 두 limits를 min/max/last-write로 화해시키지 않는다.

Native update는 여러 route/fit pass를 포함할 수 있다. Request owner는 하나의 누적 work/pairs,
동시 sample charge/직접 buffer reservation ledger를 유지한다. 새로운 job/pass를 만들 때 ledger를
0으로 초기화하지 않는다. 영향을 받는 **각 v2 resource의 명시 policy를 같은 전체 ledger에 대조**한다.
어느 하나라도 실패하면 전체 요청이 원자적으로 실패하며 persisted policy를 재작성하지 않는다.
이는 서로 다른 route의 독립 policy를 읽는 것이며 동일 job의 중복 권위를 생성하지 않는다. 서로
다른 한도의 두 route가 요청 전체 비용을 각각 감당해야 한다는 의미를 문서/오류에 명시하고,
heterogeneous policy 성공·거부 fixture를 필수로 둔다. V1 route가 함께 영향을 받으면 해당 v1 계산의
원 자체 guard도 유지하고 실제 발생한 비용을 공통 요청에 추가한다.

Work/pairs는 합산, samples/buffers는 기존 단위의 동시 최대·예약량이다. 완성 route를 held result로
보관하는 동안의 sample 수명도 ledger에 포함한다. maxBytes는 각 canonical job/completion packet의
개별 한도이며 모든 packet의 무조건 합산 한도로 바꾸지 않는다. 전체 object/packet resident heap은
별도 실제 lifetime 검증 대상이다. Typed buffer는 할당 전 예약하고 finally에서 반환하며 source
`forceNeighbors.js`의 upper-triangle chunk·`densitySamples.js`의 packed representation을 그대로 쓴다.
`maxSamples`의6S를 typed2S로 재정의하거나 field 방문·density20회/force165회를 줄이지 않는다.

## 4. 저장 header와 bytes/hash 범위

제안 job은 다음 exact own fields만 허용한다. Hierarchy는 해당 method만 필수다.

```text
{schemaVersion:2, algorithmVersion, inputs, intent,
 input:{model,positions,order}, viewport, [hierarchy], inputHash}
```

`algorithmVersion`은 현재 method별 수학 문자열 그대로다. Inputs는 graph/layout 및 필요한
hierarchy/layout의 정확 순서/identity/revision이다. World viewport=null, screen viewport는 실제 확정된
{x,y,width,height}다. inputHash는 inputHash 필드만 제외한 전체 body의 canonical tagged bytes SHA256이며
intent.execution도 포함한다. Header의 hash64자리 비용까지 maxBytes에 예약한다.

완료 packet은 exact `{schemaVersion:2,inputHash,resultHash,result}`다. Result는 기존
`{complete:true,routes,diagnostics,options}` 구조이며 numeric options에서 execution/limits/mapping은
제외한다. Diagnostics는 현재 method별 정확 필드에 `peakBufferBytes` 하나를 추가하고 policy 값은
중복 저장하지 않는다. resultHash는 result만의 canonical tagged bytes SHA256이다. maxBytes는 header를
포함한 완료 packet 전체에 적용하며 encodedBytes 같은 자기 참조 진단 필드를 만들지 않는다.

저장 resource는 기존 kind:`edge-route`를 유지하고 resource `algorithmVersion:'2'`로 v2 reader를
선택한다. Method provenance version은 바꾸지 않는다. options intent에 execution을 저장하며 result의
기존 viewport/inputHash/resultHash/complete/routes/diagnostics 구조를 유지한다. 저장 resource의 version이
reader를 선택하므로 result 안에 completion schemaVersion을 또 넣지 않는다. V1 resource version1과
기존 deserialize/hash bytes는 그대로다. V2의 전체 resource round-trip, exact stored fields, typed keys,
unknown/undefined/혼합 version 거부를 public declarations/Current/docs와 함께 검증해야 한다.

V2 result validator는 기존 endpoint/order/finite geometry/bounds/provenance/schedule 검사를 모두
재사용하고 execution ledger를 명시로 전달한다. `resultProvenance.js`의work10M 및 `result.js`의 최종
`validateWorkLimit`을 전역 수정하지 않는다. V2 branch만 scoped maxWork를 적용한다. Displacement 등
수학 cardinality guard는 해당 원 식을 유지한다. V1 `routeValueHash` 전체 교체는 제외한다.

## 5. snapshot→iterator→native proof→최종 handle

1. Host는 abort/deadline과 exact Full receiver/constructor/token/native request/refs를 검사한다.
   원 source/row/UUID/child identity 계획을 한 번 확정한다. Raw caller args를 await 뒤 다시 읽지 않는다.
2. Native job owner가 domain 검증을 마치고 deep-owned snapshot을 만든다. Core cursor의 isOwned는
   domain 권한이 아니다. 원 `validatedJobs` WeakSet과 원 prepared WeakMap만 proof owner로 유지한다.
3. Immutable body를 strict cursor로 읽어 기존 incremental SHA owner에 공급한다. V2 internal depth는
   private cursor의128, total maxSteps는 해당 stream maxBytes로 정한다. 각 step은 최소1byte를 내므로
   유효 완료 stream의 steps≤bytes다. 이 식은 descriptor/BigInt CPU 시간을 제한하지는 않는다.
   Chunk≤64KiB/4096steps와 실제 timer/MessageChannel macrotask 사이 abort/deadline 검사를 둔다.
4. 마지막 chunk 뒤에도 host가 abort/deadline을 검사한 다음 native generator를 완료시킨다. Body hash와
   전체 job bytes를 모두 확인한 뒤에만 **원 동일 module의 validatedJobs.add(job)**를 한다. Job proof는
   아직 prepared handle 또는 resource write 권한이 아니다.
5. Worker의 결과 및 custom executor event.data는 외부 mutable 입력이다. 첫 await 전에 native strict
   validation을 거친 자체 snapshot을 확보해야 한다. Raw message.data를 coroutine frame에 보관한 채
   다음 turn에 검증하지 않는다. Worker clone/freeze/hash 일치만으로 기존 proof를 우회하지 않는다.
6. Result header/options/member/endpoints/bounds/provenance/diagnostics/hash/byte 검증과 후속 native
   materialization 계획을 끝낸 뒤 exact receiver+constructor+kind+token+refs에 결합된 원 prepared owner가
   handle을 등록한다. 실패/취소/late packet은 terminal1회·게시0·원 program/history/trace 변경0이다.
7. Final apply는 동일 owner가 검산한 계획과 현재 base identity를 소비한다. Resource write는 기존
   preparedResourceContext 권한으로만 수행한다. Async 준비용 제2proof registry나 authentic처럼
   보이는 frozen record는 만들지 않는다. SHA/cursor/worker/listener/timer/buffer 참조는 finally에서 해제한다.

## 6. 소형 native iterator 증거와100ms 잔여

[추출 도구](route-v2-proposal-evidence/job-stages.mjs)는 actual job.js 전체를 ignored temp module로
복사하고, 원 createRouteJob 본문의 마지막 hash 지점만 generator로 바꾼 함수를 추가한다. 원 validation과
clone/body 그대로이며 payload/viewport 참조를 첫 yield 전에 지운다. 원 same-module validatedJobs.add가
hash완료 뒤 실행되는 것은 그대로 두고 등록 횟수만 관찰한다. Product owner/registry는 수정하지 않는다.

[검산](route-v2-proposal-evidence/audit.mjs)은 edge-path/force-directed/density/hierarchical×world/screen의
3node/3edge native job8개를 사용한다. HEB는 실제 hierarchy anchors와 같은 fixed graph layout을 쓴다.
Node20.20.2/22.23.1/24.22.1 각8개 결과가 native createRouteJob과 deepEqual이고8hash가 런타임 간
동일했다. 첫 yield 뒤 raw input/ref/viewport를 timer에서 바꿔도 job은 같다. 동일 temporary module은
기존 proof identity를 재사용하고 canonical 제품 module은 별도 full validation으로 새 deepEqual job를
만든다. 각 job의 첫/마지막 hash chunk에서 timer abort를 걸면 등록0·게시0·activeHashes0이다.
Abort-before-input 및 getter실행0도 검증한다. 최종 각 report는registrations8/activeHashes0이다.

첫 harness의 HEB value field, tree explicit options, graph/hierarchy anchor mismatch 실패3건은
원로그로 보존했다. 정적 검토에서 발견한 JSON finite number의24→25자리 상계 정정도 기록했다. 모두 도구/fixture 수정이며 production 완화가 아니다. 이 검산은 solver 실행도 native
prepared handle 게시도 하지 않았다. V2 schema/수치 admission, worker transfer, renderer/SLO를
검증했다고 확대하지 않는다. 새로운 archive를 만들지 않았고 product source는207과 동일하다.

| 남은 동기 구간 | 왜 현재100ms 증거가 아닌가 | 다음 좁은 구현/증거 |
|---|---|---|
| 초기 immutable acquisition | clone/graph indexing/typed key sort가 첫 yield 전 끝난다 | 이미 owned native model 재사용과 각 validation phase iterator, 원 snapshot 의미·오류 순서 대조 |
| wide record key/descriptor | ownRecord/ownArray와Object.keys가 한 번에 모든 key를 수집한다 | bounded schema traversal 또는 사전 한정 cardinality, arbitrary wide attrs 허용 경계의 concrete 검토 |
| BigInt decimal·typed key | 기존 encodeValue/encodeRowKey의 decimal 변환이 atomic이다 | 같은 scalar owner에서 지원 가능한 strict 크기 검사/변환 경계 검토; v1 변경 금지 |
| postMessage/structured clone | whole immutable job/completion 전송도 host 내부 atomic 작업이다 | 실제 original1k/10k 전송 지연 측정, 필요 시 별도 bounded packet 전송 제안·채택; 아직 transport 변경 없음 |
| result clone/hash/validation | mutable completion snapshot, per-route bounds/provenance가 동기다 | exact native result owner의 strict iterator와 snapshot 격리 |
| 최종 materialization/fit | guide/GraphPlot/GeoRoute/child rematerialization의 큰 loop가 남는다 | 실제 native plan 재개·fit aggregate ledger·최종 publish 전 완료 |

Private cursor chunk의 latency만으로 전체 prepare100ms를 선언하지 않는다. Hostile Proxy/createWorker
callback 자체의 임의 실행시간은 선점할 수 없고, 지원하는 native own-data의 stage를 측정한다.
원 입력/model/route math와 sample/iteration/guard를 줄여 통과시키지 않는다.

## 7. typed storage와 native union의 완료 의무

Typed force neighbors와 packed density samples는 이미 제품에 있으나 큰 v2 policy 예약과 result/
packet 수명을 아직 연결하지 않았다. Force schedule의6.887Bwork, density 후반 sample/object 증가,
wide key/BigInt/초기 snapshot 비용은 현재 cursor 하나로 사라지지 않는다.

기존 직접14개 operation은 전체 native update의 closed union이 아니다. Source90ae의
[332개 action 후보](density-schedule-evidence/native-union.json)는 누락 탐색용 상위집합이다. 332개를
runtime allowlist로 그대로 허용하지 않는다. 정확 source call-site 및 positive fixture에 따라 action을
명시로 선택해야 한다. 기존22derived editor(특히editBin2DData/editRegressionStatisticsData), guide/
scale15channel/encoding/mark, typography/theme/fonts, composition/facet/shared guide/childresize,
remove/cascade를 포함한 실제 closure가 남아 있다. Alias trace와 원 native args를 유지한다.

Route→GeoRoute→projection→GraphPlot/GeoLine DAG 및 actual occupied bounds를 사용한다. Fit 과정에서
route를 지우거나 straight line으로 바꾸지 않는다. UUID 재배정/전체 action throw-and-retry로 재시작하지
않는다. Bounded route가 exact target closure에 없는 unrelated update는 ordinary 경로를 안내하고
arbitrary action 실행기로 사용하지 않는다. 원10k edges+10k nodes GraphPlot은 기존 generic graphic10k
한도와 충돌할 수 있으므로 solver policy admission을 전체 renderer 지원이라고 세지 않는다.
이 별도 capacity 문제도 guard를 지우지 않고 실제 소유 구조와 증거로 해결할 의무다.

## 8. 재현과 채택 뒤 구현 순서

```sh
mkdir -p .artifacts/route-v2-proposal
node agent_docs/impl/roadmap9/chart/route-v2-proposal-evidence/job-stages.mjs
node agent_docs/impl/roadmap9/chart/route-v2-proposal-evidence/audit.mjs
node agent_docs/impl/roadmap9/chart/route-v2-proposal-evidence/numeric.mjs
node agent_docs/impl/roadmap9/chart/route-v2-proposal-evidence/verify.mjs
```

Node20/24 audit는 동일 tool의 마지막 인자로 output JSON 경로를 지정한다. 고정 qualification은 source와
도구·기존 ledger hash, 실제3Node receipt, 최초 실패 로그를 보존한다. Temp absolute import의 생성 hash는
원 실행 경로의 증거이며 다른 checkout 재현은 원 source/body hash 및 결과8hash로 비교한다.

채택 뒤 한 개념씩 진행한다: (1) v2 policy/header/types/Current의 일관된 narrow 경로,
(2) exact native snapshot+job/result iterator와 원 registry 연결,
(3) scoped buffer/sample/work ledger 및 worker deadline/lifecycle,
(4) B native update의 전체 phase/명시 union과 원자 apply,
(5) original100/1k/10k source-free 동일 archive3Node/Chromium·취소100ms·retained heap·100cycle·P95.
각 product checkpoint는 core owner100%와 bytes/getter/error/UTF16/holes/±0/BigInt/abort 회귀를 유지한다.
큰 진단은 root CPU 슬롯 배정 후에만 한 건씩 실행한다. 현재 proposal에는 새 큰 실행·PR·publish·deploy가 없다.
