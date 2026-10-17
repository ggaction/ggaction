import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {createCanvas} from "@napi-rs/canvas";
import {render} from "../../../src/index.js";
import {assertDisplayedProgram} from "../../support/visual-variants.js";
import {visualVariants} from "./manifest.js";
function output(program){
 const canvas=createCanvas(200,200),context=canvas.getContext("2d"),calls=[];
 const recorded=new Proxy(context,{
  get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=="function")return value;
   return(...args)=>{calls.push({op:key,args:args.map(arg=>typeof arg?.getContext==="function"?{
    width:arg.width,height:arg.height,rgba:createHash("sha256").update(arg.getContext("2d").getImageData(0,0,arg.width,arg.height).data).digest("hex")
   }:arg)});return value.apply(target,args);};},
  set(target,key,value){calls.push({op:"set",key,value});return Reflect.set(target,key,value,target);}
 });
 render(program,recorded);
 return {calls,rgba:context.getImageData(0,0,200,200).data};
}
for(const variant of visualVariants)test(`${variant.variant} shares exact graphics, order, Canvas calls and RGBA`,()=>{
 const actual=variant.userFacing(),expected=variant.primitive();assertDisplayedProgram(variant,actual);
 assert.deepEqual(actual.graphicSpec,expected.graphicSpec);
 assert.deepEqual(actual.graphicSpec.order,expected.graphicSpec.order);
 assert.deepEqual(output(actual),output(expected));
});
