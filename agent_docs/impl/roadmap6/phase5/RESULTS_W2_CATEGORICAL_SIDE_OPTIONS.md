# W2 C2 — categorical side option parity 결과

[계약](CONTRACT_W2_CATEGORICAL_SIDE_OPTIONS.md)과 [전체 승인](../APPROVAL.md)에 따라 #108을 수정했다. 기준e8c88162의 right columns3/horizontal 및 양쪽 side titlePosition left는 무시되며 성공했고, left columns1과 horizontal grid→left 전환은 거절됐다.

Categorical normalizer의 양쪽 side를 vertical/center/한 열/top title로 통일했다. Right stored direction도 실제 출력과 같은 vertical이 기본이다. Columns omission/1은 허용하고 의미 없는 option은 오류다. Horizontal grid는 columns1/top title을 명시하여 양쪽 side로 이동한다. 명시하지 않은 기존 edit option 보존과 legacy-bottom 계약은 유지한다. Layout/renderer의 기존 유효 시각 결과는 변경하지 않는다.

## 검증

- Full/Basic color/line/shape×left/right의 defaults/columns1/nested guide/invalid options 및 Full focused editing/Canvas replay PASS. 초기 nested guide probe는 기본 grid를 포함했으므로 grid:false를 명시해 같은 최종 옵션을 비교했다.
- Focused190/190, full normal2918/2918 PASS. 기존 primitive graphics/order/pixel pairs도 누적 suite에서 유지된다.
- Coverage95.47%lines/92.34%branches/99.02%functions; critical floors86개 PASS.
- Installed canonical Node/types/MCP/export/bundle consumer PASS. Full/Basic 양쪽 side의 유효·거부 옵션과 Full top-grid→side 전환을 검사했다. 동일 tgz Chromium Canvas/SVG1/1: 네 consumer case의direction vertical/invalid3개 거부/SVG 정상 확인.
- Docs generate/preflight/Jekyll build/built125pages, catalog/navigation/documentation closeout21/21 PASS. Default direction과 migration을 type/current contract/docs에 동기화했고 PNG bytes는 변화가 없다.

[Canonical package](package-categorical-side-options-results.json): SHA256 `941782ef41a0ab33afa24ade68e2337324764a4a809b81ececd74f43b4e896be`, entries452/packed509239/unpacked2432884bytes. GzipFull253359/Basic139640/SVG6437bytes. 기존 한도 유지. 0.0.12 개발 checkpoint이며 0.0.13 최종 release는 아니다.

Ignored logs는 `.artifacts/roadmap6-authoring/phase5-categorical-side-options-*`에 있다. 전체 통합 감사에서 별도 발견한 combined size의 edge-dependent default #109는 아직 미완료다. 해당 통합 audit은9/10 PASS이며 stable suite로 승격하거나 W2 완료로 기록하지 않았다. 후속 W3–W5/Phase6–11/release도 남아 있다.
