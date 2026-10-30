# Route host 옵션과 후행 qualification 감사

## 진행 상태

- [x] AT82 원문과 기존 worker/cache/size guard owner 확인
- [x] 상속된 getter 실행 반례와 기존 own-data 계약 수리
- [x] native host/source/revision 20개 및 두 owner critical coverage 검증
- [x] package·source boundary·discovery 43개 검증
- [ ] 새 고정 archive의 public own-host·실제 worker/cache 설치 검증
- [ ] 설치·실측 및 source-pinned 문서 증거 마감
- [ ] AT82 Chromium production sizeclass/SLO·retained heap qualification

기존 [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval 범위에서 기존 입력
계약을 보수한다. 새 API·저장 schema·지원 한도는 추가하지 않는다.

## 발견과 최소 수리

`ownRecord`는 own descriptors를 검사하지만 원 객체를 그대로 반환한다. 실행기/준비 owner가
생략한 `createWorker`, `signal`, `executor`와 필수 `requestToken`, `kind`를 일반 속성 읽기로
접근하면 Object.prototype의 getter를 실행할 수 있었다. `createGraphRouteExecutor({})`의
독립 최초 재현은 inherited getter 1회 후 예외였다.

입력 경계 네 곳에서 기존 ownRecord 검사를 먼저 수행하고 enumerable own 값을
null-prototype record에 얕게 복사한다. 함수·AbortSignal·authentic executor의 실제 own 값은
동일 객체를 유지한다. 새 validator나 registry를 만들지 않고 기존 unknown/descriptor/native
signal 검사를 그대로 사용한다. 생성 옵션, compute args, prepare request와 host만 수정한다.

회귀는 다섯 property 각각에 throwing inherited getter를 설치해 reads=0을 확인한다.
필수 own 값이 없으면 기존 오류로 거절하고, optional 값은 생략 의미로 처리한다. 정상 own
worker·AbortSignal의 취소/cleanup/cache·snapshot 검증은 기존 host suite에서 함께 실행한다.
이전 native program의 serialized snapshot도 불변이다.

## AT82에서 이미 있는 것과 남은 것

- `resources/graphRouteExecutor.js`: instance LRU8개/총1M samples, pending8개,
  exact job/result hash, cache eviction, 완료·오류·abort·dispose cleanup.
- `graph-route-host.test.js`: 실제 worker parity, stale/forged/ABA, LRU·late callback·
  cleanup 예외·construction 재진입. `interaction-update.test.js`와 기존
  [lifecycle evidence](lifecycle-matrix-evidence/qualification.json)는 100회 controlled
  worker/observer/asset lifetime 및 별도 실제 browser worker를 구분해 증명한다.
- 원 qualification 계약의 production Chromium DPR1/2 warmup5+30회 측정,
  bundling100/1k/10k edges 단계별 P95·메모리와 retained-heap slope는 이 작은
  수리의 범위로 완료했다고 집계하지 않는다. 기존 일반 benchmark-runtime은 다른 workload의
  Node 측정이며 그 증거로 대체할 수 없다.
- 원본의 budget error는 안전성 결과이며 해당 sizeclass 성능 성공과 구분한다.
  renderer parity와 worker/cache/runtime lifetime의 기존 검증을 재사용하되 AT82 전체,
  STEP070/074/077 종료는 여전히 후행이다.
