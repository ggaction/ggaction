# 추론 worker 준비 경계

## 진행 상태

- [x] 기존 동기 결과/기본 한도와 분리된 전용 worker executor 및 authentic 준비 결과 구현.
- [x] exact receiver/kind/token/input revision, own-data/hash/bytes, 취소/늦은 응답/100회 수명과 원자 실패 검증.
- [x] 실제 Chromium worker의100/1k/10k 원노드와 k10의 모든 간선·typed tie·direction·weight·sourceRows 독립 검산.
- [ ] 동일 archive Node20/22/24, 최종 source pin 문서 및 패키지 자격 마감.
- [ ] 최종 combined AT82 P95/retained heap/100cycle 성능 자격. 본 checkpoint는 SLO 통과가 아니다.

승인은 [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval 및 root가 채택한 [32c26e969 구체안](inference-execution-design.md)을 재사용한다. 전 단계 explicit execution은2f768950d로 완료했다. 이 단계는 새 전역 한도·algorithmVersion·추론 수학·원10000nodes/100000edges·k·renderer를 변경하지 않는다.

## 구현 경계

- `grammar/graph/inferenceDefinition.js`는 기존 stored definition 검증을 추출한다. `inferenceJob.js`는 exact ordered input refs·원행·candidate의 자체 한도를 plain job으로 소유하고 encoded128MiB admission을 hash/clone 전에 검증한다. 외부/structured-clone job은 전체 검증, exact deep-owned job만 private WeakSet 단축이다.
- 기존 inference owner의 work charge/formula는 유지한다. optional signal은 별도 인자로 전달되고 반복 계산 checkpoint가 검사한다. Executor는 원 worker를 terminate하므로 다른 event loop에서 취소할 수 있다.
- `resources/graphInferenceExecutor.js`는 필수 worker factory·pending1·cache0·fresh worker1·terminal1을 소유한다. `graphInference.js`는 정확한 Full constructor의 closed program, request/token, native source binding을 소유한다. Basic/등록되지 않은 파생 constructor·복제 handle·다른 receiver/restore clone·다른 action/token은 오류다.
- `materialization/graph/inferenceRequest.js`를 기존 동기 create/edit과 공유한다. 완료된 resource는 기존 stored/model/source/weight/diagnostics 검증을 모두 통과해야 한다. Worker는 신뢰된 host 계산 provider이며 consistency hash는 수학적 최적성 증명이 아니다. Main에서 solver를 다시 실행하지 않는다.
- 준비 중 원 state/trace를 쓰지 않고 기존 create/edit의 배타적 `{prepared,requestToken}` 적용이 한 번 closure를 실행한다. 후속 fixed-layout 실패도 원 program/trace를 보존한다. Worker/promise/signal/token은 저장하지 않는다.
- Source revision의 기존 동기 resource closure와 전역10M/graphic/layout/route 경계는 바뀌지 않는다. Job과 completion 각각128MiB는 전체 heap 보장이 아니다. Editable program codec에 존재하지 않는64MiB guard를 추가하지 않는다.

## 실행 근거와 한계

원본 실패는 evidence에 보존한다. 첫 host fixture는 directed candidate를 MST에 잘못 넘겨 오류를 worker error로 전달하지 않았으며, fixture의 undirected candidate와 실제 worker error 전달을 복구했다. 첫 browser 실행은 존재하지 않는 host chart 이름을 사용했다. 전체 결과의 독립 검산 자체는 통과했지만 browser error 때문에 전체 실패로 보존하고 정본 host 이름으로 재실행했다. 최초 문서5실패는 stale source fingerprint/LLM와 실제 search byte ceiling으로 분리한다.

Chromium 측정은 functional single run이다. prepare 시간은 startup/message copy/worker compute/main validation을 포함하며 commit은 별도다. 따라서 medium/large SLO, final P95, retained heap 또는 AT82 완료로 집계하지 않는다. 원크기·간선·반복·한도를 줄이지 않았고 worker의 모든100000edge를 독립 lattice-shell oracle로 검사했다. Oracle는 제품 search/metric/key helper를 import하지 않으며 literal 및 small all-pairs 증거는 기존 `test/unit/grammar/graph/inference-grid-oracle.test.js`에 있다.

정확한 공개 계약은 [Current GRAPHS](../../../contract/current/GRAPHS.md#inferred-graph-worker-preparation), 실행 로그·archive·최종 source ref는 [summary](inference-worker-evidence/summary.json)가 소유한다.
