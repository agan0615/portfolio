import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const configuration=JSON.parse(await readFile(new URL('../portfolio-assets.json',import.meta.url),'utf8'));
if(configuration.source!=='https://agan0615.github.io/contract-risk-analysis-system/portfolio/') throw new Error('Unexpected asset source');
if(!Array.isArray(configuration.assets)||configuration.assets.length!==21) throw new Error('Unexpected asset list');
const destination=path.resolve('assets');
await mkdir(destination,{recursive:true});
for(const asset of configuration.assets){
 if(!/^assets\/[a-z0-9][a-z0-9-]*\.(pdf|webp|png|jpg|svg|mp4)$/.test(asset.path)||!/^[a-f0-9]{64}$/.test(asset.sha256)||!Number.isSafeInteger(asset.bytes)||asset.bytes<1||asset.bytes>20000000) throw new Error('Invalid manifest entry');
 const output=path.resolve(asset.path);
 if(!output.startsWith(destination+path.sep)) throw new Error('Invalid output path');
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  try {
   const response=await fetch(new URL(asset.path,configuration.source),{signal:AbortSignal.timeout(90000)});
   if(!response.ok) throw new Error(`HTTP ${response.status} for ${asset.path}`);
   const content=Buffer.from(await response.arrayBuffer());
   if(content.length!==asset.bytes||createHash('sha256').update(content).digest('hex')!==asset.sha256) throw new Error(`Integrity mismatch: ${asset.path}`);
   await writeFile(output,content);lastError=undefined;console.log(`Verified ${asset.path} (${content.length} bytes)`);break;
  } catch(error){lastError=error;if(attempt<2)await new Promise(r=>setTimeout(r,1000*(attempt+1)));}
 }
 if(lastError) throw lastError;
}
console.log('All 21 portfolio assets imported with verified SHA-256 checksums.');
