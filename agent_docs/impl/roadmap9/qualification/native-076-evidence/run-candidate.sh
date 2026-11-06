#!/bin/zsh
# Run the nine canonical qualification checks on the clean candidate checkout.
cd /private/tmp/claude-501/-Users-hyeonjeon-Documents-Codex-2026-11-04-new-chat/31cec956-b25e-50fd-b1ab-e9063388439a/scratchpad/candidate
export npm_execpath=/opt/homebrew/Cellar/node@22/22.23.1/lib/node_modules/npm/bin/npm-cli.js
export PATH=/opt/homebrew/opt/ruby@3.3/bin:$PATH
export GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=/Users/hyeonjeon/.codex/worktrees/roadmap9-integration/ggactionnewbrand/.artifacts/datasets/tidytuesday
for spec in "normal:test" "realistic:run test:realistic" "coverage:run test:coverage" "browser:run test:browser" "render:run test:render" "package:run test:package" "platform:run test:platform" "package-artifact:run package:check" "documentation:run docs:verify"; do
  label=${spec%%:*}; args=(${=spec#*:})
  echo "== $label start $(date +%H:%M:%S) status=$(git status --porcelain --untracked-files=all | wc -l | tr -d ' ')"
  node scripts/run-check.js $label -- npm $args > /private/tmp/claude-501/-Users-hyeonjeon-Documents-Codex-2026-11-04-new-chat/31cec956-b25e-50fd-b1ab-e9063388439a/scratchpad/cand-$label.log 2>&1
  echo "== $label exit=$? $(date +%H:%M:%S) status=$(git status --porcelain --untracked-files=all | wc -l | tr -d ' ')"
done
echo all=done
