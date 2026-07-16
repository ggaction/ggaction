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

## `0.0.1` actual observations

- Interactive `npm publish`는 browser authorization URL을 제시했고 승인 후 exact tarball을 한 번만 publish했다.
  OTP, recovery code와 reusable npm token은 저장하지 않았다.
- Bootstrap publish는 설치돼 있던 npm `10.9.2`로 성공했다. Trusted publisher 설정 전 npm을 `11.18.0`으로
  올렸고 `npm trust github` 결과를 `npm trust list ggaction`으로 다시 확인했다.
- Publishing access의 token 우회를 막기 위해 `npm access set mfa=publish ggaction`을 실행했다. 이 모드는
  interactive publish에 2FA를 요구하고 automation token override를 허용하지 않는다.
- Registry consumer는 다음 두 명령으로 재현한다.

  ```bash
  node scripts/package-consumer.js ggaction@0.0.1
  GGACTION_PACKAGE_SPEC=ggaction@0.0.1 node --test test/browser/package-consumer.browser.js
  ```

- Trusted publisher와 protected environment readiness는 npm binding, GitHub environment policy와 workflow contract
  test로 확인했다. 이미 존재하는 `0.0.1`을 재배포하지 않고 corrective `0.0.2`에서 실제 OIDC publish를 검증했다.

## `0.0.2` OIDC observations

- Default-branch workflow가 input tag를 checkout하고 annotated tag target과 candidate commit을 검증한다. Candidate
  helper에 effective tag ref를 전달해 tag identity를 retry에서도 보존한다.
- Full graphical equality는 canonical Node 20, coverage/documentation은 CI와 같은 Node 22, trusted publish는 npm
  OIDC를 지원하는 Node 24가 담당한다. Runtime 차이를 application failure로 숨기지 않는다.
- Protected `npm-release` environment는 reviewer approval, `v*` tag policy와 default-branch orchestrator용 `main`
  branch policy를 함께 사용한다. Publish 전 실패는 registry를 변경하지 않으며 exact retained artifact만 재사용한다.
- Release run `29520189000`이 retained artifact를 OIDC로 publish하고 matching GitHub Release를 만들었다. Registry에서
  다시 받은 tarball은 retained artifact와 같은 SHA-1 `87e4210a12a4949c1e6036dfd6e91a0f537504dc`와 SHA-256
  `b8ec5879e6aba08432cef5dc13a01ae216cb35c2a7828f035fdc06ab149e26e7`을 가졌다.
- Registry tarball은 221 files이고 internal `AGENTS.md`가 없다. Main, extension, PNG, TypeScript와 browser fresh
  consumer가 모두 통과했고 `latest`는 `0.0.2`를 가리킨다.

## 이후 OIDC release

1. 공통 candidate 절차와 approval을 완료한다.
2. Approved commit에 matching annotated tag를 만들고 push한다.
3. GitHub Actions의 default branch에서 `Release` workflow를 matching tag input으로 수동 실행한다. Workflow는
   annotated tag를 checkout하고 checked-out commit이 그 tag target과 정확히 같은지 검증한다.
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
