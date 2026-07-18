# STEP 4 — Facet Scale Resolution Grammar

## 진행 상태

- [x] Option normalization and closed-key validation
- [x] Continuous shared-union oracle
- [x] Discrete stable-union oracle
- [x] Independent child-domain oracle
- [x] Explicit-domain and conflict precedence tests

Channel policy를 normalized facet state로 변환한다. Omitted channels are shared. Shared derived-output domains are
computed after cell replay; independent domains remain child-local. Explicit semantic domains are copied unchanged.

One scale ID가 differently resolved channels에 연결되면 preflight에서 전체 호출을 거부한다. Histogram shared
bin boundaries는 Phase 7 behavior를 유지하고 independent x에서는 cell values로 다시 계산한다.

Pure grammar는 runtime child mutation 없이 normalized channel/scale policy와 domain plan만 반환한다. Continuous
domain은 min/max union, ordinal/band/point는 child order의 stable union, quantile은 duplicate를 보존한 sample merge를
사용한다. Histogram boundary resolver도 shared면 전체 cell values에서 한 번, independent면 cell별로 계산한다.
