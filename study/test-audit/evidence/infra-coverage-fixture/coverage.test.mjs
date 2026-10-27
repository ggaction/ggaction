import test from "node:test";import assert from "node:assert/strict";import {used} from "./src/used.mjs";test("only imported source",()=>assert.equal(used(),1));
