# Theme collection identity 보존

## 진행 상태

- [x] `d29d17622` 이후 실제 public Area/BoxPlot에서 item identity 누락 재현
- [x] 기존 collection primitive에 identity를 그대로 전달하는 최소 수정
- [x] Apply/swap/remove, rect/path owner clip, codec, scene, named highlight 회귀
- [x] 집중 검사·문서·source-free installed consumer·package/bundle 한도 검증
- [ ] STEP-033의 guide family 색 복원·geometry/palette/provenance 및 Flow 연결
- [ ] STEP-034/035 responsive layout·nested facet/shared guide

색상만 바꾸는 `recolorGraphic`이 collection item의 type/properties만 전달하면서 기존 identity를
버리고 index 기반 id로 다시 만들었다. 기존 `editGraphics` 입력 계약에 맞게 optional identity를 함께
전달한다. Raw id나 새로운 state를 저장하지 않는다. Owner clip은 기존 primitive가 이미 보존하므로
새 clip 처리 경로를 만들지 않고 rect/path 회귀로 확인한다. Public signature와 선언은 변경하지 않는다.

새 집중 회귀 3개는 실제 Area와 BoxPlot rule/cap/median collection에서 key/lineage/topology, Canvas/SVG
scene key와 clip, offline 복원 후 row 선택을 검사한다. Named highlight의 기존 앞쪽 재정렬을 허용하되
identity 자체는 유지한다. 이전 immutable program도 동일하다. 최초 잘못된 fixture option 실패는
별도 로그로 남겼으며, 올바른 fixture로 수정 전 0/3 실패와 수정 후 3/3 통과를 확인했다.

기존 theme/parallel을 포함한 94개, source/package/discovery 계약 33개, docs 172개가 통과했다.
수정된 reconcile owner의 집중 coverage는 94.93/92.62/96.10이며 전체 source coverage를 뜻하지 않는다.
Node20의 source-free 설치에서는 같은 3회귀를 공개 package import로 실행했다. 이는 scene의 구조적
증거이며 새로운 SVG/PDF pixel parity 주장은 없다. Bundle 실측 Full 601,984 / Basic 350,038 / SVG 19,199
gzip bytes로 기존 한도를 유지했다. Package는 823 entries, 1,208,357 packed / 5,561,025 unpacked bytes다.

입력 hash, tar SHA256, commands와 결과는 `identity-evidence/summary.json`에 보존한다. 이 checkpoint는
기존 identity 보존 계약 수리이며 STEP-033 전체 완료를 의미하지 않는다.
