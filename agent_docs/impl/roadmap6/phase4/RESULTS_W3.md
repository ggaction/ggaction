# Phase 4 W3 — Rose와 Radial bar 완료

[전체 실행 승인](../APPROVAL.md)에 따라 measured radius의 [하위 계산](RESULTS_RADIAL_CORE.md), [encodeR와 scale lifecycle](RESULTS_RADIAL_ENCODING.md)에 이어 두 chart facade와 V2 다섯 변형을 구현·검증했다. W5 및 Phase 전체 통합 검증은 남아 있다.

## 결과와 책임

- Full의 `createRosePlot`은 sector 면적, `createRadialBarPlot`은 inner radius부터의 길이로 값을 표현한다. 기본은 category별 count이며 value를 지정하면 aggregate sum을 명시한다. Basic에는 두 facade를 추가하지 않았다.
- 두 액션은 기존 Arc → theta → measured radius → color → guides의 wrapped child chain을 조합한다. 가상 source field/dataset, chart recipe 상태나 renderer의 의미 추론은 없다.
- Radius scale은 zero-based linear subset을 사용한다. 값 2·3·4 모두 표현하며 Rose는 annulus의 제곱 반지름 차이, Radial bar는 반지름 차이를 비례시킨다. Category source membership, zero category domain, independent color identity를 유지한다.
- 공통 facade guide owner를 Polar까지 확장했다. 자체 coordinate/scale에 속한 theta/radius axes와 theta/radial grid만 허용하고, 호환되는 기존 guide의 생략된 스타일·angle·tick mode를 보존한다. 부족한 component는 기존 wrapped child로 채운다. 외부 target이나 명시적 스타일 충돌은 atomic 오류다.
- Pie와 category/aggregate validation owner를 공유했다. 기존 Pie 및 Cartesian guide 동작의 회귀 검사를 통과했다.
- Discovery에서 Rose와 Radial bar를 각각 `chart.rose`와 `chart.radialBar`로 분리했다. 기존 generic Arc + ordinary radius 조합 대신 각 측정 의미를 소유한 완성 액션을 제안한다. Current direct 181, Planned actions 0, Planned capability 1(midpoint)이다.

## 재현과 검증

[공개 실행 예제](../../../../examples/radial-sectors/program.js)와 [primitive·manifest·검증](../../../../test/charts/radial-sectors/)에 disk/hole Rose, disk/hole Radial bar, theta/legend order의 다섯 변형을 고정했다.
Primitive는 공개 chart facade나 measured encodeR에 의존하지 않고 scale·semantic leaf·explicit materialization으로 작성했다. 독립 literal 반지름과 각도, 원본 membership, semantic/graphic/Canvas 명령 및 편집 후 결과를 비교했다.

| 검사 | 결과 |
| --- | --- |
| `npm test` 최종 실행 | 2,706/2,706; fail/skip/cancel 0 |
| Focused 새 facade + Pie + guide reuse | 75/75 |
| 5 PNG + 5 SVG/PDF + strict chart declaration | 11/11; 같은 실행의 decoded pixel equality와 vector parity |
| `npm run test:browser` | 61/61; 새 radial 예제 포함 |
| Docs/reference/card/signature/search/machine/LLM | 재생성 후 normal freshness 검사 통과 |
| Installed tarball | Node/runtime/renderers, 새 facade sum/count, strict positive/negative types, tutorials, MCP, minimal browser bundles 모두 통과 |

[패키지 기계 결과](package-radial-facade-results.json): SHA-256 `77a3bd9b39fb34f4601f32aa5b8d0e263a0e59c9097ee2c4142c55050516a5e5`.
441 entries / packed 494,189 bytes / unpacked 2,360,635 bytes.
Full/Basic/SVG gzip 245,072 / 134,702 / 6,437 bytes.

공통 Polar guide scoping으로 Basic의 공통 source graph도 증가했다. 기존 245,000/132,000 한도를 넘는 최초 측정을 보존했고, 사전 승인에 따라 Full 247,000 / Basic 136,000, package entry 442로 한도를 조정했다. SVG 25,000과 packed/unpacked 한도는 유지했다. 실제 설치 tarball로 새 한도를 검증했다.

로그: `.artifacts/roadmap6-authoring/radial-facade-*.log`. 초기 inventory·taxonomy·example dimension·entry 한도 실패는 보존했고 수정 후 전체 검증을 통과했다.
PNG: `.artifacts/test/png/charts/measured-radius/radial-sectors/`. Ordered variant를 직접 열어 C/A/B 위치·색·범례 대응을 확인했다. Guide 기본 배치의 추가 fitting은 Phase 5 범위이며 미리 완료했다고 주장하지 않는다. Coverage·realistic 전체·built docs는 Phase 통합 검증에 남아 있다.
