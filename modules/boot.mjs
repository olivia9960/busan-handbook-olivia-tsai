import {connect} from './sync.mjs?v=f6228d036dd9';import {mountItinerary} from './itinerary.mjs?v=f6228d036dd9';import {mountLedger} from './ledger.mjs?v=f6228d036dd9';import {mountMenu} from './menu.mjs?v=f6228d036dd9';import {koreaDay} from './ui.mjs?v=f6228d036dd9';
const $=id=>document.getElementById(id);let client=null,starting=false,snapshot=null,day=koreaDay();
function notice(message){$('toast').textContent=message;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),6000)}
const state={getClient:()=>client,onError:notice,onSaved:notice,onDay:d=>document.getElementById(`tab-${Number(d.slice(-2))-17}`)?.click()};
const itinerary=mountItinerary($('day-panel'),null,state),ledger=mountLedger($('ledger-root'),null,state),menu=mountMenu($('menu-root'),null,state,d=>{ledger.setDraft(d);document.getElementById('ledger').scrollIntoView({behavior:'smooth'})});
const fallback={trip:{rates:null},itinerary:window.TRIP.days.flatMap((d,i)=>d.items.map((x,j)=>{const [time,title,detail,type,url,badge,address,extra_links]=x;return {id:`local-${i}-${j}`,date:`2026-10-${17+i}`,original_date:`2026-10-${17+i}`,position:j,time,title,detail,type,url,badge,address,extra_links,completed:false,version:1}})),expenses:[],menus:[],photos:[]};
function render(s){snapshot=s;itinerary.render(s,day);ledger.render(s);menu.render(s)}
window.addEventListener('busan-day',e=>{day=`2026-10-${17+e.detail}`;itinerary.render(snapshot||fallback,day)});
function status(s,message){$('sync-status').textContent=s==='synced'?'☁ 共用資料已同步':s==='connecting'?'☁ 正在連線…':`⚠ ${message||'同步中斷，請重新連線'}`;$('sync-status').classList.toggle('sync-error',s==='error')}
async function start(){if(starting)return;starting=true;$('sync-retry').disabled=true;try{client?.disconnect();client=null;client=await connect(window.BUSAN_CONFIG,render,status);status('synced')}catch(e){status('error',e.message);if(!snapshot)render(fallback)}finally{starting=false;$('sync-retry').disabled=false}}
$('sync-retry').onclick=start;render(fallback);document.getElementById(`tab-${Number(day.slice(-2))-17}`)?.click();start();
