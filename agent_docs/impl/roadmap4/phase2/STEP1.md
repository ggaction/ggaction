# Step 1 — Facade 계약과 Gate A

## 진행 상태

- [x] existing mark/encoding/guide option owner 조사
- [x] `createBoxPlot` aggregate-action pattern 조사
- [x] 다섯 facade 최소 signature와 hierarchy 초안
- [x] inference, ID, guides와 failure atomicity 계약
- [x] chart별 계약 문서 작성
- [x] P2-A review package 작성
- [x] P2-A 사용자 승인

## 작업

Facade가 새 vocabulary를 만들지 않도록 public option을 기존 child action 타입에 대응시킨다. P2-A에서는
특히 stable default ID, field-string shorthand, guide 기본 동작과 heatmap label non-goal을 승인한다.

승인 전 후보는 Phase-local 문서에만 존재했다. 2026-07-20 승인 뒤 STEP2에서 Planned inventory로
승격하고 구현을 시작한다.
