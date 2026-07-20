# Step 2 — Cars binned heatmap primitive와 P5-A

## 진행 상태

- [x] `Weight_in_lbs × Miles_per_Gallon` 10×8 cell dataset 생성
- [x] ranged rect와 quantitative count color primitive 작성
- [x] 축, 연속 legend와 title을 포함한 Node PNG 생성
- [x] Browser Canvas parity와 visual contract 검증
- [x] P5-A exact checkpoint commit/push
- [ ] 사용자 승인

## 시각 목표

- 700×500 white canvas
- explicit extent x `[1500, 5200]`, y `[8, 48]`
- full 10×8 grid, white 1px cell separator, `blues` continuous palette
- x title `Vehicle weight (lb)`, y title `Miles per gallon`
- right continuous legend `Cars per bin`
- plot 중심 title `Fuel Economy by Vehicle Weight`
- 빈 cell은 가장 옅은 color로 남고 occupied cell의 음의 관계가 읽혀야 한다.

## Gate A 승인 패키지

- 후보 API와 action hierarchy
- independent oracle test 결과
- primitive call chain과 review PNG
- Node/Browser visual evidence
- production/public surface가 아직 변경되지 않았다는 증거
