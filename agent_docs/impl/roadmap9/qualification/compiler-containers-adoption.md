# 완성된 compiler container 소유권 채택

상태: 기존 `AUTHORIZATION.json#remainingApproval` 범위의 구체 구현 선택을 채택한다.
검토 revision은 `14f3daf7c586fcda9926569ff832e10a32703a2e`이며
[검토와 원100k CPU 기록](sampler-cpu-review.md)이 정확한 대상이다.
Root는 loader의 변경 전체, 기존 compiler/immutable 순회,17개 원자료 hash 및
통합본 compiler source hash 일치를 확인했다. 제품 구현과 최종 성능 통과는 별도다.

## 채택 범위

Compiler가 직접 생성한 ID-only children과 완성된 objects/order/graphicSpec/program
container만 직접 소유권을 부여한다. Raw group 및 borrowed/translated properties wrapper는
기존 생성 순서와 `state.graphicSpec.objects.<id>` 오류 경로로 cloneAndFreeze한다.
기존 node/clip 검사와 translation을 모두 마친 뒤 처리하고 caller scene/descendant를
동결하거나 stamp하지 않는다. 모든 반환 child가 owned이며 즉시 완전히 materialized된
backend-neutral graphicSpec을 유지한다. 새 cache, 공개 API, 저장 schema, native 권한은 없다.

제품 checkpoint는 caller/getter/error 순서,7개 primitive, mutable 재컴파일,
actual1k whole/native/offline/rebase/timeline/work/wire,4renderer 및 이전 frame 수명,
owning coverage와 같은 frozen archive의3Node/browser/type/docs 검증을 포함한다.
원100k workload 및 quota를 줄이지 않으며 대형 실행은 단일 슬롯에서 진행한다.

## 남은 구조 문제

검토의 canonical batch 항목은 미채택이다. 현재 약120만 freeze/100k를 유지하므로
이 변경만으로50ms 달성을 주장하지 않는다. 별도 구조 제안은 구체 schema, 기존 reader와
inspection 호환, all-renderer/hit/native/offline 의미, immutable snapshot 및 실제 oracle을
갖춘 뒤 판단한다. P95와100cycle 및 STEP057–077 closeout 의무를 유지한다.
