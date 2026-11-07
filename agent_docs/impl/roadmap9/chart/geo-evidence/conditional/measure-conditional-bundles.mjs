import fs from 'node:fs/promises';import path from 'node:path';import{measureMinimalBrowserBundle}from'../../scripts/browser-bundle-size.js';
const result={node:process.version,zlib:process.versions.zlib,bundles:{}};
for(const specifier of ['ggaction','ggaction/basic','ggaction/svg','ggaction/interaction','ggaction/graph'])result.bundles[specifier]=await measureMinimalBrowserBundle(path.resolve('.artifacts/geo/conditional/bundle-measure'),{specifier});
await fs.writeFile('.artifacts/geo/conditional/source-bundles-'+process.versions.node.split('.')[0]+'.json',JSON.stringify(result,null,2));console.log(result);
