# Native qualification 집계 기반

## 진행 상태

- [x] 원안 STEP-074와 qualification-delivery 및 기존 실행 증거 소유자 확인
- [x] 기존 AUTHORIZATION.json의 STEP-077 전체 승인 재사용
- [x] durable active manifest와 독립 실패 시험 구현
- [x] 집중 검증 및 원본 요구/consumer 보존 비교
- [ ] source checkpoint와 미완료 집계 인계

이 작업은 최종 qualification 완료가 아니라 그 판정 기반이다. 최종 통합 후보의
전체 suite와 동일 package artifact 검증은 root가 수행한다.

## 소유 경계

`test/native-capabilities.json`이 native active 요구, acceptance group 및 consumer 의무의
지속되는 정본이다. 30개 GGA/USR 요구, 79개 AT 그룹, 30 family × 19 consumer와
interaction 7축을 보존한다. 원안의 요구→시험 연결에 없던 공통 12그룹은 해당 native
요구에 연결한다. 외부 참고 원장은 분모에 포함하지 않는다. 역사 번호는 추적 ID이며
제품 테스트나 validator는 study/roadmap/완료 기록을 import하거나 읽지 않는다.

현재 존재하는 계약과 발견 가능한 시험 파일만 assigned owner로 등록한다. 미통합
기능 또는 전체 요구를 소유하는 시험이 확정되지 않은 그룹은 pending owner와 이유를
갖는다. assigned는 실행 성공을 뜻하지 않는다. Evidence가 없으면 모든 결과는 pending이다.

`scripts/native-capability-completion.js`가
구조 검사와 집계를 소유한다. 기존 `scripts/verification-evidence.js`의 exact commit,
실행 전후 clean source, receipt/log/artifact hash 및 nonempty discovery 검사를 재사용한다.
새 generic resource/runtime API는 만들지 않는다.

## 판정 계약

- candidate는 exact commit과 하나의 package archive SHA-256으로 식별한다.
- acceptance/consumer target은 정본에서 만든 닫힌 집합이다. 누락 결과는 pending이며
  unknown/duplicate target, 이름만 바꾼 pass, reference-only target은 오류다.
- passed에는 실제 execution completion과 input/call/independent expected/actual/diff
  파일의 hash가 필요하다. 같은 candidate commit/archive와 현재 assigned test owners의
  실제 실행·입력 hash를 확인한다. 존재하는 test 경로만으로 passed를 계산하지 않는다.
- required cell을 N/A로 바꾸는 결과는 거부한다. N/A는 canonical applicability에 구체적인
  현재 계약 근거가 먼저 있어야 하며 이유 없는 N/A나 scope 축소는 허용하지 않는다.
- full candidate completion은 모든 acceptance/consumer가 닫히고 기존 9개 qualification
  명령이 같은 candidate에서 성공해야 한다. pending/failed/missing qualification은 완료가 아니다.
- 평상시 validation은 구조와 정직한 pending 집계를 검증한다. `--require-complete`만
  실제 release 완료를 요구하며 pending이면 실패한다. 일반 테스트 통과를 native 완료로
  보고하지 않는다.

## 검증 범위

독립 temporary Git fixture에서 작은 실제 Node test를 실행하고 그 receipt를 사용한다.
누락/중복/unknown 연결, 잘못된 owner 경로, 역사 경로 의존, 빈 evidence, invalid N/A,
failed/dirty/stale 실행, archive mismatch 및 변조된 파일을 음성 시험으로 검증한다.
원안 JSON과 새 정본의 ID/consumer 보존 비교는 이관 시 한 번만 수행하고 evidence에 기록한다.
그 비교 스크립트를 제품 테스트나 릴리스 필수 의존으로 남기지 않는다.

승인 근거: [전체 승인 기록](../AUTHORIZATION.json). 원안은
`study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-074-native-qualification.ko.md`와
`roadmap/contracts/qualification-delivery.ko.md`이다. 기존 required coverage/CI 명령은 변경하지 않는다.


## 집계 사용법

```sh
node scripts/native-capability-completion.js
node scripts/native-capability-completion.js test/native-capabilities.json candidate-results.json
node scripts/native-capability-completion.js test/native-capabilities.json candidate-results.json --require-complete
```

첫 명령은 현재 구조 검증과 pending 목록을 반환한다. 정상 종료는 completion을 뜻하지 않는다.
결과가 `status: pending` 또는 `failed`이면 완료가 아니며, 마지막 명령은 이 상태를 오류로 종료한다.
현재 manifest에는 38개 acceptance owner와 97개 consumer owner를 실제 경로에 연결했다.
41개 acceptance owner와 480개 consumer owner는 pending이다. 실행 결과는 모두 별개로
79개 그룹과 577개 consumer가 pending이고 passed는 0이다. 추가 interaction 7축 중
`current-frame`은 AT-34/43/65/80/81의 기존 의무를 명시한 열이다. 기존 570개 consumer를
삭제하거나 N/A로 바꾸지 않았다.

`candidate-results.json`은 다음 네 필드를 갖는다.

- `candidate`: exact `commit`, `{path,sha256}`인 `artifact`와 `manifest`.
  Manifest path는 `test/native-capabilities.json`이며 실행 commit의 blob과 같아야 한다.
- `evidence`: `id`, 기존 `validateCompletion` 형식의 `completion`, 각각 `{path,sha256}`인
  `input`, `call`, `expected`, `actual`, `diff`. 다섯 파일은 서로 다르고 비어 있지 않아야 한다.
  Completion의 `taskId`는 evidence ID이며 artifacts에 archive, manifest, 다섯 proof와
  실행된 test/current contract 입력을 포함한다. `diff` JSON은 `status: passed`, 구체적인
  `comparison` 설명과 정확한 `expectedSha256`/`actualSha256`을 갖는다.
- `results`: `target`, `status`, 통과일 때 evidence ID 배열. Target은 `AT-xx` 또는
  `consumer:<family>/<column>`이다. 실패/not-run에는 `reason`, N/A에는 정본 applicability의
  정확한 reason이 필요하다. 전달되지 않은 target은 pending이다.
- `qualification`: `taskId: native-qualification`인 기존 completion 형식. 9개 required check
  label과 각 canonical npm command를 실행한 receipt, 같은 archive/manifest가 필요하다.
  기존 completion 규칙의 nonempty Node test discovery를 만족하는 canonical inner runner
  receipt도 함께 넣는다. Outer npm receipt만으로 실제 발견된 테스트를 추정하지 않는다.

결과는 증거의 신원·연결·실행 상태를 검증한다. 수치가 의미상 맞는지 자동으로 추론하거나
개별 oracle의 의미 검토를 대신하지 않는다. 각 owner 시험과 독립 expected/diff 검토가
해당 domain assertion을 소유한다. AT-60의 독립 검토 의무는 여전히 pending이다.
AT-61의 실제 공개 artifact 대조 등 후행 전달 의무도 그대로 남긴다. 이 변경은 기존 CI나
publish workflow에 선행 gate를 추가하지 않는다.

## 집중 증거

`native-capability-owning-4.log` 최초 확장 검사에서 49개 중 48개 통과했다. 음성 fixture의
금지 historical path 문자열이 기존 test discovery 정책에 걸렸으며, 제품 의존은 없었다.
현재 계약 밖의 일반 경로를 쓰는 동일 음성 검사로 바꾸어 `native-capability-owning-6.log`의
49개 모두 통과했다. 아래 최종 source 고정 검증에서 다시 실행해 exact receipt를 보존한다.
역사 요구 이관 비교는 30 IDs/79 groups/570 cells와 기존 모든 requirement→group edge의
보존을 확인했고 12개 공통 그룹의 추가 연결만 있다.
