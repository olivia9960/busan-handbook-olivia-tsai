const scales={KRW:1,TWD:100,MOP:100}, R=1000000000n;
export function toMinor(value,currency,allowZero=false){
 const scale=scales[currency];if(!scale)throw Error('幣別不正確');
 const text=String(value).trim();if(!/^\d+(\.\d+)?$/.test(text))throw Error('請輸入有效金額');
 const [a,b='']=text.split('.');const precision=scale===1?0:2;if(b.length>precision)throw Error(`${currency} 金額小數位數不正確`);
 const n=BigInt(a)*BigInt(scale)+BigInt(b.padEnd(precision,'0')||'0');if(n>100000000000n||n<0n||(!allowZero&&n===0n))throw Error('金額必須大於零且在合理範圍內');return Number(n);
}
function rate(rates,c){if(c==='KRW')return R;const key=c==='TWD'?'twdPerKrw':'mopPerKrw';const s=String(rates?.[key]??'');if(!/^\d+(\.\d{1,9})?$/.test(s))throw Error('請先設定有效匯率（最多 9 位小數）');const [a,b='']=s.split('.');const n=BigInt(a)*R+BigInt(b.padEnd(9,'0'));if(n<=0n||n>100n*R)throw Error('請先設定有效匯率');return n;}
export function validateRates(rates){rate(rates,'TWD');rate(rates,'MOP');return {twdPerKrw:String(rates.twdPerKrw),mopPerKrw:String(rates.mopPerKrw)}}
const rational=(n,d)=>({n:BigInt(n),d:BigInt(d)});
const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
function reduce(a){let x=a.n<0n?-a.n:a.n,y=a.d;while(y){[x,y]=[y,x%y]}return rational(a.n/(x||1n),a.d/(x||1n))}
function krw(minor,c,r){return rational(BigInt(minor)*R,BigInt(scales[c])*rate(r,c))}
function asNumber(a){return Number(a.n)/Number(a.d)}
function converted(a,c,r){return asNumber(rational(a.n*rate(r,c),a.d*R))}
export function convert(amount,from,to,rates){const minor=toMinor(amount,from,true);return converted(krw(minor,from,rates),to,rates)}
export function format(n,c){return n==null?'設定匯率後顯示':`${{KRW:'₩',TWD:'NT$',MOP:'MOP$'}[c]}${Number(n).toLocaleString('zh-TW',{minimumFractionDigits:c==='KRW'?0:2,maximumFractionDigits:c==='KRW'?0:2})}`}
export function validateExpense(input){
 const amount_minor=toMinor(input.amount,input.currency),rates=validateRates(input.rates);if(!['米','凌'].includes(input.payer))throw Error('請選擇付款人');if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date||'')||isNaN(Date.parse(input.date)))throw Error('請選擇日期');if(!String(input.title??'').trim())throw Error('請填品項／店名');
 let mi,ling;if(input.split==='equal'){mi=Math.ceil(amount_minor/2);ling=amount_minor-mi}else if(input.split==='mi'){mi=amount_minor;ling=0}else if(input.split==='ling'){mi=0;ling=amount_minor}else if(input.split==='custom'){mi=toMinor(input.shares?.mi,input.currency,true);ling=toMinor(input.shares?.ling,input.currency,true);if(mi+ling!==amount_minor)throw Error('兩人分攤金額合計需等於總額')}else throw Error('請選分攤方式');
 return {id:input.id,date:input.date,title:String(input.title).trim(),amount_minor,currency:input.currency,payer:input.payer,split:input.split,mi_share_minor:mi,ling_share_minor:ling,rates,notes:input.notes||'',receipt_id:input.receipt_id||null};
}
export function summarize(expenses,rates){
 let total=rational(0,1),net=rational(0,1);let totals={KRW:0,TWD:0,MOP:0};const daily={},paid={'米':0,'凌':0},owed={'米':0,'凌':0};
 for(const e of expenses.filter(e=>!e.deleted_at)){
  const k=krw(e.amount_minor,e.currency,e.rates);total=reduce(add(total,k));const m=krw(e.mi_share_minor,e.currency,e.rates);const delta=e.payer==='米'?reduce(add(k,rational(-m.n,m.d))):rational(-m.n,m.d);net=reduce(add(net,delta));
  const d=daily[e.date]??={KRW:0,TWD:0,MOP:0};for(const c of Object.keys(totals)){const v=converted(k,c,e.rates);totals[c]+=v;d[c]+=v}paid[e.payer]+=asNumber(k);owed['米']+=asNumber(m);owed['凌']+=asNumber(k)-asNumber(m);
 }
 const absolute=rational(net.n<0n?-net.n:net.n,net.d),settlement={from:net.n>0n?'凌':net.n<0n?'米':null,to:net.n>0n?'米':net.n<0n?'凌':null,krw:asNumber(absolute),KRW:asNumber(absolute)};for(const c of ['TWD','MOP']){try{settlement[c]=converted(absolute,c,rates)}catch{settlement[c]=null}}
 return {daily,totals,paid,owed,settlement};
}
export function estimateMeal(items,budget,rates){
 let sum=0;for(const x of items.filter(x=>x.selected)){if(!x.confirmed||!Number.isSafeInteger(x.price_minor)||x.price_minor<=0)throw Error('請先確認品項價格');if(!Number.isInteger(Number(x.quantity))||Number(x.quantity)<1||Number(x.quantity)>100)throw Error('份數須為 1–100 的整數');sum+=x.price_minor*Number(x.quantity)}if(!Number.isSafeInteger(sum)||sum>100000000000)throw Error('總額超出範圍');
 const totals={KRW:sum,TWD:null,MOP:null};for(const c of ['TWD','MOP'])try{totals[c]=convert(sum,'KRW',c,rates)}catch{}
 if(!budget||budget.amount==='')return {totals,budgetState:'none',difference:null};const b=convert(budget.amount,budget.currency,'KRW',rates),difference=b-sum;return {totals,budgetState:Math.abs(difference)<1e-8?'exact':difference>0?'under':'over',difference};
}
