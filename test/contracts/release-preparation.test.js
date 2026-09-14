import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { planRelease } from "../../scripts/prepare-release.js";
import { extractReleaseNotes } from "../../scripts/release-notes.js";

function files() { return {
  "knowledge/intent-taxonomy.json":JSON.stringify({packageVersion:"0.0.15",constraints:[]}),
  "knowledge/mcp-resources.json":JSON.stringify({packageVersion:"0.0.15",resources:[]}),
  "context7.json":JSON.stringify({previousVersions:[{tag:"v0.0.15"}]}),
  "docs/_config.yml":"title: ggaction\nversion: 0.0.15\n",
  "package.json":JSON.stringify({name:"ggaction",version:"0.0.15",exports:{".":"./src/index.js"}}),
  "package-lock.json":JSON.stringify({version:"0.0.15",lockfileVersion:3,packages:{"":{version:"0.0.15"},"node_modules/example":{version:"1.2.3"}}}),
  "src/version.js":'// Canonical runtime identity.\nexport const packageVersion = "0.0.15";\n',
  "README.md":'> **Status:** `0.0.15` is the current experimental public release.\n',
  "CHANGELOG.md":"# Changelog\n\n## Unreleased\n\n### Fixed\n\n- Preserve user data.\n\n## [0.0.15] - 2026-09-01\n\n- Older work.\n"
}; }
const options={version:"0.0.16",date:"2026-09-14"};

test("prepares all canonical version owners and promotes only unreleased notes without changing dependencies",()=>{
 const input=files(),before=JSON.stringify(input); const next=planRelease(input,options);
 assert.equal(JSON.parse(next["package.json"]).version,"0.0.16");
 assert.match(next["docs/_config.yml"],/^version: 0\.0\.16$/m);
 assert.equal(JSON.parse(next["knowledge/intent-taxonomy.json"]).packageVersion,"0.0.16");
 assert.equal(JSON.parse(next["knowledge/mcp-resources.json"]).packageVersion,"0.0.16");
 assert.deepEqual(JSON.parse(next["context7.json"]).previousVersions,[{tag:"v0.0.16"},{tag:"v0.0.15"}]);
 const lock=JSON.parse(next["package-lock.json"]);assert.equal(lock.version,"0.0.16");assert.equal(lock.packages[""].version,"0.0.16");assert.equal(lock.packages["node_modules/example"].version,"1.2.3");
 assert.match(next["src/version.js"],/"0\.0\.16"/);assert.match(next["README.md"],/`0\.0\.16`/);
 assert.equal(extractReleaseNotes(next["CHANGELOG.md"],"0.0.16"),"# ggaction 0.0.16\n\n### Fixed\n\n- Preserve user data.\n");
 assert.equal(extractReleaseNotes(next["CHANGELOG.md"],"0.0.15"),extractReleaseNotes(input["CHANGELOG.md"],"0.0.15"));
 assert.equal(JSON.stringify(input),before); assert.deepEqual(planRelease(next,options),next);
});

test("preflight rejects drift, empty notes, invalid dates, downgrades and existing releases",()=>{
 for(const version of [undefined,"v0.0.16","0.0.016","0.0.16;echo x","0.0.14","0.0.16-beta"]) assert.throws(()=>planRelease(files(),{...options,version}));
 for(const date of [undefined,"2026-02-30","2026-13-01","today"]) assert.throws(()=>planRelease(files(),{...options,date}));
 for(const [file,value] of [
   ["src/version.js",'export const packageVersion = "0.0.14";'],
   ["package-lock.json",JSON.stringify({version:"0.0.15",packages:{"":{version:"0.0.14"}}})],
   ["README.md","No release status."],
   ["knowledge/intent-taxonomy.json",JSON.stringify({packageVersion:"0.0.14"})],
   ["knowledge/mcp-resources.json",JSON.stringify({packageVersion:"0.0.14"})],
   ["docs/_config.yml","version: 0.0.14\n"],
   ["CHANGELOG.md","# Changelog\n\n## Unreleased\n\n### Fixed\n"],
   ["CHANGELOG.md",files()["CHANGELOG.md"]+"\n## [0.0.16]\n- Already released.\n"]
 ]) assert.throws(()=>planRelease({...files(),[file]:value},options));
});

test("release preparation has no publish, tag, push, or candidate-packing side effects",()=>{
 const source=readFileSync(new URL("../../scripts/prepare-release.js",import.meta.url),"utf8");
 assert.doesNotMatch(source,/createReleaseCandidate|createPackageArtifact|git["'],\s*["'](?:tag|push|commit)|npm["'],\s*["']publish/);
 assert.match(source,/publishes:false/);
});
