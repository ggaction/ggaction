# Phase 0 — 검증 기반 구현

상태: 진행 중. 사용자 요청 “1단계 구현. 밀어”에 따라 WP-00 / STEP-001–003을 구현하고 검증한 뒤 현재 branch에 push한다.

## 범위와 검토 경계

- 커밋 기준 inventory, 독립 oracle harness, test discovery와 완료 증거 검사를 구현한다.
- 공개 API·저장 schema·renderer 의미 변경은 없다. 이번 Phase에 필요한 새 승인 Gate는 없다.
- 후속 G-CORE 등은 [원안 결정표](../../../../study/coverage-expansion-2026-10-27/roadmap/DECISIONS.ko.md)에 따라 미승인 상태를 유지한다. 이번 지시를 세부 계약 승인으로 기록하지 않는다.
- [STEP1](STEP1.md), [STEP2](STEP2.md), [STEP3](STEP3.md)를 순서대로 실행한다.

## 검증과 인계

카드마다 focused 검사를 실행한다. Phase 종료에는 npm test, test:browser, test:render, test:package 및 해당 docs/type 검사를 실행한다. 대형 검사는 상위 저장 공간 감시기를 거친다.
실행 로그와 증거는 `.artifacts/verification/`에 두고, 재현 명령·결과·해시와 해당 코드 커밋을 이 Phase의 완료 기록에서 연결한다. 실행하지 않은 후속 기능·렌더러 지원은 통과로 기록하지 않는다.
