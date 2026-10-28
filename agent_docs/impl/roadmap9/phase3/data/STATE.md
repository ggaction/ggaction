# G-DATA 저장 상태와 소비자 검증 기록

2026-10-28 기준 B 구현 기록이다. [전체 실행 승인](../../AUTHORIZATION.json)과 [공개 경계 제안](PUBLIC.md)의 B 범위를 적용한다. 이 기록은 source 상태·복원과 소비자 fixture의 구현 근거이며, G-DATA 전체 checkpoint 또는 STEP-013 완료 판정은 root 통합 검증 뒤에 한다.

## 저장 소유권

- `materialization/dataSourceState.js`가 `normalizeDataSourceOptions`, receipt/resource factory, receipt 검증과 최종 `validateDataSourceState`를 소유한다. Key 정책은 기존 `core/itemIdentity.js`의 `createSourceIdentity`를 재사용한다.
- `grammar/dataSourcePayload.js`는 retained text/rows와 parser version, MIME, encoding, byte length, content hash, parsed rows/schema의 일치 검사를 공유한다. UTF-8 text와 authored rows를 구분하며 rows의 signed zero는 기존 tagged value codec으로 보존한다.
- A의 `grammar/dataSourceRequest.js`가 request 생성과 digest를 소유한다. B의 복원 검증은 이 digest와 AST 정규화·의존성 검사만 사용하며 URL AST를 평가하거나 loader를 호출하지 않는다.
- `core/resourceReference.js`가 exact typed ref의 닫힌 모양과 revision 검사를 소유한다. 기존 materialization resource owner는 이를 재export한다. 이 분리로 source validator와 generic resource validator의 순환 import를 제거했다.

기존 private request digest는 상대 URL 계산에 사용한 `baseURL`을 hash 본문에 포함하지 않았다. 공개 저장 연결에서는 source intent의 일부인 canonical absolute `baseURL`도 digest에 포함하도록 root와 A/B가 합의했다. Receipt의 확정 `resolvedURL`, 현재 source/options와 exact parameter refs/scalars가 같은 digest에 결박된다. Factory도 stored options와 prepared request의 source/baseURL 불일치를 거부한다. 이 보완은 새 G-DATA checkpoint에만 적용하며 이전 parameter checkpoint의 검증 기록을 변경하지 않는다.

## Primitive와 최종 검증

Generic resource 검증은 envelope·reference 모양과 exact graph를 검사한다. `data-source.result.data`는 현재 output을 가리키며 input DAG edge로 취급하지 않는다. Final source 검증은 retained 원본을 pure parser로 재검증하고 dataset rows/schema, live output, key 정책, source intent와 request hash를 대조한다. Historical receipt의 source ID는 당시의 label이므로 삭제된 live resource를 다시 요구하지 않는다.

`actions/primitives/dataSourceContext.js`는 parameter primitive의 정확한 argument object에 최종 source envelope 목록을 결박한다. 목록 항목은 `{previous: {kind,id,revision}, resource}`이며 같은 source의 다음 revision만 허용한다. `replaceStoredResource`는 기존 dependency rebind 순서 안에서 이 envelope를 한 번 저장한다. 중첩 호출은 이전 context를 복구하고 모든 종료 경로는 `try/finally`로 context를 정리한다. 복제한 args나 stale prior revision은 권한을 얻지 않는다.

Dataset의 source receipt는 values 이전에 저장하며, materialized dataset의 정의는 기존과 같이 불변이다. Parameter만 primitive로 바꾸면 generic graph는 유효할 수 있으나 기존 bytes를 새 응답으로 인정하지 않는다. 최종 action과 serialize/restore는 stale source proof를 거부한다.

제거 collector는 live source의 exact output binding도 수집한다. `removeData`는 다른 consumer가 없는 경우 자신의 binding만 해제한 뒤 dataset을 제거한다. Primitive 직접 삭제는 같은 검사를 우회하지 못한다. Source가 참조하는 parameter는 inactive URL branch에만 있어도 제거할 수 없다.

Facet adoption은 selection/computed의 명시 reference가 요구하는 exact resource closure만 채택한다. 독립 live source는 replacement unit의 resources가 authoritative하며, 이전 child에 남은 binding을 output snapshot의 존재만 보고 재생성하지 않는다. 필요한 closure가 source를 참조할 때는 raw output의 exact ID/logical identity/revision을 유지하며 filtered cell로 바꾸지 않는다. 현재 parameter/source를 오래된 child 값으로 덮지 않는다.

## 검증 근거

- B state 테스트는 malformed receipt/MIME/encoding, getter 미실행, signed zero, named empty typed schema와 field keys, exact output/remove, historical independence, private envelope lifetime, inactive URL dependency, serialized payload 변조를 검사한다. 최종 B 14개와 consumer 4개를 canonical unit runner로 실행하여 18/18 통과했다.
- 기존 resource·parameter·persistence·removal·facet 12파일은 87/87 통과했다. 이 회귀 실행에서 부분 program에 resources가 없을 때 source lookup이 실패한 문제를 발견해 기존 selector 규칙처럼 빈 목록으로 처리했다.
- 새 B 모듈 4개의 focused coverage는 관련 A/C·resolver·consumer 테스트를 함께 실행하여 66/66 통과, line 99.44%, branch 95.59%, function 100%다. Source context와 resource reference는 전 항목 100%이고 source state는 line/function 100%, branch 94.89%다.
- Source import boundary 10/10 및 installed fixture manifest의 전체 파일/ID/문법 검사가 통과했다. 최종 package 크기 조정 전 실행한 artifact 검사에는 entry count 696 > 기존 ceiling 685가 남았으며, 이는 실제 package 통합 검증 완료로 주장하지 않는다.

독립 C 검토에서 준비된 source refresh가 적용 때 revision plan을 다시 계산하여 logical owner 이름에 충돌하는 문제를 발견했다. Root는 준비한 plan을 재사용하도록 수정했으며, `prepared-data-plan.test.js`의 공개 owner collision 및 6,000단계 bounded planning 2/2가 통과했다. 또 repeat의 `editFacetSource`가 direct rows revision으로 해제한 source를 이전 child에서 재채택하는 문제가 있었다. B의 독립 source 자동 adoption을 제거한 뒤 action/program 교체 양쪽 회귀와 기존 parameter/facet lifecycle을 묶어 40/40이 통과했다. 관련 로그는 `.artifacts/data-source-plan-review.log`, `.artifacts/data-source-adoption-review.log`, `.artifacts/data-source-c-review.log`다.

주요 로컬 로그는 `.artifacts/data-source-state-focused.log`, `.artifacts/data-source-state-regression.log`, `.artifacts/data-source-state-coverage.log`, `.artifacts/data-source-consumer-source.log`, `.artifacts/data-source-consumer-contracts.log`다. 모두 변경 중 worktree의 focused 근거이며 최종 commit/tag 검증을 대체하지 않는다.

## Installed 소비자

`scripts/consumers/fixtures/node/prepared-data.mjs`의 4개 case를 기존 manifest에 등록했다. Full/Basic source 생성, 별도 프로세스의 네트워크 없는 복원과 명시 host bytes refresh, stale/token/forged handle/abort 거부, source parameter 변경 뒤 Canvas/SVG/PNG/PDF/scene의 concrete parity를 검증한다. Canvas와 PNG 및 scene의 픽셀을 비교하고 PDF vector stream과 SVG의 graphic-only parity를 확인한다. Renderer 실행 중 loader 호출이 늘지 않는 것도 검사한다.

`test/unit/resources/prepared-data-consumer.test.js`가 동일 fixture를 공개 source exports로 실행하며 4/4 통과했다. 최종 `.tgz`를 설치한 별도 consumer 실행과 브라우저·전체 coverage·문서·타입·크기 검증은 root의 통합 checkpoint에서 수행한다.
