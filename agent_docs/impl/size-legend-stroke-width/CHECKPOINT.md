# Size legend omitted outline width correction

## 진행 상태

- [x] 기존 공개 옵션만 사용한 renderer 실패 재현 및 부모 불변성 확인
- [x] Size materializer에서 명시 stroke / 생략 width에 base 폭0 적용
- [x] 원래 무외곽선 sample의 concrete shape와 명시 폭 유지
- [x] Continuous / ordinal / quantize, side / corner, 교체·해제·resize·scale·persistence 검증
- [x] SVG / native Canvas PNG에서 명시0과 동일 출력 확인
- [x] Unit3034 / contracts533 / docs120 / package check 통과
- [ ] 이 checkpoint를 실행 저장소에 통합하고 영향을 받는 기존 결과 재검증

## 범위와 승인

현재 공개 `editLegendBlock.symbol.stroke`와 선택적 `strokeWidth`가 허용하는 조합을
materialize하는 bug fix다. 새로운 공개 옵션, persisted schema, 기본 간격 또는 renderer
의미 변경은 없다. 사용자는 번역 중 확인한 ggaction 결함을 계속 수정하도록 승인했고,
2026-10-16 부모 작업이 동일한 투명 stroke 재현에 대해 이 isolated bug fix를 명시 지시했다.
별도 미해결 공개 설계 Gate는 없다. Stable runtime은 변경하지 않았다.

## 변경과 증거

Size sample의 기존 layout은 생략한 outline 폭을0으로 계산하지만 concrete circle에는
`stroke`만 쓰고 폭을 쓰지 않았다. 이 조합은 SVG / persistence의 finite-width 계약을
만족하지 못했다. 동일 owner가 명시 stroke에 필요한0을 concrete 결과에 기록한다.
Stroke도 없으면 기존 property omission을 그대로 유지한다. 명시 폭은 그대로 유지하고,
block symbol 객체 교체와 해제는 기존 base-style 의미를 유지한다.

`test/unit/actions/guides/size-legend-stroke-default.test.js`의8개 test와 인접18개 test가 통과했다.
전체 Unit3034, contracts533, docs120이 통과했고 package check는565 entries,
793,059 packed bytes / 3,894,683 unpacked bytes였다. 기존 artifact 예산 안이며 새 runtime
모듈이나 공개 declaration은 추가하지 않았다. PNG는 decode 없이 byte identity로 비교했으며
차트 픽셀을 보지 않았다. Canonical contract와 영어 공개 editing 문서를 함께 정정했다.
