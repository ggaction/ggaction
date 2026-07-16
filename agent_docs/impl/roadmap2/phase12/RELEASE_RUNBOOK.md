# ggaction Release Runbook

## 목적

이 문서는 npm package, Git tag, GitHub Release와 public docs를 하나의 version으로 배포하고 실패 시 안전하게
복구하는 절차를 정의한다. `0.0.1`만 interactive npm 인증을 사용하는 bootstrap release이며, package가 생성된
뒤에는 protected GitHub environment와 npm trusted publisher를 사용한다.

## 공통 release candidate

1. `main`을 최신 상태로 만들고 worktree가 clean인지 확인한다.
2. `package.json`과 root `package-lock.json` version을 같은 semantic version으로 변경한다.
3. `CHANGELOG.md`에 같은 version section을 추가한다. 이 section이 GitHub Release notes의 단일 원본이다.
4. 다음 generated artifact와 전체 검증을 실행한다.

   ```bash
   npm ci
   npm run contracts:catalog:check
   npm run docs:images
   npm run docs:llms
   npm test
   npm run test:coverage
   npm run test:package
   npm run test:browser
   npm run test:render
   npm run release:notes -- <version>
   npm run package:pack
   git diff --exit-code -- docs/assets/images/manifest.json docs/llms-full.txt
   ```

5. Candidate commit의 remote CI/Pages 결과, exact tarball inventory와 SHA-256, release notes, npm account/package
   상태를 Gate evidence로 제시한다.
6. 명시적 승인 전에는 tag, npm publish, GitHub Release를 만들지 않는다.

## `0.0.1` bootstrap publish

1. Candidate commit과 worktree가 Gate B evidence와 같은지 다시 확인한다.
2. npm CLI를 browser 인증하고 owner를 확인한다.

   ```bash
   npm login --auth-type=web
   npm whoami
   ```

   출력은 반드시 `hyeonjeon`이어야 한다. OTP나 recovery code를 repository, log, command argument에 저장하지
   않는다.
3. Annotated tag `v0.0.1`을 approved commit에 만들고 push한다.
4. 검증한 exact tarball을 public `latest`로 한 번만 publish한다.

   ```bash
   npm publish .artifacts/release/ggaction-0.0.1.tgz --access public --tag latest
   ```

5. `CHANGELOG.md`에서 생성한 exact notes로 GitHub Release `v0.0.1`을 만든다.
6. npm package가 존재한 뒤 npm package settings에서 trusted publisher를 연결한다.

   ```bash
   npm install --global "npm@^11.5.1"
   npm trust github ggaction \
     --file release.yml \
     --repo hj-n/ggaction \
     --env npm-release \
     --allow-publish \
     --yes
   ```

   ```text
   owner/repository   hj-n/ggaction
   workflow           release.yml
   environment        npm-release
   allowed action     npm publish
   ```

   CLI 설정을 사용할 수 없으면 npm package Settings의 Trusted Publisher form에 같은 값을 입력한다. Binding을
   확인한 뒤 Publishing access를 `Require two-factor authentication and disallow tokens`로 제한한다.
7. STEP9의 registry/fresh-install/docs verification을 완료한다.

## 이후 OIDC release

1. 공통 candidate 절차와 approval을 완료한다.
2. Approved commit에 matching annotated tag를 만들고 push한다.
3. GitHub Actions의 `Release` workflow를 matching tag input으로 수동 실행한다.
4. Protected `npm-release` environment approval 화면에서 version, commit과 evidence를 다시 확인하고 승인한다.
5. Workflow가 OIDC로 exact source commit을 publish하고 같은 tag의 GitHub Release를 생성한다. Long-lived npm
   token은 사용하지 않는다.

## 실패와 복구

- **Publish 전 실패:** 작업을 중단하고 원인을 수정한 새 candidate commit을 만든다. 이미 만든 local tag는 승인된
  commit과 다르면 삭제한다.
- **Remote tag 후 npm publish 실패:** package bytes가 변하지 않은 인증/registry 일시 오류라면 같은 approved
  tag와 artifact만 재시도한다. Code, dependency, metadata를 고쳐야 하면 기존 tag를 release하지 말고 새 candidate
  승인을 받는다.
- **npm 성공 후 GitHub Release 실패:** npm을 다시 publish하지 않는다. 같은 tag와 generated notes로 GitHub
  Release creation만 재시도한다.
- **잘못된 package가 이미 public:** 같은 version을 덮어쓰거나 routine unpublish하지 않는다. 필요하면
  `npm deprecate ggaction@<version> "<reason and replacement>"`로 경고하고 수정한 다음 patch version을 배포한다.
- **dist-tag만 잘못됨:** package integrity를 확인한 뒤 `npm dist-tag add ggaction@<version> latest`로 tag만 수정한다.
- **Credential 의심:** npm/GitHub에서 credential 또는 trusted-publisher binding을 폐기하고 audit한다. Secret을
  commit history에서 고치려 하지 않는다.

## Release 완료 기록

각 release closeout에는 commit, tag, npm version/integrity/dist-tag, tarball SHA-256, GitHub Release URL, workflow
run, public docs URL, fresh JavaScript/TypeScript/PNG/browser consumer 결과와 recovery 여부를 남긴다.
