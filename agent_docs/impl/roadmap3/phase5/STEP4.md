# STEP 4 — Nightingale Rose Primitive

## 진행 상태

- [x] Observable reference values and provenance fixture
- [x] April-to-March equal theta bands
- [x] Three cause sectors per month from a shared center baseline
- [x] Larger-first stable overlay order
- [x] Month labels, radial grid, legend and high-DPI PNG

Source의 12개월 × 3 cause 값을 long-form row로 보존한다. 각 cause는 stack되지 않고 center에서 시작한다.
같은 month 안에서는 outer radius가 큰 sector를 먼저 그리고 작은 sector를 나중에 그려 세 색이 모두 남는다.
Equal month band와 cause order의 tie-break는 source order에 독립적인 explicit domain으로 고정한다.
