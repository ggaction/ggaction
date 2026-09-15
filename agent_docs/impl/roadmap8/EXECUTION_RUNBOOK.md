# Roadmap 8 실행·재개 절차 — 개정 2

이 파일은 다른 구현자가 같은 결과를 만들기 위한 작업 순서다. 코드 구현 상태는 **not_started**다.
F06은 제외되었다. 시작 파일은 [IMPLEMENTER_START_HERE.md](IMPLEMENTER_START_HERE.md)다.

## 1. 시작 전 확인

```sh
git status --short
git branch --show-current
git log -1 --oneline
```

현재 사용자의 변경을 보존한다. 기준은 v0.0.16이나 작업 중 HEAD가 달라졌다면 relevant 파일 diff를 읽고
현재 코드가 이미 해결한 항목을 재구현하지 않는다. baseline 문서를 현재 구현 사실로 덮어쓰지 않는다.
작업은 저장소 내부만 대상으로 한다. 런타임 구현을 승인받았는지 해당 결정 원장을 확인한다.

## 2. WP 순서

`IMPLEMENTATION_MAP.json.executionOrder`의 WP01–WP14를 순서대로 따른다.
dependsOn은 기능 dependency이며 병렬 agent 사용을 요구하는 지침이 아니다.
한 Phase 안에서도 coherent conceptual change 하나씩 구현·검증·기록한다.

각 WP마다:

1. existingSources와 해당 파일 scope의 AGENTS를 읽는다. proposedNewSources는 아직 없는 출력 파일이다.
2. 관련 D의 exact 승인 근거와 API/types 개정을 기록한다. 이미 승인된 범위는 재확인하지 않는다.
3. 관련 V 사례에서 expected values/error/identity 관계를 먼저 확인한다.
4. pure normalizer·kernel → action registration → replay/consumer → types/contracts 순으로 구현한다.
5. unknown options/invalid values/absent field/empty input/immutability negative case를 실행한다.
6. testTargets의 기존 테스트와 새 durable capability tests를 실행한다.
7. 생성 API가 있으면 edit/revise/facet/snapshot/remove 경로까지 연결한다. 통합 의무를 다음 사람에게 숨기지 않는다.
8. 해당 Phase STEP의 진행 상태를 업데이트하고 구현·증거 commit을 기록한다.
9. repository workflow에 따라 verified checkpoint를 commit/push하고 다음 WP로 진행한다.

## 3. source 함수 작성 순서 예시: WP09 sort

```text
normalizeSortTransform(args)
  closed object → nonempty sortBy → unique fields → explicit defaults
validateSortTransform(transform)
  stored shape/type/order/nulls/unit validation
deriveSortedRows(rows, transform)
  preflight schema → decorate keys/index → stable comparator → map row refs
createSortedData
  existing derivedCreator → createDerivedData → materializeSortedData
editSortedData
  existing owner resolution → revised transform → downstream policy → materialize
```

registry 누락 검사: transforms, transformTopology, data/index, edit creator/role map,
types DatasetTransform, semantic validator, persistence, docs/catalog/cards.
facetTopology는 statistical로 등록하고 sorting과 partition이 재실행되는지 검증한다.
row count 유지 때문에 기존 transparent flag를 그대로 복사하지 않는다.

## 4. source 함수 작성 순서 예시: WP06 filter patch

```text
read current requested definition
if field or mode changed: require full new mode; discard prior field-specific range
else if range patch:
  normalize legacy inclusive → endpoint flags
  merge only supplied endpoints/flags
  false endpoint → delete endpoint+flag
  reject no endpoints / conflicting grammar / wrong types
else: retain current mode and merge valid nulls override
validate fields against current input schema
compute new rows + revision dependency plan
```

V29에서 하한 1, 상한3(open)의 상한만2로 바꾸면 `[1,2)`다. 기존 하한·상한 inclusion을
기본값으로 재설정하여 `[1,2]`나 `[0,2)`가 나오면 실패다.

## 5. Phase별 기록 구조

각 실제 구현 Phase 시작 시 `phaseN/GOAL.md`, `STEP1.md`, `GATES.md`를 만든다.
STEP의 처음에는 진행 상태 체크리스트를 두고 다음을 기록한다.

```text
진행 상태
- [ ] 관련 D 승인 근거 확인
- [ ] pure 계산/검증
- [ ] domain action과 등록
- [ ] replay/consumer/persistence
- [ ] types/current/docs/package
- [ ] V 사례 및 cumulative 검증

작업: WP ID, baseline commit, source files, 사용자 승인 근거
검증: 실제 명령, exit code, test count, artifact 경로, 검증 commit
한계: 아직 not_run인 V/consumer 셀과 다음 의무
```

기능 하나의 테스트 통과를 전체 Phase 완료로 쓰지 않는다. map/cases의 status를 passed로 바꿀 때는
실제 durable test와 실행 증거가 있어야 한다. 이 폴더를 runtime test import로 만들지 않는다.

## 6. 명령과 실행 환경

계획 문서 자체 검증:

```sh
node --test test/contracts/agent-docs-navigation.test.js
node_modules/.bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 agent_docs/impl/roadmap8/TYPE_EXAMPLES.ts
git diff --check
```

TYPE_EXAMPLES는 compile-only다. 실행하면 안 되며 현재 ggaction에서 새 API가 동작한다는 증거가 아니다.
의미 있는 positive/negative 사례가 선언의 모순을 잡는 데 쓰인다.
optional 추가 검사:

```sh
node_modules/.bin/tsc --noEmit --strict --exactOptionalPropertyTypes --skipLibCheck --module NodeNext --moduleResolution NodeNext --target ES2022 agent_docs/impl/roadmap8/TYPE_EXAMPLES.ts
```

기준 0.0.16은 `--exactOptionalPropertyTypes`와 declaration 검사 전체를 동시에 켜면 기존
`types/program.d.ts`의 EditLegendOptions.channels 상속에서 TS2430이 발생했다.
계획 변경은 이 제품 타입을 수정하지 않는다. 표준 strict와 강화 옵션 consumer-only 결과를 따로 기록하며
skipLibCheck 검사를 전체 기존 declaration 검증 통과로 표현하지 않는다.

구현 후 focused test는 실제 작성한 testTargets 파일을 `node --test <file>`로 실행한다.
일반 cumulative entry는 `npm run test:unit`, `npm run test:contracts`, `npm run test:charts`,
`npm run test:browser`, `npm run test:coverage`, `npm run test:package`, `npm run test:docs`다.
정확한 runner 옵션은 현재 package.json/scripts를 확인한다. 필수 현실 시나리오/렌더/배포 후보 검증은
현재 CI의 owner와 동일한 명령을 사용한다. 이번 계획 수정 때문에 전체 runtime suite를 반복하지 않는다.

## 7. 중단 후 인계

다음 구현자에게 남길 최소 정보:

- 현재 branch/commit과 가장 최근 검증된 checkpoint.
- 활성 Phase/WP와 완료한 V ID, 아직 not_run인 사례.
- 승인된 D와 원래 사용자 발언·검토 revision.
- 실제 변경 파일과 현재 미완료 consumer/persistence/package 경로.
- baseline과 의도적으로 다른 값·default 및 migration 이유.

명세가 없는 새 API를 임의 발명하지 않는다. 명세 구현이 현재 architecture와 충돌하면 구체적인
before/after state와 대안을 먼저 정리한다. 일반적인 파일 분할이나 이미 승인된 동일 계약의 구현 선택을
이유로 멈추지 않는다. E01/E02는 여전히 조건부 확장이고 제외된 F06은 재개 대상이 아니다.
