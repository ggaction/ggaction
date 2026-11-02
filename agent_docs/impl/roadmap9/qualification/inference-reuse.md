# 추론 준비의 검증 증명 재사용

## 진행 상태

- [x] stable cb08d22a8 보존 및 원10000노드/100000간선 계측
- [x] root가 기존 remainingApproval 범위로 좁은 두 증명 경계를 채택
- [x] completion/job 및 prepared resource의 정확한 동일 객체 재검증만 제거
- [x] 복제·plain freeze·다른 source/constructor·codec·abort/late 회귀와3개 owner coverage
- [ ] 같은 package3Node·실제 Chromium worker 및 source pin 자격 마감
- [ ] 최종 combined AT82 P95/retained heap/100cycle

승인은 [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval 및2026-11-02 root의 구체안 채택을 재사용한다. 기존 source6644a8aef, qualification cb08d22a8 위의 독립 checkpoint다. Benchmark 도구·공유 animation4·원fixture·추론 수학·work charge·전역guard·공개schema·타입을 바꾸지 않는다.

## 실제 중복과 최소 수정

임시 ESM loader가 함수 경계에 단발 계측만 추가하며 원10k worker 결과를 독립 lattice-shell oracle로 전수 검산한다. Prepare에서 completion validator가 두 번 실행되어 model/index/bytes/hash를 반복했다. Native commit에서 같은 prepared resource의 stored validation이 두 번 더 실행됐다. 기존 `cloneAndFreeze`는 이미 소유된 값 자체를 재사용하므로 복사 일반화를 추가하지 않는다.

1. `validateInferenceCompletion`은 전체byte/model/hash 검증과 deep clone 완료 후에만 exact completion→exact normalized job의 WeakMap proof를 등록한다. 같은 쌍만 반환을 재사용한다. Compute output 자체·외부/복제·다른job은 이 권한을 부여하지 않는다. Abort는 executor와 prepare의 기존 검사가 lookup보다 앞선다.
2. `validatePreparedInferredResource`는 원 stored+binding 검증을 모두 수행한 뒤 deep-owned resource만 WeakSet에 등록한다. 같은 resource의 stored 검사만 생략하고 generic envelope/constructor/ID/revision/행 참조 및 매 commit의 source/metric/binding 검증은 유지한다. 예산·hash·오류 및원행의 저장형식은 바꾸지 않는다.

계측 before/after의 main prepare에서 hash3→2, model index3→2, byte 검사7→6이 확인됐다. Commit의 model index2→0, result byte2회 제거, source binding1회는 그대로다. 출력100000간선과 search work31,318,394는 동일하다. 두 계측 사이 root/peer 기능검사 부하가 달라 시간은 성능 비교나 P95/SLO 증거가 아니다. 원시시간과 최초 test fixture/상한 실패를 함께 보존한다.

## 검증 범위

새 회귀는 exact job·owned completion만 재사용하고 plain freeze/clone/참조교체/다른 revision·hostile accessor를 검증한다. Prepared resource를 같은ID/revision이지만 다른 실제 field 값에 적용해도 binding 검증이 실패한다. Missing source/Basic/복제 corruption/codec 및 원 trace 불변도 검증한다. 최초 다른source fixture는 logicalId까지 달라 먼저 stale-ref 오류가 발생했으므로 동일ref·다른값 반례로 좁혀 binding 검사까지 도달하게 했다. 이 fixture 조정은 runtime 변경이 아니다.

정확한 결과와 미완료 의무는 [summary](inference-reuse-evidence/summary.json)에 둔다.

## 계측 재현

증거의 `profile*.mjs.txt` 세 파일을 `.artifacts/inference-reuse/`에 `.txt` 없이 복사하고 root에서 `node --loader ./.artifacts/inference-reuse/profile-loader.mjs .artifacts/inference-reuse/profile.mjs 10000 <prefix>`를 실행한다. Baseline cb08과 현재 소스 각각 실행한 inclusive 함수 시간은 서로 중첩되므로 합계로 해석하지 않는다. Loader는 제품 파일을 쓰지 않고 실제 worker의 원결과를 그대로 전달한다. 정본 benchmark 도구는 수정하지 않았다.

같은 archive의 Node24 첫 검사는 모든 기능·type·문서 예제는 통과했지만 graph entry의 gzip67,610bytes가 기존67,600bytes를 넘었다. 최초 receipt를 보존하고67,700의 최소 백 단위 상한에 같은 측정값을 재검산했다. Package 실측은1246entries/Node20packed1,787,331/unpacked8,055,120으로 각각1,787,400/8,055,200 한도를 적용한다. Full 및 다른 entry 한도는 보존한다.
