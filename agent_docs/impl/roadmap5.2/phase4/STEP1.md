# STEP 1 — Move Release Actions to Supported Node 24 Revisions

## 진행 상태

- [x] Current release workflow action revisions와 official latest releases audit
- [x] Selected releases의 official `action.yml` runtime 확인
- [x] Release workflow revisions 갱신
- [x] Immutable-tag, exact-artifact와 protected publish invariants 검증
- [x] Focused workflow contract 4/4와 YAML structure 검증

## 실행 계약

다음 official releases를 사용한다.

| Action | Current | Target | Runtime result |
| --- | --- | --- | --- |
| `actions/upload-artifact` | `v4` | `v7` | Node 24 |
| `actions/download-artifact` | `v5` | `v8` | Node 24; digest mismatch fails closed |
| `actions/configure-pages` | `v5` | `v6` | Node 24 |
| `actions/upload-pages-artifact` | `v4` | `v5` | composite using upload-artifact v7 |
| `actions/deploy-pages` | `v4` | `v5` | Node 24 |

기존 artifact name/path, exact reviewed artifact identity, protected environments, permissions와 job dependency는 바꾸지
않는다. Major revision은 runtime migration에 필요한 official action boundary에만 한정한다.
