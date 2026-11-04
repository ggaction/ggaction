# Run from the repository root; pass explicit Node20/22/24 executable paths.
set -e
if (( $# == 0 )); then set -- node; fi
mkdir -p .artifacts/route-native-update
for route_node in "$@"; do
  route_major=$($route_node -p 'process.versions.node.split(".")[0]')
  $route_node --test --experimental-test-coverage test/unit/resources/graph-route*.test.js test/unit/resources/graph-routes.test.js test/unit/resources/source-resource-plan.test.js test/unit/resources/graph-layouts.test.js test/unit/resources/graph-coordinate-revisions.test.js test/unit/resources/hierarchy-*.test.js test/unit/grammar/graph/routes/*.test.js test/unit/geo/route-resources.test.js test/unit/geo/projection-resources.test.js test/unit/geo/join-resources.test.js test/unit/geo/lod-resources.test.js test/unit/graph-presentation.test.js test/unit/core/encoded-value-cursor.test.js test/unit/core/json-text.test.js test/unit/persistence/codec.test.js test/unit/core/canvas-resource-revision.test.js test/unit/core/action*.test.js test/unit/actions/theme-native-route-update.test.js test/unit/actions/theme-flow.test.js test/unit/actions/theme-resource-plots.test.js test/unit/actions/theme-provenance.test.js test/unit/actions/data/observed-graph.test.js test/unit/actions/data/inferred-graph.test.js test/unit/actions/composition/facet-resource-projection.test.js > .artifacts/route-native-update/owning-node$route_major.log 2>&1
done
