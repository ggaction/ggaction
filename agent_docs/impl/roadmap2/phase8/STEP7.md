# Roadmap 2 — Phase 8 Step 7: Factor and Style Primitive Batch

## 목표

Custom Tukey factor/style과 outliers-off targets를 raw primitives로 만들고 Gate C에서 option classes와 optional
component behavior를 승인받는다.

## 진행 상태

- [x] Tukey factor 1.0 reference rows and changed outlier set
- [x] Narrow band width and custom box appearance target
- [x] Custom median stroke/width target
- [x] Diamond/radius/opacity outlier target
- [x] `outliers: false` target without outlier resources
- [x] Two variant manifests and exact future call chains
- [x] Primitive PNGs and browser/renderer checks
- [ ] Gate C user confirmation
- [ ] STEP status, conceptual commit and push

## Gate C

Factor가 statistics를 바꾸고 style은 concrete appearance만 바꾸는지, median과 point geometry가 body에 정렬되는지,
outliers-off target에 stale optional state가 없는지 확인한다.

## 완료 조건

Chosen factor/width/style/shape와 optional-component policy가 두 primitive targets에서 승인된다.
