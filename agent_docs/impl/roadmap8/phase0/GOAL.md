# Phase 0 — Roadmap 8 계획과 구현 계약 검토

상태: **계획 패키지 작성, runtime 구현 미시작**.

## 목표

앞선 12개 ggaction 보완 항목을 누락 없이 Phase·API 제안·호환성·검증으로 연결한다.
계획 작성 요청을 새 public API나 릴리즈 승인으로 오인하지 않는다.

## 산출물

- [ROADMAP](../ROADMAP.md): F01–F12와 조건부 E01/E02, Phase 0–7 실행 순서.
- [BASELINE](../BASELINE.md): 0.0.16 실행 사실 B01–B14.
- [FEATURES](../FEATURES.md): 기능별 동작·구현 위치·완료 조건.
- [DECISIONS](../DECISIONS.md): D01–D14 제안과 G0–G7 planned 상태.
- [VALIDATION](../VALIDATION.md): V01–V46, 공통 lifecycle 및 성능 측정안.

## 구현 시작 시 순서

1. 현재 public/source/persistence의 관련 contract를 다시 확인한다. baseline 이후 다른 변경이 있으면 기록한다.
2. G1의 exact schema 타입, old→new snapshot 예시, 빈 domain 결과를 구체적인 review package로 만든다.
3. 승인된 D가 있으면 기존 발언/범위를 Gate에 기록하고 반복 승인을 생략한다.
4. F01/F02 구현은 해당 결정 승인 뒤 시작한다. 독립적인 재현·계약·검증 준비는 진행한다.
5. 구현 Phase마다 GOAL/STEP/GATES를 만들고 실제 실행한 결과만 기록한다.

## 이번 턴의 완료와 다음 단계

이번 요청의 완료는 계획 문서와 navigation을 저장하고 검사하는 것이다. 12개 기능의 구현 완료가 아니다.
계획의 후속 실행이 요청되면 기존 승인 범위를 확인하고 미해결 material decision에 대한 구체안을 먼저 확정한다.
