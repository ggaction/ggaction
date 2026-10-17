# 0.0.18 이슈 및 PR 검토

## 진행 상태

- [x] 열린 이슈45개와 PR4개 목록 및 본문 확인
- [x] 이미 구현된17개 이슈를 통합 소스와 대조
- [x] 의존성 PR3개를 릴리스 브랜치에 merge하여 원본 커밋 ancestry 보존
- [ ] 최신 의존성에 대한 전체 CI와 태그 릴리스 검증
- [ ] main 반영 뒤 구현된 이슈17개를 검증 링크와 함께 종료
- [x] 남은28개도 설계 검토 후 모두 구현한다는 사용자 범위 승인

## 구현된 이슈

종료는 main에 반영한 뒤 수행한다. 아래 구현은 기존 승인 또는 기존 계약의 버그 수정이며 새 설계를 묵시적으로 승인한 것으로 해석하지 않는다.

| 이슈 | 검증된 구현 커밋 |
| --- | --- |
| [#165](https://github.com/ggaction/ggaction/issues/165) | [1024d4b0](https://github.com/ggaction/ggaction/commit/1024d4b0) |
| [#178](https://github.com/ggaction/ggaction/issues/178) | [3d1ee556](https://github.com/ggaction/ggaction/commit/3d1ee556) |
| [#179](https://github.com/ggaction/ggaction/issues/179) | [dd84bf1b](https://github.com/ggaction/ggaction/commit/dd84bf1b) |
| [#180](https://github.com/ggaction/ggaction/issues/180) | [e9182b50](https://github.com/ggaction/ggaction/commit/e9182b50) |
| [#181](https://github.com/ggaction/ggaction/issues/181) | [b750e8bc](https://github.com/ggaction/ggaction/commit/b750e8bc) |
| [#182](https://github.com/ggaction/ggaction/issues/182) | [7d4f8ee6](https://github.com/ggaction/ggaction/commit/7d4f8ee6) |
| [#183](https://github.com/ggaction/ggaction/issues/183) | [8853fdcc](https://github.com/ggaction/ggaction/commit/8853fdcc) |
| [#184](https://github.com/ggaction/ggaction/issues/184) | [cb117929](https://github.com/ggaction/ggaction/commit/cb117929) |
| [#185](https://github.com/ggaction/ggaction/issues/185) | [7819b2f0](https://github.com/ggaction/ggaction/commit/7819b2f0) |
| [#186](https://github.com/ggaction/ggaction/issues/186) | [21a2ad91](https://github.com/ggaction/ggaction/commit/21a2ad91) |
| [#187](https://github.com/ggaction/ggaction/issues/187) | [76d08a16](https://github.com/ggaction/ggaction/commit/76d08a16) |
| [#188](https://github.com/ggaction/ggaction/issues/188) | [b5b739a6](https://github.com/ggaction/ggaction/commit/b5b739a6) |
| [#189](https://github.com/ggaction/ggaction/issues/189) | [eec7c757](https://github.com/ggaction/ggaction/commit/eec7c757) |
| [#190](https://github.com/ggaction/ggaction/issues/190) | [eec7c757](https://github.com/ggaction/ggaction/commit/eec7c757) |
| [#191](https://github.com/ggaction/ggaction/issues/191) | [ef02ca64](https://github.com/ggaction/ggaction/commit/ef02ca64) |
| [#192](https://github.com/ggaction/ggaction/issues/192) | [eec7c757](https://github.com/ggaction/ggaction/commit/eec7c757) |
| [#201](https://github.com/ggaction/ggaction/issues/201) | [f9e0aa65](https://github.com/ggaction/ggaction/commit/f9e0aa65) |

## 미구현 제안

다음28개는 실제 미구현 요구다. 완료로 닫거나 API를 임의로 선택하지 않는다. 상세 요구, 재현과 설계 링크는 각 이슈에 보존되어 있다.

| 이슈 | 요구 |
| --- | --- |
| [#164](https://github.com/ggaction/ggaction/issues/164) | Support display label maps for sampled continuous size legends |
| [#166](https://github.com/ggaction/ggaction/issues/166) | Support native dash styling for Cartesian ticks and per-value guide lines |
| [#167](https://github.com/ggaction/ggaction/issues/167) | Support exact calendar-year or substring extraction in computed data expressions |
| [#168](https://github.com/ggaction/ggaction/issues/168) | Define explicit Lab/HCL white-point interoperability with D50 |
| [#169](https://github.com/ggaction/ggaction/issues/169) | Support an explicit gamma control for continuous cubehelix color interpolation |
| [#170](https://github.com/ggaction/ggaction/issues/170) | Support the built-in wedge point shape through the public mark and shape vocabulary |
| [#171](https://github.com/ggaction/ggaction/issues/171) | Support a fused categorical legend for same-field ordinal size and shape encodings |
| [#172](https://github.com/ggaction/ggaction/issues/172) | Support power transforms for continuous color scales and original-value legends |
| [#173](https://github.com/ggaction/ggaction/issues/173) | Support dashed legend borders in public legend creation and editing |
| [#174](https://github.com/ggaction/ggaction/issues/174) | Support semantic Cartesian axis titles inside or above the plot with explicit anchoring |
| [#175](https://github.com/ggaction/ggaction/issues/175) | Support the native arrow point symbol in the public point-shape vocabulary |
| [#176](https://github.com/ggaction/ggaction/issues/176) | Support clipping sampled legend symbols without changing encoded size |
| [#177](https://github.com/ggaction/ggaction/issues/177) | Focused legend text editors cannot select a coexisting opacity block on the same layer |
| [#193](https://github.com/ggaction/ggaction/issues/193) | Support independent placement of selected legend blocks on one mark owner |
| [#194](https://github.com/ggaction/ggaction/issues/194) | Support outward offset of a complete Cartesian axis frame |
| [#195](https://github.com/ggaction/ggaction/issues/195) | Support explicit Cartesian axis label text alignment |
| [#196](https://github.com/ggaction/ggaction/issues/196) | Support positive-response exponential regression through existing regression APIs |
| [#197](https://github.com/ggaction/ggaction/issues/197) | Support named independent Cartesian axes on the same plot |
| [#198](https://github.com/ggaction/ggaction/issues/198) | Support finite floor in typed computed expressions |
| [#199](https://github.com/ggaction/ggaction/issues/199) | Support along-axis offsets for semantic Cartesian axis titles |
| [#200](https://github.com/ggaction/ggaction/issues/200) | Support independent gradient legend direction and optional bottom titles |
| [#202](https://github.com/ggaction/ggaction/issues/202) | Expose fitted regression statistics for data-bound annotations without duplicate moment pipelines |
| [#203](https://github.com/ggaction/ggaction/issues/203) | Support difference compositing through the existing bar appearance API |
| [#205](https://github.com/ggaction/ggaction/issues/205) | Support one quantitative legend combining same-field color and point size |
| [#206](https://github.com/ggaction/ggaction/issues/206) | Support a shared in-plot facet legend wider than one narrow cell |
| [#207](https://github.com/ggaction/ggaction/issues/207) | Support bounded scatter layers above the 10000 generated-point ceiling |
| [#208](https://github.com/ggaction/ggaction/issues/208) | Support explicit opacity on legend symbol recipe layers |
| [#209](https://github.com/ggaction/ggaction/issues/209) | Support bounded summary outputs up to 30000 groups |

## 의존성 PR

- #162: ip-address10.4.0 →10.7.2.
- #163: SDK1.30.0 →1.30.1(선택적 peer도 동일 pin), Canvas1.0.8 →1.0.9, Playwright1.62.1 →1.63.0.
- #210: proxy-addr2.0.7 →2.0.8.

세 브랜치를 #211에 실제 merge했다. main merge 뒤 기존 PR이 자동 종료되는지 확인하며, 자동 종료되지 않으면 포함된 커밋 근거로 정리한다.

최신 audit 재검사에서는 SDK1.30.1, fast-uri3.1.7, source-map-js1.2.1의
3건이 남았다. SDK의 dev/optional-peer pin을1.32.1로 함께 올리고 나머지 두
전이 의존성은 기존 range 안에서 수정 버전으로 갱신했다. 이 checkpoint의
`npm audit` 결과는0건이며 실제 MCP/설치 소비자 검증을 다시 수행한다.

## 승인 경계

저장소 루트 AGENTS.md의 공개 API/저장 스키마/핵심 구조에 대한 명시적 설계 승인 규칙을 따른다. 현재 사용자 요청은 전체 검토·기존 수정 통합·PR 정리·릴리스를 승인한다. 미구현 기능의 구체적인 새 계약은 기존 승인에 포함된 것으로 기록하지 않는다.

28개 설계와 독립 primitive 목표는 별도 검토 branch의
[bad3f346 검토 패키지](https://github.com/ggaction/ggaction/blob/bad3f346/agent_docs/impl/release-0.0.19/PROPOSAL.md)에 게시했다.
사용자는 “설계와 시각 목표 모두 승인하고 구현”으로 구체적 API·저장·시각 목표도
승인했다. 승인 기록은 별도 검토 branch의 `f53dd78a`이며 세 구현 worktree에서 진행 중이다.

## 추가 릴리스 검증에서 발견한 기존 문제

- [#212](https://github.com/ggaction/ggaction/issues/212): Canvas의 `none` paint가
  이전 검정 fill/stroke를 유지하던 기존 버그를 공통 paint owner에서 수정했다.
  원본690767d5와 수정소스의 동일 public graphicSpec에서 `(28,140)` pixel이
  검정→의도한 흰 바탕으로 바뀌는 것을 실제 native PNG로 확인했다. 새API는 없다.
- Polar PNG3종의 native font ink bounds는 macOS와Linux에서 y가3.5px까지
  다르다. [실측](evidence/polar-native-fonts.json)은 각각의 플랫폼에서
  primitive/public3쌍의 decoded pixels가 정확히 같음을 증명한다. 동일 tolerance를
  유지하고Linux의 측정 중심만 분리한다. ink ratio/영역/색/정확한 pixel parity는
  유지하며 차트의 public/primitive program이나 geometric target을 바꾸지 않는다.
- 전체50개실데이터 facet 회귀는 최대폭4,364px, 최대높이2,210px로 확인했다.
  새 guide 배치의 축소된 폭만 exact resource signature에 반영하고50개 build,
  모든 facet/legend label·data integrity 및RSS 제한은 유지한다.

- [#213](https://github.com/ggaction/ggaction/issues/213): Canvas에서 strokeWidth0을
  대입해도 이전 양의 lineWidth가 남으므로 네 drawer가 stroke 호출을 생략하도록
  기존 계약을 복구했다. 실제 Native/Chromium/SVG8bit 표본과 이전 양의 선을 검사한다.
  [수정 근거](../canvas-zero-stroke/IMPLEMENTATION.md)는 별도 기능 제안과 분리했다.
- Hierarchical facade의 모든 옵션·리터럴은 원본 기준5회/3실데이터셋 이상과
  최종8데이터셋 검증을 통과했다. 실제 불가능한 continuous bandPosition5경로만
  runtime·TypeScript 음성 증거로 선언에서 바로잡았다. Area의 두 band 방향은
  실제 원본 집계로 보존했다. 상세 증거는
  [구현 기록](../hierarchical-facade-coverage/IMPLEMENTATION.md)에 있다.

최종 누적 검사에서 기존 primitive 회귀 한 곳만 폭0인80rect+1circle의
불필요한 stroke 호출을 기대했다. 저장 geometry와 실제 양의 선18개는 그대로
검증하고 호출 기대를18로 수정했다. 수정 후 전체216개 renderer 회귀가 통과했다.
직전 CI는4328개 중 이1개 외4327개를 통과했으며 새 head에서 전체를 다시 검사한다.
