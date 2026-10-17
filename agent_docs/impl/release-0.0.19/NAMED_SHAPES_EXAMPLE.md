# Named point shape 승인 목표의 정식 예제

## 범위와 승인

#170/#175의 기존 승인 `bad3f346` / 승인 기록 `f53dd78a`를 재사용한다.
원래480×270 chart body의 네 glyph를 보존했다: wedge/arrow 각각 area100·225,
anchor85/195×100/180, clockwise0·90도 및 원래 area/angle labels다.
설명용 target heading은 차트 API 출력이라고 주장하지 않는다.
기존 runtime feature/API/type/architecture는 변경하지 않았다.

- canonical `examples/named-shapes/program.js`가 scatterplot 선언 뒤 shape/size/angle
  encoding을 명시하며 함수별 핵심 인수는3개 이하로 작성했다.
- 독립 `test/oracles/directional-point-scenes.js`가 raw vertices, shoelace area,
  회전과 area 정규화로 primitive 좌표를 만든다. Runtime geometry, public program,
  materialized snapshot을 읽거나 복사하지 않는다. Literal 좌표·면적·wedge centroid·
  arrow bounds-center를 고정 assertion으로 검증한다.
- `test/charts/named-shapes/`의 manifest는 canonical public/explicit primitive,
  표시한 전체 top-level 호출,480×270 크기와 artifact identity를 소유한다.
- graph/order/nativeCanvas호출/전체518400RGBAbytes, PNG, SVG, PDF를 exact 비교한다.
  SVG는 기존 `resourceNamespace:'comparison'`으로 identity를 명시하며4path/noimage를 검사한다.
- registry/shared browser host/catalog/API source link/문서 이미지가 같은 program을 재사용한다.
  Browser는 Canvas fullRGBA, nativeNode와동일SVG,4path/noimage/status/크기/접근성 이름/오류없음을 검사한다.
- 승인된 source-neutral 어휘를 유지했으며 이미지 관찰/VLM/외부 모델 API를 사용하지 않았다.

## 검증

- primitive/public/PNG/SVG/PDF/browser/vertical/discovery 집중 **19/19 PASS**.
- 기존 directional shape/type/source-boundary **13/13 PASS**.
- 문서120개 검사는 canonical source commit 이후 재생성하여 최종 기록한다.
  선행 검사의 search-budget2개 실패는 실측828580bytes에 따라 cap만829000으로
  좁게 조정한다. 새 source 링크1개 실패는 commit 전 canonical 경로가 없어 발생했다.
  Runtime/package/browser/coverage 한도는 변경하지 않는다.
- artifacts: `.artifacts/test/png/charts/point-shapes/named-shapes/area-and-rotation/`
  아래 `primitive.png`, `user-facing.png`, exact public call chain의 `variant.json`.
