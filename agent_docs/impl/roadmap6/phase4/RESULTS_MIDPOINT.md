# Phase 4 W5 — Sequential midpoint 기반

[전체 실행 승인](../APPROVAL.md)에 따라 P4-C06의 numeric midpoint, gradient consumer와 reset을 구현·검증했다. **W5는 진행 중**이다. P4-C07의 atomic scale/legend family transition과 V3의 나머지 Point/Bar 전환 변형은 다음 변경이다.

## 결과와 책임

- Direct `createScale`/`editScale`와 quantitative color의 nested scale에 `midpoint:number|"auto"`를 추가했다. Numeric 값은 semantic scale의 midpoint 한 곳에 저장하고 auto는 해당 leaf를 제거한다. 생략은 편집·재할당에서 기존 policy를 보존한다.
- Pure color grammar가 finite/domain validation과 양쪽 구간의 color parameter [0,.5]/[.5,1] mapping을 소유한다. Unattached auto scale은 finite 값을 보존하며 consumer가 domain을 resolve할 때 엄격한 내부 범위를 검증한다. Temporal/position/discretized numeric midpoint는 거부한다.
- Point, aggregate Bar, observed Rect의 현재 grain을 유지한다. Shared scale의 모든 consumer가 같은 의미를 사용하고, temporal consumer가 하나라도 있으면 numeric midpoint는 atomic 오류다. Palette의 중앙 sample을 사용하며 중앙이 white라고 추측하지 않는다.
- Gradient strip도 공통 color mapper를 사용한다. Tick은 값에 선형인 위치를 유지하고 midpoint를 base samples에 한 번 추가한다. [-2,8] / midpoint0에서 white 기준값은 범례의 20% 위치다. Reverse/clamp와 8개 interpolation도 같은 owner를 사용한다.
- Midpoint가 없는 기존 범례는 uniform parameter를 불필요하게 value로 바꾸었다 되돌리지 않는다. 첫 회귀 실행에서 발견한 색 채널 ±1 및 tick coordinate 부동소수점 차이를 제거하여 기존 primitive/public의 exact equality를 유지했다.
- 마지막 nested option 검사에서 `null`이 omission처럼 취급될 가능성을 확인해 direct/nested 모두 오류가 되도록 교정했다. `"auto"` reset은 계속 명시적이며 semantic string을 남기지 않는다.

## 공개 예제와 시각 증거

[공개 프로그램](../../../../examples/color-midpoint/program.js), [primitive와 manifest](../../../../test/charts/color-midpoint/)는 asymmetric / clear 두 변형을 소유한다. Lower semantic leaf와 explicit rematerialization으로 먼저 target을 렌더링한 뒤 public flow를 구현했다.

Point radius 7과 outline을 명시하여 흰색인 0도 보이게 했다. Base tick count는 3을 명시한다. 초기 default count 5에서는 추가 0과 기존 0.5 label이 가까웠다. 범례 fitting은 Phase 5에서 해결할 범위이며, 이 예제의 명시적 count를 기본 자동 fitting 완료로 해석하지 않는다. 변경한 정확한 호출은 visual-target-plan에도 동기화했다.

## 검증

| 검사 | 결과 |
| --- | --- |
| 최종 `npm test` | 2,726/2,726; fail/skip/cancel 0 |
| Midpoint action/grammar focused | 16/16; null guard와 Bar/Rect/shared temporal 포함 |
| 두 PNG + 두 SVG/PDF + strict declarations | 5/5 |
| 마지막 render + affected chart regressions + action checks | 21/21 |
| Browser 전체 | 62/62; 새 midpoint 예제 포함 |
| Docs/card/signature/reference/search/machine/LLM | 생성 후 normal freshness 검사 통과 |
| Installed tarball | runtime/renderers, midpoint 생성·reset, strict positive/negative types, tutorials, MCP, minimal bundles 모두 통과 |

Numeric tests는 literal blue/white/pale-red/red, descending/extreme/subnormal domains, clamping/unknown, monotonicity, 8개 interpolation의 중앙 sample과 atomic rejection을 검사한다. Visual 쌍은 exact semantic/graphic/draw/Canvas 및 decoded PNG, SVG/PDF를 비교한다. Asymmetric PNG를 직접 확인했다.

[패키지 결과](package-midpoint-results.json): SHA-256 `dbf68ca918073b1d7a3899ccc4027e8dfdd64d8b14a32b7ac139898dad09a85e`.
441 entries / packed 495,106 bytes / unpacked 2,364,624 bytes.
Full/Basic/SVG gzip 245,606 / 135,206 / 6,437 bytes. 기존 247,000 / 136,000 / 25,000 한도 안이며 이번 checkpoint의 추가 한도 변경은 없다.

로그는 `.artifacts/roadmap6-authoring/midpoint-*`다. 최초 docs link 경로 오류와 vector test의 path 기본값 오류는 수정했고, 기존 gradient round-trip 회귀 실패도 보존했다. 최종 검증은 위와 같다. Coverage·realistic 전체·built docs 및 Phase 전체 종료 검증은 아직 남아 있다.
