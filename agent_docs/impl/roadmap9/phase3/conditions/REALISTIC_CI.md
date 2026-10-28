# Conditional appearance 현실적 예제 CI 수리

## 진행 상태

- [x] main `a9ecf107`의 CI `40730410088`, realistic shard 7 실패를 보존
- [x] 집계 변경과 실제 조건부 호출 증거 누락을 구분
- [x] 7개 appearance 인코딩의 모든 대상 option path/literal/diversity를 실제 5/3 호출로 검증
- [x] 8번째 stroke와 expression `where`를 포함한 선택·parameter·codec 수명 5개 실제 데이터셋 검증
- [x] Area의 조건부 fill 선행 검증 오류를 별도 source checkpoint로 수정
- [x] Point/Area 조건부 stroke의 기본 두께 누락을 별도 source checkpoint로 수정
- [x] 최종 fixture/evidence checkpoint 검증 완료; 이 기록을 포함한 commit/push

## 원인과 수리 범위

원 CI는 data-mark required option count `76 !== 65`, encoding inventory의
path/literal/diversity `429/420/21 !== 310/305/12`에서 실패했다. 이는 공개 conditional
union이 확장되었지만 기존 realistic recipe에는 conditional 호출 자체가 없었던 상태다.
숫자만 바꾸면 뒤의 5회·3개 데이터셋 요구에서 다시 실패한다.

`realistic-encoding-coverage-recipes.js`는 기존 실제 authoring payload를 일반 인코딩으로
실행한 뒤 같은 payload를 conditional fallback으로 실행한다. 이전 scale ID를 명시적으로
유지해 공유 domain 변화와 조건부 동작을 혼동하지 않는다. 각 전환에서 item type과 모든
concrete properties를 직접 비교한다. 5개 pinned 데이터셋 각각 75개, 총 375개 전환이다.
7개 채널은 color/opacity/size/shape/strokeWidth/strokeDash/angle이며, 전체 대상 429개 path,
420개 literal, 21개 diversity requirement가 모두 5/3 검사를 통과한다. 두 CI 집계의 기준을
줄이거나 예외로 제외하지 않았다. Data-mark recipe에도 실제 field/constant dash 분기를
실행한 뒤 기존 최종 assignment로 돌려 기존 factor 의미를 보존한다.

신뢰구간 색상은 singleton cell에서 값이 정의되지 않는다. 일반 aggregate color는 그런
cell을 제외하지만 조건부 분기는 최종 item grain을 바꿀 수 없다. CI 조건부 예제는 원본
행을 복제하지 않고 `filterData`로 같은 category의 관측이 2개 이상인 행만 선택한다.
원본 row lineage를 유지하며 모든 branch payload는 유효한 통계 입력을 사용한다.

새 `realistic-conditional-lifecycle.test.js`는 다섯 실제 데이터셋에서 raw source selection을
filtered mark에 적용한다. JS의 직접 row predicate와 원본 row keys가 기대값이다. first-match,
정확한 opacity 0, conditional stroke, filter 생성/수정, parameter revision, selection 수정,
codec 복원 후 재편집, 이전 program 불변성, concrete/SVG 출력을 확인한다. `filterData.where`와
`editFilteredData.where` 각각 5회·5개 dataset의 직접 trace가 있다. 이는 모든 가능한 AST
조합을 망라한다는 주장이 아니며, 기존 AST/비활성 분기 단위 검증과 함께 사용한다.

## 런타임 결함

- `692d28dbf9f6fb7f411676afe652bd1c381e6eaf`: 유효한 density Area의 일반 color를 동일한
  conditional fallback으로 바꾸면 기본 fill이 먼저 undefined로 쓰여 concrete validation이
  실패했다. Area owner가 공유 conditional resolver로 최종 fill을 먼저 구한다. stroke-from-fill
  역시 같은 최종 fill을 사용한다. 임시 색상이나 renderer 분기를 추가하지 않았다.
- `fb780217a454c80cad152809c1e2ae1ee31deff0`: stroke가 없던 Point/Area에 conditional stroke를
  적용하면 기본 strokeWidth가 없어 SVG가 실패하거나 기본 모양의 outline이 보이지 않았다.
  두 mark owner가 conditional stroke를 기존 stroke materialization 입력으로 소비하게 했다.
  circle/square/triangle-up, constant/field branch, 명시적 width 0, codec 후 Canvas 편집과
  실제 SVG 소비를 검사한다. 공개 API/저장 shape/기본값을 추가하지 않고 기존 계약을 복원한다.

## 검증 및 남은 범위

최종 명령과 원본 로그·파일 hash는 [evidence manifest](evidence/realistic-ci/manifest.json)에 있다.

- Canonical realistic 18/18, heap 512 MiB/concurrency 2.
- Focused unit 104/104. Area owner line/branch/function 91.62/84.55/90.91%; Point owner
  89.45/83.09/76.92%. 이는 해당 focused 실행의 실측이며 전체 source coverage 대체가 아니다.
- Source boundary/discovery/package contracts 34/34. 새 realistic 모듈은 전용 suite에만 포함된다.
- Package 712 entries, packed 1,057,756 / unpacked 4,924,852 bytes.
- Installed Full/Basic bundle gzip 534,567 / 312,370 bytes. 기존 한도 유지.

본 수리는 main `a9ecf107` appearance/where 범위다. 이후 위치·text·pointRadius 조건부 union에
대한 확대 witness는 후속 conditions 통합에 남는다. Root가 확인한 Text의 조기 fill 검증
오류도 그 후속 branch에서 수정 중이며 이 checkpoint에서 해결했다고 주장하지 않는다.
H 공개 설계 승인, STEP-016 전체와 Roadmap9 STEP-077 전체 완료를 뜻하지 않는다.
