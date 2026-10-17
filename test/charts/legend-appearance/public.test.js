import assert from 'node:assert/strict';import test from 'node:test';
import {createPublicProgram,createPrimitiveProgram} from './manifest.js';
test('public whole-symbol opacity has exact independent literal concrete state',()=>{assert.deepEqual(createPublicProgram().graphicSpec,createPrimitiveProgram().graphicSpec);});
