# W2 — opacity symbol TypeScript 결과

[계약](CONTRACT_W2_OPACITY_SYMBOL_TYPES.md)과 [전체 승인](../APPROVAL.md)에 따라 #107을 수정했다. 기준374b07c9에서 runtime은 성공하지만 createLegend/editLegend/editLegendSymbols/createGuides의 opacity point recipe가 strict TypeScript TS2353으로 실패하는 네 경로를 재현했다.

LegendSymbolRecipe에 기존 단일 opacity point 형태(type?/radius?/fill?/stroke?/strokeWidth?)를 반영했다. Runtime/action/geometry는 변경하지 않는다. Categorical layered point는 기존 size를 유지하며 opacity radius와 구별한다. 문서와 current contract를 동기화했다.

## 검증

- Strict TypeScript 신규1test: 생성·편집·nested guide·재사용 options positive cases와 type circle/string radius/numeric fill/unknown key/layer radius의5negative cases PASS.
- 기존 continuous/opacity spacing과 합쳐 focused17/17 PASS. Runtime baseline의 최종 radius13/guideRadius9를 확인했다.
- Full normal2916/2916 PASS. Runtime source가 동일하여 coverage는 직전374b07c9의95.46%lines/92.35%branches/99.02%functions,86critical floors 결과를 재사용한다.
- Canonical tgz installed Node/strict TypeScript/exports/MCP/bundle consumer PASS. Installed TS에도 생성·generic/focused editing/nested guide와 invalid radius를 추가했다. 동일 tgz Chromium Canvas/SVG1/1 PASS.
- Docs generate/preflight/Jekyll build/built125pages PASS. TypeScript snapshot과 LLM/search artifacts를 재생성했다.

[패키지 측정](package-opacity-symbol-types-results.json): SHA256 `cf7030f8e1f5cdcea68ac2420f0daa9c2679bf1bc4c1c1c3bcc13ec1491972c4`, entries452/packed509163/unpacked2432387bytes. Browser gzipFull253346/Basic139625/SVG6437bytes. 한도 변경 없음. Version0.0.12 개발 checkpoint이며 최종0.0.13 release는 남아 있다.

Ignored evidence는 `.artifacts/roadmap6-authoring/phase5-opacity-symbol-types-*`와 `package-opacity-symbol-types/`에 있다. W2 전체 family×edge×lifecycle 통합과 W3–W5, Phase6–11, 실제 release는 계속 진행한다.
