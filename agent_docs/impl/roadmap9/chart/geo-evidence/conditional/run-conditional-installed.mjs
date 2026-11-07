import {spawn}from'node:child_process';import fs from'node:fs';import path from'node:path';
for(const [major,node]of [['20','/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node'],['22','/opt/homebrew/Cellar/node@22/22.23.1/bin/node'],['24','/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node']]){
 const prefix='.artifacts/geo/conditional/installed-'+major,fd=fs.openSync(prefix+'.log','w');const child=spawn(node,['.artifacts/geo/conditional-installed.mjs'],{stdio:['ignore',fd,fd],env:{...process.env,npm_execpath:'/opt/homebrew/lib/node_modules/npm/bin/npm-cli.js',PATH:path.dirname(node)+':'+process.env.PATH}});
 const code=await new Promise(resolve=>child.on('exit',resolve));fs.closeSync(fd);fs.writeFileSync(prefix+'.exit.json',JSON.stringify({node,code}));console.log({major,code});if(code!==0){process.exitCode=1;break;}
}
