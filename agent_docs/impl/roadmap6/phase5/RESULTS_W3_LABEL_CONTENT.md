# W3 B1 — Final-item semantic label content 결과

상태: 구현·검증 완료. [계약](CONTRACT_W3_LABEL_CONTENT.md)과 [전체 승인](../APPROVAL.md)을 따른다. W3 전체나 0.0.13 릴리즈 완료는 아니다.

## 구현과 rationale

- `encodeText`가 기존 field/constant 외에 `content:"category"|"value"|"share"`를 지원한다. Exclusive assignment이며 source-owned Bar/Arc의 final item을 읽는다. `createMarkLabels`가 조합할 낮은 층위의 내용 정의다.
- Bar value는 final members에 canonical aggregate를 적용하므로 누적 끝점·normalized height와 구분된다. Histogram은 final segment count, Pie는 sector count/weighted sum/quantitative theta, Radial Arc는 radius 의미값을 사용한다.
- Share는 current source total 또는 명시적 Bar category/bin total을 분모로 사용한다. Filtering 뒤 새 값으로 재계산하고 큰 finite 값은 최대값 정규화로 합계 overflow를 피한다. Negative/nonfinite value와 non-empty zero denominator는 오류다. Empty final item set은 라벨도 비운다.
- `format:".0%"`–`".12%"`를 추가했다. Auto는 기존 deterministic String 변환을 유지하므로 share는 fraction이다. Field/datum/content/normalization의 재지정은 incompatible branch를 제거하고 format omission은 보존한다.
- Primitive semantic paths와 shared closed-vocabulary validators, TypeScript, current contract, architecture, generated docs/cards, installed/browser probes를 동기화했다. 새 grammar owner에 95/85/100 critical coverage floor를 추가했다. Direct action inventory는 194 direct / 188 user-facing으로 유지된다.

## 수정한 기존 버그

- [#111](https://github.com/ggaction/ggaction/issues/111): Histogram의 attached text를 independent unbinned consumer로 취급하여 resize가 실패했다. 실제 binned owners만 domain을 정의하고 source 관계가 확인된 text를 독립 bin 소비자에서 제외한다. 필터로 source item count가 바뀔 때 position scale이 text를 source geometry보다 먼저 갱신하던 경로도 유예하여 dependency plan에서 source 다음에 실행한다. 진짜 independent unbinned text 혼합은 계속 오류다.
- [#112](https://github.com/ggaction/ggaction/issues/112): TextFormat의 number template이 `.13f`, `.-1f`, `.1.5f`를 컴파일 허용했지만 runtime은 거부했다. Strict compiler로 기존 선언의 accept를 재현한 뒤 precision을 runtime과 일치시켰다. 기존 runtime이 허용한 zero-padded `00`–`09`도 보존했다. 새 percent 역시 같은 규칙을 따른다.

## 검증

- Normal 전체 **2961/2961 PASS**.
- Focused runtime/grammar/source/primitive **39/39 PASS**. Final type/precision 추가 검증 **8/8 PASS**.
- Final source coverage **95.49% lines / 92.46% branches / 99.03% functions**, **87 critical floors PASS**. 이후 변경은 선언·타입 테스트·문서이며 runtime source는 동일하다.
- Independent literal text primitive로 Pie 25%/75%, stacked Bar 1/1/2/4를 먼저 렌더링·검토했다. Public graphics/order/Canvas calls 및 same-run PNG pixel equality **2/2 PASS**; normal suite에 포함된다.
- 네 Bar layout, 양 orientation의 pure aggregate, histogram/bin normalization, Pie count/sum/quantitative theta, measured Arc, negative/zero/huge values, source completion·aggregate reassignment·filter·scale·Canvas, immutable rejection을 검증했다.
- Facet child를 먼저 만든 뒤 각 child source에 붙인 라벨의 25/75와 75/25 분모를 확인했다. 현재 facet의 pre-existing text template 거부도 명시적으로 검증했다. Text-bearing facet template 지원을 이 변경에서 완료로 주장하지 않는다.
- Canonical installed Node/runtime/types/MCP/export/bundle consumer PASS. Type probe는 canonical precisions 26개와 zero-padded precisions 20개, invalid content/normalization/precision을 검증한다.
- 동일 tgz의 Chromium browser **1/1 PASS**. 실제 Canvas render, SVG의 25.0%/75.0%, filter 뒤 100.0%를 확인했다.
- Docs generation/preflight/build, built pages **125 PASS**. Catalog/navigation/documentation closeout **21/21 PASS**.

## Canonical artifact와 budget

[Package evidence](package-label-content-results.json): SHA-256 `7e88492942d68094773eabc38a1f16519c147752ba4917f08587437002f141de`.

- Entries 453; packed 511605 bytes; unpacked 2441550 bytes.
- Browser gzip Full 254683 / Basic 139916 / SVG 6437 bytes.
- 새 grammar 파일을 위해 entry cap 452→453, measured compressed size 증가에 맞춰 packed cap 511000→512000으로 조정했다. Unpacked 2500000과 browser gzip 255000/141000/25000 한도는 유지했다. 전체 승인에 포함된 조정이다.
- Artifact는 개발 버전 0.0.12다. 실제 0.0.13 release artifact가 아니다.

로그는 `.artifacts/roadmap6-authoring/phase5-label-content-*`, baseline probes는 `histogram-label-baseline.mjs`, `text-format-type-baseline.mts`에 보관한다.

## 다음 범위

`createMarkLabels` facade, reference line/band, annotation과 공통 axis/legend/text format·rotation, W4 theme, W5 fitting을 계속한다. D13/F14/F18과 Phase 5 전체는 완료하지 않았다.
