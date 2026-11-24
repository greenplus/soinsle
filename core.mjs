export const RANKS = 'A23456789TJQK';
export const POINTS = [2,1,1,3,1,3,1,3,2,2,1,4,1];
export const SAMPLE = 'AAA23333578889TJK';
export function cards(text) {
  const s = text.toUpperCase().replace(/\s/g, '');
  if (!s || [...s].some(c => !RANKS.includes(c))) throw Error('カードは A〜K の表記で入力してください。1はA、10はT、11はJ、12はQ、13はKです。');
  return [...s];
}
export function value(text) { return BigInt(cards(text).map(c => RANKS.indexOf(c)+1).join('')); }
export function counts(list) { const c = Array(13).fill(0); for (const r of list) c[RANKS.indexOf(r)]++; return c; }
export function isPrime(n) {
  if (n < 2n) return false;
  for (const p of [2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n]) { if(n===p) return true; if(n%p===0n) return false; }
  // For a legal 17-card equality, a factor >= 2^64 would require at least
  // 10 cards on each side (each card contributes at most two decimal digits).
  if(n >= 18446744073709551616n) throw Error('素因数が判定可能範囲を超えています。');
  let d=n-1n,s=0; while(d%2n===0n){d/=2n;s++;}
  function pow(a,b){let r=1n; for(;b;b>>=1n,a=a*a%n) if(b&1n)r=r*a%n; return r;}
  for(const a of [2n,325n,9375n,28178n,450775n,9780504n,1795265022n]) {
    if(a%n===0n)continue;
    let x=pow(a%n,d); if(x===1n||x===n-1n)continue;
    let pass=false; for(let r=1;r<s;r++){x=x*x%n;if(x===n-1n){pass=true;break;}}
    if(!pass)return false;
  }
  return true;
}
export function validateRole(left, right) {
  if(typeof left!=='string'||typeof right!=='string'||left.length>40||right.length>100)throw Error('17枚以内のカードで式を作ってください。');
  const lhs=cards(left), n=value(left);
  const parts=right.toUpperCase().replace(/\s/g,'').split(/[×*·]/);
  let used=[...lhs], product=1n, multiplicity=0;
  const normalized=[];
  if(lhs.length+right.replace(/[\s×*·^]/g,'').length>17)throw Error('1役に使えるカードは手札の17枚以内です。');
  for(const part of parts){
    const match=/^([A23456789TJQK]+)(?:\^([A23456789TJQK]+))?$/.exec(part);
    if(!match)throw Error('右辺は素数を × でつなぎ、累乗は ^ で入力してください。例：2^8');
    const base=value(match[1]), exponent=match[2]?value(match[2]):1n;
    if(!isPrime(base))throw Error(`${match[1]}（${base}）は素数ではありません。`);
    if(exponent<2n&&match[2])throw Error('指数は2以上にしてください。');
    // If 2^exponent exceeds the left side, equality is impossible. Avoid huge powers.
    if(exponent>BigInt(n.toString(2).length))throw Error('右辺の積が左辺を超えています。');
    product*=base**exponent; multiplicity+=Number(exponent);
    if(product>n)throw Error('右辺の積が左辺を超えています。');
    used.push(...cards(match[1]),...(match[2]?cards(match[2]):[]));
    normalized.push(match[1]+(match[2]?'^'+match[2]:''));
  }
  if(multiplicity<2)throw Error('左辺は合成数にしてください。');
  if(product!==n)throw Error(`左右が一致しません。左辺は${n}、右辺は${product}です。`);
  const points=used.reduce((s,c)=>s+POINTS[RANKS.indexOf(c)],0);
  return {left:lhs.join(''),right:normalized.join('×'),used,count:used.length,points,score:points*used.length};
}
export function evaluate(hand, rows) {
  const available=counts(cards(hand)), spent=Array(13).fill(0);
  const roles=rows.map(r=>validateRole(r.left,r.right));
  for(const r of roles)for(const c of r.used)if(++spent[RANKS.indexOf(c)]>available[RANKS.indexOf(c)])throw Error(`${c}のカードが足りません。同じ札は再使用できません。`);
  return {roles,score:roles.reduce((s,r)=>s+r.score,0),used:spent.reduce((a,b)=>a+b,0),complete:spent.every((n,i)=>n===available[i]),remaining:available.map((n,i)=>n-spent[i])};
}
export function jstDate(date=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function dailyIndex(day,length){const ordinal=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse('2026-11-20T00:00:00Z'))/86400000);return ((ordinal%length)+length)%length;}
