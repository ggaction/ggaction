# 기존 inferred graph capacity 전달 보수

## 진행 상태

- [x] 공개·저장된 `maxNodes`/`maxEdges`와 내부 기본 한도 불일치 재현
- [x] 여섯 rule, feature 준비, exact search, candidate subset 및 restore에 기존 값 전달
- [x] 원본 모든 간선·행·typed 순서·가중치와 immutable revision/codec 검증
- [x] 집중 source 135개 및 변경 10 owner의 기존 critical floor 통과
- [x] 동일 archive의 Node20/22/24 공개 소비자·types·문서·6entry bundle 검증
- [ ] source pin 및 문서 정합 마감
- [ ] 원래 10k nodes × k10 전체 100k edges의 work-bound 지원
- [ ] 실제 inference worker·취소·늦은 결과·atomic prepared commit 및 최종 AT82 성능 검증

기준은 `90eb027cca2363514d1e78588b09c769cc811a59`이며
[전체 승인](../AUTHORIZATION.json)의 remainingApproval과 root의 기존 capacity 버그 분리 지시를 재사용한다.
새 public API/schema/algorithmVersion/work 정책/renderer를 추가하지 않는다.

## 원인과 수리

Current의 createInferredGraphData는 이미 `maxNodes`/`maxEdges`를 받으며 normalized definition에
저장한다. 그러나 neighbors/preprocess/structural/spanning/exact radius search는 지정값을 받지 않아
내부 기본10000을 적용했다. 원본1001×k10는 `maxEdges:10010`이어도
`Graph neighbor edges must not exceed 10000.`로 실패했다. source10001행의 명시 omit-node도
`maxNodes:10001`이 feature/neighbor 준비에 전달되지 않아 실패했다.

순수 field adapter가 한 쌍의 capacity를 명시 전달하며 기존 graphLimits 검증을 재사용한다.
MST candidate는 후보 resource의 저장 capacity로 전체 검증하고 출력 graph는 자신의 capacity를
사용한다. 별도의 candidate capacity를 출력의 더 작은 edge limit으로 덮지 않는다.
Source subset도 전체 candidate를 먼저 검사한 뒤 같은 capacity로 투영한다. Restore의 feature
준비도 원 definition capacity를 사용한다. 원본 raw keys·배열·행·옵션 검증을 생략하지 않는다.

## 실제 증거

`test/unit/actions/data/inferred-graph-limits.test.js`의 독립 전수 거리 정렬은1001×10의
10010간선 모두를 비교한다. source row와 endpoint, weight, typed tie/order, revision 및 저장 복원을
검사한다. radius/similarity/group은143개 원본에서10153간선 모두를 독립 pair loop로 비교한다.
10001행의 명시 누락 정책은 원 provenance와 omission10001개를 보존하며 빈 graph로 복원된다.
10001개의 관측 parallel candidate는 전부 검증되고 MST 두 간선과 subset10000간선이 보존된다.
작은 explicit maxEdges의 실패는 기존 program을 변경하지 않는다. Basic에 추론 action은 없다.

기존 graph grammar/input/수명/저장 검증과 recompute/filter 시험을 합친135개가 통과했다.
변경10owner는 lines100%, functions100%, branches 최저93.33%이며 canonical 각 floor를
`scripts/coverage-policy.js`의 assertCriticalCoverage로 검사했다. 별도 경계/type/package/discovery45개 통과.
최초 candidate test의 options fixture 오류와 처음 빠뜨린 recompute 소비자 coverage는 원본 로그에
남겼으며 최종 검증이 이를 대체한다. 제품 검증을 낮추지 않았다.

고정 archive `4d722cae212b0a2cb7a304077bbb074e30c7ba4b6290ff7fad33bfd0ce554639`에서
Node20/22/24가 각각 기존 lifecycle 및 새 explicit-capacity 두 runtime, strict graph-inference 선언,
실제 graph-inference 문서 snippet, optional peers 및 여섯 browser entry를 실행했다. 설치 fixture는
공개 package만 import하고 모든10010간선을 전수 oracle로 검사한다. Packed1,777,751bytes,
unpacked8,022,770bytes, entries1239다. 최초 unpacked cap 초과는8,022,800으로 최소 조정했다.
Node20 첫 Full gzip784,092bytes 초과는 원본 failed receipt를 보존하고 cap784,100으로 동일 측정을
재평가했다(Node24도784,092). 다른 entry 한도와 archive는 그대로다. 재평가는 재실행이라고 세지 않는다.

명령·원본 로그·coverage·고정 archive descriptor·각 Node receipt는
[inference-capacity-evidence](inference-capacity-evidence/summary.json)에 있다.

## 남은 실제 제한

원래10000개 grid nodes와 k10, `maxEdges:100000`은 이제 edge cap을 지나지만 여전히
`Graph exact search work must not exceed 10000000.`에서 거부된다. 이 실패도 owning regression이다.
기본10M work와 graphic10k를 높이지 않았으며 데이터·k·iteration·입력을 줄이지 않았다.
Capacity 전달 성공을 large 지원이나 worker/SLO 성공으로 세지 않는다. 기존 exact model/key 검증
비용과 가능한 중복 제거, 명시 bounded execution 정책 및 전용 inference preparation/worker는
별도 구체 설계와 checkpoint로 이어간다. 현재 이 checkpoint에는 그런 새 API가 없다.
