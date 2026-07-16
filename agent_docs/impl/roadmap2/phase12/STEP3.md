# Roadmap 2 — Phase 12 Step 3: Minimal Deterministic Package Artifact

## 목표

Registry consumer에게 필요한 파일만 포함하는 deterministic npm tarball을 만들고 현재 과도한 package contents를
기계적으로 차단한다.

## 진행 상태

- [ ] Explicit package `files` allowlist designed and applied
- [ ] Runtime source, declarations, README, license and required package metadata included
- [ ] Tests, examples, internal agent records, workflows, scripts, data and generated artifacts excluded
- [ ] Forbidden secret, environment, editor and OS files rejected
- [ ] `npm pack --dry-run --json` inventory contract added
- [ ] Packed and unpacked size recorded with a regression budget
- [ ] Tarball produced in an isolated artifact directory
- [ ] Tarball checksum and manifest made available to release verification
- [ ] STEP status, conceptual commit and push

## Artifact boundary

Allowlist는 source directory 전체를 무조건 포함하는 대신 public runtime import graph에 필요한 파일을 포함해야 한다.
Package test는 required file 누락과 forbidden file 추가를 모두 실패시킨다. `.npmignore`의 broad exception chain보다
`package.json.files`의 positive allowlist를 우선한다.

## 완료 조건

The exact publish artifact is small, deterministic, free of internal material and fully described by executable inventory
checks.
