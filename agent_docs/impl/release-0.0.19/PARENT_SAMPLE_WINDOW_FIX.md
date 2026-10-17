# Parent sample-window 복원 정정

## 범위

기존 승인 #176/#206의 parent 및 ordinary composition 결합 버그 정정이다.
새 public API/schema/renderer 경계는 추가하지 않는다. `createGraphics`의 기존
letters/numbers/underscore/hyphen ID 정책은 그대로 유지한다.

- 내부 clip Canvas와 glyph object ID는 기존 `namespaceGraphicId` owner로 생성한다.
  원래 mark item ID, typed sample domain, size mapping, radius/path/stroke는 유지한다.
- parent intent의 closed config keys에 이미 승인된 `clipHeight`를 포함한다.
- scaffold는 저장된 block마다 channels/combine/representation/명시 symbol을 사용한다.
  각 원래 config를 복원한 뒤 최종 materialization에서 clip을 적용하므로 서로 다른
  window와 unclipped gradient strip이 독립적으로 유지된다.
- `auto`, partial removal, local native position, short union fit 오류는 immutable하다.
- 색상+size 결합(`colorSize`)의 기존 `combine: 'color-size'` scaffold 분기도 보존한다.
  해당 기능의 새 구현 결합 검증은 별도 통합 담당자와 진행한다.

## 실행 증거

환경: macOS, Node22.23.1, npm10.9.8, Ruby3.2.11.

- `npm run test:unit`: **3260/3260 PASS**, 85254ms.
- parent7 + 기존 sample-window7 최종 focused: **14/14 PASS**.
  typed domain `["1", 1]`의 구분, mapped areas `[5000,10000]`, block config 전체
  equality, `size-shape`/local position/reflow/import, gradient+size, ordinary facet/hconcat,
  mark selection identity, closed-key/invalid snapshot, atomic short-union reset 포함.
- symbol-window public/primitive/PNG, native sample-window PNG/PDF, browser36cases,
  source boundaries, chart vertical slices: **14/14 PASS**.
- combined appearance/block/edges/types/discovery: **30/30 PASS**.
- clip 생략 legacy12cases: 기존 `0e373e71`와 JSON/SVG/전체decodedRGBA **exact PASS**.
  재현: `node agent_docs/impl/release-0.0.19/probes/legend-symbol-window-default-parity.mjs`.
  고정 결과: [default parity evidence](evidence/legend-symbol-window-default-parity.json).
- Ruby3.2 Jekyll build +150builtpages 검사 PASS.
- 최종 installed package runtime/Full-Basic/TypeScript/MCP/browser 검사 **PASS**.
  원래 package 및 bundle cap 실패는 위 실측 조정 이후 재실행으로 해소했다.
- postcommit provenance freshness는 source commit 이후 별도 재생성·확인한다.

## 측정된 package 예산

589entries /833342packed /4061404unpacked. 기존 owner2모듈 증가를 포함한 최소한도
589 /834000 /4062000 적용. Installed browser 실측 Full411464/Basic201346gzip로
기존410000/200000 검사는 실패했다. 최소1000단위412000/202000으로만 갱신하며,
SVG25000과 모든 inventory/coverage 기준은 유지한다.
