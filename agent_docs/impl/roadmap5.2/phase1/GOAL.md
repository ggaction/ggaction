# Roadmap 5.2 Phase 1 — Repository Governance, Community, and Security

## 목표

`main`을 PR/check 경계로 보호하고, 사람이든 AI-assisted contributor든 같은 입력 양식과 책임 기준을 따르며,
취약점이 공개 issue 대신 private channel로 들어오는 repository 운영 기반을 만든다.

## 진행 상태

- [x] Community/security file set과 exact content 작성
- [x] AI-assisted contribution responsibility와 PR checklist 작성
- [x] Monthly non-major Dependabot policy 작성
- [x] Durable repository-governance contract test
- [x] `main` active ruleset 적용과 recovery path 확인
- [x] Merged branch auto-delete 적용
- [x] Dependabot/security/private-reporting/secret-scanning 설정 적용
- [x] GitHub community profile과 settings API 검증
- [x] R52-P1-A remote checkpoint
- [ ] 사용자 explicit approval

## Gate R52-P1-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.

### 승인 전 차단

- Architecture/README/current contract truth correction
- Partial coverage status와 current action tests 변경
- CI action runtime, dependencies와 bundle source 변경
- Phase 2 이후 작업
