# 추론 모델 검증 및 문자열 바이트 할당 축소

## 진행 상태

- [x] stable57f779ea3 보존 및 원10000노드/100000간선 단발 계측
- [x] 기존 remainingApproval에 따른 root의 두 최소안 채택
- [x] 완료 검증 뒤 exact model·동일 policy의 최초 stored index 재사용
- [x] 동일 JSON UTF-8 byte 수를 버퍼 할당 없이 계산
- [x] 모든 단일 UTF-16 code unit·혼합·quota 및 proof 회귀·핵심 커버리지
- [ ] 같은 최종 archive3Node·Chromium·문서·소스 핀
- [ ] 최종 합산 AT82 P95·retained heap·100cycle 및 large worker SLO

승인 근거는 [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval 및2026-11-02 root의 구체안 채택이다. 기존 체크포인트57f779ea3 위에서 작업하며 shared core·benchmark 도구·공유 animation4·공개API/schema·알고리즘·해시 바이트·work charge·capacity·전역guard를 바꾸지 않는다.

## 실제 비용과 구현 경계

임시 ESM 계측은 원10k/100k 결과를 독립 lattice-shell oracle로 전수 검산하고 함수 경계의 inclusive 시간과 bytewalk 문자열 할당 수를 기록했다. Prepare main은3,539,079개의 문자열 바이트 버퍼에 누적152,173,284bytes, worker는6,957,986개에303,944,845bytes를 할당했다. 이는 누적 임시 배열 크기이며 peak heap이나 retained heap 수치가 아니다. Hash의 encode/canonical/digest는 각각 독립 계측하되 제품 구현은 그대로 유지한다.

`inferenceJob`은 completion의 byte/schema/model/hash 검증과 deep clone을 모두 끝낸 뒤에만 exact model→정규 definition proof를 등록한다. 최초 stored 검증은 정규 closed limits/execution이 동일할 때만 그 model index를 재사용한다. Clone·다른 model·변경된 limits/execution은 기존 full index를 실행한다. Generic index owner, resource envelope·constructor·revision·원행 및 source/metric binding은 바꾸지 않는다. Proof는 외부 freeze나 일반 ownership flag로 부여되지 않으며 전송·저장되지 않는다.

`inferenceBudget`은 문자열·객체 key마다 기존 UTF-16 길이 lower-bound 검사를 먼저 유지한 뒤 JSON quote/backslash·5개 단축 제어 escape·나머지 control의6byte escape·UTF-8 width·유효 surrogate pair4bytes·고립 surrogate6bytes를 센다. 모든 descriptor/array/depth/cycle 검사는 그대로다. Canonical encoding, hash 또는 byte quota를 바꾸지 않으며 외부 입력을 인코딩하기 전에 기존 byte 경계에서 거부한다.

## 정확성 및 성능의 구분

모든65,536개 단일 UTF-16 code unit, 경계·혼합·객체 key·정확 quota/한 byte 부족을 독립 `JSON.stringify`+`TextEncoder` 경로와 비교한다. 기존 결과의 전체100000간선, typed order, sourceRows, metric weight, searchWork31,318,394를 유지한다. 두 계측에서 방문수와 누적 byte 수는 같고 임시 byte buffer만0개로 바뀌었으며 main index2회가1회로 줄었다.

Root/peer 기능검사와 본인 coverage가 겹친 단발 후속 계측 시간49.96초는 성능 개선율 또는 P95/SLO 근거가 아니다. 최초 계측과 환경·실패를 보존하고 최종합산 전용 CPU 측정은 root benchmark 소유로 남긴다. 결과 및 검증 영수증은 [summary](inference-byte-refinement-evidence/summary.json)에 둔다.

## 재현 및 최초 한도 결과

증거의 `profile*.mjs.txt`를 `.artifacts/inference-refinement/`에 `.txt` 없이 복사한 뒤 `node --loader ./.artifacts/inference-refinement/profile-loader.mjs .artifacts/inference-refinement/profile.mjs 10000 <prefix>`로 재현한다. Baseline57f와 후속소스 각각의 계측은 함수 시간이 중첩되므로 합산하지 않으며, 후속 CPU 경합을 원시 로그에서 제거하지 않는다.

최초 package 검사는unpacked8,056,744가8,055,200을, Node20packed1,787,748이1,787,400을 초과했다. 같은실측에 최소 백 단위 상한8,056,800/1,787,800을 적용한다. Node24 동일 archive의5개 기능/type/문서 검사는 통과했고 Full785,925·graph67,837gzipbytes만 기존785,700·67,700을 초과했다. 원 실패를 보존하고 같은 측정을786,000·67,900으로 재검산하며 다른 bundle 한도를 바꾸지 않는다.
