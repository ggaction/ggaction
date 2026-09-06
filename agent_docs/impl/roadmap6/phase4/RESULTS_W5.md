# Phase 4 W5 — Midpoint와 color scale/legend 전환 완료

[전체 실행·릴리즈 승인](../APPROVAL.md)에 따라 [midpoint 기반](RESULTS_MIDPOINT.md)에 이어 P4-C07의 type transition과 V3의 Point/Bar 두 표현을 구현·검증했다. **Phase 4 전체 통합 검증은 아직 남아 있다.**

## 구현된 결과

- Point·aggregate Bar·Rect는 Full의 editScale 또는 encodeColor nested type reassignment로 sequential↔quantize/quantile/threshold를 전환한다. Source/field meaning을 몰래 바꾸지 않고 기존 final grain을 유지한다.
- `grammar/scales/colorConsumers.js`가 생성·scale 편집·materialization의 fieldType/aggregate/grain/unknown 검증을 공유한다. 기존 edit 검사가 Bar·Rect의 실제 생성 지원보다 좁던 문제를 교정했다. Quantile domain이 source row 대신 Bar 최종 aggregate 2·8을 사용하여 경계 5가 되는 독립 사례를 확인했다.
- 편집은 모든 shared consumer와 guide를 포함한 immutable candidate를 검증한 뒤 같은 wrapped child plan을 적용한다. 실패하면 이전 semantic/graphic/config/resolved/context/trace가 유지된다. Nested reassignment도 internal scale setter에서 같은 editScale owner를 호출한다.
- Right/vertical gradient↔interval legend를 같은 transaction에서 교체한다. Target/channel, title·inferred mode·visibility, labels/titleStyle/border/align/offset을 보존한다. 이전 family의 custom count/gradient size/symbol/itemGap은 조용히 버리지 않고 오류다. 새 family의 전용 속성은 새 default를 사용한다.
- Explicit extent, quantile sample, threshold domain의 의미가 바뀌면 새 domain을 요구한다. Sequential↔quantize의 compatible extent 또는 타입이 지원하는 auto intent는 유지 가능하다. Midpoint/interpolate 등 stale type 속성은 제거하고 복귀 시 숨은 복원은 없다.
- Interval legend 생성의 Point-only dispatcher와 target resolver도 Bar·Rect에 맞췄다. Basic에서 typed interval chart 생성이 내부 등록 누락으로 실패하던 문제를 고쳤다. Basic의 structural edit 제한은 유지하고 type reassignment를 Full 또는 새 scale ID 경로로 안내한다.
- Docs generation에서 capability producer보다 action-reference consumer가 먼저 실행되어 첫 생성 직후 stale reference가 남던 오류를 수정했다. 의존 순서대로 한 번 생성한 뒤 freshness가 통과한다.

## 증거

[공개 프로그램](../../../../examples/color-transitions/program.js)과 [primitive/manifest/tests](../../../../test/charts/color-transitions/)가 두 V3 전환 변형을 소유한다. Primitive는 명시적 legend 제거, semantic scale leaves, scale/Bar materialization, legend 생성으로 먼저 작성·렌더링했다. 값 -2/0/4/8은 Point에서 blue/blue/red/red, zero-height Bar를 제외하면 blue/red/red다. 구간 경계는 3이다.

| 검사 | 결과 |
| --- | --- |
| 최종 npm test | 2,748/2,748; fail/skip/cancel 0 |
| 초기 transition + 기존 scale/Bar/discretized focused | 42/42 |
| 확장 transition focused | 19/19; 3 mark × 3 target type × legend 유무의 양방향·reassignment matrix 포함 |
| 두 primitive/public + primitive oracle + 두 PNG + 두 SVG/PDF | 7/7 |
| Browser 전체 | 63/63 |
| Docs/catalog/capability/reference/card/signature/search/machine/LLM | 의존 순서 수정 후 한 번 생성·normal freshness 통과 |
| Installed package | Full Bar family transition·nested 복귀·Basic interval 생성·Node/renderers·strict types·tutorials·MCP·browser bundles 통과 |

Common style/hidden→auto title/focused edits, shared temporal incompatibility, unknown fallback, overflow rollback, Canvas resize, highlighted item identity와 baseline colors도 확인했다. 같은 실행의 exact semantic/graphic/draw/Canvas/decoded pixels 및 SVG/PDF 동등성을 검사했다. Bar target PNG를 직접 열어 범례와 색·경계 대응을 확인했다.

[패키지 결과](package-color-transition-results.json): SHA-256 `51d15921c3d82dcf6a65cb322132884483741418bd176d136fc0035dde6b0d75`.
443 entries / packed 496,258 bytes / unpacked 2,368,693 bytes.
Full/Basic/SVG gzip 246,966 / 136,900 / 6,437 bytes.

최초 package entry 443이 기존 442를 초과했고 Basic은 기존 136,000을 900 bytes 초과했다. 사전 승인에 따라 entries 444, Full 249,000, Basic 138,000으로 한도를 조정했다. Full은 최초 기존 한도에 34 bytes만 남아 함께 여유를 조정했다. SVG 25,000 및 packed/unpacked 상한은 유지했다. Guard를 끄지 않고 실제 설치 tarball로 검증했다.

로그는 `.artifacts/roadmap6-authoring/color-transitions-*`다. 초기 stale docs 및 primitive test의 잘못된 graphic ID는 수정 후 재검증했다. Current direct 181 / Planned actions 0 / Planned capabilities 0이며 obsolete quantitative Planned 문서를 제거했다. W1–W5의 coverage·realistic·전체 renderer·built docs와 Phase 전체 종료 대조는 다음 통합 단계다. 릴리즈는 전체 로드맵을 마친 뒤 0.0.13으로 수행한다.
