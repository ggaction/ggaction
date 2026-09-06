# Roadmap 6 Phase 11 W2 결과 — Cross-layer and installed consumer verification

## 고정 결과

- 검증된 source commit과 원격 ref는
  `4068121a73a6d34cfd5c8edece13ea3301d5346e`이며
  `origin/codex/roadmap6-hierarchical-actions`에 push했다.
- Durable contract test가 H0 exact set 31개를 고정하고, composition 3개를 제외한 모든 H0에서 실행 관계를
  따라 H2와 H4에 도달함을 검사한다. Composition은 complete child program prerequisite와 다섯 direct editor를
  별도 계약으로 검사한다.
- Basic 지원 표시는 public `BasicMethodKey` declaration exact set과 일치하고, default와 declared Basic method의
  런타임 가용성을 함께 확인한다. Basic facade가 내부에서 쓰는 undocumented wrapped dependency는 public 지원으로
  과장하지 않는다.

## Fresh package consumer

Fresh packed tarball을 설치한 뒤 Node, extension, PNG/PDF/SVG, strict TypeScript, Basic, tutorial, MCP와
minimal browser bundle을 실행했다. 설치된 knowledge 파일을 직접 읽어 schema v3, 234 cards, H0/H4,
complete/deferred와 package version을 확인했다.

| 항목 | 실제 결과 |
| --- | ---: |
| package entries | 486 |
| packed bytes | 591,993 |
| unpacked bytes | 2,948,977 |
| artifact SHA-256 | `9bd997821860075d66557c132931d9f64bebc0eb62a9d25a9025173e1cd64c92` |
| Full browser gzip | 297,211 bytes |
| Basic browser gzip | 152,124 bytes |
| SVG browser gzip | 6,418 bytes |
| MCP cold start | 477 ms |

Package ceiling은 486/595,000/2,960,000, browser ceiling은 300,000/155,000/25,000 bytes다. 실제 artifact는
모두 그 아래이며 설치 consumer와 package shape가 같은 tarball을 검사했다.

## 누적 검증

| 범위 | 실제 결과 |
| --- | --- |
| unit | 2,277/2,277 pass |
| contracts | 328/328 pass |
| charts | 578/578 pass |
| renderer/gallery | 216/216 pass; approved variants 171, active review 0 |
| docs | 47/47 pass |
| browser examples | 73/73 pass |
| coverage | 95.46% lines, 92.33% branches, 98.96% functions; 88 critical floors pass |
| realistic corpus | 243/243 pass |

새 renderer 의미나 appearance는 추가하지 않았다. 기존 stable chart·renderer evidence를 누적 실행해 discovery
변경이 concrete `graphicSpec` 소비 경계를 바꾸지 않음을 확인했다.
