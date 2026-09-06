# Phase 7 W1 결과 — Polar Scatter와 Polar Line facade

## 결과

- `createPolarScatterPlot({ id?, data?, coordinate?, theta, radius, color?, size?, shape?, point?,
  guides? })`을 Full chart facade로 추가했다. Point mark를 만든 뒤 theta와 radial position을 각각
  `encodeTheta`와 `encodeR` owner에 맡기고, appearance와 Polar guide를 그 아래 child trace로 보존한다.
- `createPolarLinePlot({ id?, data?, coordinate?, theta, radius, groupBy?, color?, strokeDash?, line?,
  guides? })`을 같은 계층으로 추가했다. 기본 line은 open path이며 `line.closed: true`만 seam을 닫는다.
  `groupBy`, color와 strokeDash는 radius나 theta의 의미를 바꾸지 않는다.
- Radial position은 `radius` channel만 소유한다. Point glyph 반지름은 `point.radius`, field-driven glyph
  크기는 `size`가 소유하며 둘을 동시에 요청하면 모호성 오류로 거부한다. `point.radius: undefined`는
  명시적 값이 아니라 omission으로 처리한다.
- 두 facade는 Full surface에만 포함했다. Basic runtime과 declaration에는 노출하지 않으며 installed
  consumer에서 실제 부재를 확인한다.

## 오류와 불변성

- Unknown option, 잘못된 theta/radius field type·unit·scale, duplicate id, Cartesian guide, radius/size
  appearance 충돌과 잘못된 line closure는 첫 child를 반환하기 전에 거부한다.
- 오류 경로와 성공 경로 모두 caller options와 data를 소유권 밖에서 변경하지 않으며 이전 program과
  trace는 immutable하게 유지한다.
- Polar line 요청은 `createPolarLinePlot`으로, radar 요청은 기존 Radar lower chain으로 라우팅한다.
  Intent taxonomy에서 `polar line chart`를 radar phrase로 취급하던 잘못된 기본 추론을 제거했다.

## 시각 동등성과 migration

- `examples/polar-points`의 Cars/Fashion point variant와 `examples/gapminder-polar-trends`의 line variant를
  새 facade로 옮겼다. 표시 call, executable trace와 test manifest를 함께 바꿨다.
- 세 variant 모두 승인된 lower primitive program과 semanticSpec, graphicSpec, draw order 및 decoded PNG
  pixel이 정확히 같다. Line은 기존 open seam을 그대로 보존한다.
- Theme reconciliation과 scale/Canvas replay가 facade child owner를 인식하도록 등록했다. Theta/radius
  scale edit 후에도 coordinate, guide와 mark가 같은 owner hierarchy로 수렴한다.

## 계약·발견성과 검증

- Public declaration, Current chart contract, action index/catalog/card, intent taxonomy, task resolver,
  API/reference/search/LLM 문서와 generated declarations를 실제 surface와 동기화했다. Resolver는 Polar
  scatter/line facade를 실행 가능한 packet으로 만들며 radar와의 phrase 경계를 별도 회귀로 고정한다.
- Strict nested scale witness는 새 theta/radius/color/size/shape 경로를 포함해 95 paths와 373 literal
  witnesses를 실행한다. Public inventory는 205 actions, 6,936 option paths, 10,047 requirements다.
- Focused Polar chart slice 18/18, browser 65/65, render 208/208, documentation 47/47, 누적 normal suite
  3,121/3,121이 통과했다. Coverage는 lines 95.45%, branches 92.4%, functions 98.93%이며 critical floor
  88개를 모두 통과했다.
- Installed package consumer는 Node runtime, strict TypeScript, Basic absence, SVG/PNG/PDF, browser bundle과
  MCP를 통과했다. [artifact 원장](package-polar-results.json)은 474 entries, 552,633 packed bytes,
  2,647,866 unpacked bytes, SHA-256 `6de57398d01eb92700b21ef6921fb28d57d735dbb80c196caa1dbbc19a459998`다.
- Browser gzip은 Full 279,467 / Basic 149,821 / SVG 6,437 bytes다. 새 source entry와 Full facade 증가에
  맞춰 entry ceiling을 473→474, packed ceiling을 552,000→554,000, Full gzip ceiling을
  279,000→280,000 bytes로 최소 조정했다. Basic, SVG와 unpacked ceiling은 유지했다.

## 현실 시나리오 감사와 남은 Phase 7 작업

- 새 facade 두 개는 `realistic-action-direct-polar-parts`에서 직접 실행한다. 이 추가가 deterministic
  schedule을 바꾸면서 기존 fixture의 두 잠복 오류를 드러냈다. 단일 행 temporal group은 path가 될 수
  없으므로 유효한 multi-row group을 선택하거나 전체 series로 명시적으로 재투영하고, 긴 실제 y-axis
  title은 보조 축과 겹치지 않는 offset을 사용하도록 수정했다.
- `npm run scenarios:realistic:audit`는 50개 pinned dataset에서 3,600/3,600 프로그램 실행과 resource
  gate를 통과했다. Strict inventory gate는 205개 중 기존 20개 액션의 현실 direct recipe 부재와 W1을
  포함한 facade option-variant schedule 미배정 때문에 실패했다. 실패 run은
  `.artifacts/scenarios/realistic/audits/2026-09-06T07-10-07-523Z-29757-d0729a0c`에 immutable하게 남겼다.
  이는 실행 실패가 아니며 성공으로 표기하지 않는다. Radar/Rug/Strip의 동일 스케줄을 추가한 뒤 Phase 7
  X 이전에 기존 20개와 전체 strict option inventory를 함께 닫는다.

## 다음 작업

- R6-P7-W2에서 long-form과 explicit Fold Radar facade를 구현하고 W1 Polar owner를 재사용한다.
- Radar와 W3 Rug/Strip 현실 변형까지 합친 뒤 strict inventory audit의 모든 action, option, literal과
  diversity deficit을 0으로 만들고 Phase 7 누적 closeout에서 다시 검증한다.
