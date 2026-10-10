export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeUrl=u=>/^https?:\/\//i.test(String(u))?u:'#';
export const dayOptions=()=>[17,18,19,20].map(d=>`<option value="2026-10-${d}">10/${d}</option>`).join('');
export const currencies=()=>['KRW','TWD','MOP'].map(c=>`<option value="${c}">${{KRW:'韓幣 KRW',TWD:'台幣 TWD',MOP:'澳門幣 MOP'}[c]}</option>`).join('');
export async function busy(button,fn,onError){if(button?.disabled)return;const text=button?.textContent;if(button){button.disabled=true;button.textContent='處理中…'}try{return await fn()}catch(e){onError?.(e.message);return null}finally{if(button){button.disabled=false;button.textContent=text}}}
export function requireClient(c){if(!c)throw Error('尚未連線，請先設定 Supabase 或按重新連線');if(globalThis.navigator?.onLine===false)throw Error('目前離線，恢復網路後再保存');return c}
export function koreaDay(now=new Date()){const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);return ['2026-10-17','2026-10-18','2026-10-19','2026-10-20'].includes(date)?date:'2026-10-17'}
export function showPhotoViewer(url){
 document.querySelector('[data-photo-viewer]')?.remove();const dialog=document.createElement('dialog');dialog.dataset.photoViewer='';dialog.innerHTML='<button type="button" aria-label="關閉照片">關閉 ✕</button><img alt="照片檢視">';dialog.querySelector('img').src=safeUrl(url);dialog.querySelector('button').onclick=()=>{dialog.close?.();dialog.remove()};dialog.addEventListener('cancel',()=>dialog.remove());document.body.append(dialog);if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');return dialog;
}
