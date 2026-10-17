# 미구현 28개 기능: 통합 설계·시각 목표 승인안

## 진행 상태

- [x] 사용자 범위 승인: “미구현 28개도 설계 검토 후 모두 구현”
- [x] 28개 이슈의 현행 API·상태·소비자 조사 및 세부 설계
- [x] 축·facet / 범례·마크 / 데이터·색상 간 소유권·조합 검토
- [x] 독립 primitive 9종 생성·Chromium 실제 렌더·수학·텍스트 경계 검사
- [x] native Canvas/PDF difference 사전 실험 및 실패·차이 보존
- [ ] 구체적인 공개 계약과 아래 primitive 목표에 대한 사용자 승인
- [ ] 기능별 구현·독립 oracle·불변성·재물질화·저장·설치 소비자 검증
- [ ] 전체 체크·문서 동기화·이슈 종료·다음 릴리스·데이터셋 동기화

Gate **ready-for-review**. 이 패키지는 구현 결과가 아니라 구체적인 승인 대상이다.
현재 release 기준 `7a215304`를 조사했으며, 이후 `1aaf0a4b`의 line horizontal
grid 타입 정정은 실제 가능한 API를 그대로 유지하므로 새 제안과 충돌하지 않는다.
0.0.18 기존 수정 릴리스와 뷰어 공개는 이미 승인된 독립 작업으로 계속 진행한다.

## 사용자가 승인할 핵심 결정

1. **먼저 완전한 차트·축·범례를 선언하고 의미 있는 세부 편집으로 고친다.**
   일반 생성 어휘에 renderer primitive를 추가하지 않는다. 기존 action을 우선
   확장하고 각 호출은 가능하면 핵심 top-level 옵션 세 개 이내로 쓴다.
2. **기본 결과를 유지하고 새 표현만 명시적으로 켠다.** 범례 결합은
   `combine:'size-shape'|'color-size'` opt-in이며 `'separate'`로 복귀한다.
   편집의 `channel`은 block 하나를 선택하고 기존 `channels`는 content를 지정한다.
3. **좌표·의미·소유자를 구분한다.** 이름 있는 축은 ID/target으로 선택하며
   같은 side에 여러 named axis는 초기 범위에서 거부한다. 축 frame offset은
   바깥 방향 0 이상, 제목 offset은 signed이며 alongOffset은 화면 방향이다.
   facet의 새 shared 범례는 최종 child plot union을 소유하는 parent guide다.
4. **표현을 바꾸어도 원본 수치를 바꾸지 않는다.** clipHeight는 큰 symbol을
   축소하지 않고 item anchor 중심의 window로 자른다. size labelMap은 글자만,
   pow는 색상 위치만 바꾼다. 날짜 연도 추출은 UTC 기본·명시 IANA 시간대다.
5. **색상 선택은 explicit이고 계산법은 고정한다.** Lab/HCL의 D65 기본을
   유지하고 D50은 opt-in. cubehelix gamma는 lightness 보간 인수에만 적용한다.
   pow는 signed raw-value 변환, 지수는 양수, transformed midpoint는 거부한다.
6. **통계와 한도도 닫힌 계약으로 확장한다.** exponential regression은
   양의 반응값 weighted fit, 새 회귀 통계 dataset은 linear만 지원하고 상수 y의
   R²는 null이다. 기존 prediction rows는 유지하되 최소 fit cache로 새 snapshot
   byte가 달라질 수 있다. point 한도는 owner가 증명된 레이어만 50,000,
   summary 입력만 30,000이며 일반 graphic/tick/path/work 한도는 유지한다.
7. **difference는 bar 하나의 fill+stroke를 합쳐 한 번 적용한다.** concrete
   rect/path에 optional enum, SVG isolation, bounded Canvas surface를 사용한다.
   PDF는 해당 opt-in glyph의 source만 raster가 될 수 있다. native 사전 실험에서
   alpha0.5의 일부 RGB channel이 1 차이 났다. 신규 difference의 PDF 변환에만
   이 한 단계 양자화 차이를 허용하는 결정도 승인 대상이며 기존 회귀는 그대로다.
   더 큰 내부 차이·불투명 sample 차이·기하 차이를 허용하지 않는다.

## 28개 요구와 정확한 설계 위치

| 이슈 | 구현할 내용 | 세부 계약 |
| --- | --- | --- |
| #164 | 연속 size 범례 표시 labelMap | [범례·마크 B164](LEGENDS_MARKS_REVIEW.md#164--연속-size-sample의-표시-labelmap) |
| #166 | 값별 tick/grid dash | [축 3](AXES_FACET_REVIEW.md#3-166-틱과-값별-guide-dash) |
| #167 | 정확한 달력 연도 추출 | [데이터 2](DATA_COLOR_REVIEW.md#2-167--달력-연도-정수-추출) |
| #168 | Lab/HCL whitePoint D50 | [데이터 3](DATA_COLOR_REVIEW.md#3-168--labhcl-백색점-명시) |
| #169 | cubehelix gamma | [데이터 4](DATA_COLOR_REVIEW.md#4-169--cubehelix-gamma) |
| #170 | wedge named point shape | [범례·마크 B170](LEGENDS_MARKS_REVIEW.md#170--좁은-named-wedge) |
| #171 | ordinal size+shape 범례 결합 | [범례·마크 B171](LEGENDS_MARKS_REVIEW.md#171--ordinal-size--shape-한-categorical-block) |
| #172 | pow 연속 색상 척도 | [데이터 5](DATA_COLOR_REVIEW.md#5-172--pow-continuous-color-transform) |
| #173 | 범례 border dash | [범례·마크 B173](LEGENDS_MARKS_REVIEW.md#173--dashed-legend-border) |
| #174 | 안쪽/위쪽 축 제목 | [축 4](AXES_FACET_REVIEW.md#4-174--194--199-축-frame과-제목-배치) |
| #175 | arrow named point shape | [범례·마크 B175](LEGENDS_MARKS_REVIEW.md#175--named-arrow) |
| #176 | 큰 범례 symbol clip window | [범례·마크 B176](LEGENDS_MARKS_REVIEW.md#176--encoded-size를-보존하는-symbol-clip-window) |
| #177 | 특정 범례 block의 focused 편집 | [범례·마크 A1/B177](LEGENDS_MARKS_REVIEW.md#a1-block-선택과-융합은-다른-차원이다) |
| #193 | block별 edge/corner 위치 | [범례·마크 B193](LEGENDS_MARKS_REVIEW.md#193--block별-edgecorner-position) |
| #194 | 축 frame 바깥 offset | [축 4](AXES_FACET_REVIEW.md#4-174--194--199-축-frame과-제목-배치) |
| #195 | 축 레이블 local 정렬 | [축 5](AXES_FACET_REVIEW.md#5-195-축-레이블의-명시적-정렬) |
| #196 | exponential regression | [데이터 6](DATA_COLOR_REVIEW.md#6-196--양의-반응값-지수-회귀) |
| #197 | 독립적인 양쪽 named axes | [축 6](AXES_FACET_REVIEW.md#6-197-이름-있는-독립-cartesian-축) |
| #198 | computed floor | [데이터 7](DATA_COLOR_REVIEW.md) |
| #199 | 축 제목 alongOffset | [축 4](AXES_FACET_REVIEW.md#4-174--194--199-축-frame과-제목-배치) |
| #200 | gradient 방향 + bottom title | [범례·마크 B200 A와 B 모두](LEGENDS_MARKS_REVIEW.md#200-a--position과-독립적인-gradient-direction) |
| #202 | linear fit 통계 dataset 생성·편집 | [데이터 8](DATA_COLOR_REVIEW.md) |
| #203 | bar difference blend | [범례·마크 B203](LEGENDS_MARKS_REVIEW.md#203--bar의-difference-compositing) |
| #205 | quantitative color+size 범례 결합 | [범례·마크 B205](LEGENDS_MARKS_REVIEW.md#205--quantitative-color--size-한-sampled-block) |
| #206 | parent가 소유하는 shared facet 범례 | [축 7](AXES_FACET_REVIEW.md#7-206-최종-facet-plot-union을-소유하는-shared-범례) |
| #207 | point 레이어 50,000 items | [데이터 9](DATA_COLOR_REVIEW.md#9-207--한-점-레이어의-50000개-item) |
| #208 | recipe layer opacity | [범례·마크 B208](LEGENDS_MARKS_REVIEW.md#208--categorical-recipe-layer-opacity) |
| #209 | summary 입력 30,000행 | [데이터 10](DATA_COLOR_REVIEW.md) |

새 공개 action은 #202의 `createRegressionStatisticsData`와
`editRegressionStatisticsData` 두 개다. 나머지는 기존 action/scale/mark 옵션을
확장한다. 세부 문서에 기재한 생성·편집·삭제·재물질화·저장·오류·reset·Full/Basic
소비자 행렬도 이 승인 범위에 포함한다. 미정인 구현 helper 이름은 공개 계약이 아니다.

## 시각 목표와 재현

[9종 SVG 목표](targets/index.html)와 [기하·호출 manifest](targets/manifest.json)가
하나의 패키지다. SVG는 독립 수식·literal primitive이고 아직 새 public action의
출력이라고 주장하지 않는다. 모든 proposed call은 manifest와 해당 세부 계약에
있으며 public/primitive parity는 승인 후 구현의 필수 완료 조건이다.

```sh
npm ci
npx playwright install chromium
node agent_docs/impl/release-0.0.19/render-targets.mjs
node agent_docs/impl/release-0.0.19/probe-native-blend.mjs
```

외부 worktree의 설치 의존성을 재사용하려면 마지막 두 명령의 인수로 그 repository
절대 경로를 준다. target generator는 ggaction의 runtime/geometry/color helper를
import하지 않는다. 9개 모두 실제 Chromium153에서 렌더했고 면적·anchor·clip·텍스트
경계·bottom title의12px 실제 clearance를 검사했다. 생성한 PNG와 variant metadata는
`.artifacts/test/png/review/capabilities/targets/`에 있다. 에이전트가 차트 픽셀을
눈으로 검토하거나 VLM으로 판단하지 않았다.

native probe는 의도적으로 **차이가 있으면 exit1**이다. 현재 결과
[blend-native-probe.json](targets/blend-native-probe.json)은 differences이며,
불투명 3 backdrop의 sample은 일치하고 alpha0.5는 일부 RGB가1 차이 난다.
이를 성공 기록으로 덮어쓰지 않는다. 앞의 제7결정이 이 차이의 허용 범위다.

## 구현 순서와 승인 후 완료 조건

1. computed datePart/floor, 색상 whitePoint/gamma/pow를 독립 checkpoint로 구현한다.
2. named axis 소유자 및 title/frame/label/dash를 통합한다. persistence·facet 경로를
   뒤로 미루지 않는다.
3. 범례 channel selector → labelMap/dash/opacity → named shapes → combined
   blocks → local position/gradient direction/title → clip window 순서로 구현한다.
4. shared facet parent owner와 모든 새 block의 lifecycle을 교차 검증한다.
5. regression exp/statistics, point/summary 한도를 독립 수학·자원 경계 검사와 구현한다.
6. bar difference는 별도 renderer/graphic-schema checkpoint로 구현한다.
7. 각 checkpoint에서 source/types/Current 계약/영문 docs/generated references와
   installed consumer를 함께 갱신하고 commit/push한다. primitive와 public의 실제
   출력·trace를 비교한다. 필수 누적 검사 통과 후에만 이슈를 close한다.
8. 통합 main·새 npm·문서·Context7·dataset runtime/재렌더 동기화까지 진행한다.

28개 중 하나라도 미구현·검증 실패·미승인 결정이 남으면 전체 완료로 보고하지 않는다.
새로운 material 변경이 필요하면 해당 부분만 새 구체적인 Gate로 연다. 현재 Gate는
기능 범위를 다시 묻는 것이 아니라 루트 AGENTS의 “Before implementing an unresolved
material decision about public APIs, persisted schemas, or core architecture, present the
concrete proposal and obtain explicit user approval.”와 시각 목표 확인 요구를 이행한다.
