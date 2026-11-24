// Offline exhaustive enumeration of left-hand card strings. No search runs on the phone.
import {writeFile,mkdir} from 'node:fs/promises';
import {RANKS,counts,validateRole,evaluate,SAMPLE} from '../core.mjs';
const maxLeft=Number(process.argv.find(x=>x.startsWith('--max-left='))?.split('=')[1]||6);
const limit=Number(process.argv.find(x=>x.startsWith('--limit='))?.split('=')[1]||2000);
if(!Number.isInteger(maxLeft)||maxLeft<1||maxLeft>6)throw Error('--max-left must be 1..6');
function spell(s){if(!s)return [''];const out=[];for(let i=1;i<=13;i++)if(s.startsWith(String(i)))for(const tail of spell(s.slice(String(i).length)))out.push(RANKS[i-1]+tail);return out;}
const sieveMax=Math.ceil(Math.sqrt(Number('13'.repeat(maxLeft)))),sieve=new Uint8Array(sieveMax+1),primes=[];
for(let p=2;p<=sieveMax;p++){if(sieve[p])continue;primes.push(p);for(let k=p*p;k<=sieveMax;k+=p)sieve[k]=1;}
function factor(n){const out=[];for(const d of primes){if(d*d>n)break;if(n%d)continue;let k=0;while(n%d===0){n/=d;k++;}out.push([d,k]);}if(n>1)out.push([n,1]);return out;}
function partitions(n,min=1){if(!n)return [[]];const out=[];for(let k=min;k<=n;k++)for(const tail of partitions(n-k,k))out.push([k,...tail]);return out;}
function materialOptions(p,k){const out=[];for(const groups of partitions(k)){let options=[''];for(const exponent of groups){const terms=[];for(const b of spell(String(p)))if(exponent===1)terms.push(b);else for(const e of spell(String(exponent)))terms.push(b+'^'+e);options=options.flatMap(a=>terms.map(b=>a?a+'×'+b:b));}out.push(...options);}return out;}
const bySize=new Map(),seen=new Set();let strings=0;
function record(left){
  strings++;const n=Number([...left].map(c=>RANKS.indexOf(c)+1).join(''));
  const factors=factor(n);if(!factors.length||(factors.length===1&&factors[0][1]===1))return;
  let options=[''];for(const [p,k] of factors){const terms=materialOptions(p,k);options=options.flatMap(a=>terms.map(b=>a?a+'×'+b:b)).filter(s=>left.length+s.replace(/[×^]/g,'').length<=12);}
  for(const right of options){const r=validateRole(left,right);if(r.count<5||r.count>12)continue;const c=counts(r.used);if(c.some(n=>n>4))continue;const key=c.join('');if(seen.has(key))continue;seen.add(key);const list=bySize.get(r.count)||[];list.push({left,right,c});bySize.set(r.count,list);}
}
function walk(s,c){if(s)record(s);if(s.length===maxLeft)return;for(let i=0;i<13;i++)if(c[i]<4){c[i]++;walk(s+RANKS[i],c);c[i]--;}}
walk('',Array(13).fill(0));
const problems=[],hands=new Set();
function add(a,b){const c=counts([...a.left,...a.right.replace(/[×^]/g,''),...b.left,...b.right.replace(/[×^]/g,'')]);if(c.some(n=>n>4))return;const hand=c.map((n,i)=>RANKS[i].repeat(n)).join('');if(hands.has(hand))return;evaluate(hand,[a,b]);hands.add(hand);problems.push({hand,solution:[{left:a.left,right:a.right},{left:b.left,right:b.right}]});}
add({left:'88AT',right:'2×3×3×5×AA×89'},{left:'J7',right:'3×3×K'});
// Deterministic shuffle avoids a catalog dominated by the first enumerated small numbers.
let seed=20261120;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
for(const a of bySize.values())shuffle(a);
const pairs=[[9,8],[10,7],[11,6],[12,5]];
for(let i=0;i<pairs.length;i++){
  const [a,b]=pairs[i],target=Math.ceil(limit*(i+1)/pairs.length);
  const aa=bySize.get(a)||[],bb=bySize.get(b)||[];
  pair: for(const x of aa){const offset=Math.floor(random()*bb.length);for(let j=0;j<bb.length;j++){const before=problems.length;add(x,bb[(offset+j)%bb.length]);if(problems.length>=target)break pair;if(problems.length>before)break;}}
}
shuffle(problems);await mkdir('data',{recursive:true});
await writeFile('data/problems.json',JSON.stringify({version:1,maxLeft,enumeratedStrings:strings,roleCounts:Object.fromEntries([...bySize].map(([k,v])=>[k,v.length])),problems})+'\n');
console.log(JSON.stringify({maxLeft,enumeratedStrings:strings,problems:problems.length,roleCounts:Object.fromEntries([...bySize].map(([k,v])=>[k,v.length]))}));
