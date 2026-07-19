# Step 2 — Weighted theta visual vertical slice와 P3-A

## 진행 상태

- [x] repository dataset 기반 independent primitive oracle
- [x] public `encodeTheta({ aggregate: "sum", weight })` program
- [x] semantic/graphic/draw-order/Canvas-call primitive parity
- [x] Browser Canvas와 2x Node PNG
- [x] public docs, generated reference와 runnable example 동기화
- [x] targeted, contract와 full regression
- [x] P3-A review package 작성
- [ ] P3-A 사용자 승인

## 작업

반복 category와 서로 다른 numeric weight를 가진 실제 dataset으로 proportional donut을 만든다. Primitive는
production aggregation helper를 호출하지 않고 category sum과 angle을 독립 계산한다. Gate에는 승인할 exact
call chain과 rendered image를 함께 제시한다.
