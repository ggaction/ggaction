# Roadmap 5.2 Phase 0 — Baseline and Policy Contract

## 목표

Runtime, tests, public docs와 GitHub settings를 바꾸기 전에 Roadmap 5.2가 정확히 무엇을 해결하고 무엇을
보존하는지 확정한다.

쉽게 말하면 Phase 0은 아래 결정을 먼저 승인받는 단계다.

- `main`을 얼마나 강하게 보호하되 solo maintainer 작업은 어떻게 막지 않을 것인가?
- 47개 `Partial`을 어떤 기준으로 완료라고 판단할 것인가?
- README의 basic 120KB promise를 복원할 것인가, 숫자를 올릴 것인가?
- Dependency major update를 이번 Roadmap에 포함할 것인가?
- 문서 drift를 한 번 고치는 데서 끝낼지, 재발 방지 test까지 만들 것인가?

## 진행 상태

- [x] Clean `main`, package와 action inventory 기준선 확인
- [x] Current contract의 47개 `Partial`과 action index partial 25개 확인
- [x] Architecture/README와 runtime의 대표 drift 확인
- [x] GitHub repository/community/security baseline 확인
- [x] Production audit, outdated dependency와 browser bundle 기준선 확인
- [x] Recommended repository, coverage, dependency와 bundle policy 작성
- [x] Focused agent-documentation verification — contract suite 161/161 pass
- [x] R52-P0-A review package commit/push — `c4a8cce3`
- [ ] 사용자 explicit approval

## Gate R52-P0-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- GitHub repository ruleset과 security setting 변경
- Community files와 public/internal truth 문서 수정
- Current contract coverage status와 test suite 변경
- CI workflow, dependency, source와 bundle registration 변경
- Phase 1 이후 작업
