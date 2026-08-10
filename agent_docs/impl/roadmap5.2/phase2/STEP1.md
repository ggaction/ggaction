# STEP 1 — Make Current Documentation Tell the Current Truth

## Exact corrections

1. `SECOND_ARCHITECTURE.md`의 current limitation에서 이미 구현된 SVG renderer를 제거한다.
2. Current source ownership tree를 Canvas/SVG/PNG/PDF renderer와 adapter 전체로 고친다.
3. 구현되지 않은 초기 아이디어의 예시를 SVG mapping이 아니라 animation/transition으로 고친다.
4. README의 Basic Browser 120,000-byte 문구를 executable current ceiling인 128,000 byte로 고친다.
5. Architecture에 full/basic/SVG current executable ceiling 225,000/128,000/25,000 byte를 기록한다.

이 변경은 current behavior를 정확히 설명할 뿐 runtime, public API, package entry, renderer output 또는 bundle source를
바꾸지 않는다. Basic entry를 120,000 byte 이하로 되돌리는 최적화와 ceiling 축소는 Phase 4가 소유한다.
