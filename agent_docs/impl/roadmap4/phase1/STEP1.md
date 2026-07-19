# Step 1 — Finding 재현과 소유권 매핑

## 목표

외부 관찰을 현재 source의 실제 정책과 연결하고, 특수 처리 없이 수정할 owner를 정한다.

## 진행 상태

- [x] B-002 최소 재현과 공개 point/render 계약 확인
- [x] B-002 원인을 point materializer의 missing graphical default로 확정
- [x] B-001 inheritance와 rule completeness 흐름 재현
- [x] B-004 line partial-position 검증 흐름 재현
- [x] 세 finding 사이의 shared readiness/materialization 경계 기록

## 소유권

- B-002: theme default + point materializer. Renderer에는 fallback을 추가하지 않는다.
- B-001: layered inheritance provenance + rule endpoint/completeness policy.
- B-004: shared position action policy + line readiness/materializer.

## 문서 영향

Phase 15에서 Point mark 기본 radius 3과 관련 예제를 public docs에 명시한다. B-001과 B-004의
문서 영향은 구현 계약이 결정된 뒤 추가한다.
