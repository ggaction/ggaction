# STEP 3 — Restore the Basic Browser Bundle Promise

## 진행 상태

- [ ] Installed-package Basic module graph와 gzip contribution audit
- [ ] Public export/capability-preserving source reduction
- [ ] Basic executable ceiling을 120,000 bytes로 복원
- [ ] README와 architecture numeric truth 동기화
- [ ] Full/basic/SVG installed bundle 측정과 package contract 검증
- [ ] Semantic, trace, render와 pixel regression 확인

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
