# STEP 1 — Source Baseline Audit and Gate A

## 진행 상태

- [x] Root/source/internal-doc instructions와 architecture baseline 확인
- [x] `src/` file/line/owner inventory 작성
- [x] Import fan-in/out, owner direction과 cycle 감사
- [x] Public/internal action과 package entry 기준선 고정
- [x] Large mixed-responsibility module과 실제 duplication 검토
- [x] Normal, coverage, contract와 package baseline 실행
- [x] Refactor tranche, 불변 조건과 중단 조건 작성
- [x] Gate A 검토 패키지 준비

상세 근거와 구현 순서는 [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md)에 있다. 이 STEP에서는 `src/`를 수정하지
않는다.

## Gate A 승인 항목

1. Production refactor는 `src/`만 변경하고 테스트는 증거 보강에만 사용한다.
2. Public API, stored schema, trace와 rendered output은 동결한다.
3. Core state → pure grammar → mark/encoding → scale/materialization → guides/composition → renderer 순서로 진행한다.
4. 이름이 같은 helper를 자동으로 합치지 않고 semantic equivalence를 먼저 증명한다.
5. 발견한 bug는 별도 finding으로 분리하고 refactor에 숨기지 않는다.
6. Public docs는 STEP 11의 `0.0.4` release preparation에서만 갱신하고 release tag에서만 배포한다.
7. GitHub organization 생성, transfer와 npm publish는 아직 수행하지 않는다.

Gate A 승인 뒤 STEP 2부터 작은 conceptual commit 단위로 진행한다.
