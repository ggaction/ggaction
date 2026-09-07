# Phase 1 Gates

모든 Gate는 **planned**다. 사용자 선택은 이 Gate의 대상 범위를 정한 것이며 세부 API나 시각 결과의 승인을 기록한 것이 아니다.

| Gate | status | 정확한 범위 | 필수 증거 | 이후 blocked work |
| --- | --- | --- | --- | --- |
| P1-A | planned | R06; R07: API·semantics·schema·호환 계약 | 정확한 API/type diff, 수치 oracle, state before/after, source owner 영향, 선행 결과 | 승인되지 않은 public/schema 변경 |
| P1-V | planned | 위 기능의 appearance variants | primitive 실행 소스·manifest·PNG, target public chain, geometry assertions | 시각 미승인 variant의 public flow 구현 |
| P1-X | planned | 위 기능 구현 완료와 후속 범위 | focused/cumulative tests, current contracts/types/docs/package, same-run parity, 남은 통합 cell, commit/push | 미검증 완료 처리와 미승인 후속 범위 |

## 상태 갱신 규칙

allowed: planned / ready-for-review / approved / changes-requested. 저장소 `agent_docs/impl/AGENTS.md`에 따라 검토 자료를 완성·검증·commit/push한 뒤 ready-for-review로 바꾼다. 명시적인 사용자 응답이 해당 범위를 승인했을 때만 approved를 기록한다. 일괄 승인이 여러 Gate의 정확한 범위를 포함하면 같은 응답을 연결하며 반복 승인을 요구하지 않는다.

V는 새로운 appearance가 있는 경우에 적용한다. data-only 범위는 미적용 이유와 수치 evidence를 기록하고 A/X로 검증한다. 수치 전용이라는 이유로 시각 변화를 숨기지 않는다. 이미 승인된 variant는 목표가 변하지 않는 한 현재 코드의 재실행 증거로 확인한다.

## 승인·증거 기록

- Commit: 미기록 — 계획 초안
- Source / artifacts / tests: 미기록 — 구현 전
- User approval: 없음
- Remaining: GOAL/STEP/features의 전체 배정 범위

이 파일을 읽는 행위는 승인에 해당하지 않는다. PR/publish/deploy는 별도 요청 범위다.
