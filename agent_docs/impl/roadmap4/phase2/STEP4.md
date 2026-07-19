# Step 4 — Bar와 histogram facade

## 진행 상태

- [x] `createBarPlot` runtime/type/trace 구현
- [x] vertical/horizontal/group/stack/overlay/diverging representative 회귀
- [x] `createHistogram` runtime/type/trace 구현
- [x] maxBins/step/boundaries/normalize representative 회귀
- [x] Jobs/Cars primitive와 Browser/PNG exact parity
- [x] P2-C review package
- [x] P2-C 사용자 승인

## 작업

Bar는 x/y와 color layout의 existing compatibility matrix를 그대로 사용한다. Histogram은 x/y를 따로
재구현하지 않고 wrapped `encodeHistogram`을 호출한다. Missing categorical cells와 empty bins를 새로 만들지 않는다.
