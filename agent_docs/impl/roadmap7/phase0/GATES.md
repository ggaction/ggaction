# Phase 0 Gates

모든 Gate는 **approved**다. 2026-09-13 사용자가 Roadmap 7 전체 구현 요청과 함께 “게이트 모두 승인”이라고 명시했으며, 아래 표의 정확한 범위에 그 일괄 승인을 연결한다.

| Gate | status | 정확한 범위 | 필수 증거 | 이후 blocked work |
| --- | --- | --- | --- | --- |
| P0-A | approved | 선택 25개와 권장 API/schema/수치/ownership/지원행렬 | 전체 계획 문서, baseline, plan validation, 검증된 commit/push | 이 승인 범위 밖의 public/schema 구현 |

## 상태 갱신 규칙

allowed: planned / ready-for-review / approved / changes-requested. 저장소 `agent_docs/impl/AGENTS.md`에 따라 검토 자료를 완성·검증·commit/push한 뒤 ready-for-review로 바꾼다. 명시적인 사용자 응답이 해당 범위를 승인했을 때만 approved를 기록한다. 일괄 승인이 여러 Gate의 정확한 범위를 포함하면 같은 응답을 연결하며 반복 승인을 요구하지 않는다.

V는 새로운 appearance가 있는 경우에 적용한다. data-only 범위는 미적용 이유와 수치 evidence를 기록하고 A/X로 검증한다. 수치 전용이라는 이유로 시각 변화를 숨기지 않는다. 이미 승인된 variant는 목표가 변하지 않는 한 현재 코드의 재실행 증거로 확인한다.

## 승인·증거 기록

- Contract revision: `67480f52` — 25개 기능의 상세 구현 계약, 고정 인수 사례, 타입 제안과 source/test 연결표
- User approval: 2026-09-13 — “게이트 모두 승인”; 이 파일 표의 A/V/X 범위 전체
- Evidence policy: 승인된 계약이 바뀌지 않는 한 재승인을 요구하지 않는다. 구현 commit, 실행 test, primitive/public render와 남은 integration cell은 각 Phase STEP 결과 원장에 계속 추가한다.
- Remaining: GOAL/STEP/features의 구현과 검증 증거. 승인 자체는 완료됐지만 검증되지 않은 기능을 Current 또는 완료로 표시하지 않는다.

이 파일을 읽는 행위는 승인에 해당하지 않는다. PR/publish/deploy는 별도 요청 범위다.
