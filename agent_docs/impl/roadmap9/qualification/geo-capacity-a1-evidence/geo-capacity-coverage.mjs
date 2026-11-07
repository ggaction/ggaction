import {spawnSync} from 'node:child_process';
import {collectTestFiles,testRunnerArguments} from '../scripts/run-tests.js';
const files=collectTestFiles('unit').filter(f=>/\/unit\/(?:geo\/|grammar\/(?:path-|compound-path|graphic-|weighted-|polar-paths|stroke-style)|actions\/primitives\/|selectors\/graphic-capacity|persistence|weighted-blend|immutable-calculation-reuse|renderers\/(?:canvas-path|canvas-stroke|compound-owner|graphic-owner))/.test(f));
const owners=['actions/geo/marks.js','actions/primitives/editGraphics.js','grammar/geo/capacity.js','grammar/geo/mark.js','grammar/geo/markGeometry.js','grammar/geo/stream.js','grammar/pathCommands.js','grammar/pathGeometry.js','grammar/pathTopology.js','grammar/schemas/concreteGraphic.js','grammar/schemas/graphic.js','grammar/schemas/graphicBounds.js','materialization/geo/mark.js','persistence/validation.js','selectors/graphicCapacity.js'];
console.log(JSON.stringify({files,owners}));
const result=spawnSync(process.execPath,['--experimental-test-coverage',...owners.map(f=>'--test-coverage-include=src/'+f),...testRunnerArguments('unit',files)],{stdio:'inherit'});process.exitCode=result.status??1;
