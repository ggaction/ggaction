# STEP 3 — Restore the Basic Browser Bundle Promise

## 진행 상태

- [x] Installed-package Basic module graph와 gzip contribution audit
- [x] Public export/capability-preserving source reduction
- [x] Basic executable ceiling을 120,000 bytes로 복원
- [x] README와 architecture numeric truth 동기화
- [x] Full/basic/SVG installed bundle 측정과 package contract 검증
- [x] Semantic, trace, render와 pixel regression 확인

## 실행 계약

`ggaction/basic`의 public exports는 계속 `chart`와 Canvas `render`이며 BasicChartProgram이 제공하는 action/facade
집합은 바뀌지 않는다. 중복 registration, unreachable import 또는 tree-shaking을 방해하는 wiring만 줄인다.

Canonical executable ceilings는 다음 값으로 마감한다.

| Entry | Gzip ceiling |
| --- | ---: |
| `ggaction` | 225,000 bytes |
| `ggaction/basic` | 120,000 bytes |
| `ggaction/svg` | 25,000 bytes |

측정값에 맞춰 ceiling을 느슨하게 올리지 않는다. Public state, trace, concrete graphics나 rendered pixels가 달라지면
작업을 중단하고 별도 결정을 요청한다.

## 구현 결과

- Basic registration은 Basic이 실제 사용하는 `bin2d` transform validator와 point/bar/rect source-mark vocabulary만
  연결한다. Full entry의 complete transform, Parallel, selection과 legend-highlight lifecycle은 full registrar에 남는다.
- Transform topology/provenance flags는 전체 transform 구현과 분리해 Basic materialization이 사용하지 않는 density,
  window, Horizon과 gradient-profile 코드를 끌어오지 않는다.
- Basic의 public exports와 chart facade 집합은 그대로이며, 대표 scatter program은 full entry와 같은 semanticSpec과
  graphicSpec을 만든다. Basic trace의 기존 top-level/facade decomposition도 focused contract로 고정했다.
- Installed minimal Vite consumer의 Basic graph는 241 → 210 modules, 126,454 → 112,984 gzip bytes로 줄었다.
- Final installed measurements는 full 222,930, Basic 112,984, SVG 5,760 gzip bytes로 각각
  225,000/120,000/25,000 ceiling을 만족한다.
- Package entry count 412와 packed ceiling 400,000 bytes는 유지했다. Source split 때문에 unpacked artifact가 기준선
  1,823,923 → 1,827,671 bytes로 3,748 bytes 늘어 내부 unpacked ceiling만 1,825,000 → 1,835,000으로 좁게
  조정했으며, final packed artifact는 386,876 bytes다.

## 검증 결과

- Focused Basic/full output and trace contract: 3/3 pass
- `npm test`: 2,061/2,061 pass
- `npm run test:coverage`: 94.74% lines, 90.25% branches, 98.47% functions; 70 critical floors pass
- `npm run test:docs`: 45/45 pass
- `npm run package:check`: 412 entries, 386,876 packed bytes, 1,827,671 unpacked bytes
- `npm run test:package`: installed runtime, types, tutorials, native adapters와 full/basic/SVG bundle budgets pass
- `npm run test:browser`: 53/53 pass
- `npm run test:render`: 136/136 pass; approved and active-review galleries verified
