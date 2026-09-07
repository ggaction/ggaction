# Phase 5 — 스케일·stroke·원자적 인코딩

상태: planned. 이 문서는 실행 계획이며 구현 또는 승인 완료 기록이 아니다.

## 목표와 범위

- [R20 — Parallel 차원별 scale 집중 편집](../features/20-parallel-scale.md)
- [R21 — 중첩 band offset scale 집중 편집](../features/21-offset-scales.md)
- [R23 — 크기 scale의 비선형·단계형 mapping](../features/23-size-scale-types.md)
- [R22 — 필드 기반 stroke 색상](../features/22-stroke-color.md)
- [R19 — 다중 채널의 원자적 재인코딩](../features/19-atomic-encoding.md)

선행 Phase: 4. 기능별 의존성은 PROPOSALS.json과 각 feature 문서를 따른다. 같은 Phase 내부에서는 아래 wave 순서가 우선한다.

## 구현 순서

1. W1: editParallelScale/offset scale을 existing editScale의focused resolver로 연결.
2. W2: size continuous/discrete mapper와area-correct mark/legend geometry.
3. W3: field stroke+scale+legend channel과series grain validator.
4. W4: encodeChannels final-state plan과all-consumer preflight.
5. W5: 단일 encode 동등성, 중간-invalid final-valid, combined legend와shared scale 통합.

## 경계와 다음 작업

이 Phase에 배정되지 않은 선택 기능은 해당 owner Phase에서 구현한다. 감사에서 선택하지 않은 나머지 25개는 추가하지 않는다. 독립적인 저작 의미가 필요할 때만 action을 추가하고, 타입과 문서만 있는 API를 만들지 않는다.

[STEP1.md](STEP1.md)의 체크리스트와 [GATES.md](GATES.md)의 상태를 함께 갱신한다. 실패한 테스트나 미실행 backend는 완료 근거가 아니다. 다음 Phase를 진행하기 위해 이름만 있는 stub을 commit하지 않는다.
