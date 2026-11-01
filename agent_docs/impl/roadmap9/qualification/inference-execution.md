# 명시 inferred graph 실행 정책

## 진행 상태

- [x] 기존 remainingApproval과 root의 `32c26e969` 구체안 채택 기록
- [x] 기본10M 정책을 유지하고 명시 inference owner별 work·encoded bytes 검증 연결
- [x] 원10000nodes/k10의100000간선 전체 독립 oracle 및 immutable/codec 검증
- [x] 여섯 rule·candidate 자체 정책·source revise·recompute·Basic·stored corruption 회귀
- [x] 변경16owner canonical critical floors와 source/package/discovery/type 경계
- [ ] 동일 고정 archive3Node 및 source pin·문서 마감
- [ ] 전용 worker·prepared commit·취소/늦은 결과/실제 browser stage
- [ ] 최종 combined archive의 AT82 P95·retained heap·100cycle qualification

[전체 승인](../AUTHORIZATION.json)의 remainingApproval을 재사용한다. 구체 결정과 원래 작업량·byte
계측은 [채택 설계](inference-execution-design.md)에 보존한다. 이번 범위는 명시 execution 정책과
기존 동기 resource lifecycle이다. 새 worker API는 다음 별도 checkpoint다.

## 구현과 한도

기존 definition에 optional `execution:{policy:'bounded-inference@1',maxWork,maxBytes}`를 저장한다.
양 한도는 양의 safe integer이며 최대100,000,000work/134,217,728encoded bytes다. 생략하면
기존10M work와 저장 shape를 유지한다. 각 source/search/model의 기존 누적 charge와 결과값은
바뀌지 않는다. 전역 work, 일반 layout/graphic, 다른 resource 및 route executor 한도는 그대로다.

`grammar/graph/inferenceBudget.js`는 closed own-data policy, 기존 owner별 work 검사 및 기존
`canonicalJSON(encodeValue(value))`의 정확 UTF-8 길이 검사를 소유한다. 완전 encoded 표현을 먼저
할당하지 않으며 descriptor/배열 길이/문자열 길이를 검사한다. 깊이64, cycle, 비plain 값과 accessor는
닫힌 오류다. input `{rows,definition,candidate?,candidateLimits?}`와 result `{model,diagnostics}`를
각각 검사한다. model clone 전 byte preflight도 수행한다. maxBytes는 JS heap ceiling이 아니다.

`inferenceResult.js`는 기존 중복 edges와 prepared vectors를 제외한 diagnostics 조립을 공유한다.
source 변경·rule 교체·candidate subset·stored validation은 같은 definition policy를 읽는다.
MST 후보 graph는 자신의 저장 policy로 검증하며 출력 graph의 작은 한도로 덮지 않는다.
원본 문자열·typed key·원행 검증을 생략하거나 model/key 비용을 낮추지 않았다.

## 정확성·실제 큰 입력

`test/oracles/inference-grid.js`는 제품 search를 import하지 않는 Manhattan shell oracle다.
작은 literal 및 별도37node all-pairs 정렬로 검산한 뒤 원10000개 grid nodes와 k10 전체100000
간선을 검사한다. source/target/order/weight/sourceRows/directed/origin/ruleId 모두 비교한다.
search work31,318,394, distance evaluations415,782와 algorithmVersion `1`/`kd-tree@1`이 보존된다.
기본 실행의10M 거부와 같은 graph의 일반 layout10M 거부를 함께 검증한다.

기존100node 결과와 여섯 rule(approximate 포함)의 전체 model/diagnostics가 exact 동일하다.
작은 한도, 잘못된 policy/work/weight/bytes, inherited getter, 긴 문자열/희소배열/Unicode/typed codec,
candidate12720간선→MST159→3node subset, source revise와 rule 교체를 독립 회귀로 고정했다.
기존 source135개에 새 검증을 합친158개가 통과했고 candidate 실행정책 분기를 추가한17개
소유 검사가 별도로 통과했다. 이는 중복 없는175개라고 집계하지 않는다. 변경16owner는 모두
lines/functions100%, branches 최소93.70%로 canonical floors를 통과했다.

실제 editable program은86,871,543bytes였으며 serialize→restore→reserialize가 exact 동일했다.
editable program codec에64MiB 한도는 없다. 별도 animation envelope의 한도를 혼동하거나
새 global guard를 추가하지 않았다. 단일 Node22 진단의 RSS1,164,312,576/heapUsed843,597,840bytes는
동시 allocation 관측값이며 GC 뒤 retained heap·P95·worker SLO로 세지 않는다.

## 검증 범위와 최초 실패

원본 로그는 [evidence](inference-execution-evidence/summary.json)에 보존한다. 첫 rule 교체 회귀는
필수 ruleId를 생략한 fixture라 이를 고쳤고, 처음 candidate branch88.89%는 실제 recompute 소비자로
보강해100%가 됐다. 최초 package1239entry 거부는 새2source의1241entry로, unpacked8,031,328은
8,031,400의 최소cap으로 반영했다. packed1,780,068은 기존1,780,500 이내다. 검색문서1,090,861bytes에
최소1,090,900cap을 적용했다. Full Node20 gzip785,207에785,300cap을 적용하며 최초 failed receipt를
지우지 않는다. 다른 entry 한도와 런타임 guard는 변경하지 않는다.

원 large worker는 아직 없다. 정책으로 전체 입력 계산이 가능해진 사실을 worker10s·원 AT82 전체
지원·STEP077 완료로 확대하지 않는다. 전용 immutable job/completion와 authentic prepared lifecycle은
채택 설계의 다음 단계이며 최종 성능은 root가 합산 archive로 별도 검증한다.
