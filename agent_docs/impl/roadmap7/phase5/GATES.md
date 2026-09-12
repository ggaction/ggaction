# Phase 5 Gates

모든 Gate는 **approved**다. 2026-09-13 사용자가 Roadmap 7 전체 구현 요청과 함께 “게이트 모두 승인”이라고 명시했으며, 아래 표의 정확한 범위에 그 일괄 승인을 연결한다.

| Gate | status | 정확한 범위 | 필수 증거 | 이후 blocked work |
| --- | --- | --- | --- | --- |
| P5-A | approved | R20; R21; R23; R22; R19: API·semantics·schema·호환 계약 | 정확한 API/type diff, 수치 oracle, state before/after, source owner 영향, 선행 결과 | 승인되지 않은 public/schema 변경 |
| P5-V | approved | 위 기능의 appearance variants | primitive 실행 소스·manifest·PNG, target public chain, geometry assertions | 시각 미승인 variant의 public flow 구현 |
| P5-X | approved | 위 기능 구현 완료와 후속 범위 | focused/cumulative tests, current contracts/types/docs/package, same-run parity, 남은 통합 cell, commit/push | 미검증 완료 처리와 미승인 후속 범위 |

## 상태 갱신 규칙

allowed: planned / ready-for-review / approved / changes-requested. 저장소 `agent_docs/impl/AGENTS.md`에 따라 검토 자료를 완성·검증·commit/push한 뒤 ready-for-review로 바꾼다. 명시적인 사용자 응답이 해당 범위를 승인했을 때만 approved를 기록한다. 일괄 승인이 여러 Gate의 정확한 범위를 포함하면 같은 응답을 연결하며 반복 승인을 요구하지 않는다.

V는 새로운 appearance가 있는 경우에 적용한다. data-only 범위는 미적용 이유와 수치 evidence를 기록하고 A/X로 검증한다. 수치 전용이라는 이유로 시각 변화를 숨기지 않는다. 이미 승인된 variant는 목표가 변하지 않는 한 현재 코드의 재실행 증거로 확인한다.

## 승인·증거 기록

- Contract revision: `67480f52` — 25개 기능의 상세 구현 계약, 고정 인수 사례, 타입 제안과 source/test 연결표
- User approval: 2026-09-13 — “게이트 모두 승인”; 이 파일 표의 A/V/X 범위 전체
- Evidence policy: 승인된 계약이 바뀌지 않는 한 재승인을 요구하지 않는다. 구현 commit, 실행 test, primitive/public render와 남은 integration cell은 각 Phase STEP 결과 원장에 계속 추가한다.
- Implementation evidence: R20 `eaea2b8b`, R21 `335ce4f0`, R23 `1b68a8ba`, R22 `3fc40a66`,
  R19 `58d9e51a`. 자세한 누적 test/package 결과와 후속 integration owner는 [STEP1.md](STEP1.md)에 기록했다.

이 파일을 읽는 행위는 승인에 해당하지 않는다. PR/publish/deploy는 별도 요청 범위다.
