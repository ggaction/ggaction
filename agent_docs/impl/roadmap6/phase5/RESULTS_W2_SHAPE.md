# Phase 5 W2 B 선행 — Shape-only legend ownership

기준 `c29f3d764637d985673fdef3a159cd9291e9975a`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md) 아래 [#86](https://github.com/ggaction/ggaction/issues/86)을 수정했다. W2 B 전체 완료는 아니다.

Shape-only point와 unrelated line이 함께 있을 때 createLegend가 없는 point color.field를 읽었다. Color+shape 범례에서 removeEncoding({target:"points",channel:"color"})로 shape만 남기는 경로도 같은 예외였다. 이제 point에 color scale이 있을 때만 같은 field/scale을 사용하는 line을 찾는다. Matching line+point의 기존 자동 recipe는 유지한다.

회귀 증거는 `test/unit/actions/guides/shape-legend-ownership.test.js`다. Complete/incomplete unrelated line, color 제거, 이전 program 불변성, line 보존, Canvas resize, shape scale domain 재정렬, 실제 공유 scale과 별도 scale을 비교한다. 생성·복원 두 실패를 수정 전에 재현했다. 테스트 초안의 잘못된 scale string과 category당 한 점뿐인 colored line fixture는 실제 API와 line 최소 cardinality에 맞게 바로잡았다.

로그는 `.artifacts/roadmap6-authoring/phase5-shape-legend-*.log`다.

| 검사 | 결과 |
| --- | --- |
| Normal | 2,809/2,809, 실패·skip 0 |
| Coverage | lines95.31%, branches92.03%, functions98.91%; 77 critical floors PASS |
| 기존 Cars combined/regression/multi-legend PNG | 11/11 |
| Installed Node/types/MCP/tutorial/renderers/budgets | PASS |
| 동일 tarball Chromium Canvas + SVG | 1/1 |
| Docs generate/preflight/build/static | 125 pages PASS |

Package SHA-256 `2066efdc48e02b412381adf5dbcd16c1963017225e1d71b2bf7ec87effeb55f5`, entries447, packed502550/unpacked2406838 bytes. Full/Basic/SVG gzip249742/137610/6437 bytes; 기존 한도를 유지했다. [정확한 artifact 기록](package-shape-legend-results.json). 0.0.12 개발 artifact이며 릴리즈가 아니다.

범례 content 부분 제거/재작성, auto/explicit recipe provenance, #87과 four-edge layout, W3–W5, 후속 Phase와 0.0.13 release는 남아 있다.
