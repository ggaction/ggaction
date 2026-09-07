# Phase 0 Gates

모든 Gate는 **planned**다. 사용자 선택은 이 Gate의 대상 범위를 정한 것이며 세부 API나 시각 결과의 승인을 기록한 것이 아니다.

| Gate | status | 정확한 범위 | 필수 증거 | 이후 blocked work |
| --- | --- | --- | --- | --- |
| P0-A | planned | 선택 25개와 권장 API/schema/수치/ownership/지원행렬 | 전체 계획 문서, baseline, plan validation, 검증된 commit/push | 이 승인 범위 밖의 public/schema 구현 |

## 상태 갱신 규칙

allowed: planned / ready-for-review / approved / changes-requested. 저장소 `agent_docs/impl/AGENTS.md`에 따라 검토 자료를 완성·검증·commit/push한 뒤 ready-for-review로 바꾼다. 명시적인 사용자 응답이 해당 범위를 승인했을 때만 approved를 기록한다. 일괄 승인이 여러 Gate의 정확한 범위를 포함하면 같은 응답을 연결하며 반복 승인을 요구하지 않는다.

V는 새로운 appearance가 있는 경우에 적용한다. data-only 범위는 미적용 이유와 수치 evidence를 기록하고 A/X로 검증한다. 수치 전용이라는 이유로 시각 변화를 숨기지 않는다. 이미 승인된 variant는 목표가 변하지 않는 한 현재 코드의 재실행 증거로 확인한다.

## 승인·증거 기록

- Commit: 미기록 — 계획 초안
- Source / artifacts / tests: 미기록 — 구현 전
- User approval: 없음
- Remaining: GOAL/STEP/features의 전체 배정 범위

이 파일을 읽는 행위는 승인에 해당하지 않는다. PR/publish/deploy는 별도 요청 범위다.
