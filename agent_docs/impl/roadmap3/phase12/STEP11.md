# STEP 11 — 0.0.4 Release Candidate and Gate D

## 진행 상태

- [ ] Version/package-lock을 `0.0.4`로 갱신
- [ ] Repository metadata, README, docs, examples와 generated references 일괄 갱신
- [ ] CI verification과 release-only Pages deployment 분리
- [ ] `0.0.4` changelog와 release notes 작성
- [ ] Exact tarball, hash, provenance input과 fresh consumer 검증
- [ ] Gate D 코드/docs/artifact 승인

일반 `main` push는 docs를 build/test할 수 있지만 public site를 배포하지 않는다. Pages는 approved release tag의
exact artifact만 배포한다.
