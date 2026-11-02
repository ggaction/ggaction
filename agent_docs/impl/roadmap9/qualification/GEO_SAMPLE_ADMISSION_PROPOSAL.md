# Geo sampler C1 — 같은 호출의 검증 결과를 즉시 소비

## 진행 상태

- [x] Root가 C1 내부 최적화 방향을 기존 remainingApproval 범위로 허용
- [x] 정확한 제품 diff와 읽기 전용 baseline/candidate 비교
- [x] 일반 admission·오류 순서·실제 작업량·누적 guard 반례 증거
- [x] 후보 loader로 기존 Geo animation 131 tests 통과
- [x] Root의 exact checkpoint e4ce7d2f3 검토·채택
- [x] 제품 적용 및 capability tests 편입
- [ ] 제품 archive·설치 consumer·original100k 기능·exclusive canonical 성능 검증

Root는 2026-11-02에 [수명/호출 감사](GEO_LIFETIME_SCOPE_AUDIT.md)의 C1 방향을 검토하고, “같은 호출에서 한 번 검증한 exact immutable presentation/group을 즉시 소비하는 계산 분리”를 허용했다. 먼저 concrete diff와 diagnostics/aggregate work 동등성을 원격 checkpoint로 고정하도록 지시했다. 이 문서는 그 선행 검토 자료다. 새 사용자 승인 요청이나 새 공개 API/schema 결정은 아니다. **이 read-only checkpoint 시점의 제품 source는 변경하지 않았다.** C2와 global registry/cache 변경은 포함하지 않는다.

## 정확한 변경 경계

[proposal.patch](geo-sample-admission-evidence/proposal.patch)는 source `db1fd0890`의 세 파일만 대상으로 한다. 각 원 파일 SHA는 [manifest](geo-sample-admission-evidence/source-hashes.json)에 고정했다.

1. `geoState.js`는 실제 geometry 계산을 비공개 `resolveNormalizedAnimationGeoGeometry`로 분리한다. 기존 `resolveAnimationGeoGeometry(input)`는 여전히 full `normalizeAnimationGeoGroup`를 먼저 호출한다. 내부 `prepareAnimationGeoGeometry(input)` 역시 full normalize를 수행하고 **그 반환값만 캡처한 지역 closure**를 반환한다. `isOwned(input)` 하나로 검사 생략을 허용하는 함수는 없다.
2. `geoPresentation.js`의 private admission helper는 기존 snapshot→closed fields→group→styles→plotOrigin→frame 순서를 그대로 수행한다. sampler 전용 combined helper는 group 검사 위치에서 위 closure를 준비하지만, style/frame 검사가 모두 성공한 뒤에야 호출한다. 잘못된 style 뒤에 stream 오류가 먼저 발생하는 순서 역전이 없다. 반환은 `{presentation, resolved}`이고 두 payload는 기존 deep-owned 결과다. closure는 program/plan/meaning/serialized state에 저장되지 않는다.
3. `sampleGeoTracks`만 combined helper로 연결한다. interpolation, timeline/style/frame 조립, 작업량 누적, `accountWork`, output-point 한도, emissions/최종 freeze는 변경하지 않는다. 기존 일반 resolver와 `validateGeoAnimationPresentations` 복원 admission은 기존 full 검사 경로를 유지한다.

실제 수학 owner, `geoMarkGeometry`의 계산 전 validation, `projectGeometry`의 별도 input admission·clip·refinement·stream/output/commands 과금, concrete validation과 반환 동결은 동일하다. 새 내부 export는 package entry의 공개 API가 아니며 raw/untrusted 값을 받으면 항상 full admission을 수행한다. native authority 및 private prepared WeakSets도 그대로다.

## 중복 admission 제거가 안전한 이유와 한계

원 첫 presentation snapshot은 descriptor/cycle/depth/value/work 검사를 모두 끝내고 deep immutable JSON tree를 반환한다. shallow-owned 입력도 모든 descendant 소유권을 확인하므로 mutable child가 있으면 전수 복사한다. alias는 별도 복사하고 null prototype은 ordinary record로 정규화한다. 이어서 group, geometry, projection/style/frame의 원 검사를 완료한다.

그 직후의 두 번째 presentation admission과 세 번째 group admission은 **같은 변경 불가능한 값, 같은 고정 limit, 새로 초기화한 동일 budget**에서 다시 실행된다. 외부 callback/getter를 끼우지 않는다. 첫 full admission의 오류·작업량 한도는 그대로 적용되며, 그 뒤의 동일 반복만 줄인다. `normalizeGeometry`와 `validateGeoMarkGeometry`는 source를 바꾸지 않는다. 따라서 group 첫 admission이 통과한 뒤 같은 group의 재검사가 새 오류를 발견할 수 없다. 이 논리는 임의 owned 값이 이미 의미상 유효하다는 주장이 아니다.

중복 validation의 budget 호출 횟수가 그대로라고 주장하지 않는다. 독립 budget을 다시 초기화하던 중복 순회는 사라진다. 대신 원 최초 admission과 실제 stream/refinement/output budget, 반환 diagnostics, group 간 aggregate work 및 callback 순서는 그대로다. 기존 2M values·10M work guard를 늘리거나 실제 계산을 과금에서 빼지 않는다. 아래 trace는 이 구분을 명시적으로 검산한다.

## 재현과 증거

저장소 root에서 Node 22.23.1 이상으로 실행한다. 원 source hash가 다르면 runner가 즉시 거부한다. baseline과 candidate는 별도 프로세스에서 같은 fixture를 사용하며, loader가 메모리에서만 candidate를 적용한다. 재현 결과를 별도 경로에 쓸 수 있다.

```sh
node agent_docs/impl/roadmap9/qualification/geo-sample-admission-evidence/run.mjs /absolute/output-directory
GEO_C1_MODE=candidate node --import ./agent_docs/impl/roadmap9/qualification/geo-sample-admission-evidence/loader.mjs --test test/unit/animation/geo-*.test.js
```

[summary](geo-sample-admission-evidence/summary.json), [baseline](geo-sample-admission-evidence/baseline.json), [candidate](geo-sample-admission-evidence/candidate.json), [131-test log](geo-sample-admission-evidence/unit-tests.log.gz).

- **96 paired cases, 모든 결과/오류/실제 work trace/계수 callback 일치**, 그중 오류 57건. 결과 hash는 전체 presentation/graphics/frames/commands/diagnostics와 property order를 포함하며 `-0`를 구분한다. 두 프로세스의 data logical IDs만 같은 deterministic UUID sequence로 생성한다. 제품 좌표·입력 크기·수학은 그대로다.
- 일반 resolver **24건은 admission을 포함한 전체 guard trace와 호출 횟수까지 동일**하다. sampler/combined 경로는 full admission 안의 trace와 실제 계산 trace를 구분하여 후자를 전부 비교한다. native stream 자체의 input admission은 제거하지 않고 비교에 포함한다.
- 원 1k fixture의 중간 sample: presentation **2→1**, group **3→1**, stream **1→1**. 반환된 stream work 및 callback은 양쪽 **18,916**. 실제 계산 guard 호출 **37,021개**의 순서·label·value·maximum 전부 동일. 전체 프레임 hash도 동일하다.
- mutable/frozen-unowned/shallow-owned/null-prototype/alias 입력의 원 JSON 복사·caller 격리·deep freeze를 검증했다. accessor는 호출 0, cycle/depth/원 array maxValues 초과·약 10M 문자열 work 초과는 동일 오류다. 잘못된 projection/latitude/geometry/feature key/style/frame 및 오류가 겹친 입력에서 원 첫 오류와 diagnostics가 같다. values 한도 바로 아래의 대형 tree를 새 필수 workload로 추가하거나 실행한 것은 아니다.
- hidden orthographic feature, seam crossing, planar polygon hole, default/explicit capacity, 원 1k 전체 command, current/rebase/offline, 두 composition groups, timeline 스타일 및 callback 두 번째 호출 오류를 비교했다. 기본/명시 capacity의 수학이나 한도를 서로 대체하지 않는다.
- **4건은 명시적 synthetic diagnostics injection**이다. 실제 작은 stream 결과의 diagnostics만 테스트 loader에서 덮어써 group aggregate owner에 원 10,000,000 work/10,000 points 경계 및 바로 초과를 전달했다. 원 limit 값을 수정하지 않고 동일 label/limit/actual 오류와 callback 선후를 확인했다. 이것은 대형 원 workload 실행이나 성능 증거가 아니다. 나머지 92건은 diagnostics injection 없이 비교했다.
- 기존 `test/unit/animation/geo-*.test.js` **131/131 pass**. loader는 원 제품 소스를 읽고 동일 candidate diff만 적용했다. `git apply --check` 통과. 제품 적용 뒤에는 필요한 assertions를 roadmap helper 의존 없이 capability test owner로 옮긴다.

## 남은 작업

이 checkpoint는 읽기 전용 검토다. 제품 diff 적용 시 scope coverage 및 declarations/contracts/package/docs 영향 검산, 동일 archive의 Node/browser/native/offline/current consumer를 수행해야 한다. 실제 capacity100k와 canonical5+30/DPR1·2/원 SLO, canonical memory100cycle은 최종 합산 archive에서 기존 조율에 따라 수행한다. 이 소형 proof는 exclusive 성능 측정이 아니며, 현재 100k camera50ms 문제 해결을 주장하지 않는다. C2는 C1 제품 결과를 본 뒤 별도 작은 변경으로 다룬다.

## 구체 채택 기록

Root는 2026-11-02에 `e4ce7d2f3`의 concrete proposal과 patch를 읽고 기존 remainingApproval 범위에서 그대로 제품 적용하도록 채택했다. 최초 입력검사·수학·stream·모든 guard와 generic/restore/v3–5 정합을 유지하고 admission/order/diagnostics/aggregate work 반례를 capability tests에 편입하도록 지시했다. C2는 미포함이다. 대형 검증은 scalar PID24486 종료/슬롯 반환 뒤 조율하며, root integration의 package cap은 별도로 유지한다.

채택 후 제품 적용과 현재 검증 결과는 [구현 기록](GEO_SAMPLE_ADMISSION_IMPLEMENTATION.md)으로 이어진다. 위 source-loader 비교는 원`db1fd0890`/proposal`e4ce7d2f3`source에서 재현하며, 제품 적용 뒤에는 고정sourcehash불일치를 의도대로 거부한다.
