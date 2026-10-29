# Native typography theme checkpoint

## 진행 상태

- [x] 사용자 전체 승인 `b758b912`와 [공개 흐름](PUBLIC.md)의 global typography 선택 재사용
- [x] `fontSize`/`fontWeight`, native role 기본값 복원, 명시 style·named highlight 우선순위
- [x] Cartesian/Polar/Parallel, title/legend/block, facet/concat, Graph/Tree/Treemap 소비자
- [x] exact font 준비 실패 원자성, codec, Full/Basic, installed Canvas/SVG/PNG/PDF/scene
- [ ] STEP-033 잔여 guide geometry·palette·winning-source inspection 및 Flow 통합
- [ ] STEP-034/035 responsive layout·nested facet/shared guides

기준은 `70d861eed`다. 이 문서는 STEP-033 전체 완료 기록이 아니다. 재현 명령과 파일별 SHA는
`typography-evidence/summary.json`을 따른다.

## 구현과 판단

기존 theme frame의 optional token 두 개를 추가한다. Active global size/weight를 바꾸거나 제거할 때만
해당 역할을 갱신하며, 두 token이 없는 기존 light/dark theme는 기존 typography를 변경하지 않는다.
Axis role size가 global size보다 우선하고, 명시 plot/mark/guide/block/header style와 named highlight는
계속 더 높은 우선순위를 가진다. 같은 기본값을 직접 지정한 경우와 numeric zero weight도 보존한다.

Shared axis typography 기본값, 기존 title/legend/facet/mark family owner와 원래 wrapped Text 생성 인자를
읽어 복원한다. 단일 trace의 immutable 파생 cache만 쓰며 program에 복구 snapshot을 추가하지 않는다.
테마 변경은 기존 wrapped typography materializer를 호출하고 Graph/Hierarchy/Layout 결과는 다시 풀지 않는다.

정확한 font profile에서 새 크기의 측정이 없으면 `metrics-required`, 새 weight binding이 없으면
`unresolved-font`로 전체 action을 거부한다. 이전 program과 caller 입력은 유지한다. Existing schema-1
측정 방식이나 renderer font 정책은 변경하지 않는다.

검증 중 `createGuides`/facade의 `guides.legend`가 명시한 스타일을 수집하지 못하는 누락을 발견했다.
같은 authored owner가 해당 nested request를 읽게 수정해 기존 discretized-color 예제의 좁은 범례를
불필요하게 키우지 않는다. Basic에는 Text/Title authoring이 없으므로 실제 지원되는 axis label/title로
global token을 검증했다.

## 검증 범위

- Theme/Current/Parallel 집중 검사 91개 통과. 새 typography 회귀는 11개다.
- New typography role owner 100% lines / 95% branches / 100% functions. 변경된 critical family는
  기존 바닥값을 유지하고 모두 통과한다. 전체 source coverage를 다시 실행했다는 의미는 아니다.
- Source boundary/discovery/package/coverage-policy 47개, public docs 172개 통과.
- TypeScript installed consumer와 세 resource plot family의 focused installed case가 Node20에서 통과한다.
  같은 graphic을 사용한 Canvas=PNG bytes, Program/Graphic codec, Canvas scene bytes, SVG의 구체 속성과
  PDF 생성을 확인한다. SVG/PDF 픽셀 동일성이나 전체 installed 3-version matrix는 주장하지 않는다.
- 공개 token 추가는 nested/required option path와 ledger requirement를 각각 2개 늘린다. 이전 font 통합의
  stale public-action 기대값 313도 실제 317에 동기화한다. Corpus를 축소하거나 requirement를 제외하지 않는다.
- 새 helper 한 개로 package entry는 823이다. Node20 final tar와 browser bundles의 실측은 summary에 보존한다.

## 남은 경계와 최초 실패

처음의 정확한 font weight 실패는 `metrics-required`로만 기대한 테스트가 실제 `unresolved-font`를 놓친
assertion 오류였으며, 오류 범주를 정확히 나눠 수정했다. Hierarchy fixture의 필수 value field와 Basic의
지원하지 않는 Text/Title action 호출도 테스트를 실제 공개 계약에 맞게 수정했다. 최초 package/bundle
한도 초과와 중간 inventory 수치 실패를 보존한다.

별도의 기존 결함으로, 마지막 theme 제거 후 Cartesian axis line/title color가 원래 `#334155` 대신
일반 light role color로 복원됨을 확인했다. 이 checkpoint는 typography 속성을 검증하며 해당 색 복원이
해결됐다고 주장하지 않는다. 다음 role-default/provenance 작업에서 정확한 family 색 owner로 수리한다.
Parent의 Partition/Flow font binder는 후속 stable integration에서 합치며 Flow body/label theme mapping도
그 뒤 닫는다. Guide geometry·palette·provenance·034/035는 계속 남는다.
