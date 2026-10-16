# Corner 범례 title 측정 복원

## 진행 상태

- [x] 기존 실제 bounds 측정 계약에 대한 bugfix이며 새 API나 persisted schema를 추가하지 않는다.
- [x] Corner item block의 불필요한 외부 SIDE fixed52 first-row floor를 제거하고 title bottom→item top 기존12px 간격으로 측정한다.
- [x] Native inset8 및 기본 itemGap18 유지. 사용자 승인된 별도 source pitch 예외는 번역 파이프라인에서만 적용한다.
- [x] Standalone 네 corner와 grouped intrinsic corner에 동일하게 적용한다. Grouped corner marker는 ephemeral derived frame에만 존재하며 저장하지 않는다.
- [x] Full/Basic, 작은 title/label, multiline title, 큰 symbol stroke/font, 충분하지 않은 공간에서 immutable 실패, persistence와 Canvas replay 회귀.
- [x] 외부 left/right24조합의 기존 layout을 exact 비교했다. [SIDE_PARITY.json](./SIDE_PARITY.json).

## Generic 재현

150×150 plot, line sample10×1.5,10categories, title11px, label7px, 명시적 pitch11px, native inset8의 최소 프로그램은 기존 first-row52 floor 때문에 넘쳤다. 실제 title/item bounds에12px gap을 적용하면 전체가134px inset 영역에 들어간다. Mark/data/plot 크기나 요청한 위치를 바꾸지 않는다. 이 명시적 pitch는 generic 회귀 fixture이며 기본값18을 변경하지 않는다.

검증: focused30/30(new4+sampled26), full unit3,006/3,006, contracts532/532, docs120/120 통과. Packed564entries·791,799bytes·unpacked3,889,033bytes로 기존 한도 유지. Installed Full gzip 실측389,027bytes가 기존389,000을27bytes 초과하므로 기존 최소1,000bytes 단위 정책으로 Full 한도만390,000으로 조정한다. Basic189,000/SVG25,000 한도 유지. Source 데이터셋 코드 작성이나 모델 호출, 차트 pixels 관찰은 수행하지 않는다.
