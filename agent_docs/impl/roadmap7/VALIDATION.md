# 구현 검증 계획과 증거 기준

여기의 명령은 **향후 구현 검증 계획**이다. 현재 문서 작성에서 실행한 것은 [PLAN_VALIDATION.md](PLAN_VALIDATION.md)에 별도로 기록한다. baseline은 c0e47da6e213852213bcb04eb19031a1a6a63cd7이고 사용자 선택 25개는 아직 미구현이다.

## 테스트 계층과 파일 소유권

| 계층 | 필수 검증 | durable owner 권장 |
| --- | --- | --- |
| Grammar unit | 수치 oracle, AST unions, 시간/DST, bucket/missing/weight/area | test/unit의 기존 transform/scale/geometry family |
| Action contracts | defaults, target inference/errors, trace decomposition, immutable state | test/contracts의 capability family |
| Lifecycle | create → edit → reencode → Canvas → source replay → remove | test/contracts 및 chart capability tests |
| Composition | layered/concat/facet/repeat, shared vs independent, retained source | 기존 composition/facet contracts |
| Renderer | primitive/public same-run parity, SVG/PDF geometry/style | test/charts, test/render family owners |
| Types | positive/negative unions, Full/basic boundary, exports | 기존 strict consumer harness |
| Knowledge | ACTION_INDEX/catalog/relations/cards/MCP/docs signature | 기존 contracts/docs/MCP harness |
| Package | 실제 packed artifact 설치 Node/browser/renderer/type consumer | scripts/package-consumer.js |

테스트 파일을 roadmap7 폴더를 import하는 제품 dependency로 만들지 않는다. 숫자 ID Rxx는 계획 traceability에만 쓰고 durable tests는 capability 이름을 사용한다. 테스트 expected 값을 production 함수로 계산하면 독립 oracle가 아니다.

## Feature 필수 테스트 유형

각 feature 문서의 oracle를 case ID `Rxx-N01...`로 번호화해 Phase STEP evidence manifest에 연결한다. 최소 다음 유형을 포함한다.

1. 가장 짧은 유효 호출, 모든 필수 ID explicit 호출, options deep-freeze.
2. 각 default/auto/false/empty/no-match 값, mode전환 및 unsupported property.
3. unknown/ambiguous/wrong-owner target, conflicting shared consumers.
4. 이전 program semantic/graphic/context/config/trace 불변; error 후 original fingerprint 동일.
5. 기존 action과 겹치는 supported-control의 output/trace compatibility.
6. 재편집 두 번, scale/domain/Canvas edit, source/facet/repeat replay, 제거와 참조 cleanup.
7. applicable backend, installed package와 strict type negative tests.

R06: AST depth/nodes/work boundary, short-circuit/missing branch structural validation, non-null output primitive uniformity.
R05: synthetic provenance/complete row budget/duplicate keys/zero vs missing, irregular linear interpolation.
R08: DST gap/fold,30분 offset/time change, week year boundary, invalid zone와 early years.
R09: closed endpoints/duplicates/minPeriods/O(n) scan.
R10: frequency virtual replication oracle, reliability scale invariance(모든 w*c에서 mean/variance/SE 동일), zero weights/auto h/finite overflow.
R19: input property order independence, 중간-invalid 최종-valid, invalid-final atomic rollback.
R23: area mapping의 수학 oracle, 모든 shape symbol과legend 일치.
R25: 모든 참조경로 하나씩만 있는 fixtures, context-only와trace-only 구별.
R43: 아래 family×provenance×resolution matrix 전체.

## 수치 oracle의 허용오차

정수/count/category/membership/ID와 explicit options는 exact equality. simple sums는 표현 가능한 값에서 exact, weighted mean/variance/geometry는 absError<=1e-10*max(1, abs(expected))를 기본으로 하되 existing tests가 더 엄격하면 유지한다. KDE gaussian의 fixed h oracle는 다음을 독립 계산한다: x=[1,3], w=[1,3], h=1, at x=1의 unit density=(1+3*exp(-2))/(4*sqrt(2π)), count=unit*4. 면적 적분은 finite extent/sample step에 따른 오차와 잘린 tail을 명시; 단순 'integral≈1'만 acceptance로 쓰지 않는다.

Weighted auto h는 feature formula와 별도 direct hand calculation fixture를 둔다. 큰 reliability weight rescaling은 합 overflow를 피하는 전략을 검증한다. Circle radius oracle= sqrt(mappedArea/π). backend raster antialias 차이는 cross-backend numeric geometry check와 명시된 raster tolerance로 다루되 primitive/public within-backend parity는 exact다.

## 시각 Gate manifest

각 appearance feature의 primitive variant를 먼저 만든다. `variant.json`은 capability/chart/variant, title, 정확한 target public call chain, dimensions와 fixture identity를 포함한다. 하나의 manifest에서 primitive/public 프로그램, metadata, dimensions, assertions를 생성한다. 다른 파일에서 example/ID/PNG를 따로 수동 관리하지 않는다.

- Review path: `.artifacts/test/png/review/<chart>/<variant>/`.
- Approval 후: `.artifacts/test/png/charts/<capability>/<chart>/<variant>/`.
- public implementation 전에 primitive와 target API chain으로 V gate 검토.
- public 후 same-run decoded RGBA equality, nonempty plot ink, semantic anchor/bounds assertion.
- metadata의 action calls는 public top-level trace와 일치해야 함.
- SVG/PDF는 path/attrs/viewBox/page bounds에 대한 독립 검사와 raster render를 함께 확인.

Required visuals: R19 swap/grouped offsets; R20 parallel dimension reverse; R21 offset padding; R22 independent fill/stroke; R23 logarithmic/discrete size legend; R27 equal data units; R29 moved polar frame; R31 remove-only-label; R32 top-k; R33 signed bar/stack/donut labels+leaders; R36 mean/band after source/filter; R37 exact samples; R38 combined blocks; R39 headers; R43 every chart contract family; R47 nested theme; R49 rounded/cap/join. Data-only 기능은 수치 gate가 우선이고 새로운 public chart appearance가 발생하면 corresponding visual variant로 검증한다.

## R43 지원행렬

[chart/polar-parallel-facets.md](chart/polar-parallel-facets.md)가 canonical family matrix다. 각 cell은 `required / not-applicable(reason) / explicitly-rejected(reason)` 중 하나. required cell을 테스트 없이 skipped로 바꾸지 않는다. shared axes는 unsupported, shared compatible legends는 required. 일반 concat 지원을 facet의 증거로 제출하지 않는다.

## 검증 명령

각 phase의 변화에 맞는 focused tests를 먼저 실행한다. 다음은 실제 package.json의 현재 명령이다. 순차 의존성이 있으므로 실패를 무시하고 뒤 명령으로 넘어가지 않는다.

```sh
node --test test/contracts/agent-docs-navigation.test.js
npm run test:unit
npm run test:contracts
npm run test:charts
npm run test:gates
npm run test:render
npm run test:browser
npm run contracts:catalog:check
npm run contracts:relations:check
npm run contracts:cards:check
npm run docs:capabilities:check
npm run docs:reference:check
npm run docs:signatures:check
npm run test:docs
npm run package:check
npm run test:package
```

서로 영향 없는 모든 테스트를 매 작은 diff마다 반복하지 않는다. 해당 surface의 required tests가 성공하면 다음 coherent change로 진행한다. Phase 12 closeout은 위 전체 matrix와 `npm test`, `npm run docs:verify`, `npm run scenarios:smoke`, `npm run scenarios:realistic:audit`, `npm run package:bundle`을 current runner에 맞춰 실행·기록한다. 문서 build/realistic 실행에 필요한 환경을 먼저 확인하며 실행 불가능한 항목은 미실행으로 보고하고 완료 gate를 만들지 않는다.

Generated current metadata를 수정하는 구현에서는 대응 generator를 실행하고 `:check`로 freshness를 확인한다. 이 계획 작성만으로 public metadata를 생성/변경하지 않는다. package는 tarball 경로와sha256, installed consumer 결과를 기록한다. release/publish/deploy는 별도 승인이고 이 roadmap의 구현 완료에 registry publish를 몰래 포함하지 않는다.

## 과거 artifact와 fingerprint 주의

`.artifacts/`는 ignored ephemeral output이다. baseline audit snapshot은 참고 evidence이며 새 코드 통과 증거가 아니다. realistic full fingerprint는 source/grammar/fixtures가 바뀌면 달라지므로 이전 단계의 녹색 report를 복사하지 않는다. runner가 expected fingerprint mismatch로 실패하면 원인을 조사하고 source revision+fixture+expected behavior 변경을 함께 설명한다. 단순히 expected hash를 새 값으로 바꿔 성공으로 만드는 행위는 검증이 아니다. stale PNG/generated docs를 재사용하지 않는다.

## 결과 기록 양식

```text
phase / gate / capability:
commit + branch:
source and fixture:
command:
exit code, tests pass/fail/skip:
artifact path + sha256 where relevant:
semantic/numeric result:
primitive/public parity result:
known unsupported cells and reason:
remaining work, next blocked gate:
```

Phase closeout에는 각 selected item의 tests/current contract/installed evidence를 별도로 연결한다. 모든 requested 기능이 Current이고 필수 later-integration cell까지 해결됐을 때만 Roadmap7 완료다.
