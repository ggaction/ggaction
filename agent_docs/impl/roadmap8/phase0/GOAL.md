# Phase 0 — Roadmap 8 계획과 구현 계약 검토

상태: **완료**. 개정 2 계약을 기준으로 F01–F05·F07–F12를 구현·검증했다. F06은 제외했다.

## 목표

앞선 11개 ggaction 보완 항목을 Phase·public API·호환성·검증으로 연결한 기준을 보존한다.

## 산출물

- [ROADMAP](../ROADMAP.md): F01–F05·F07–F12와 조건부 E01/E02, Phase 0–7 실행 순서.
- [BASELINE](../BASELINE.md): 0.0.16 실행 사실 B01–B14.
- [FEATURES](../FEATURES.md): 기능별 동작·구현 위치·완료 조건.
- [DECISIONS](../DECISIONS.md): D01–D14 결정과 G0–G7 승인·구현 상태.
- [VALIDATION](../VALIDATION.md): V01–V22, V26–V46, 공통 lifecycle 및 성능 측정안.

- [구현자 인계](../IMPLEMENTER_START_HERE.md): 상세 명세·타입·14개 WP·43개 구조화 사례·실행 순서.

## 구현에 사용한 순서

1. 현재 public/source/persistence의 관련 contract를 다시 확인한다. baseline 이후 다른 변경이 있으면 기록한다.
2. G1의 exact schema 타입, old→new snapshot 예시, 빈 domain 결과를 구체적인 review package로 만든다.
3. 승인된 D가 있으면 기존 발언/범위를 Gate에 기록하고 반복 승인을 생략한다.
4. F01/F02 구현은 해당 결정 승인 뒤 시작한다. 독립적인 재현·계약·검증 준비는 진행한다.
5. 구현 Phase마다 GOAL/STEP/GATES를 만들고 실제 실행한 결과만 기록한다.

## 완료 범위

11개 기능의 runtime, 타입, 문서, generated contract, 패키지 경계와 성능 workload를 구현했다.
npm publish, release tag, 문서 배포는 별도 운영 범위로 남긴다.

## 개정 2 계획 검증 결과

- 기존 agent-docs navigation 검사 7개 통과.
- 제안 타입의 positive 예제 7개와 negative 예제 7개를 TypeScript 7.0.2 표준 strict로 검사, 통과.
- exactOptionalPropertyTypes+skipLibCheck의 consumer 검사 통과. 기존 declaration 전체의 강화 옵션
  문제는 EXECUTION_RUNBOOK에 별도 기록했으며 제품 타입을 이 계획 수정에서 변경하지 않았다.
- 11개 active feature, 43개 active V 사례, 14개 WP의 선행·ID·기존 source 경로와 문서 링크 일치 확인.
- 반열린 filter·부분 경계 edit·stable sort fixture 기대값의 독립 계산 확인.
- F06/D08/V23–V25는 제외 기록에만 남고 active 작업·타입·테스트 계획에는 없음.
- runtime 인수 사례 43개와 작업 패키지 14개는 구현·검증 완료 상태로 갱신했다.
