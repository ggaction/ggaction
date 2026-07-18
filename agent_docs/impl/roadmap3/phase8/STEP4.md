# STEP 4 — Facet Scale Resolution Grammar

## 진행 상태

- [ ] Option normalization and closed-key validation
- [ ] Continuous shared-union oracle
- [ ] Discrete stable-union oracle
- [ ] Independent child-domain oracle
- [ ] Explicit-domain and conflict precedence tests

Channel policy를 normalized facet state로 변환한다. Omitted channels are shared. Shared derived-output domains are
computed after cell replay; independent domains remain child-local. Explicit semantic domains are copied unchanged.

One scale ID가 differently resolved channels에 연결되면 preflight에서 전체 호출을 거부한다. Histogram shared
bin boundaries는 Phase 7 behavior를 유지하고 independent x에서는 cell values로 다시 계산한다.
