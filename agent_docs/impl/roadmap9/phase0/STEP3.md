# STEP3 — 시험 발견과 완료 증거

## 진행 상태

- [x] 계약과 기존 소유자 확인
- [x] 구현 및 focused 검증
- [ ] 누적 검증 및 실제 증거 저장
- [ ] 커밋·push와 인계 기록

상태: implemented. 원안 STEP-003에 대응한다. Phase 누적 검증은 구현 commit 이후 실행한다.

## 구현

- 기존 runner의 빈 selector 거부를 재사용하고 실제 child Node에 전달한 test 파일 목록을 receipt에 남긴다.
- `scripts/run-check.js`는 실행 전후 commit/clean 상태, 명령, 시간, 종료 코드, bounded log hash를 기록한다. 비저장소 호출은 실행 가능하지만 완료 근거로 인정되지 않는다.
- `scripts/verification-evidence.js`는 실제 commit 존재, receipt/log/artifact hash, 필수 check, consumer/gate 의무, 선행 작업 완료를 확인한다. 현재 실행계획의 모든 작업이 최종 검증으로 이어지는지도 확인한다.
- 0개 discovery, 존재하지 않는/변조된 artifact, 미실행·실패·dirty·다른 commit 기록, 미승인 Gate와 미완료 선행 작업을 거부하는 반례를 실행했다.
- 계획 보정은 [execution-plan.json](../execution-plan.json)의 STEP-070→STEP-056 의존성이다. 원안의 연구 기록을 덮어쓰지 않았다.

## 누적 검사

`execution-plan.json`의 첫 세 task에 requiredChecks를 고정했다. 일반·브라우저·render·설치 패키지·package budget·해당 metadata/type 검사를 실행하여 실제 증거로 완료 기록을 만든다. 작업 로그는 `.artifacts/verification/` 및 `.artifacts/checks/`에 저장한다.

새 API·저장 schema·시각 결과가 없어 별도 Gate가 필요하지 않다. 후속 G-CORE는 이 Phase의 승인으로 간주하지 않는다.
