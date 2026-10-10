import {parseReceipt,parseMenu,validatePhoto} from './ocr-parser.mjs?v=805c8568b1ec';
import {translateMenuLocally} from './dish-dictionary.mjs?v=805c8568b1ec';
const base=new URL('../vendor/ocr/',import.meta.url);let loading=null,running=false;
async function loadEngine(){
 if(globalThis.Tesseract?.createWorker)return globalThis.Tesseract;
 if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('tesseract.min.js',base).href;s.onload=()=>globalThis.Tesseract?.createWorker?resolve(globalThis.Tesseract):reject(Error('辨識程式載入失敗'));s.onerror=()=>reject(Error('無法載入辨識程式，請檢查 vendor/ocr 是否已完整上傳'));document.head.append(s)}).catch(e=>{loading=null;throw e});
 return loading;
}
export async function readImageLocally(blob,onProgress=()=>{}){
 const engine=await loadEngine();let worker,expired=false,timer;
 const task=(async()=>{
  worker=await engine.createWorker('kor+eng',1,{workerPath:new URL('worker.min.js',base).href,corePath:new URL('tesseract-core-lstm.wasm.js',base).href,langPath:new URL('lang/',base).href.replace(/\/$/,''),workerBlobURL:false,logger:m=>{
   const label=m.status==='recognizing text'?'正在辨識文字':m.status.includes('language')?'正在載入韓文／英文模型':'正在準備辨識';
   onProgress(`${label}… ${Math.round((m.progress||0)*100)}%`);
  }});
  if(expired){await worker.terminate();throw Error('辨識逾時')}
  const {data}=await worker.recognize(blob);return {text:data.text,confidence:data.confidence};
 })();
 try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('辨識超過 150 秒，請分區拍攝或手動輸入'))},150000)})])}
 finally{clearTimeout(timer);if(worker)try{await worker.terminate()}catch{}}
}
function receiptLines(text){const lines=text.split('\n');return lines.map((line,i)=>/합\s*계|총\s*액|결제\s*금액|total|결제액/i.test(line)&&!/[0-9]/.test(line)&&/^\s*(?:₩\s*)?[\d,]+\s*(?:원)?\s*$/.test(lines[i+1]||'')?line+' '+lines[i+1]:line).join('\n')}
export async function recognizeLocally(blob,mode,onProgress=()=>{},engine=readImageLocally){
 validatePhoto(blob);if(!['receipt','menu'].includes(mode))throw Error('不支援的辨識類型');if(running)throw Error('另一張照片辨識中，請完成後再試');running=true;
 try{onProgress('首次辨識需要載入模型，請稍候…');const data=await engine(blob,onProgress);const text=String(data.text||'').trim();if(!text)throw Error('未辨識到文字，請拍清楚、分區拍攝，或手動輸入');
  if(mode==='receipt'){const result=parseReceipt(receiptLines(text));return {...result,text,uncertain:result.uncertain||data.confidence<60,engine:'local',confidence:data.confidence}}
  const items=translateMenuLocally(parseMenu(text));const unknown=items.filter(x=>!x.translated_name).length;
  return {text,items,engine:'local',confidence:data.confidence,translationWarning:`已用本機辨識與內建菜名詞庫；${unknown?'有 '+unknown+' 項中文待補填。':'中文僅供參考。'}請對照原圖核對品項、規格與價格。`};
 }finally{running=false}
}
