# Roadmap 5 Phase 1 — UTC Time-Unit Derived Data

## 목표

Temporal source field를 UTC calendar bucket 시작 timestamp로 변환하는 immutable `createTimeUnitData` vertical
slice를 구현한다. Runtime, transform provenance, strict declarations, current contract, docs, package와 representative
temporal chart-consumption evidence를 한 Gate에서 동기화한다.

## 진행 상태

- [x] R5-P0-A exact contract 승인
- [x] Planned inventory와 R5-P1-A 선언
- [x] Pure UTC bucket normalization/materialization 구현
- [x] Public action registration과 derived replay 구현
- [x] Strict declarations와 Current action contract 동기화
- [x] Focused grammar/action/facet/immutability tests
- [x] Ordinary temporal point materialization evidence
- [x] Before/after UTC month-bucketing visual review evidence
- [x] Cumulative contract/unit/chart/package/docs verification
- [x] R5-P1-A runtime, visual and approval remote checkpoints (`e98f418d`, `5d419979`, `3f74a073`)
- [x] 사용자 explicit approval — 2026-08-02

## Gate R5-P1-A

### 승인 대상

- Seven UTC units와 exact bucket-start values
- Immutable row derivation과 stored transform provenance
- Explicit/current source resolution, collisions와 atomic errors
- Derived replay/facet behavior와 ordinary temporal encoding compatibility
- Runtime/type/current contract/public docs/package parity

### 승인 전 차단

Phase 2 semantic category ordering implementation.

## Non-goals

- Week, local timezone, DST 또는 configurable calendar
- Group aggregation, resampling, missing-month imputation
- Edit/revision action 또는 generic transform executor
