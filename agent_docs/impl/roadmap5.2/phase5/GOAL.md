# Roadmap 5.2 Phase 5 — Integration and Closeout

## 목표

Roadmap 5.2 전체 결과를 하나의 reproducible candidate로 통합하고, local/package/render evidence와 실제 GitHub
default-branch 상태를 모두 닫은 뒤 R52-Exit에서 완료 여부를 승인받는다.

## 진행 상태

- [x] Phase 4 explicit approval과 Phase 5 전환
- [x] Current GitHub settings/community/security baseline 재확인
- [x] Repository truth와 generated artifact drift audit
- [ ] Complete local/package/docs/browser/render verification
- [ ] R52-P5-A remote candidate checkpoint
- [ ] 사용자 R52-P5-A explicit approval
- [ ] 별도 PR creation/merge authorization과 required checks
- [ ] Merged `main` community/security/settings reconciliation
- [ ] R52-Exit remote checkpoint와 explicit approval

## 두 단계 closeout 경계

현재 GitHub community profile과 Dependabot alert는 default branch인 `main`만 평가한다. Roadmap branch에는 complete
community files와 patched PostCSS가 있지만 아직 main에 없으므로 profile 50%와 medium alert 1건이 정상적으로
남아 있다.

따라서 Phase 5는 다음 순서를 강제한다.

1. R52-P5-A에서 merge 전 candidate의 repository truth와 complete verification을 승인받는다.
2. PR creation과 merge는 Gate 승인과 별도로 사용자에게 권한을 받는다.
3. Exact candidate가 required checks를 거쳐 main에 들어간 뒤 profile, alert, ruleset과 environments를 재확인한다.
4. R52-Exit에서 merged-main truth를 승인받는다.

## Gate ownership

- Pre-merge candidate: [`GATE_A.md`](./GATE_A.md)
- Final merged-main closeout: [`GATE_EXIT.md`](./GATE_EXIT.md)

R52-P5-A 전에는 PR/merge를 하지 않는다. R52-Exit 전에는 Roadmap completed 선언, package publish, docs deployment나
`0.0.9` release preparation을 하지 않는다.
