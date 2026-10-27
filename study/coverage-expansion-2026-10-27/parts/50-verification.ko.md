## 13. '완전 지원'을 실제로 판정하는 검증 시스템

### 13.1 서로 다른 종류의 coverage를 분리한다

첫째는 코드 coverage다. 분기와 예외 처리를 얼마나 실행했는지 측정한다. 둘째는 계약 coverage다. 공개 액션·옵션·입력 경계·resource lifecycle을 검증한다. 셋째는 native capability coverage다. 데이터·geometry·상태·시간축의 요구가 자체 fixture와 독립 oracle로 검증되는지 판정한다. 넷째는 조합 coverage다. 예를 들어 facet+log+selection+animation처럼 기능이 같이 작동하는지 확인한다. 이 네 수치를 하나의 백분율로 합치지 않는다.

필수 지표는 native requirement별 구현·계약·수치·기하·입력·시간축·저장·패키지의 검증 상태다. GGA 10개 capability와 USR 20개 요구를 활성 원장으로 관리하며 USR-03/04는 후속 과제로 보존한다. 외부 Flint 874행과 코퍼스 1,405행은 참고 자료다. 전체 2,311행 중 활성30/후속2/참고2,279를 분리하며 외부 자료를 필수 합격 분모로 사용하지 않는다.

### 13.2 native 계약과 독립 reference

reference는 수학적 기대값, 별도의 알고리즘 구현, 수작업 state transition, 고정된 geometry constraint를 우선한다. native defaults·version·units·error semantics를 fixture에 기록하고 같은 구현 함수로 expected를 재생성하지 않는다. 외부 논문은 알고리즘 근거로 사용할 수 있지만 외부 chart engine의 이벤트 순서·픽셀·테마를 복제하는 시험은 요구하지 않는다.

외부 spec의 dialect/schema/asset 문제와 원본 번역 fidelity는 별도 프로젝트다. 이번 gate에 unresolved source나 corpus translation failure를 연결하지 않는다. native 기능의 미완료를 외부 범위 제외로 숨겨서도 안 된다.

### 13.3 oracle을 여러 층으로 만든다

| 층 | 비교 대상 | 실패가 뜻하는 것 |
|---|---|---|
| 원본·자원 | spec/data/font/map/image hash, dialect/profile | 다른 입력을 비교하고 있음 |
| data/semantic | rows, transforms, group grain, aggregate, domain, order, lineage | 그림이 비슷해도 의미가 다름 |
| geometry | mark endpoint/bounds/path topology, scale mapping, clip | 위치·범위·면적·연결이 다름 |
| guide/text/layout | ticks/labels/format/font/line breaks, header/footer, alignment | 디자인 또는 읽기 순서가 다름 |
| raster/vector | 고정 환경의 pixel diff와 SVG/PDF geometry | 렌더링·paint·anti-aliasing 차이 |
| behavior/state | 입력 후 화면, selection/filter/viewport, event trace | 이벤트만 있거나 화면만 변하는 불완전 구현 |
| time | 중간 프레임, key matching, cancellation, final state | endpoint만 맞는 잘못된 animation |
| lifecycle/package | fresh install, reload, resize, dispose, platform | 실제 backend/배포에서 사용 불가 |

수치 기대값을 ggaction의 같은 함수로 다시 계산하지 않는다. known analytic example, 독립 구현, source engine의 검증된 intermediate result를 사용한다. projection은 순수 수학 oracle와 topology invariants, 통계는 수식·외부 기준값, layout은 독립 bounds/constraints, interaction은 실제 input script와 state transition table을 함께 사용한다.

### 13.4 tolerance와 baseline 변경 규칙

대상값마다 단위와 이유가 있는 tolerance를 둔다. 순수 산술은 절대+상대 오차를 명시하고, geometry는 logical CSS pixel, projection inverse는 degree/radian, area는 데이터 단위, animation은 ms/값 단위로 검사한다. **초기 설계 제안**은 일반 geometry 최대 오차 0.5 CSS px, 정렬·공유 경계는 같은 layout 계산에서 exact equality다. 실제 source kernel과 font 환경을 고정한 뒤 더 엄격하거나 필요한 별도 한계를 정한다. 이 숫자는 이번 조사에서 검증된 모든 fixture의 보장치가 아니다.

pixel diff는 anti-aliasing 차이를 분리하되 geometry·text·색·data oracle 실패를 평균 diff로 덮지 않는다. 글자 하나가 잘못되어도 전체 이미지 면적에서 차지하는 비율은 작으므로 전역 5% 같은 단일 threshold만으로 합격시키지 않는다. region mask와 edge/text/color metrics를 병행한다. issue #258처럼 작은 header 오차도 shared alignment 의도가 깨지면 원인을 해결한다.

baseline 업데이트는 원본/의도 변경, 엔진·폰트 변경, target 버그 수정의 이유와 이전/이후 수치·그림을 포함한다. 테스트가 실패한다는 이유만으로 모든 snapshot을 재생성하지 않는다. 의도적 departure는 requirement row에 남기고 완전 동등 판정과 구분한다.

### 13.5 test matrix의 분모와 조합 전략

native capability의 모든 채택된 옵션과 대표 조합 fixture를 실행한다. 모든 boolean은 양쪽, enum은 모든 값, 연속값은 경계·대표값·잘못된 값, optional은 omitted와 explicit default, nullable은 null을 포함한다. 무한한 연속값 전체를 시험할 수는 없으므로 property invariants와 fuzz seed를 고정해 보강한다.

옵션의 전체 Cartesian product를 '전수'라고 약속하지 않는다. 모든 채택된 native 조합 + 모든 단일 옵션 값 + pairwise + 위험한 고차 조합을 명시 matrix로 관리한다. 반드시 직접 포함할 조합은 log/negative, facet/independent scale/legend toggle, shared guide/reorder/resize, selection/filter/aggregate, polar/angular brush, geo/LOD/annotation/tween, image/clip/export, font-load/resize/destroy, animation/data revision/hit-test다. 지원 불가 조합은 native 계약의 이유와 진단을 명시한다. GGA/USR 필수 조합이면 미완료로 남겨 해결한다.

환경은 Node와 실제 browser, SVG/Canvas/PNG/PDF, DPR 1/2/3, 고정 기본 timezone과 UTC/DST 경계, 최소 두 locale/한글 fallback, 작은·중간·큰 container, keyboard/touch/pointer, reduced-motion을 포함한다. 모든 대형 benchmark를 매 PR마다 실행할 필요는 없지만 release candidate에서는 전체 qualification manifest를 닫는다. 변경 dependency에 따른 subset 선택은 누락 검출 audit와 함께 유지한다.

### 13.6 실제 입력을 검증하는 방식

인터랙션 시험은 `setState`를 직접 호출해 그림만 바꾸는 것으로 대체하지 않는다. Playwright 같은 실제 browser 입력으로 pointerdown→move→up, wheel, keyboard, touch/cancel을 보내고 paint된 geometry, visible tooltip/widget, getState, event trace를 같은 checkpoint에서 수집한다. guide label의 font load가 끝나기 전후, container 밖 release, nested scroll, CSS resize, DPR 변경, focus loss를 포함한다.

접근성은 accessible data export만으로 끝나지 않는다. 논리 focus 순서, focus indicator, keyboard equivalent, tooltip의 focus 접근, context menu 열기·닫기·focus 복원, 선택/숨김 상태 설명, 색 외 구분, reduced-motion을 확인한다. 수천 mark를 모두 tab stop으로 만드는 대신 chart entry와 내부 탐색 모델을 제공한다. core data semantics와 host accessibility tree를 함께 검증한다. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

### 13.7 성능과 자원 관리

성능 수치를 측정하기 전에 '60fps 지원'이라고 문서화하지 않는다. 시험은 point 수, path vertex 수, facet 수, geometry ring 수, labels 수, parameter dependency 범위로 size class를 정의한다. 같은 10,000 marks라도 circle과 복잡한 polygon의 비용은 다르다. 장비/OS/browser/font/cache/CPU throttling을 기록한다.

| 항목 | 초기 측정 목표 제안 | 완료 판정 방법 |
|---|---|---|
| 일반 hover/selection 반응 | small/medium fixture에서 input→paint P95 50ms 이하 | 실제 event timestamp와 frame 측정, tooltip 포함 |
| animation | 지정 medium fixture에서 P95 frame 16.7ms 이내를 목표 | main thread/paint 시간, dropped frames, 정확한 final state 함께 기록 |
| 대형 정적/geo 업데이트 | dataset/geometry size별 별도 SLO | parse/project/layout/paint 시간을 분해; 선형·증분 기대와 비교 |
| mount/dispose 장시간 반복 | 지속적인 retained heap 증가 없음 | GC 조건 고정 반복, listener/rAF/DOM/asset handle 잔존 검사 |
| bundle | core 기존 소비자에 geo·DOM·animation 의존성 강제 유입 없음 | package import graph/tree-shaking/clean consumer 측정 |

이 수치는 측정 시작을 위한 제안이며 현재 달성한 성능이 아니다. 지원 size class와 예산은 구현 전에 고정하고 이후 실패를 숨기려고 일방적으로 낮추지 않는다. 대형 chart에서 명시적인 품질 정책을 쓰더라도 데이터 의미·최종 geometry·선택 정확성을 버리지 않는다. source 요구에 없는 WebGL/3D 엔진을 범위에 억지로 추가하지 않으며, 필요가 드러나면 새 요구 행으로 판단한다.

### 13.8 증거 레코드와 CI gate

```json
{
  "requirementId": "GGA-08",
  "fixture": { "version": "native-fixture-v1", "path": "fixture-path", "sha256": "..." },
  "profile": { "contractVersion": "native-v1", "renderer": "canvas", "viewport": [720,420] },
  "target": { "commit": "candidate-sha", "packageSha256": "...", "programSha256": "..." },
  "environment": { "fontManifestSha256": "...", "timezone": "UTC", "dpr": 2 },
  "results": { "semantic": "pass", "visual": "pass", "behavior": "unrun", "time": "unrun" },
  "qualification": "visual-qualified",
  "evidence": ["semantic.json", "source.png", "target.png", "diff.png"]
}
```

위는 저장 형식 제안이다. `unrun`, `unknown`, `source-blocked`, `unsupported`를 pass로 집계하지 않는다. 특정 layer가 적용되지 않으면 `not-applicable`과 근거를 저장한다. 문서의 지원표는 이 manifest에서 생성한다. 코드 변경이 전혀 없어도 source/font/engine hash가 바뀌면 해당 qualification을 재검증한다.


### 13.9 개정 범위의 독립 oracle와 정책 gate

부록 F의 partition/kNN·radius·MST 수치 예제는 [revision-oracle-fixtures.json](evidence/revision-oracle-fixtures.json)에 저장했다. 구현 함수로 expected를 재생성하지 않는다. bundling은 각 method의 별도 reference, endpoint·identity·adjacency 불변식, route provenance, deterministic iteration, frame hit/geo clip을 함께 검사한다.

정책 gate는 KPI/Gauge 전용 지원 제외, 단일 frame의 숨은 독립 Y와 mirror guide 거절, 합법적인 facet·range endpoint 허용, 전용 Marginal/Bullet/Combo API 부재, Pyramid의 명칭·의미 보존를 확인한다. native fixture의 frame/scale resolution을 검사한다. corpus screening은 과거 참고 자료이며 종결 의무가 없다.
