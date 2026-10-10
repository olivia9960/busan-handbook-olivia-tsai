import {convert,toMinor} from './money.mjs?v=dcfc26fdbe14';
export const MENU_AI_PROMPT=`請將我接著提供的菜單圖片或文字，整理成可匯入「釜山旅行網站」的 JSON。
請將菜名翻成繁體中文，保留韓文或其他原文。只輸出一個完整 JSON，不要加說明或 Markdown 表格。
格式必須如下（範例數字不可當成實際菜單）：
{
  "schema_version": 1,
  "title": "餐廳／菜單名稱",
  "items": [
    {
      "original_name": "삼겹살",
      "translated_name": "五花肉",
      "spec": "200g／每份",
      "price": 18000,
      "currency": "KRW",
      "notes": ""
    }
  ]
}
規則：
1. items 每項是可單獨點選的一道菜、套餐或加購。同一道菜不同規格／價格分開列。套餐保持整份，不要把內含品項重複計價。
2. price 是原幣單價，使用數字，不含逗號或貨幣符號。韓幣使用整數；台幣／澳門幣最多兩位小數。currency 只能是 KRW、TWD、MOP。不要自行換匯。
3. 看不清楚、價格不確定或只有時價時，price 填 null，notes 說明待確認；不要猜數字。
4. 加價、換品項、最低點餐、份量與限制寫入 notes。不要把「+3000」誤當成套餐原價；若可單獨勾選加購，另列一項並清楚註明適用條件。
5. 沒有原文可用中文填 original_name。translated_name、spec、notes 都必須是文字，沒有資料填空字串。
6. 排除分類標題、廣告與無法點餐的說明；最多100項。保留價格與品項的正確對應。
請依上面格式處理我接著提供的菜單：`;
function text(value,label,max,optional=false){if(value==null&&optional)return '';if(typeof value!=='string'||value.length>max)throw Error(`${label} 必須是文字，且不可超過 ${max} 字`);return value.trim()}
export function parseMenuImport(input,rates){
 if(typeof input!=='string'||input.length>200000)throw Error('菜單文字不可超過 200,000 字');let source=input.trim().replace(/^\uFEFF/,'');source=source.replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i,'$1');let parsed;
 try{parsed=JSON.parse(source)}catch{throw Error('格式無法讀取：請貼上 AI 按模板輸出的完整 JSON，或上傳 UTF-8 的 .json／.txt 檔')}
 if(!parsed||Array.isArray(parsed)||parsed.schema_version!==1)throw Error('請使用網站模板，schema_version 必須是 1');
 const title=text(parsed.title,'菜單名稱',200);if(!title)throw Error('請填菜單名稱');
 if(!Array.isArray(parsed.items)||!parsed.items.length||parsed.items.length>100)throw Error('菜單需包含 1–100 項');
 const items=parsed.items.map((row,index)=>{try{
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('資料必須是物件');
  const original=text(row.original_name,'原菜名',1000),translated=text(row.translated_name,'中文菜名',1000,true);if(!original&&!translated)throw Error('請填原菜名或中文');
  const spec=text(row.spec,'規格',1000,true),notes=text(row.notes,'備註',1000,true),currency=row.currency||'KRW';if(!['KRW','TWD','MOP'].includes(currency))throw Error('幣別需為 KRW、TWD、MOP');
  let price=null;if(row.price!==null){if(typeof row.price!=='number'||!Number.isFinite(row.price))throw Error('price 請用數字；未知價格請填 null');toMinor(row.price,currency);price=Math.round(convert(row.price,currency,'KRW',rates));if(price<1||price>100000000000)throw Error('換算金額超出範圍')}
  const originalPrice=currency!=='KRW'&&price!==null?`原價 ${row.price} ${currency}；依匯入時匯率換算韓幣`:'';
  return {id:crypto.randomUUID(),original_name:original||translated,translated_name:translated,spec:[spec,notes,originalPrice].filter(Boolean).join('；'),price_minor:price,confirmed:false,selected:false,quantity:1};
 }catch(e){throw Error(`第 ${index+1} 項：${e.message}`)}});
 return {title,items};
}
