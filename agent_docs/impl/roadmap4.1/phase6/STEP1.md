# STEP 1 — Interval Statistics and Error-band Boundaries

## 진행 상태

- [x] Error bar/band statistical owner and component mapping
- [x] Complete statistical candidate preflight
- [x] Immutable interval revision, component rebind and rematerialization
- [x] Boundary disable, cleanup and ordinary recreate
- [x] Focused interval/boundary tests

## 실행 순서

1. Statistical versus explicit interval owners, interval dataset provenance, main/cap/body/boundary component IDs와
   mark-config ownership을 mapping한다.
2. `statistics` partial object를 current interval provenance와 merge하고 owner/component compatibility를 첫 child action
   전에 검증한다.
3. New immutable interval revision을 만들고 all owned visual components를 explicit rebind한 뒤 scale/guide/selection을
   deterministic하게 replay하고 orphan prior를 release한다.
4. `boundaries: false`는 optional lower/upper boundary semantic/config/graphics만 정리하고 body와 statistical data를
   보존한다. Object는 both boundaries를 ordinary path로 create/edit한다.
5. Statistical-owner-only, omitted/empty/no-op/invalid/missing/ambiguous, downstream failure와 immutability를 검증한다.
