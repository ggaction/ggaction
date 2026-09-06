# W2 — combined size appearance 결과

[계약](CONTRACT_W2_COMBINED_SIZE_APPEARANCE.md)과 [전체 승인](../APPROVAL.md) 아래 #109를 수정했다. 기준213b7eac에서 left→right 이동은 size title#334155, 직접 right 생성은#0f172a였다. 새 통합 matrix의 combined 행에서 실패했다.

신규 categorical+size는 모든 edge에서 categorical typography를 상속한다. Position 조건을 제거해 left·explicit typography에만 적용되던 정책을 통일했다. 새 right/top/bottom combined title은#334155이며 standalone size default#0f172a와 기존 standalone의 저장된 style은 보존한다. Label offset12, geometry, renderer, explicit/partial edit의 merge 경계는 유지한다. 단순히 이동할 때 색을 재설정하면 기존 사용자 style을 잃기 때문에 creation provenance를 바로잡았다.

## 검증

- 수정 전 literal primitive fill#334155로 right/top target을 작성·렌더링·육안 확인하고 stable contract가 old fill#0f172a에서 실패함을 확인했다. 수정 후 four-edge graphics/order/same-run PNG pair PASS.
- Focused13/13:9family×4edge×border와 Basic7family parity, combined default/explicit/partial typography, stored standalone 유지, hidden/restore. 통합 검사는 semanticSpec/resolvedScales/graphicSpec까지 확대하여 별도10/10 PASS.
- Full normal2931/2931 PASS. 초기9fail은 old combined title literal references였으며 Cars regression, combined horizontal 및 content 생성/제거의 기대 fill을 교정했다. 기존 standalone에서 content를 확장한 reference는#0f172a를 유지한다. 수정된 reference-focused18/18 PASS.
- Coverage95.46%lines/92.35%branches/99.02%functions,86critical floors PASS.
- Cars 실제 회귀 차트 variants와 combined appearance/edge PNG11/11 PASS. 생성된 Cars regression 문서 이미지도 같은 public program을 사용한다.
- Installed canonical Node/types/MCP/export/bundle consumer와 동일 tgz Chromium1/1 PASS. Full/Basic 모든 edge default와 Full 이동 parity, 브라우저 right/bottom combined title colors#334155를 검사했다.
- Docs generate/preflight/Jekyll build/built125pages PASS. Current contract·type comment·public docs와 generated assets를 동기화했다.

[Canonical package](package-combined-appearance-results.json): SHA256 `7f60f45759c4a5226417028a2d9bd525e7530f099aa97f3680a01fa48f00e541`, entries452/packed509289/unpacked2432882bytes. Browser gzipFull253346/Basic139624/SVG6437bytes. 한도 변화 없음. 0.0.12 개발 checkpoint이며0.0.13 release artifact가 아니다.

Ignored logs/targets는 `.artifacts/roadmap6-authoring/phase5-combined-appearance-*`와 `combined-appearance-*-target.png`에 있다. W2 통합 종료는 [RESULTS_W2_INTEGRATION.md](RESULTS_W2_INTEGRATION.md)에 기록한다. W3–W5와 후속 Phase 및 release는 남아 있다.
