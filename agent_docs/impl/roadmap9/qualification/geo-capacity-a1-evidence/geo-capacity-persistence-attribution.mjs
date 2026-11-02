import{readFileSync}from'node:fs';import{spawnSync}from'node:child_process';import{collectTestFiles,testRunnerArguments}from'../scripts/run-tests.js';
const files=collectTestFiles('unit').filter(f=>!/(?:point-explicit-capacity|interaction-)/.test(f)).filter(f=>/deserializeProgram|validateProgramState/.test(readFileSync(f,'utf8')));console.log(JSON.stringify({files}));
const r=spawnSync(process.execPath,['--experimental-test-coverage','--test-coverage-include=src/persistence/validation.js',...testRunnerArguments('unit',files)],{stdio:'inherit'});process.exitCode=r.status??1;
