import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from "recharts";

/* ── TOKENS ──────────────────────────────────────────────────────── */
const C={bg:"#060c18",bg2:"#08101f",card:"#0b1628",card2:"#0d1a30",border:"rgba(255,255,255,0.07)",border2:"rgba(255,255,255,0.13)",o:"#FF6B00",oG:"rgba(255,107,0,0.1)",t:"#dde3f0",t2:"#5a7090",t3:"#2e4060",g:"#22c55e",gG:"rgba(34,197,94,0.1)",y:"#f59e0b",yG:"rgba(245,158,11,0.1)",r:"#ef4444",rG:"rgba(239,68,68,0.1)",b:"#3b82f6",bG:"rgba(59,130,246,0.1)",p:"#8b5cf6"};
const M="'IBM Plex Mono',monospace",S="'IBM Plex Sans',sans-serif";

/* ── OBD DB ──────────────────────────────────────────────────────── */
const OBD_DB={P0171:{title:"Смесь бедная (банк 1)",system:"Топливная система",danger:"средний",can_drive:true,desc:"Бедная топливно-воздушная смесь.",price_min:2000,price_max:15000,price_comment:"Диагностика",actions:["Проверьте патрубки на подсосы","Замените фильтр","Промойте форсунки"]},P0300:{title:"Пропуск воспламенения",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Случайные пропуски зажигания.",price_min:3000,price_max:25000,price_comment:"Диагностика зажигания",actions:["Замените свечи","Проверьте форсунки","Диагностика компрессии"]},P0301:{title:"Пропуск воспл. цил. №1",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Пропуск зажигания в 1-м цилиндре.",price_min:2000,price_max:20000,price_comment:"Свеча/катушка/форсунка",actions:["Замените свечу №1","Проверьте катушку","Проверьте форсунку"]},P0302:{title:"Пропуск воспл. цил. №2",system:"Двигатель",danger:"высокий",can_drive:false,desc:"Пропуск зажигания во 2-м цилиндре.",price_min:2000,price_max:20000,price_comment:"Свеча/катушка/форсунка",actions:["Замените свечу №2","Переставьте катушки","Проверьте компрессию"]},P0420:{title:"КПД катализатора",system:"Выхлопная система",danger:"низкий",can_drive:true,desc:"Эффективность катализатора снижена.",price_min:5000,price_max:60000,price_comment:"Диагностика катализатора",actions:["Проверьте лямбда-зонды","Присадка для катализатора","При необходимости — замена"]},P0440:{title:"Утечка паров топлива",system:"Топливная система",danger:"низкий",can_drive:true,desc:"Система EVAP не держит давление.",price_min:500,price_max:8000,price_comment:"Крышка бака или шланги",actions:["Проверьте крышку бака","Проверьте шланги EVAP","Диагностика клапана"]},P0700:{title:"Неисправность АКПП",system:"Трансмиссия",danger:"высокий",can_drive:false,desc:"Блок АКПП зафиксировал неисправность.",price_min:5000,price_max:80000,price_comment:"Диагностика АКПП",actions:["Проверьте масло АКПП","Обратитесь в сервис","Не перегружайте"]},C0035:{title:"Датчик ABS",system:"Тормоза",danger:"высокий",can_drive:false,desc:"Нет сигнала от датчика ABS.",price_min:1500,price_max:8000,price_comment:"Замена датчика ABS",actions:["Ездите осторожно","Проверьте проводку","Замените датчик"]}};

/* ── BODY PANELS ─────────────────────────────────────────────────── */
const PANEL_STATUS=[{id:"ok",label:"НОРМА",color:C.g,icon:"✓"},{id:"scratch",label:"ЦАРАПИНА",color:C.y,icon:"∼"},{id:"dent",label:"ВМЯТИНА",color:C.o,icon:"◎"},{id:"repair",label:"РЕМОНТ",color:C.r,icon:"⚠"},{id:"fixed",label:"ГОТОВО",color:C.b,icon:"✔"}];
const PS=Object.fromEntries(PANEL_STATUS.map(s=>[s.id,s]));
const nextStatus=cur=>{const i=PANEL_STATUS.findIndex(s=>s.id===cur);return PANEL_STATUS[(i+1)%PANEL_STATUS.length].id;};
const BODY_PANELS=[{id:"bumper_f",name:"Передний бампер",path:"M 55,10 L 145,10 L 150,35 L 50,35 Z"},{id:"hood",name:"Капот",path:"M 50,35 L 150,35 L 148,110 L 52,110 Z"},{id:"fender_fl",name:"Крыло пер. лев.",path:"M 30,40 L 52,40 L 52,110 L 30,110 Z"},{id:"fender_fr",name:"Крыло пер. прав.",path:"M 148,40 L 170,40 L 170,110 L 148,110 Z"},{id:"windshield_f",name:"Лобовое стекло",path:"M 52,110 L 148,110 L 145,140 L 55,140 Z"},{id:"door_fl",name:"Дверь пер. лев.",path:"M 28,112 L 52,112 L 52,195 L 28,195 Z"},{id:"door_fr",name:"Дверь пер. прав.",path:"M 148,112 L 172,112 L 172,195 L 148,195 Z"},{id:"roof",name:"Крыша",path:"M 55,140 L 145,140 L 145,230 L 55,230 Z"},{id:"door_rl",name:"Дверь зад. лев.",path:"M 28,195 L 52,195 L 52,270 L 28,270 Z"},{id:"door_rr",name:"Дверь зад. прав.",path:"M 148,195 L 172,195 L 172,270 L 148,270 Z"},{id:"windshield_r",name:"Заднее стекло",path:"M 55,230 L 145,230 L 148,260 L 52,260 Z"},{id:"quarter_l",name:"Крыло зад. лев.",path:"M 28,270 L 52,270 L 52,345 L 30,345 Z"},{id:"quarter_r",name:"Крыло зад. прав.",path:"M 148,270 L 172,270 L 170,345 L 148,345 Z"},{id:"trunk",name:"Крышка багажника",path:"M 52,260 L 148,260 L 150,345 L 50,345 Z"},{id:"bumper_r",name:"Задний бампер",path:"M 50,345 L 150,345 L 145,370 L 55,370 Z"},{id:"wheel_fl",name:"Колесо пер. лев.",path:"M 8,55 L 28,55 L 28,105 L 8,105 Z",wheel:true},{id:"wheel_fr",name:"Колесо пер. прав.",path:"M 172,55 L 192,55 L 192,105 L 172,105 Z",wheel:true},{id:"wheel_rl",name:"Колесо зад. лев.",path:"M 8,250 L 28,250 L 28,300 L 8,300 Z",wheel:true},{id:"wheel_rr",name:"Колесо зад. прав.",path:"M 172,250 L 192,250 L 192,300 L 172,300 Z",wheel:true}];
const DEF_BODY=Object.fromEntries(BODY_PANELS.map(p=>[p.id,{status:"ok",note:""}]));

/* ── DEFAULTS ────────────────────────────────────────────────────── */
const DEF_TIRES={fl:{pos:"Перед лев.",pressure:2.2,target:2.2,temp:18},fr:{pos:"Перед прав.",pressure:2.2,target:2.2,temp:18},rl:{pos:"Зад лев.",pressure:2.1,target:2.1,temp:18},rr:{pos:"Зад прав.",pressure:2.1,target:2.1,temp:18}};
const DEF_CAR={id:"car1",make:"Toyota",model:"Camry",year:2019,mileage:52400,color:"Белый перламутр",fuel:"АИ-95",vin:"",plate:""};
const DEF_SVC=[{id:1,name:"Моторное масло",icon:"🛢",lastKm:45000,lastDate:"2025-02-10",intervalKm:10000,intervalMo:12,status:"ok",history:[]},{id:2,name:"Воздушный фильтр",icon:"💨",lastKm:38000,lastDate:"2024-10-15",intervalKm:20000,intervalMo:18,status:"ok",history:[]},{id:3,name:"Тормозная жидкость",icon:"🔴",lastKm:28000,lastDate:"2022-08-01",intervalKm:40000,intervalMo:24,status:"overdue",history:[]},{id:4,name:"Тормозные колодки",icon:"⬛",lastKm:40000,lastDate:"2024-08-20",intervalKm:40000,intervalMo:36,status:"ok",history:[]},{id:5,name:"Свечи зажигания",icon:"⚡",lastKm:20000,lastDate:"2022-05-10",intervalKm:30000,intervalMo:36,status:"overdue",history:[]},{id:6,name:"Антифриз",icon:"🧊",lastKm:30000,lastDate:"2023-03-15",intervalKm:60000,intervalMo:24,status:"warning",history:[]},{id:7,name:"АКПП масло",icon:"⚙️",lastKm:30000,lastDate:"2023-03-01",intervalKm:60000,intervalMo:48,status:"ok",history:[]},{id:8,name:"Салонный фильтр",icon:"🌬",lastKm:42000,lastDate:"2024-12-01",intervalKm:15000,intervalMo:12,status:"warning",history:[]}];
const DEF_EXP=[{id:1,date:"2025-05-10",cat:"топливо",amount:3200,note:"АЗС Лукойл"},{id:2,date:"2025-04-18",cat:"сервис",amount:4500,note:"Замена масла"},{id:3,date:"2025-04-03",cat:"топливо",amount:2900,note:"АЗС Shell"},{id:4,date:"2025-03-20",cat:"страховка",amount:18000,note:"КАСКО 2025"},{id:5,date:"2025-03-12",cat:"топливо",amount:3100,note:"АЗС Газпром"},{id:6,date:"2025-02-28",cat:"запчасти",amount:2200,note:"Щётки"},{id:7,date:"2025-01-22",cat:"топливо",amount:3400,note:"АЗС BP"}];
const DEF_FUEL=[{id:1,date:"2025-05-10",liters:45,cost:3200,odometer:52400,station:"АЗС Лукойл"},{id:2,date:"2025-04-03",liters:42,cost:2900,odometer:51650,station:"АЗС Shell"},{id:3,date:"2025-01-22",liters:47,cost:3400,odometer:49800,station:"АЗС BP"}];
const DEF_DOCS=[{id:1,name:"ОСАГО",icon:"📄",expires:"2025-11-15",note:"Ингосстрах"},{id:2,name:"КАСКО",icon:"🛡",expires:"2026-01-20",note:"АльфаСтрахование"},{id:3,name:"Техосмотр",icon:"🔍",expires:"2025-08-01",note:"2 года"},{id:4,name:"Права",icon:"🪪",expires:"2030-05-14",note:"Категория B"}];
const DEF_APPTS=[];
const DEF_NOTIFS=[];
const CAT_CLR={топливо:C.o,сервис:C.b,страховка:C.p,запчасти:C.y,штрафы:C.r,прочее:C.t2};
const AUTO_TIPS=[{icon:"🛢",tip:"Проверьте уровень масла — 2 минуты и вы защищаете двигатель стоимостью 200+ тысяч."},{icon:"💨",tip:"Правильное давление в шинах снижает расход топлива до 3% и продлевает срок службы резины."},{icon:"💧",tip:"Охлаждающая жидкость. Перегрев двигателя = ремонт на 100-300 тысяч рублей."},{icon:"🔦",tip:"Проверьте все фонари. Неработающий стоп-сигнал — штраф и угроза безопасности."},{icon:"⚡",tip:"Изношенные свечи увеличивают расход топлива до 15% и снижают мощность."},{icon:"🛞",tip:"Дисбаланс колёс ускоряет износ подвески. Балансировка — 500-800 ₽ за колесо."},{icon:"🔴",tip:"Скрипящие тормоза — сигнал износа колодок. Это вопрос вашей безопасности."},{icon:"🌬",tip:"Забитый салонный фильтр снижает КПД кондиционера и качество воздуха в салоне."}];
const REGION_OSAGO={"Москва":{coef:2.0,min:9000,max:44000},"Санкт-Петербург":{coef:1.8,min:8100,max:39600},"Московская область":{coef:1.7,min:7650,max:37400},"Краснодарский край":{coef:1.3,min:5850,max:28600},"Свердловская область":{coef:1.4,min:6300,max:30800},"Татарстан":{coef:1.3,min:5850,max:28600},"Новосибирская область":{coef:1.2,min:5400,max:26400},"default":{coef:1.0,min:4500,max:22000}};

/* ── HOOKS ───────────────────────────────────────────────────────── */
function usePersist(key,init){const[v,setV]=useState(()=>{try{const s=localStorage.getItem("ja7_"+key);return s?JSON.parse(s):init}catch{return init}});const set=useCallback(fn=>setV(prev=>{const next=typeof fn==="function"?fn(prev):fn;try{localStorage.setItem("ja7_"+key,JSON.stringify(next))}catch{}return next}),[key]);return[v,set];}
function useToast(){const[toasts,setToasts]=useState([]);const show=useCallback((msg,type="info",dur=3000)=>{const id=Date.now();setToasts(p=>[...p,{id,msg,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),dur);},[]);return{toasts,show};}
function useGeo(){const[geo,setGeo]=usePersist("geo",null);const[loading,setLoading]=useState(false);const[err,setErr]=useState(null);const request=useCallback(()=>{if(!navigator.geolocation){setErr("Не поддерживается");return;}setLoading(true);setErr(null);navigator.geolocation.getCurrentPosition(async pos=>{try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&accept-language=ru`,{headers:{"User-Agent":"JarvisAuto/1.0"}});const d=await r.json();setGeo({region:d.address?.state||d.address?.region||null,city:d.address?.city||d.address?.town||null,lat:pos.coords.latitude,lon:pos.coords.longitude,ts:Date.now()});}catch{setGeo({lat:pos.coords.latitude,lon:pos.coords.longitude,ts:Date.now()});}setLoading(false);},()=>{setErr("Доступ запрещён");setLoading(false);},{timeout:8000,maximumAge:3600000});},[setGeo]);return{geo,loading,err,request};}

/* ── SERVICE UTILS ───────────────────────────────────────────────── */
function calcSvcStatus(svc,mileage){const kmUsed=mileage-svc.lastKm;const moUsed=(Date.now()-new Date(svc.lastDate))/(1000*60*60*24*30);const kmPct=kmUsed/svc.intervalKm;const moPct=svc.intervalMo>0?moUsed/svc.intervalMo:0;const worst=Math.max(kmPct,moPct);if(worst>=1)return"overdue";if(worst>=0.85)return"warning";return"ok";}
function recalcAll(svcs,mileage){return svcs.map(s=>({...s,status:calcSvcStatus(s,mileage)}));}
const calcHealth=s=>Math.max(0,Math.min(100,100-s.filter(x=>x.status==="overdue").length*18-s.filter(x=>x.status==="warning").length*8));

/* ── AI ──────────────────────────────────────────────────────────── */
const DIAG_SYS=`Ты — Джарвис, ИИ-диагност. Только русский. JSON без markdown:
{"title":"до 6 слов","system":"Двигатель|Трансмиссия|Тормоза|Электроника|Подвеска|Топливная система|Охлаждение|Выхлопная","description":"2-3 предложения без жаргона","danger":"низкий|средний|высокий","danger_reason":"1 предложение","can_drive":true|false,"urgency":"сегодня|3 дня|1 неделя|1 месяц","price_min":число,"price_max":число,"price_comment":"что входит","actions":["шаг1","шаг2","шаг3"],"parts":["деталь1"]}
Если не авто — {"error":"Введите код ошибки OBD-II или симптом."}`;
const TIPS_SYS=`Ты — Джарвис, автоэксперт-друг. Русский. Дружелюбно, конкретно, 3-4 абзаца.`;
const FIND_SYS=`Создай 4 реалистичных демо-сервиса. JSON:{"tip":"совет","results":[{"name":"","type":"","address":"","rating":4.5,"reviews":100,"price":"от 500 ₽","phone":"+7 (900) 000-00-00","hours":"9:00–21:00","wait":"~20 мин","tags":["быстро"]}]}`;
async function ai(sys,msg,max=1000){const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:max,system:sys,messages:[{role:"user",content:msg}]})});const d=await r.json();return d.content?.find(b=>b.type==="text")?.text||"{}";}

/* ── UTILS ───────────────────────────────────────────────────────── */
const rub=n=>(n||0).toLocaleString("ru-RU")+" ₽";
const sCfg={ok:{color:C.g,bg:C.gG,label:"OK",icon:"✓"},warning:{color:C.y,bg:C.yG,label:"СКОРО",icon:"⚠"},overdue:{color:C.r,bg:C.rG,label:"ПРОСРОЧЕНО",icon:"✗"}};
const dCfg={"низкий":{color:C.g,bg:C.gG,label:"НИЗКИЙ"},"средний":{color:C.y,bg:C.yG,label:"СРЕДНИЙ"},"высокий":{color:C.r,bg:C.rG,label:"ВЫСОКИЙ"}};
const urgClr={"сегодня":C.r,"3 дня":C.r,"1 неделя":C.y,"1 месяц":C.g};
const daysUntil=d=>Math.round((new Date(d)-new Date())/86400000);
const docStatus=d=>{const days=daysUntil(d);return days<0?"overdue":days<30?"warning":"ok";};
const fmtPlate=v=>v.toUpperCase().replace(/[^А-ЯA-Z0-9]/g,"").slice(0,9);
const fmtVin=v=>v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,17);
const getRegionOsago=r=>{if(!r)return REGION_OSAGO.default;const k=Object.keys(REGION_OSAGO).find(k=>r.includes(k)||k.includes(r));return k?REGION_OSAGO[k]:REGION_OSAGO.default;};
const tirePressureStatus=p=>{if(p<1.6||p>3.0)return{color:C.r,label:"КРИТИЧНО"};if(p<1.9||p>2.6)return{color:C.y,label:"НИЗКОЕ"};return{color:C.g,label:"НОРМА"};};

/* ── ATOMS ───────────────────────────────────────────────────────── */
function Ring({val,max=100,size=108,sw=9,color,children}){const R=(size-sw)/2,C2=2*Math.PI*R,pct=Math.min(val/max,1);return<div style={{position:"relative",width:size,height:size}}><svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}><circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${pct*C2} ${C2}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{children}</div></div>;}
function Badge({n,color=C.r}){if(!n)return null;return<div style={{position:"absolute",top:-5,right:-5,minWidth:17,height:17,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:`2px solid ${C.bg}`}}><span style={{fontSize:8,color:"white",fontWeight:700,fontFamily:M}}>{n>9?"9+":n}</span></div>;}
const Pill=({children,color=C.o})=><span style={{fontSize:9,fontWeight:700,letterSpacing:.8,padding:"2px 9px",borderRadius:20,background:color+"20",color,fontFamily:M,whiteSpace:"nowrap"}}>{children}</span>;
const Card=({children,style={},onClick})=><div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",...style,cursor:onClick?"pointer":"default"}}>{children}</div>;
const Lbl=({children,color=C.t2,mb=8,style={}})=><div style={{fontSize:10,color,letterSpacing:2.5,fontFamily:M,marginBottom:mb,...style}}>{children}</div>;
function Input({value,onChange,placeholder,type="text",style={},maxLength,onKeyDown}){return<input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} maxLength={maxLength} style={{width:"100%",padding:"11px 14px",fontSize:13,fontFamily:M,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:9,color:C.t,outline:"none",boxSizing:"border-box",...style}} onFocus={e=>e.target.style.borderColor=C.o} onBlur={e=>e.target.style.borderColor=C.border}/>;}
function PBtn({children,onClick,disabled,full,color=C.o,style={}}){return<button onClick={onClick} disabled={disabled} style={{padding:"12px 20px",background:disabled?C.card2:color,color:disabled?C.t3:"white",border:"none",borderRadius:10,fontSize:12,fontFamily:M,fontWeight:700,cursor:disabled?"not-allowed":"pointer",letterSpacing:1,width:full?"100%":undefined,opacity:disabled ? 0.5 : 1,...style}} onMouseEnter={e=>!disabled&&(e.currentTarget.style.opacity=".85")} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;}
function GBtn({children,onClick,full,style={}}){return<button onClick={onClick} style={{padding:"10px 18px",background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11,fontFamily:M,cursor:"pointer",letterSpacing:1,width:full?"100%":undefined,...style}}>{children}</button>;}
function Spinner(){return<div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:28,color:C.o,display:"inline-block",animation:"spin 1.4s linear infinite"}}>⚙</div><div style={{marginTop:14,fontSize:10,color:C.t2,letterSpacing:3,fontFamily:M}}>ОБРАБОТКА...</div></div>;}
function Toasts({toasts}){const tc={success:C.g,error:C.r,info:C.o,tip:C.b};return<div style={{position:"fixed",top:66,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:608,zIndex:999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>{toasts.map(t=><div key={t.id} style={{background:C.card2,border:`1px solid ${tc[t.type]||C.o}50`,borderRadius:10,padding:"10px 16px",fontSize:13,color:C.t,fontFamily:S,display:"flex",gap:10,alignItems:"center",animation:"fadeUp .3s ease",boxShadow:"0 4px 24px rgba(0,0,0,.5)"}}><div style={{width:6,height:6,borderRadius:"50%",background:tc[t.type]||C.o,flexShrink:0}}/>{t.msg}</div>)}</div>;}
function BackHeader({title,onBack,right}){return<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}><button onClick={onBack} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:20,padding:0,lineHeight:1}}>←</button><div style={{fontSize:16,fontWeight:700,color:C.t,fontFamily:S,flex:1}}>{title}</div>{right}</div>;}
function ProgressBar({remaining,color}){const pct=Math.max(0,Math.min(1,remaining));const c=pct>0.5?C.g:pct>0.2?C.y:C.r;return<div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2}}><div style={{height:4,background:c,borderRadius:2,width:`${pct*100}%`,transition:"width .7s cubic-bezier(.4,0,.2,1)"}}/></div>;}
function TipCard({tip,onClose}){if(!tip)return null;return<div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:480,zIndex:200,animation:"fadeUp .4s ease"}}><div style={{background:C.card2,border:`1px solid ${C.b}40`,borderRadius:14,padding:"16px 18px",boxShadow:`0 8px 32px rgba(0,0,0,.7)`}}><div style={{display:"flex",gap:12,alignItems:"flex-start"}}><span style={{fontSize:22,flexShrink:0}}>{tip.icon}</span><div style={{flex:1}}><div style={{fontSize:10,color:C.b,fontFamily:M,letterSpacing:1.5,marginBottom:6}}>💡 СОВЕТ ДЖАРВИСА</div><div style={{fontSize:13,color:C.t,fontFamily:S,lineHeight:1.6}}>{tip.tip}</div></div><button onClick={onClose} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,flexShrink:0}}>×</button></div></div></div>;}

/* ── TIRE PRESSURE TRACKER ───────────────────────────────────────── */
function TireTracker({tires,setTires,toast}){
  const[editing,setEditing]=useState(null);
  const[val,setVal]=useState("");
  const positions=[{key:"fl",x:30,y:30,label:"Пер. лев."},{key:"fr",x:140,y:30,label:"Пер. прав."},{key:"rl",x:30,y:120,label:"Зад. лев."},{key:"rr",x:140,y:120,label:"Зад. прав."}];
  const allOk=Object.values(tires).every(t=>tirePressureStatus(t.pressure).label==="НОРМА");
  const savePressure=()=>{const p=parseFloat(val);if(isNaN(p)||p<0.5||p>5){toast("Введите значение от 0.5 до 5.0 бар","error");return;}setTires(prev=>({...prev,[editing]:{...prev[editing],pressure:p,lastCheck:new Date().toISOString().slice(0,10)}}));toast(`${tires[editing]?.pos}: ${p} бар`,"success");setEditing(null);setVal("");};

  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Status summary */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <Card style={{background:allOk?`${C.g}08`:`${C.r}08`,borderColor:allOk?`${C.g}25`:`${C.r}25`}}>
        <Lbl mb={4} color={allOk?C.g:C.r}>СОСТОЯНИЕ ШИН</Lbl>
        <div style={{fontSize:18,fontWeight:700,color:allOk?C.g:C.r,fontFamily:M}}>{allOk?"НОРМА":"ВНИМАНИЕ"}</div>
      </Card>
      <Card>
        <Lbl mb={4}>ПОСЛЕДНЯЯ ПРОВЕРКА</Lbl>
        <div style={{fontSize:13,fontWeight:700,color:C.t,fontFamily:M}}>{Object.values(tires).find(t=>t.lastCheck)?.lastCheck||"—"}</div>
      </Card>
    </div>

    {/* Visual car + pressure */}
    <Card>
      <Lbl>ДАВЛЕНИЕ В ШИНАХ (бар)</Lbl>
      <div style={{position:"relative",width:"100%",maxWidth:300,margin:"0 auto"}}>
        <svg viewBox="0 0 200 170" style={{width:"100%",height:"auto"}}>
          {/* Car body outline */}
          <rect x="45" y="45" width="110" height="80" rx="8" fill={C.card2} stroke={C.border2} strokeWidth="1.5"/>
          <rect x="55" y="35" width="90" height="30" rx="6" fill={C.card2} stroke={C.border2} strokeWidth="1"/>
          {/* Windshields */}
          <rect x="60" y="37" width="80" height="26" rx="4" fill="rgba(59,130,246,0.15)" stroke={C.b+"30"} strokeWidth="1"/>
          {/* Center */}
          <text x="100" y="90" textAnchor="middle" fontSize="9" fill={C.t2} fontFamily="monospace">КУЗОВ</text>
          {/* Tire circles */}
          {positions.map(({key,x,y,label})=>{
            const t=tires[key];const st=tirePressureStatus(t.pressure);
            return<g key={key} style={{cursor:"pointer"}} onClick={()=>{setEditing(key);setVal(String(t.pressure));}}>
              <circle cx={x+20} cy={y+20} r="18" fill={st.color+"25"} stroke={st.color} strokeWidth="2"/>
              <text x={x+20} y={y+16} textAnchor="middle" fontSize="11" fontWeight="700" fill={st.color} fontFamily="monospace">{t.pressure}</text>
              <text x={x+20} y={y+27} textAnchor="middle" fontSize="7" fill={C.t2} fontFamily="monospace">бар</text>
              <text x={x+20} y={y+38} textAnchor="middle" fontSize="7" fill={C.t2} fontFamily="monospace">{label}</text>
            </g>;
          })}
        </svg>
      </div>
      <div style={{fontSize:11,color:C.t2,fontFamily:S,textAlign:"center",marginTop:4}}>Нажмите на колесо чтобы обновить давление</div>
    </Card>

    {/* Edit pressure */}
    {editing&&<Card style={{borderLeft:`3px solid ${C.o}`,animation:"fadeUp .2s ease"}}>
      <Lbl>ОБНОВИТЬ ДАВЛЕНИЕ — {tires[editing]?.pos}</Lbl>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        <Input type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="2.2" style={{flex:1,fontSize:18,textAlign:"center"}} onKeyDown={e=>e.key==="Enter"&&savePressure()}/>
        <PBtn onClick={savePressure} color={C.g} style={{padding:"10px 16px",fontSize:14}}>✓</PBtn>
        <GBtn onClick={()=>setEditing(null)}>✗</GBtn>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[1.8,2.0,2.1,2.2,2.3,2.4,2.5].map(v=><button key={v} onClick={()=>setVal(String(v))} style={{padding:"4px 10px",fontSize:12,fontFamily:M,background:C.oG,color:C.o,border:`1px solid ${C.o}30`,borderRadius:6,cursor:"pointer"}}>{v}</button>)}
      </div>
      <div style={{fontSize:11,color:C.t2,fontFamily:S,marginTop:8}}>Рекомендуемое: {tires[editing]?.target} бар · Норма: 1.9–2.5 бар</div>
    </Card>}

    {/* Tire detail list */}
    <Card>
      <Lbl>ДЕТАЛИ ПО КАЖДОМУ КОЛЕСУ</Lbl>
      {Object.entries(tires).map(([key,t],i,arr)=>{
        const st=tirePressureStatus(t.pressure);
        return<div key={key} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:st.color+"15",border:`2px solid ${st.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:700,color:st.color,fontFamily:M}}>{t.pressure}</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,color:C.t,fontFamily:S,fontWeight:500}}>{t.pos}</div>
            <div style={{fontSize:11,color:C.t2,fontFamily:M}}>норма: {t.target} · {t.lastCheck||"не проверялось"}</div>
          </div>
          <Pill color={st.color}>{st.label}</Pill>
          <button onClick={()=>{setEditing(key);setVal(String(t.pressure));}} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:16,padding:"0 4px"}}>✎</button>
        </div>;
      })}
    </Card>

    {/* Quick tip */}
    <Card style={{background:`${C.b}08`,borderColor:`${C.b}25`,display:"flex",gap:10,alignItems:"flex-start",padding:"14px 16px"}}>
      <span style={{fontSize:18}}>💡</span>
      <div style={{fontSize:12,color:C.t2,fontFamily:S,lineHeight:1.6}}>Давление падает на ~0.1 бар каждые 10°C. Зимой проверяйте еженедельно. Не качайте холодные шины выше нормы — при нагреве давление вырастет.</div>
    </Card>
  </div>;
}

/* ── GARAGE (multi-car) ──────────────────────────────────────────── */
function Garage({cars,activeCar,setActiveCar,addCar,removeCar,onBack,toast}){
  const[adding,setAdding]=useState(false);
  const[form,setForm]=useState({make:"",model:"",year:new Date().getFullYear()-3,mileage:50000,color:"",fuel:"АИ-95",vin:"",plate:""});
  const save=()=>{if(!form.make||!form.model)return;addCar({...form,year:+form.year,mileage:+form.mileage,id:"car_"+Date.now()});setAdding(false);setForm({make:"",model:"",year:new Date().getFullYear()-3,mileage:50000,color:"",fuel:"АИ-95",vin:"",plate:""});toast("Автомобиль добавлен","success");};
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Мой гараж" onBack={onBack}/>
    <Card style={{background:`${C.o}06`,borderColor:`${C.o}20`,padding:"10px 16px",display:"flex",gap:10,alignItems:"center"}}><span>🚗</span><div style={{fontSize:11,color:C.t2,fontFamily:S}}>{cars.length} {cars.length===1?"автомобиль":"автомобиля"} в гараже · Активный выделен оранжевым</div></Card>
    {cars.map(car=><Card key={car.id} onClick={()=>{setActiveCar(car.id);toast(`Активен: ${car.make} ${car.model}`,"success");onBack();}} style={{borderColor:activeCar===car.id?`${C.o}60`:C.border,background:activeCar===car.id?`${C.o}06`:C.card,cursor:"pointer"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
            <div style={{fontSize:15,fontWeight:700,color:C.t,fontFamily:S}}>{car.make} {car.model}</div>
            {activeCar===car.id&&<Pill color={C.o}>АКТИВНЫЙ</Pill>}
          </div>
          <div style={{fontSize:12,color:C.t2,fontFamily:M}}>{car.year} · {car.mileage?.toLocaleString()} км · {car.fuel}</div>
          {car.plate&&<div style={{marginTop:4,display:"inline-flex",padding:"2px 8px",background:`${C.o}15`,border:`1px solid ${C.o}30`,borderRadius:5}}><span style={{fontSize:11,fontWeight:700,color:C.o,fontFamily:M}}>{car.plate}</span></div>}
        </div>
        {cars.length>1&&<button onClick={e=>{e.stopPropagation();if(window.confirm(`Удалить ${car.make} ${car.model}?`))removeCar(car.id);}} style={{background:"none",border:"none",color:C.r,cursor:"pointer",fontSize:16,padding:"0 4px"}}>🗑</button>}
      </div>
    </Card>)}
    {adding?<Card>
      <Lbl>НОВЫЙ АВТОМОБИЛЬ</Lbl>
      {[["МАРКА","make","text","Kia"],["МОДЕЛЬ","model","text","Rio"],["ГОД","year","number","2021"],["ПРОБЕГ (КМ)","mileage","number","30000"],["ЦВЕТ","color","text","Синий"],["ГОС. НОМЕР","plate","text","В456ГД77"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:t==="number"?+e.target.value:k==="plate"?fmtPlate(e.target.value):e.target.value}))}/></div>)}
      <div style={{marginBottom:14}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:7,fontFamily:M}}>ТОПЛИВО</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["АИ-92","АИ-95","АИ-98","Дизель","Газ"].map(f=><button key={f} onClick={()=>setForm(p=>({...p,fuel:f}))} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:form.fuel===f?C.oG:"transparent",color:form.fuel===f?C.o:C.t2,border:`1px solid ${form.fuel===f?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{f}</button>)}</div></div>
      <div style={{display:"flex",gap:8}}><PBtn full onClick={save} disabled={!form.make||!form.model}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
    </Card>:<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ АВТОМОБИЛЬ</button>}
  </div>;
}

/* ── APPOINTMENT BOOKING ─────────────────────────────────────────── */
function Appointments({appts,setAppts,toast,car,geo}){
  const[adding,setAdding]=useState(false);
  const[form,setForm]=useState({date:"",time:"",service:"",shop:"",phone:"",note:""});
  const services_list=["Замена масла","Диагностика","Шиномонтаж","ТО плановое","Ремонт тормозов","Кузовной ремонт","Замена фильтров","Другое"];
  const addAppt=()=>{if(!form.date||!form.service)return;setAppts(p=>[{...form,id:Date.now(),carPlate:car.plate,car:`${car.make} ${car.model}`},...p]);setAdding(false);setForm({date:"",time:"",service:"",shop:"",phone:"",note:""});toast("Запись добавлена","success");};
  const delAppt=id=>{setAppts(p=>p.filter(a=>a.id!==id));toast("Запись удалена","info");};
  const upcoming=appts.filter(a=>new Date(a.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const past=appts.filter(a=>new Date(a.date)<new Date()).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Записи в сервис" onBack={null}/>
    {/* Upcoming */}
    {upcoming.length>0&&<Card style={{background:`${C.g}06`,borderColor:`${C.g}20`}}>
      <Lbl color={C.g}>ПРЕДСТОЯЩИЕ ({upcoming.length})</Lbl>
      {upcoming.map((a,i)=><div key={a.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<upcoming.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
        <div style={{minWidth:42,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:C.g,fontFamily:M,lineHeight:1}}>{new Date(a.date).getDate()}</div>
          <div style={{fontSize:10,color:C.t2,fontFamily:M}}>{new Date(a.date).toLocaleString("ru",{month:"short"})}</div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:C.t,fontFamily:S}}>{a.service}</div>
          <div style={{fontSize:11,color:C.t2,fontFamily:S}}>{a.shop||"Сервис не указан"}{a.time?` · ${a.time}`:""}</div>
          {a.phone&&<div style={{fontSize:11,color:C.b,fontFamily:M}}>{a.phone}</div>}
          {a.note&&<div style={{fontSize:11,color:C.t2,fontFamily:S,marginTop:3}}>📝 {a.note}</div>}
        </div>
        <button onClick={()=>delAppt(a.id)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button>
      </div>)}
    </Card>}
    {/* Add form */}
    {adding?<Card>
      <Lbl>НОВАЯ ЗАПИСЬ</Lbl>
      <div style={{marginBottom:12}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:7,fontFamily:M}}>ВИД РАБОТЫ</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{services_list.map(s=><button key={s} onClick={()=>setForm(p=>({...p,service:s}))} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:form.service===s?C.oG:"transparent",color:form.service===s?C.o:C.t2,border:`1px solid ${form.service===s?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{s}</button>)}</div></div>
      {[["ДАТА","date","date",""],["ВРЕМЯ","time","time",""],["НАЗВАНИЕ СЕРВИСА","shop","text","Автосервис Мастер"],["ТЕЛЕФОН","phone","tel","+7 (900) 000-00-00"],["ЗАМЕТКА","note","text","Взять с собой..."]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>)}
      <div style={{display:"flex",gap:8}}><PBtn full onClick={addAppt} disabled={!form.date||!form.service}>СОХРАНИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
    </Card>:<PBtn full onClick={()=>setAdding(true)}>+ НОВАЯ ЗАПИСЬ В СЕРВИС</PBtn>}
    {/* Past */}
    {past.length>0&&<Card>
      <Lbl>ИСТОРИЯ ЗАПИСЕЙ</Lbl>
      {past.slice(0,5).map((a,i)=><div key={a.id} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<Math.min(5,past.length)-1?`1px solid ${C.border}`:"none",alignItems:"center",opacity:.6}}>
        <div style={{minWidth:42,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,color:C.t2,fontFamily:M,lineHeight:1}}>{new Date(a.date).getDate()}</div><div style={{fontSize:10,color:C.t2,fontFamily:M}}>{new Date(a.date).toLocaleString("ru",{month:"short"})}</div></div>
        <div style={{flex:1}}><div style={{fontSize:13,color:C.t2,fontFamily:S}}>{a.service}</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>{a.shop||"—"}</div></div>
        <button onClick={()=>delAppt(a.id)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:14,padding:"0 4px"}}>×</button>
      </div>)}
    </Card>}
    {!upcoming.length&&!adding&&<Card style={{textAlign:"center",padding:"32px",background:`${C.b}06`,borderColor:`${C.b}20`}}><div style={{fontSize:32,marginBottom:12}}>📅</div><div style={{fontSize:14,color:C.t2,fontFamily:S}}>Нет предстоящих записей</div><div style={{fontSize:12,color:C.t2,fontFamily:S,marginTop:4}}>Добавьте запись в сервис или к мастеру</div></Card>}
  </div>;
}

/* ── SERVICE HISTORY ─────────────────────────────────────────────── */
function ServiceHistory({services,car,toast}){
  const allHistory=useMemo(()=>{const items=[];services.forEach(svc=>{(svc.history||[]).forEach(h=>{items.push({...h,svcName:svc.name,svcIcon:svc.icon});});if(svc.lastDate&&svc.lastKm){items.push({date:svc.lastDate,km:svc.lastKm,note:"Плановая замена",svcName:svc.name,svcIcon:svc.icon});}});return items.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,50);},[services]);
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Lbl>ИСТОРИЯ РАБОТ ({allHistory.length})</Lbl>
    {allHistory.length===0&&<div style={{textAlign:"center",padding:"32px",color:C.t2,fontSize:13,fontFamily:S}}>История пуста. Отмечайте выполненные работы в сервисной книжке.</div>}
    {allHistory.map((h,i)=><div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<allHistory.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
      <span style={{fontSize:18,flexShrink:0}}>{h.svcIcon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,color:C.t,fontFamily:S,fontWeight:500}}>{h.svcName}</div>
        <div style={{fontSize:11,color:C.t2,fontFamily:M}}>{h.date} · {(+h.km)?.toLocaleString()} км</div>
        {h.note&&<div style={{fontSize:11,color:C.t2,fontFamily:S,marginTop:2}}>{h.note}</div>}
      </div>
      <Pill color={C.g}>✓ ВЫПОЛНЕНО</Pill>
    </div>)}
  </div>;
}

/* ── SETTINGS ────────────────────────────────────────────────────── */
function Settings({settings,setSettings,onBack,toast,onReset}){
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <BackHeader title="Настройки" onBack={onBack}/>
    <Card>
      <Lbl>УВЕДОМЛЕНИЯ</Lbl>
      {[["Советы каждые 30 мин","tips",true],["Оповещения о просрочке ТО","overdue",true],["Напоминания о документах","docs",true]].map(([label,key,def])=><div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:13,color:C.t,fontFamily:S}}>{label}</span>
        <div onClick={()=>{setSettings(p=>({...p,[key]:!(p[key]??def)}));toast("Сохранено","success");}}
          style={{width:44,height:24,borderRadius:12,background:(settings[key]??def)?C.o:C.t3,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
          <div style={{position:"absolute",top:2,left:(settings[key]??def)?22:2,width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
        </div>
      </div>)}
    </Card>

    <Card>
      <Lbl>ЕДИНИЦЫ ИЗМЕРЕНИЯ</Lbl>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:13,color:C.t,fontFamily:S}}>Давление шин</span>
        <div style={{display:"flex",gap:6}}>{["бар","PSI","кПа"].map(u=><button key={u} onClick={()=>{setSettings(p=>({...p,pressureUnit:u}));toast(`Единица: ${u}`,"success");}} style={{padding:"4px 10px",fontSize:11,fontFamily:M,background:(settings.pressureUnit||"бар")===u?C.oG:"transparent",color:(settings.pressureUnit||"бар")===u?C.o:C.t2,border:`1px solid ${(settings.pressureUnit||"бар")===u?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{u}</button>)}</div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0"}}>
        <span style={{fontSize:13,color:C.t,fontFamily:S}}>Объём топлива</span>
        <div style={{display:"flex",gap:6}}>{["л","галлон"].map(u=><button key={u} onClick={()=>{setSettings(p=>({...p,fuelUnit:u}));toast(`Единица: ${u}`,"success");}} style={{padding:"4px 10px",fontSize:11,fontFamily:M,background:(settings.fuelUnit||"л")===u?C.oG:"transparent",color:(settings.fuelUnit||"л")===u?C.o:C.t2,border:`1px solid ${(settings.fuelUnit||"л")===u?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{u}</button>)}</div>
      </div>
    </Card>

    <Card>
      <Lbl>ОБ ПРИЛОЖЕНИИ</Lbl>
      <div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:13,color:C.t2,fontFamily:S,flex:1}}>Версия</div><div style={{fontSize:13,color:C.t,fontFamily:M}}>7.0.0 BETA</div></div>
      <div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><div style={{fontSize:13,color:C.t2,fontFamily:S,flex:1}}>Движок ИИ</div><div style={{fontSize:13,color:C.t,fontFamily:M}}>Claude Sonnet 4</div></div>
      <div style={{display:"flex",gap:10,padding:"10px 0"}}><div style={{fontSize:13,color:C.t2,fontFamily:S,flex:1}}>Хранилище данных</div><div style={{fontSize:13,color:C.g,fontFamily:M}}>Локально</div></div>
    </Card>

    <button onClick={onReset} style={{padding:"14px",background:"transparent",border:`1px solid ${C.r}30`,color:C.r,borderRadius:10,fontSize:11,fontFamily:M,cursor:"pointer",letterSpacing:1}}>🔄 СБРОСИТЬ ВСЕ ДАННЫЕ</button>
  </div>;
}

/* ── DASHBOARD ───────────────────────────────────────────────────── */
function Dashboard({name,car,services,diagHistory,expenses,fuel,body,tires,geo,setTab,toast,appts,onRequestGeo,geoLoading}){
  const health=calcHealth(services);const hColor=health>=75?C.g:health>=50?C.y:C.r;
  const totalExp=expenses.reduce((s,e)=>s+e.amount,0);
  const overdue=services.filter(s=>s.status==="overdue");const warning=services.filter(s=>s.status==="warning");
  const bodyDamaged=BODY_PANELS.filter(p=>body[p.id]?.status!=="ok").length;
  const needRepair=BODY_PANELS.filter(p=>body[p.id]?.status==="repair").length;
  const upcomingAppts=appts.filter(a=>new Date(a.date)>=new Date()).length;
  const tiresOk=Object.values(tires).every(t=>tirePressureStatus(t.pressure).label==="НОРМА");
  const weekly=useMemo(()=>[4,3,2,1].map(w=>{const now=new Date();const from=new Date(now);from.setDate(from.getDate()-w*7);const to=new Date(now);to.setDate(to.getDate()-(w-1)*7);return{w:`-${w}н`,sum:expenses.filter(e=>{const d=new Date(e.date);return d>=from&&d<to;}).reduce((s,e)=>s+e.amount,0)};}),[expenses]);
  const avgCons=useMemo(()=>{if(fuel.length<2)return null;const s=[...fuel].sort((a,b)=>a.odometer-b.odometer);let tL=0,tK=0;for(let i=1;i<s.length;i++){tL+=s[i-1].liters;tK+=s[i].odometer-s[i-1].odometer;}return tK>0?((tL/tK)*100).toFixed(1):null;},[fuel]);
  const regionOsago=useMemo(()=>getRegionOsago(geo?.region),[geo]);

  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Greeting */}
    <div>
      <div style={{fontSize:13,color:C.t2,fontFamily:S}}>{new Date().getHours()<12?"Доброе утро":new Date().getHours()<18?"Добрый день":"Добрый вечер"}, {name}</div>
      <div style={{fontSize:21,fontWeight:700,color:C.t,fontFamily:S,letterSpacing:-.4}}>{car.make} {car.model}</div>
      <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,color:C.t2,fontFamily:M}}>{car.year} · {car.mileage?.toLocaleString("ru-RU")} км</span>
        {car.plate&&<div style={{display:"inline-flex",padding:"2px 8px",background:`${C.o}15`,border:`1px solid ${C.o}30`,borderRadius:5}}><span style={{fontSize:12,fontWeight:700,color:C.o,fontFamily:M,letterSpacing:1}}>{car.plate}</span></div>}
        {geo?.city&&<div style={{display:"inline-flex",gap:3,alignItems:"center"}}><span style={{fontSize:9}}>📍</span><span style={{fontSize:9,color:C.t2,fontFamily:M}}>{geo.city}</span></div>}
      </div>
    </div>

    {/* Health */}
    <Card style={{background:`linear-gradient(135deg,${C.card} 0%,#0f1f3a 100%)`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",right:-40,top:-40,width:140,height:140,borderRadius:"50%",background:"rgba(255,107,0,0.05)",pointerEvents:"none"}}/>
      <div style={{display:"flex",gap:18,alignItems:"center"}}>
        <Ring val={health} color={hColor} size={96} sw={8}><div style={{fontSize:20,fontWeight:700,color:hColor,fontFamily:M,lineHeight:1}}>{health}</div><div style={{fontSize:8,color:C.t2,letterSpacing:.5}}>/ 100</div></Ring>
        <div style={{flex:1}}>
          <Lbl mb={3}>ЗДОРОВЬЕ АВТО</Lbl>
          <div style={{fontSize:17,fontWeight:700,color:hColor,fontFamily:M,marginBottom:3}}>{health>=75?"ОТЛИЧНО":health>=50?"ВНИМАНИЕ":"КРИТИЧНО"}</div>
          <div style={{fontSize:11,color:C.t2,fontFamily:S,lineHeight:1.5,marginBottom:5}}>{overdue.length>0?`${overdue.length} операций просрочено`:warning.length>0?`${warning.length} скоро истекут`:"Всё в норме"}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {avgCons&&<div style={{display:"flex",gap:4}}><span style={{fontSize:9,color:C.t2,fontFamily:M}}>⛽</span><span style={{fontSize:11,fontWeight:700,color:C.o,fontFamily:M}}>{avgCons} л/100</span></div>}
            <div style={{display:"flex",gap:4}}><span style={{fontSize:9,color:tiresOk?C.g:C.y,fontFamily:M}}>🛞</span><span style={{fontSize:11,color:tiresOk?C.g:C.y,fontFamily:M}}>{tiresOk?"Шины OK":"Проверить"}</span></div>
          </div>
        </div>
      </div>
    </Card>

    {/* 5-stat grid */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
      {[{l:"РАСХОДЫ",v:rub(totalExp),c:C.t,tab:"finance"},{l:"СЕРВИС ТО",v:overdue.length,c:overdue.length?C.r:C.g,tab:"maintain"},{l:"КУЗОВ",v:bodyDamaged,c:bodyDamaged?C.y:C.g,tab:"body"},{l:"ШИНЫ",v:tiresOk?"OK":"!",c:tiresOk?C.g:C.y,tab:"more"},{l:"ЗАПИСИ",v:upcomingAppts,c:upcomingAppts?C.b:C.t,tab:"appts"}].map(({l,v,c,tab})=><Card key={l} onClick={()=>setTab(tab)} style={{padding:"8px 10px",cursor:"pointer"}}><Lbl mb={2} style={{fontSize:7,letterSpacing:1}}>{l}</Lbl><div style={{fontSize:13,fontWeight:700,color:c,fontFamily:M}}>{v}</div></Card>)}
    </div>

    {/* Geo OSAGO */}
    {geo?.region?<Card style={{background:`${C.p}08`,borderColor:`${C.p}25`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><Lbl mb={0} color={C.p}>📍 ОСАГО — {geo.city||geo.region}</Lbl><Pill color={C.p}>{regionOsago.coef}x КБМ</Pill></div>
      <div style={{display:"flex",gap:12}}><div><div style={{fontSize:9,color:C.t2,fontFamily:M,marginBottom:2}}>ОТ</div><div style={{fontSize:14,fontWeight:700,color:C.t,fontFamily:M}}>{rub(regionOsago.min)}</div></div><div><div style={{fontSize:9,color:C.t2,fontFamily:M,marginBottom:2}}>ДО</div><div style={{fontSize:14,fontWeight:700,color:C.t,fontFamily:M}}>{rub(regionOsago.max)}</div></div></div>
    </Card>:<Card style={{background:`${C.b}06`,borderColor:`${C.b}20`,cursor:"pointer"}} onClick={onRequestGeo}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:20}}>📍</span><div style={{flex:1}}><div style={{fontSize:12,color:C.b,fontFamily:M}}>{geoLoading?"ОПРЕДЕЛЯЮ...":"ВКЛЮЧИТЬ ГЕОЛОКАЦИЮ"}</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>ОСАГО по региону и сервисы рядом</div></div></div></Card>}

    {/* Upcoming appointment */}
    {upcomingAppts>0&&<Card style={{background:`${C.b}08`,borderColor:`${C.b}25`,cursor:"pointer"}} onClick={()=>setTab("appts")}>
      <Lbl color={C.b} mb={4}>📅 ЗАПИСИ В СЕРВИС</Lbl>
      <div style={{fontSize:13,color:C.t,fontFamily:S}}>{upcomingAppts} предстоящ. {upcomingAppts===1?"запись":"записи"} → {appts.filter(a=>new Date(a.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date))[0]?.service}</div>
    </Card>}

    {/* Alerts */}
    {(overdue.length+warning.length>0)&&<Card style={{background:`${C.r}05`,borderColor:`${C.r}20`}}>
      <Lbl color={C.r}>⚠ НУЖЕН СЕРВИС</Lbl>
      {[...overdue,...warning].slice(0,3).map((s,i,arr)=><div key={s.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}><span style={{fontSize:16}}>{s.icon}</span><div style={{flex:1,fontSize:13,color:C.t,fontFamily:S}}>{s.name}</div><Pill color={sCfg[s.status].color}>{sCfg[s.status].label}</Pill></div>)}
      <button onClick={()=>setTab("maintain")} style={{marginTop:10,width:"100%",padding:"8px",fontSize:10,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",letterSpacing:1}}>ПЕРЕЙТИ В СЕРВИСНУЮ КНИЖКУ →</button>
    </Card>}

    {/* Body alert */}
    {needRepair>0&&<Card style={{background:`${C.o}06`,borderColor:`${C.o}25`,cursor:"pointer"}} onClick={()=>setTab("body")}><Lbl color={C.o} mb={4}>🚗 КУЗОВ — {needRepair} зон требуют ремонта</Lbl><div style={{fontSize:11,color:C.t2,fontFamily:S}}>Открыть схему кузова →</div></Card>}

    {/* Expense chart */}
    <Card>
      <Lbl>РАСХОДЫ ПО НЕДЕЛЯМ</Lbl>
      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={weekly}>
          <defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.o} stopOpacity={.3}/><stop offset="100%" stopColor={C.o} stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey="w" tick={{fontSize:9,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false}/>
          <Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:M,color:C.t}}>{rub(payload[0].value)}</div>:null}/>
          <Area type="monotone" dataKey="sum" stroke={C.o} strokeWidth={2} fill="url(#og)"/>
        </AreaChart>
      </ResponsiveContainer>
    </Card>

    {/* Recent diagnoses */}
    {diagHistory.length>0&&<Card>
      <Lbl>ПОСЛЕДНИЕ ДИАГНОЗЫ</Lbl>
      {diagHistory.slice(0,3).map((d,i)=><div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<2?`1px solid ${C.border}`:"none",alignItems:"center"}}><div style={{width:7,height:7,borderRadius:"50%",background:dCfg[d.danger]?.color||C.t2,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:13,color:C.t,fontFamily:S}}>{d.title}</div><div style={{fontSize:10,color:C.t2,fontFamily:M}}>{d.query} · {d.time}</div></div><Pill color={dCfg[d.danger]?.color}>{dCfg[d.danger]?.label}</Pill></div>)}
    </Card>}
  </div>;
}

/* ── SERVICE BOOK ────────────────────────────────────────────────── */
function Maintain({services,setServices,car,setCar,toast}){
  const[editKm,setEditKm]=useState(false);const[newKm,setNewKm]=useState(car.mileage);const[adding,setAdding]=useState(false);const[filter,setFilter]=useState("all");const[showHistory,setShowHistory]=useState(false);
  const[form,setForm]=useState({name:"",icon:"🔧",lastKm:car.mileage,lastDate:new Date().toISOString().slice(0,10),intervalKm:10000,intervalMo:12});
  const sorted=[...services.filter(s=>filter==="all"||s.status===filter)].sort((a,b)=>({overdue:0,warning:1,ok:2})[a.status]-({overdue:0,warning:1,ok:2})[b.status]);
  const iconOpts=["🛢","💨","🔴","⬛","⚡","🧊","⚙️","🌬","🔧","🔩","💧","🛞","🪛","🔦"];

  const saveMileage=()=>{setCar(c=>({...c,mileage:newKm}));setServices(prev=>recalcAll(prev,newKm));setEditKm(false);toast(`Пробег: ${newKm.toLocaleString()} км · ТО пересчитано`,"success",4000);};

  const markDone=id=>{
    const now=new Date().toISOString().slice(0,10);
    setServices(prev=>recalcAll(prev.map(s=>{
      if(s.id!==id)return s;
      const histEntry={date:now,km:car.mileage,note:"Плановая замена"};
      return{...s,lastKm:car.mileage,lastDate:now,history:[histEntry,...(s.history||[])].slice(0,10)};
    }),car.mileage));
    toast("Выполнено ✓ — записано в историю","success");
  };

  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Mileage */}
    <Card>{editKm?<div style={{display:"flex",gap:8}}><Input type="number" value={newKm} onChange={e=>setNewKm(+e.target.value)} style={{flex:1,fontSize:18,borderColor:C.o}}/><PBtn color={C.g} onClick={saveMileage} style={{padding:"10px 16px",fontSize:14}}>✓</PBtn><GBtn onClick={()=>setEditKm(false)}>✗</GBtn></div>:<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><Lbl mb={4}>ТЕКУЩИЙ ПРОБЕГ</Lbl><span style={{fontSize:26,fontWeight:700,color:C.t,fontFamily:M}}>{car.mileage?.toLocaleString("ru-RU")}</span><span style={{fontSize:13,color:C.t2,fontFamily:M,marginLeft:6}}>км</span></div><div style={{textAlign:"right"}}><button onClick={()=>{setEditKm(true);setNewKm(car.mileage);}} style={{padding:"6px 14px",fontSize:10,fontFamily:M,background:C.oG,color:C.o,border:`1px solid ${C.o}40`,borderRadius:7,cursor:"pointer",letterSpacing:1,display:"block",marginBottom:3}}>ОБНОВИТЬ</button><div style={{fontSize:9,color:C.t2,fontFamily:S}}>автопересчёт</div></div></div>}
    </Card>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>{[{l:"ПРОСРОЧЕНО",v:services.filter(s=>s.status==="overdue").length,c:C.r},{l:"СКОРО",v:services.filter(s=>s.status==="warning").length,c:C.y},{l:"В НОРМЕ",v:services.filter(s=>s.status==="ok").length,c:C.g}].map(({l,v,c})=><Card key={l} style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,color:c,fontFamily:M}}>{v}</div><div style={{fontSize:9,color:C.t2,letterSpacing:1.5,fontFamily:M,marginTop:2}}>{l}</div></Card>)}</div>

    {/* Tabs */}
    <div style={{display:"flex",gap:6}}>
      {[["all","ВСЕ"],["overdue","ПРОСРОЧЕНО"],["warning","СКОРО"],["ok","OK"]].map(([v,l])=><button key={v} onClick={()=>{setFilter(v);setShowHistory(false);}} style={{flex:1,padding:"5px 0",fontSize:9,fontFamily:M,borderRadius:6,cursor:"pointer",letterSpacing:1,border:`1px solid ${filter===v&&!showHistory?C.o:C.border}`,background:filter===v&&!showHistory?C.oG:"transparent",color:filter===v&&!showHistory?C.o:C.t2}}>{l}</button>)}
      <button onClick={()=>setShowHistory(h=>!h)} style={{flex:1,padding:"5px 0",fontSize:9,fontFamily:M,borderRadius:6,cursor:"pointer",letterSpacing:1,border:`1px solid ${showHistory?C.g:C.border}`,background:showHistory?C.gG:"transparent",color:showHistory?C.g:C.t2}}>ИСТОРИЯ</button>
    </div>

    {showHistory?<ServiceHistory services={services} car={car} toast={toast}/>:<Card>
      <Lbl>РЕГЛАМЕНТ — {services.length} ПОЗИЦИЙ</Lbl>
      {sorted.map((s,i)=>{
        const cfg=sCfg[s.status];const kmUsed=car.mileage-s.lastKm;const kmRem=s.intervalKm-kmUsed;const remainingPct=Math.max(0,Math.min(1,kmRem/s.intervalKm));
        return<div key={s.id} style={{padding:"12px 0",borderBottom:i<sorted.length-1?`1px solid ${C.border}`:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:18}}>{s.icon}</span><span style={{fontSize:14,color:C.t,fontFamily:S,fontWeight:500}}>{s.name}</span></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}><Pill color={cfg.color}>{cfg.icon} {cfg.label}</Pill><button onClick={()=>setServices(p=>p.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:14,padding:"0 2px"}}>×</button></div>
          </div>
          <div style={{marginBottom:5}}><ProgressBar remaining={remainingPct}/></div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:s.status!=="ok"?8:0}}>
            <div style={{fontSize:10,color:C.t2,fontFamily:M}}>{s.lastDate} · {s.lastKm?.toLocaleString()} км</div>
            <div style={{fontSize:10,color:cfg.color,fontFamily:M}}>{s.status==="overdue"?`−${Math.abs(kmRem).toLocaleString()} км`:`${Math.max(0,kmRem).toLocaleString()} км`}</div>
          </div>
          {s.status!=="ok"&&<div style={{display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:11,color:cfg.color,fontFamily:M}}>{s.status==="overdue"?`⚠ просрочено на ${Math.abs(kmRem).toLocaleString()} км`:`→ осталось ~${kmRem.toLocaleString()} км`}</span>
            <button onClick={()=>markDone(s.id)} style={{padding:"3px 12px",fontSize:10,fontFamily:M,background:C.gG,color:C.g,border:`1px solid ${C.g}40`,borderRadius:5,cursor:"pointer"}}>СДЕЛАНО ✓</button>
          </div>}
          {(s.history||[]).length>0&&<div style={{fontSize:10,color:C.t2,fontFamily:S,marginTop:4}}>История: {(s.history||[]).length} замен · последняя: {(s.history||[])[0]?.date}</div>}
        </div>;
      })}
    </Card>}

    {!showHistory&&(adding?<Card>
      <Lbl>НОВАЯ ОПЕРАЦИЯ</Lbl>
      <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:6,fontFamily:M}}>ИКОНКА</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{iconOpts.map(ic=><button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{padding:"4px 8px",fontSize:16,background:form.icon===ic?C.oG:"transparent",border:`1px solid ${form.icon===ic?C.o:C.border}`,borderRadius:6,cursor:"pointer"}}>{ic}</button>)}</div></div>
      {[["НАЗВАНИЕ","name","text","Замена ремня ГРМ"],["ПРОБЕГ ПРИ ЗАМЕНЕ","lastKm","number",""],["ДАТА ЗАМЕНЫ","lastDate","date",""],["ИНТЕРВАЛ КМ","intervalKm","number","30000"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:t==="number"?+e.target.value:e.target.value}))}/></div>)}
      <div style={{display:"flex",gap:8}}><PBtn full onClick={()=>{if(!form.name)return;const ns={...form,id:Date.now(),status:calcSvcStatus(form,car.mileage),history:[]};setServices(p=>[...p,ns]);setAdding(false);toast("Добавлено","success");}}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div>
    </Card>:<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ ОПЕРАЦИЮ ТО</button>)}
  </div>;
}

/* ── DIAGNOSTICS ─────────────────────────────────────────────────── */
function Diagnostics({history,setHistory,car,toast}){
  const[input,setInput]=useState("");const[loading,setLoading]=useState(false);const[result,setResult]=useState(null);const[err,setErr]=useState("");const[offline,setOffline]=useState(false);
  const ref=useRef(null);const examples=["P0301","P0420","P0171","P0300","стук при торможении","не заводится","вибрация 80 км/ч"];
  const run=async(q)=>{const query=(q!==undefined?q:input).trim();if(!query||loading)return;setLoading(true);setResult(null);setErr("");setOffline(false);
    const code=query.toUpperCase().replace(/\s/g,"");const local=OBD_DB[code];
    if(local){const r={...local,urgency:"1 неделя",parts:[]};setResult(r);setOffline(true);setHistory(prev=>[{...r,query,time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})},...prev].slice(0,30));toast("Найдено в офлайн-базе","success");setLoading(false);return;}
    try{const text=await ai(DIAG_SYS,`Авто: ${car.make} ${car.model} ${car.year}, ${car.mileage?.toLocaleString()} км. ${query}`);const r=JSON.parse(text);if(r.error)setErr(r.error);else{setResult(r);setHistory(prev=>[{...r,query,time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})},...prev].slice(0,30));toast("Диагноз получен","success");}}catch{setErr("Ошибка соединения.");}setLoading(false);};
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <Card><Lbl>КОД OBD-II ИЛИ СИМПТОМ</Lbl><div style={{display:"flex",gap:8,marginBottom:10}}><input ref={ref} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder="P0301 или «стучит при разгоне»" style={{flex:1,padding:"11px 14px",fontSize:13,fontFamily:M,background:C.bg2,border:`1px solid ${input?C.o+"60":C.border}`,borderRadius:9,color:C.t,outline:"none",transition:"border-color .2s"}}/><PBtn onClick={()=>run()} disabled={loading||!input.trim()} style={{padding:"11px 20px",fontSize:16}}>→</PBtn></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{examples.map(ex=><button key={ex} onClick={()=>{setInput(ex);setTimeout(()=>run(ex),20);}} style={{padding:"3px 10px",fontSize:10,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:4,cursor:"pointer"}} onMouseEnter={e=>{e.target.style.color=C.o;e.target.style.borderColor=C.o;}} onMouseLeave={e=>{e.target.style.color=C.t2;e.target.style.borderColor=C.border;}}>{ex}</button>)}</div></Card>
    {loading&&<Card><Spinner/></Card>}
    {err&&!loading&&<Card style={{background:C.rG,borderColor:`${C.r}30`,color:C.r,fontSize:13,fontFamily:S}}>{err}</Card>}
    {result&&!loading&&<div style={{display:"flex",flexDirection:"column",gap:10,animation:"fadeUp .35s ease"}}>
      <Card style={{borderLeft:`3px solid ${C.o}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><Lbl mb={0}>{(result.system||"").toUpperCase()}</Lbl><div style={{display:"flex",gap:6}}>{offline&&<Pill color={C.g}>⚡ ОФЛАЙН</Pill>}{result.urgency&&<Pill color={urgClr[result.urgency]||C.t2}>{result.urgency}</Pill>}</div></div><div style={{fontSize:18,fontWeight:700,color:C.t,fontFamily:S,lineHeight:1.3,marginBottom:10}}>{result.title}</div><div style={{fontSize:13,color:C.t2,fontFamily:S,lineHeight:1.65}}>{result.description||result.desc}</div></Card>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card style={{background:dCfg[result.danger]?.bg,borderColor:(dCfg[result.danger]?.color||C.t2)+"50"}}><Lbl>ОПАСНОСТЬ</Lbl><div style={{fontSize:15,fontWeight:700,color:dCfg[result.danger]?.color,fontFamily:M,marginBottom:4}}>{dCfg[result.danger]?.label}</div><div style={{fontSize:11,color:C.t2,fontFamily:S,lineHeight:1.45}}>{result.danger_reason}</div></Card>
        <Card style={{background:result.can_drive?C.gG:C.rG,borderColor:(result.can_drive?C.g:C.r)+"40",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"16px 12px"}}><div style={{fontSize:32,color:result.can_drive?C.g:C.r,marginBottom:5}}>{result.can_drive?"✓":"✗"}</div><div style={{fontSize:10,fontWeight:700,color:result.can_drive?C.g:C.r,letterSpacing:1.5,fontFamily:M}}>{result.can_drive?"МОЖНО ЕХАТЬ":"НЕ ЕХАТЬ"}</div></Card>
      </div>
      <Card><Lbl>СТОИМОСТЬ РЕМОНТА</Lbl><div style={{fontSize:22,fontWeight:700,color:C.t,fontFamily:M,marginBottom:4}}>{rub(result.price_min)} – {rub(result.price_max)}</div><div style={{fontSize:12,color:C.t2,fontFamily:S}}>{result.price_comment}</div></Card>
      {result.parts?.length>0&&<Card><Lbl>ВЕРОЯТНО ПОТРЕБУЮТСЯ</Lbl><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{result.parts.map(p=><Pill key={p} color={C.b}>{p}</Pill>)}</div></Card>}
      <Card><Lbl>ЧТО ДЕЛАТЬ</Lbl>{(result.actions||[]).map((a,i)=><div key={i} style={{display:"flex",gap:12,marginBottom:i<result.actions.length-1?12:0,alignItems:"flex-start"}}><div style={{minWidth:24,height:24,borderRadius:"50%",background:`${C.o}20`,border:`1px solid ${C.o}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}><span style={{fontSize:9,fontWeight:700,color:C.o,fontFamily:M}}>{i+1}</span></div><span style={{fontSize:13,color:C.t,fontFamily:S,lineHeight:1.55}}>{a}</span></div>)}</Card>
      <GBtn full onClick={()=>{setResult(null);setInput("");ref.current?.focus();}}>← НОВЫЙ ЗАПРОС</GBtn>
    </div>}
    {history.length>0&&!result&&!loading&&<Card><Lbl>ИСТОРИЯ ({history.length})</Lbl>{history.slice(0,8).map((d,i)=><div key={i} onClick={()=>{setInput(d.query);setTimeout(()=>run(d.query),20);}} style={{display:"flex",gap:10,padding:"9px 4px",borderBottom:i<Math.min(8,history.length)-1?`1px solid ${C.border}`:"none",cursor:"pointer",borderRadius:6,margin:"0 -4px"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{width:7,height:7,borderRadius:"50%",background:dCfg[d.danger]?.color||C.t2,flexShrink:0,marginTop:6}}/><div style={{flex:1}}><div style={{fontSize:13,color:C.t,fontFamily:S}}>{d.title}</div><div style={{fontSize:10,color:C.t2,fontFamily:M}}>{d.query} · {d.time}</div></div><Pill color={dCfg[d.danger]?.color}>{dCfg[d.danger]?.label}</Pill></div>)}</Card>}
  </div>;
}

/* ── BODY MAP ────────────────────────────────────────────────────── */
function BodyMap({body,setBody,car,toast}){
  const[selected,setSelected]=useState(null);const[noteEdit,setNoteEdit]=useState(false);const[noteText,setNoteText]=useState("");const[legend,setLegend]=useState(false);
  const damaged=BODY_PANELS.filter(p=>body[p.id]?.status!=="ok").length;const needRepair=BODY_PANELS.filter(p=>body[p.id]?.status==="repair").length;
  const handleClick=pid=>{if(selected===pid&&!noteEdit){const next=nextStatus(body[pid]?.status||"ok");setBody(b=>({...b,[pid]:{...b[pid],status:next}}));toast(`${BODY_PANELS.find(p=>p.id===pid)?.name}: ${PS[next].label}`,"info");}else{setSelected(selected===pid?null:pid);setNoteEdit(false);}};
  const selPanel=selected?BODY_PANELS.find(p=>p.id===selected):null;const selState=selected?body[selected]||{status:"ok",note:""}:null;
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
      <Card style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:C.r,fontFamily:M}}>{needRepair}</div><div style={{fontSize:9,color:C.t2,letterSpacing:1.5,fontFamily:M,marginTop:2}}>РЕМОНТ</div></Card>
      <Card style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:C.o,fontFamily:M}}>{damaged-needRepair}</div><div style={{fontSize:9,color:C.t2,letterSpacing:1.5,fontFamily:M,marginTop:2}}>ПОВРЕЖДЕНИЯ</div></Card>
      <Card style={{padding:"12px 14px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:C.g,fontFamily:M}}>{BODY_PANELS.filter(p=>!p.wheel).length-damaged}</div><div style={{fontSize:9,color:C.t2,letterSpacing:1.5,fontFamily:M,marginTop:2}}>В НОРМЕ</div></Card>
    </div>
    <Card style={{background:`${C.b}08`,borderColor:`${C.b}20`,padding:"10px 16px",display:"flex",gap:10,alignItems:"center"}}><span>👆</span><div style={{fontSize:11,color:C.t2,fontFamily:S,lineHeight:1.5}}><span style={{color:C.t,fontWeight:600}}>1 клик</span> — выбрать · <span style={{color:C.t,fontWeight:600}}>2 клика</span> — сменить статус</div></Card>
    <Card style={{padding:"16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <Lbl mb={0}>СХЕМА КУЗОВА — {car.make} {car.model}</Lbl>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setLegend(l=>!l)} style={{padding:"3px 10px",fontSize:9,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:5,cursor:"pointer",letterSpacing:1}}>ЛЕГЕНДА</button>
          <button onClick={()=>{setBody(DEF_BODY);toast("Сброшено","info");setSelected(null);}} style={{padding:"3px 10px",fontSize:9,fontFamily:M,background:"transparent",color:C.r,border:`1px solid ${C.r}40`,borderRadius:5,cursor:"pointer",letterSpacing:1}}>СБРОС</button>
        </div>
      </div>
      {legend&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,padding:"10px",background:C.bg2,borderRadius:8}}>{PANEL_STATUS.map(s=><div key={s.id} style={{display:"flex",gap:5,alignItems:"center"}}><div style={{width:10,height:10,borderRadius:2,background:s.color+"30",border:`1px solid ${s.color}60`}}/><span style={{fontSize:9,color:C.t2,fontFamily:M}}>{s.label}</span></div>)}</div>}
      <div style={{display:"flex",justifyContent:"center"}}>
        <svg viewBox="0 0 200 390" style={{width:"100%",maxWidth:280,height:"auto",cursor:"pointer",userSelect:"none"}}>
          {BODY_PANELS.map(panel=>{const st=body[panel.id]?.status||"ok";const cfg=PS[st];const isSelected=selected===panel.id;return<g key={panel.id}><path d={panel.path} fill={isSelected?cfg.color+"50":cfg.color+"18"} stroke={isSelected?cfg.color:cfg.color+"60"} strokeWidth={isSelected?2:0.8} style={{transition:"fill .2s,stroke .2s",cursor:"pointer"}} onClick={()=>handleClick(panel.id)}/>{!panel.wheel&&st!=="ok"&&(()=>{const bb=panel.path.split(/[MLZ\s,]+/).filter(Boolean).map(Number).filter(n=>!isNaN(n));const xs=bb.filter((_,i)=>i%2===0),ys=bb.filter((_,i)=>i%2===1);return<text x={(Math.min(...xs)+Math.max(...xs))/2} y={(Math.min(...ys)+Math.max(...ys))/2+4} textAnchor="middle" fontSize="9" fill={cfg.color} fontFamily="sans-serif" style={{pointerEvents:"none"}}>{cfg.icon}</text>;})()}</g>;})}
          <text x="100" y="386" textAnchor="middle" fontSize="8" fill={C.t2} fontFamily="monospace">▲ ВПЕРЁД</text>
        </svg>
      </div>
    </Card>
    {selPanel&&selState&&<Card style={{borderLeft:`3px solid ${PS[selState.status].color}`,animation:"fadeUp .2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:15,fontWeight:700,color:C.t,fontFamily:S}}>{selPanel.name}</div><button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:18,padding:"0 4px"}}>×</button></div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{PANEL_STATUS.map(s=><button key={s.id} onClick={()=>{setBody(b=>({...b,[selPanel.id]:{...b[selPanel.id],status:s.id}}));toast(`${selPanel.name}: ${s.label}`,"info");}} style={{padding:"4px 10px",fontSize:10,fontFamily:M,background:selState.status===s.id?s.color+"25":"transparent",color:selState.status===s.id?s.color:C.t2,border:`1px solid ${selState.status===s.id?s.color+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{s.icon} {s.label}</button>)}</div>
      <div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>ЗАМЕТКА</div>
      {noteEdit?<div style={{display:"flex",gap:8}}><Input value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Описание…" style={{flex:1}} onKeyDown={e=>{if(e.key==="Enter"){setBody(b=>({...b,[selPanel.id]:{...b[selPanel.id],note:noteText}}));setNoteEdit(false);toast("Сохранено","success");}}}/><PBtn color={C.g} onClick={()=>{setBody(b=>({...b,[selPanel.id]:{...b[selPanel.id],note:noteText}}));setNoteEdit(false);}} style={{padding:"10px 14px",fontSize:12}}>✓</PBtn></div>:<div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{flex:1,padding:"9px 12px",background:C.bg2,borderRadius:8,fontSize:12,color:selState.note?C.t:C.t2,fontFamily:S,minHeight:38,border:`1px solid ${C.border}`}}>{selState.note||"Нет заметки"}</div><button onClick={()=>{setNoteText(selState.note||"");setNoteEdit(true);}} style={{padding:"8px 12px",background:C.oG,color:C.o,border:`1px solid ${C.o}40`,borderRadius:8,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>✎</button></div>}
    </Card>}
    {damaged>0&&<Card><Lbl>ПОВРЕЖДЁННЫЕ ЗОНЫ ({damaged})</Lbl>{BODY_PANELS.filter(p=>body[p.id]?.status!=="ok").map((p,i,arr)=>{const st=body[p.id]?.status||"ok";const cfg=PS[st];return<div key={p.id} onClick={()=>{setSelected(p.id);setNoteEdit(false);}} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",cursor:"pointer",alignItems:"center"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{width:8,height:8,borderRadius:2,background:cfg.color,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:13,color:C.t,fontFamily:S}}>{p.name}</div>{body[p.id]?.note&&<div style={{fontSize:11,color:C.t2,fontFamily:S}}>{body[p.id].note}</div>}</div><Pill color={cfg.color}>{cfg.icon} {cfg.label}</Pill></div>;})}
    </Card>}
  </div>;
}

/* ── FINANCE ─────────────────────────────────────────────────────── */
function Finance({expenses,setExpenses,fuel,setFuel,car,toast}){
  const[view,setView]=useState("exp");const[adding,setAdding]=useState(false);
  const[form,setForm]=useState({date:new Date().toISOString().slice(0,10),cat:"топливо",amount:"",note:""});
  const[fForm,setFForm]=useState({date:new Date().toISOString().slice(0,10),liters:"",cost:"",odometer:car.mileage,station:""});
  const total=expenses.reduce((s,e)=>s+e.amount,0);
  const byCategory=expenses.reduce((acc,e)=>({...acc,[e.cat]:(acc[e.cat]||0)+e.amount}),{});
  const pieData=Object.entries(byCategory).map(([name,value])=>({name,value}));
  const monthly=useMemo(()=>{const m={};expenses.forEach(e=>{const k=e.date.slice(0,7);m[k]=(m[k]||0)+e.amount;});return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).slice(-5).map(([mo,sum])=>({mo:mo.slice(5),sum}));},[expenses]);
  const fuelTrend=useMemo(()=>{if(fuel.length<2)return[];const s=[...fuel].sort((a,b)=>a.odometer-b.odometer);const out=[];for(let i=1;i<s.length;i++){const km=s[i].odometer-s[i-1].odometer;if(km>0){out.push({d:s[i].date.slice(5),cons:((s[i-1].liters/km)*100).toFixed(1)});}}return out;},[fuel]);
  const avgCons=useMemo(()=>{if(fuel.length<2)return null;const s=[...fuel].sort((a,b)=>a.odometer-b.odometer);let tL=0,tK=0;for(let i=1;i<s.length;i++){tL+=s[i-1].liters;tK+=s[i].odometer-s[i-1].odometer;}return tK>0?((tL/tK)*100).toFixed(1):null;},[fuel]);
  const addExp=()=>{if(!form.amount)return;setExpenses(p=>[{...form,amount:+form.amount,id:Date.now()},...p]);setAdding(false);setForm({date:new Date().toISOString().slice(0,10),cat:"топливо",amount:"",note:""});toast("Добавлено","success");};
  const addFuel=()=>{if(!fForm.liters||!fForm.cost)return;setFuel(p=>[{...fForm,liters:+fForm.liters,cost:+fForm.cost,odometer:+fForm.odometer,id:Date.now()},...p]);setAdding(false);toast("Заправка добавлена","success");};
  return<div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",gap:6}}>{[["exp","РАСХОДЫ"],["fuel","ТОПЛИВО"],["charts","ГРАФИКИ"]].map(([v,l])=><button key={v} onClick={()=>setView(v)} style={{flex:1,padding:"8px",fontSize:10,fontFamily:M,borderRadius:8,cursor:"pointer",letterSpacing:1,border:`1px solid ${view===v?C.o:C.border}`,background:view===v?C.oG:"transparent",color:view===v?C.o:C.t2}}>{l}</button>)}</div>
    {view==="exp"&&<>
      <Card style={{borderLeft:`3px solid ${C.o}`}}><Lbl>ИТОГО 2025</Lbl><div style={{fontSize:28,fontWeight:700,color:C.t,fontFamily:M,marginBottom:4}}>{rub(total)}</div><div style={{fontSize:12,color:C.t2,fontFamily:S}}>{expenses.length} записей · среднее {rub(Math.round(total/(expenses.length||1)))}</div></Card>
      {adding?<Card><Lbl>НОВЫЙ РАСХОД</Lbl><div style={{marginBottom:12}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:7,fontFamily:M}}>КАТЕГОРИЯ</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Object.keys(CAT_CLR).map(cat=><button key={cat} onClick={()=>setForm(p=>({...p,cat}))} style={{padding:"5px 12px",fontSize:10,fontFamily:M,background:form.cat===cat?(CAT_CLR[cat]||C.t2)+"20":"transparent",color:form.cat===cat?CAT_CLR[cat]:C.t2,border:`1px solid ${form.cat===cat?(CAT_CLR[cat]||C.t2)+"60":C.border}`,borderRadius:5,cursor:"pointer",textTransform:"capitalize"}}>{cat}</button>)}</div></div>
      {[["СУММА (₽)","amount","number","3200"],["ДАТА","date","date",""],["ПРИМЕЧАНИЕ","note","text",""]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={form[k]} placeholder={ph} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>)}
      <div style={{display:"flex",gap:8}}><PBtn full onClick={addExp}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div></Card>
      :<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ РАСХОД</button>}
      <Card><Lbl>ВСЕ ЗАПИСИ</Lbl>{expenses.map((e,i)=><div key={e.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<expenses.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}><div style={{width:9,height:9,borderRadius:"50%",background:CAT_CLR[e.cat]||C.t2,flexShrink:0}}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.t,fontFamily:S,textTransform:"capitalize"}}>{e.cat}</span><span style={{fontSize:13,color:C.t,fontFamily:M,fontWeight:600}}>{rub(e.amount)}</span></div><div style={{fontSize:11,color:C.t2,fontFamily:M}}>{e.note} · {e.date}</div></div><button onClick={()=>setExpenses(p=>p.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button></div>)}</Card>
    </>}
    {view==="fuel"&&<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card style={{background:`${C.o}08`,borderColor:`${C.o}25`}}><Lbl>РАСХОД</Lbl><div style={{fontSize:22,fontWeight:700,color:C.o,fontFamily:M}}>{avgCons||"—"}<span style={{fontSize:11,color:C.t2,marginLeft:4}}>л/100</span></div></Card>
        <Card style={{background:`${C.g}08`,borderColor:`${C.g}25`}}><Lbl>ЗАПРАВОК</Lbl><div style={{fontSize:22,fontWeight:700,color:C.g,fontFamily:M}}>{fuel.length}</div></Card>
      </div>
      {adding?<Card><Lbl>НОВАЯ ЗАПРАВКА</Lbl>{[["ДАТА","date","date",""],["ЛИТРОВ","liters","number","45"],["СТОИМОСТЬ (₽)","cost","number","3200"],["ПРОБЕГ (КМ)","odometer","number",""],["АЗС","station","text",""]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:10}}><div style={{fontSize:10,color:C.t2,letterSpacing:2,marginBottom:5,fontFamily:M}}>{l}</div><Input type={t} value={fForm[k]} placeholder={ph} onChange={e=>setFForm(p=>({...p,[k]:e.target.value}))}/></div>)}<div style={{display:"flex",gap:8}}><PBtn full onClick={addFuel}>ДОБАВИТЬ</PBtn><GBtn onClick={()=>setAdding(false)}>ОТМЕНА</GBtn></div></Card>
      :<button onClick={()=>setAdding(true)} style={{padding:"14px",background:"transparent",border:`1px dashed ${C.border}`,color:C.t2,borderRadius:12,fontSize:10,fontFamily:M,cursor:"pointer",letterSpacing:1}}>+ ДОБАВИТЬ ЗАПРАВКУ</button>}
      {fuelTrend.length>1&&<Card><Lbl>ТРЕНД РАСХОДА ТОПЛИВА</Lbl><ResponsiveContainer width="100%" height={100}><LineChart data={fuelTrend}><XAxis dataKey="d" tick={{fontSize:9,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false}/><Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:M,color:C.t}}>{payload[0].value} л/100км</div>:null}/><Line type="monotone" dataKey="cons" stroke={C.b} strokeWidth={2} dot={{fill:C.b,r:3}} activeDot={{r:5}}/></LineChart></ResponsiveContainer></Card>}
      <Card><Lbl>ИСТОРИЯ ЗАПРАВОК</Lbl>{fuel.map((f,i)=><div key={f.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<fuel.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}><span style={{fontSize:18}}>⛽</span><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.t,fontFamily:S}}>{f.station||"АЗС"}</span><span style={{fontSize:13,color:C.t,fontFamily:M,fontWeight:600}}>{rub(f.cost)}</span></div><div style={{fontSize:11,color:C.t2,fontFamily:M}}>{f.date} · {f.liters}л · {(f.cost/f.liters).toFixed(0)} ₽/л · {f.odometer?.toLocaleString()} км</div></div><button onClick={()=>setFuel(p=>p.filter(x=>x.id!==f.id))} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:15,padding:"0 4px"}}>×</button></div>)}</Card>
    </>}
    {view==="charts"&&<>
      <Card><Lbl>РАСХОДЫ ПО МЕСЯЦАМ</Lbl><ResponsiveContainer width="100%" height={160}><BarChart data={monthly}><XAxis dataKey="mo" tick={{fontSize:10,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:9,fill:C.t2,fontFamily:M}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}к`}/><Tooltip content={({active,payload})=>active&&payload?.length?<div style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",fontSize:11,fontFamily:M,color:C.t}}>{rub(payload[0].value)}</div>:null}/><Bar dataKey="sum" fill={C.o} radius={[4,4,0,0]} maxBarSize={40}/></BarChart></ResponsiveContainer></Card>
      <Card><Lbl>ПО КАТЕГОРИЯМ</Lbl><div style={{display:"flex",gap:16,alignItems:"center"}}><PieChart width={110} height={110}><Pie data={pieData} cx={50} cy={50} innerRadius={28} outerRadius={50} dataKey="value" strokeWidth={0}>{pieData.map((e,i)=><Cell key={i} fill={CAT_CLR[e.name]||C.t2}/>)}</Pie></PieChart><div style={{flex:1}}>{pieData.sort((a,b)=>b.value-a.value).map(({name,value})=><div key={name} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}><div style={{width:8,height:8,borderRadius:"50%",background:CAT_CLR[name]||C.t2,flexShrink:0}}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.t,fontFamily:S,textTransform:"capitalize"}}>{name}</span><span style={{fontSize:12,color:C.t,fontFamily:M}}>{rub(value)}</span></div><div style={{height:2,background:C.border,borderRadius:1,marginTop:3}}><div style={{height:2,background:CAT_CLR[name]||C.t2,borderRadius:1,width:`${(value/total)*100}%`}}/></div></div></div>)}</div></div></Card>
    </>}
  </div>;
}

/* ── MORE HUB ────────────────────────────────────────────────────── */
function More({car,name,cars,activeCar,setActiveCar,addCar,removeCar,toast,setCar,expenses,setExpenses,fuel,setFuel,body,geo,onRequestGeo,geoLoading,appts,setAppts,settings,setSettings,tires,setTires,setServices}){
  const[sub,setSub]=useState(null);
  const FIND_SYS_LOCAL=`Создай 4 реалистичных демо-сервиса. JSON:{"tip":"совет","results":[{"name":"","type":"","address":"","rating":4.5,"reviews":100,"price":"от 500 ₽","phone":"+7 (900) 000-00-00","hours":"9:00–21:00","wait":"~20 мин","tags":["быстро"]}]}`;
  if(sub==="garage")return<Garage cars={cars} activeCar={activeCar} setActiveCar={setActiveCar} addCar={addCar} removeCar={removeCar} toast={toast} onBack={()=>setSub(null)}/>;
  if(sub==="tires")return<TireTracker tires={tires} setTires={setTires} toast={toast}/>;
  if(sub==="appts")return<Appointments appts={appts} setAppts={setAppts} toast={toast} car={car} geo={geo}/>;
  if(sub==="settings")return<Settings settings={settings} setSettings={setSettings} onBack={()=>setSub(null)} toast={toast} onReset={()=>{if(window.confirm("Сбросить все данные?")){"ja7_car,ja7_cars,ja7_services,ja7_diagHistory,ja7_expenses,ja7_fuel,ja7_body,ja7_onboarded,ja7_name,ja7_geo,ja7_tires,ja7_appts,ja7_settings,ja7_docs,ja7_lastTipTime,ja7_tipIdx,ja7_activeCar".split(",").forEach(k=>localStorage.removeItem(k));window.location.reload();}}}/>;
  if(sub==="profile"){
    return<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <BackHeader title="Мой автомобиль" onBack={()=>setSub(null)}/>
      <Card>
        {[["МАРКА","make","text","Toyota"],["МОДЕЛЬ","model","text","Camry"],["ГОД","year","number","2019"],["ПРОБЕГ (КМ)","mileage","number","52000"],["ЦВЕТ","color","text","Белый"]].map(([l,k,t,ph])=><div key={k} style={{marginBottom:12}}><Lbl mb={5}>{l}</Lbl><Input type={t} value={car[k]||""} placeholder={ph} onChange={e=>setCar(p=>({...p,[k]:t==="number"?+e.target.value:e.target.value}))}/></div>)}
        <div style={{background:C.bg2,border:`1px solid ${C.border2}`,borderRadius:10,padding:"14px",marginBottom:12}}>
          <Lbl color={C.o} mb={10}>ИДЕНТИФИКАЦИЯ</Lbl>
          <div style={{marginBottom:10}}><Lbl mb={5}>ГОС. НОМЕР</Lbl><Input value={car.plate||""} placeholder="А123БВ77" onChange={e=>setCar(p=>({...p,plate:fmtPlate(e.target.value)}))} maxLength={9} style={{fontWeight:700,fontSize:16,letterSpacing:3,textAlign:"center"}}/></div>
          <div><Lbl mb={5}>VIN-КОД (17 знаков)</Lbl><Input value={car.vin||""} placeholder="XTA..." onChange={e=>setCar(p=>({...p,vin:fmtVin(e.target.value)}))} maxLength={17} style={{fontFamily:M,fontSize:11}}/>
            {car.vin?.length>0&&<div style={{fontSize:10,color:car.vin.length===17?C.g:C.y,fontFamily:M,marginTop:5}}>{car.vin.length===17?"✓ VIN корректен":`${car.vin.length}/17`}</div>}
          </div>
        </div>
        <div style={{marginBottom:16}}><Lbl mb={7}>ТОПЛИВО</Lbl><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["АИ-92","АИ-95","АИ-98","Дизель","Газ","Гибрид","Электро"].map(f=><button key={f} onClick={()=>setCar(p=>({...p,fuel:f}))} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:car.fuel===f?C.oG:"transparent",color:car.fuel===f?C.o:C.t2,border:`1px solid ${car.fuel===f?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{f}</button>)}</div></div>
        <PBtn full onClick={()=>{toast("Данные сохранены","success");setSub(null);}}>СОХРАНИТЬ</PBtn>
      </Card>
    </div>;
  }
  if(sub==="service"){
    const[q,setQ]=useState("");const[loading,setLoading]=useState(false);const[data,setData]=useState(null);
    const cats=["автосервис","шиномонтаж","автомойка","запчасти","эвакуатор","техосмотр"];
    const search=async(qv)=>{const query=(qv||q).trim();if(!query)return;setLoading(true);setData(null);try{const t=await ai(FIND_SYS_LOCAL,`${query} для ${car.make} ${car.model} ${car.year} в ${geo?.city||"вашем городе"}`);setData(JSON.parse(t));}catch{toast("Ошибка поиска","error");}setLoading(false);};
    return<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <BackHeader title="Найти сервис" onBack={()=>setSub(null)}/>
      {geo?.city&&<Card style={{background:`${C.g}06`,borderColor:`${C.g}25`,padding:"10px 16px",display:"flex",gap:10,alignItems:"center"}}><span>📍</span><div style={{fontSize:12,color:C.t,fontFamily:S}}>Ищем в <span style={{color:C.g,fontWeight:600}}>{geo.city}</span></div></Card>}
      <Card><div style={{display:"flex",gap:8,marginBottom:10}}><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Шиномонтаж, замена масла…" style={{flex:1}}/><PBtn onClick={()=>search()} disabled={loading||!q.trim()} style={{padding:"11px 18px",fontSize:15}}>→</PBtn></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>{setQ(c);search(c);}} style={{padding:"4px 11px",fontSize:10,fontFamily:M,background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:5,cursor:"pointer"}}>{c}</button>)}</div></Card>
      {loading&&<Card><Spinner/></Card>}
      {data&&!loading&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {data.tip&&<Card style={{background:C.gG,borderColor:`${C.g}25`,padding:"10px 16px"}}><div style={{fontSize:12,color:C.t,fontFamily:S}}>💡 {data.tip}</div></Card>}
        {(data.results||[]).map((s,i)=><Card key={i}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}><div><div style={{fontSize:15,fontWeight:600,color:C.t,fontFamily:S}}>{s.name}</div><Pill color={C.b}>{s.type}</Pill></div><div style={{display:"flex",gap:3,alignItems:"center"}}><span style={{color:C.y}}>★</span><span style={{fontSize:13,color:C.t,fontFamily:M}}>{s.rating}</span></div></div><div style={{fontSize:12,color:C.t2,fontFamily:S,marginBottom:3}}>📍 {s.address}</div><div style={{fontSize:12,color:C.t2,fontFamily:S,marginBottom:8}}>📞 {s.phone} · {s.hours}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(s.tags||[]).map(t=><Pill key={t} color={C.o}>{t}</Pill>)}</div><span style={{fontSize:14,fontWeight:700,color:C.g,fontFamily:M}}>{s.price}</span></div></Card>)}
      </div>}
    </div>;
  }
  if(sub==="tips"){
    const[input,setInput]=useState("");const[loading,setLoading]=useState(false);
    const[msgs,setMsgs]=useState([{role:"j",text:`Привет! Я Джарвис. Задайте любой вопрос о ${car.make} ${car.model}.`}]);const bottom=useRef(null);
    const send=async(q)=>{const msg=(q||input).trim();if(!msg||loading)return;setMsgs(p=>[...p,{role:"u",text:msg}]);setInput("");setLoading(true);try{const t=await ai(TIPS_SYS,`${car.make} ${car.model} ${car.year}, ${car.mileage?.toLocaleString()} км. ${msg}`,600);setMsgs(p=>[...p,{role:"j",text:t}]);}catch{setMsgs(p=>[...p,{role:"j",text:"Ошибка."}]);}setLoading(false);setTimeout(()=>bottom.current?.scrollIntoView({behavior:"smooth"}),100);};
    return<div style={{display:"flex",flexDirection:"column",gap:14}}><BackHeader title="Советы Джарвиса" onBack={()=>setSub(null)}/><div style={{display:"flex",flexDirection:"column",gap:10,minHeight:180}}>{msgs.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="u"?"flex-end":"flex-start"}}><div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="u"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="u"?C.o:C.card,border:m.role==="j"?`1px solid ${C.border}`:"none"}}><div style={{fontSize:13,color:m.role==="u"?"white":C.t,fontFamily:S,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{m.text}</div></div></div>)}{loading&&<div style={{display:"flex"}}><div style={{padding:"10px 14px",borderRadius:"14px 14px 14px 4px",background:C.card,border:`1px solid ${C.border}`}}><div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.t2,animation:`pulse 1.4s ease ${i*.2}s infinite`}}/>)}</div></div></div>}<div ref={bottom}/></div>{msgs.length===1&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Как часто менять масло?","Признаки износа колодок","ABS не работает","Перегрев двигателя"].map(s=><button key={s} onClick={()=>send(s)} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:C.card,color:C.t2,border:`1px solid ${C.border}`,borderRadius:20,cursor:"pointer"}}>{s}</button>)}</div>}<div style={{display:"flex",gap:8}}><Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Задайте вопрос…" style={{flex:1}}/><PBtn onClick={()=>send()} disabled={loading||!input.trim()} style={{padding:"11px 18px",fontSize:15}}>↑</PBtn></div></div>;
  }
  if(sub==="sos"){
    const[step,setStep]=useState(null);const G={dtb:{title:"ДТП",color:C.r,steps:["Включите аварийную сигнализацию","При пострадавших — немедленно 112","Знак: 15м в городе, 30м на трассе","Фото: место, повреждения, номера","Данные всех участников","Европротокол при согласии без пострадавших","Страховую уведомить за 5 дней"]},flat:{title:"Пробитое колесо",color:C.y,steps:["Плавно снижайте скорость","Аварийка, обочина справа","Знак аварийной остановки","Ручник, ровная поверхность","Ослабьте болты (земля, 1 оборот)","Домкрат под точку кузова","Колесо, болты крест-накрест","Через 50 км проверьте затяжку"]},bat:{title:"АКБ — прикурить",color:C.y,steps:["Красный: + ваш → + донор","Чёрный: − донор → металл кузова","Заведите донор, ждите 5 мин","Заводите свой автомобиль","Провода в обратном порядке","30 мин езды для зарядки"]},heat:{title:"Перегрев",color:C.r,steps:["Немедленно остановитесь!","Заглушите мотор, аварийка","НЕ открывайте крышку — кипяток!","Ждите 30 минут","Долейте охлаждающую жидкость","Утечка → только эвакуатор"]}};
    if(step){const g=G[step];return<div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{display:"flex",gap:10,alignItems:"center"}}><button onClick={()=>setStep(null)} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:20,padding:0}}>←</button><div style={{fontSize:16,fontWeight:700,color:g.color,fontFamily:S}}>{g.title}</div></div><Card>{g.steps.map((s,i)=><div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<g.steps.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}><div style={{minWidth:26,height:26,borderRadius:"50%",background:g.color+"20",border:`1px solid ${g.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:g.color,fontFamily:M}}>{i+1}</span></div><span style={{fontSize:13,color:C.t,fontFamily:S,lineHeight:1.6}}>{s}</span></div>)}</Card></div>;}
    return<div style={{display:"flex",flexDirection:"column",gap:14}}><BackHeader title="Экстренная помощь" onBack={()=>setSub(null)}/><a href="tel:112" style={{textDecoration:"none"}}><Card style={{background:`${C.r}12`,borderColor:`${C.r}40`,textAlign:"center",padding:"20px",cursor:"pointer"}}><div style={{fontSize:36,marginBottom:6}}>🆘</div><div style={{fontSize:18,fontWeight:700,color:C.r,fontFamily:M,letterSpacing:2}}>ЗВОНОК 112</div></Card></a><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[{id:"dtb",icon:"💥",label:"ДТП",color:C.r},{id:"flat",icon:"🛞",label:"КОЛЕСО",color:C.y},{id:"bat",icon:"🔋",label:"АКБ",color:C.y},{id:"heat",icon:"🌡",label:"ПЕРЕГРЕВ",color:C.r}].map(({id,icon,label,color})=><Card key={id} onClick={()=>setStep(id)} style={{cursor:"pointer",borderColor:`${color}25`,padding:"14px"}}><div style={{fontSize:26,marginBottom:6}}>{icon}</div><div style={{fontSize:11,fontWeight:700,color,fontFamily:M}}>{label}</div></Card>)}</div><Card><Lbl>НОМЕРА</Lbl>{[["112","Единая"],["101","Пожарная"],["102","Полиция"],["103","Скорая"]].map(([num,name])=><a key={num} href={`tel:${num}`} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,textDecoration:"none"}}><span style={{fontSize:13,color:C.t,fontFamily:S}}>{name}</span><span style={{fontSize:13,color:C.o,fontFamily:M,fontWeight:700}}>{num}</span></a>)}</Card></div>;
  }
  const menu=[
    {id:"garage",icon:"🏠",label:"МОЙ ГАРАЖ",sub:`${cars.length} авт. · переключить активное`},
    {id:"appts",icon:"📅",label:"ЗАПИСИ В СЕРВИС",sub:"Добавить запись к мастеру"},
    {id:"tires",icon:"🛞",label:"ДАВЛЕНИЕ ШИН",sub:"Контроль всех 4 колёс"},
    {id:"service",icon:"🔍",label:"НАЙТИ СЕРВИС",sub:`Рядом с вами${geo?.city?` в ${geo.city}`:""}`},
    {id:"tips",icon:"💡",label:"СОВЕТЫ ДЖАРВИСА",sub:"ИИ-ответы на вопросы об авто"},
    {id:"sos",icon:"🆘",label:"ЭКСТРЕННАЯ ПОМОЩЬ",sub:"ДТП, поломка, инструкции"},
    {id:"profile",icon:"🚗",label:"МОЙ АВТОМОБИЛЬ",sub:"VIN, гос. номер, данные"},
    {id:"settings",icon:"⚙",label:"НАСТРОЙКИ",sub:"Уведомления, единицы, сброс"},
  ];
  return<div style={{display:"flex",flexDirection:"column",gap:10}}>
    <div style={{fontSize:18,fontWeight:700,color:C.t,fontFamily:S}}>Ещё</div>
    {!geo?.city&&<Card style={{background:`${C.b}06`,borderColor:`${C.b}20`,cursor:"pointer"}} onClick={onRequestGeo}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:20}}>📍</span><div style={{flex:1}}><div style={{fontSize:12,color:C.b,fontFamily:M}}>{geoLoading?"ОПРЕДЕЛЯЮ...":"ВКЛЮЧИТЬ ГЕОЛОКАЦИЮ"}</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>ОСАГО по региону и сервисы рядом</div></div></div></Card>}
    <Card>{menu.map((m,i)=><div key={m.id}><div onClick={()=>setSub(m.id)} style={{display:"flex",gap:12,padding:"13px 0",alignItems:"center",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.opacity=".75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}><span style={{fontSize:22,flexShrink:0}}>{m.icon}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.t,fontFamily:S}}>{m.label}</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>{m.sub}</div></div><span style={{fontSize:18,color:C.t2}}>›</span></div>{i<menu.length-1&&<div style={{height:1,background:C.border}}/>}</div>)}</Card>
    <Card style={{background:`${C.o}06`,borderColor:`${C.o}15`,textAlign:"center",padding:"18px"}}><div style={{fontSize:22,marginBottom:6}}>⚙</div><div style={{fontSize:10,fontWeight:700,color:C.o,fontFamily:M,letterSpacing:1,marginBottom:4}}>JARVIS AUTO BETA v7</div><div style={{fontSize:11,color:C.t2,fontFamily:S}}>Гараж · Шины · Записи · История ТО · Настройки</div></Card>
  </div>;
}

/* ── ROOT ────────────────────────────────────────────────────────── */
const TABS=[{id:"home",icon:"⌂",label:"ГЛАВНАЯ"},{id:"diag",icon:"⚙",label:"ДИАГНОЗ"},{id:"body",icon:"🚗",label:"КУЗОВ"},{id:"maintain",icon:"≡",label:"СЕРВИС"},{id:"finance",icon:"₽",label:"ФИНАНСЫ"},{id:"more",icon:"···",label:"ЕЩЁ"}];

export default function JarvisApp(){
  const[onboarded,setOnboarded]=usePersist("onboarded",false);
  const[name,setName]=usePersist("name","");
  const[cars,setCars]=usePersist("cars",[DEF_CAR]);
  const[activeCar,setActiveCar]=usePersist("activeCar","car1");
  const[services,setServices]=usePersist("services",DEF_SVC);
  const[diagHistory,setDiagHistory]=usePersist("diagHistory",[]);
  const[expenses,setExpenses]=usePersist("expenses",DEF_EXP);
  const[fuel,setFuel]=usePersist("fuel",DEF_FUEL);
  const[body,setBody]=usePersist("body",DEF_BODY);
  const[tires,setTires]=usePersist("tires",DEF_TIRES);
  const[appts,setAppts]=usePersist("appts",DEF_APPTS);
  const[settings,setSettings]=usePersist("settings",{tips:true,overdue:true,docs:true,pressureUnit:"бар",fuelUnit:"л"});
  const[lastTipTime,setLastTipTime]=usePersist("lastTipTime",0);
  const[tipIdx,setTipIdx]=usePersist("tipIdx",0);
  const[tab,setTab]=useState("home");
  const{toasts,show:toast}=useToast();
  const geoState=useGeo();
  const[currentTip,setCurrentTip]=useState(null);

  // Active car
  const car=useMemo(()=>cars.find(c=>c.id===activeCar)||cars[0]||DEF_CAR,[cars,activeCar]);
  const setCar=useCallback(fn=>setCars(prev=>prev.map(c=>c.id===activeCar?(typeof fn==="function"?fn(c):fn):c)),[setCars,activeCar]);
  const addCar=useCallback(newCar=>setCars(prev=>[...prev,newCar]),[setCars]);
  const removeCar=useCallback(id=>{setCars(prev=>prev.filter(c=>c.id!==id));if(activeCar===id)setActiveCar(cars[0]?.id||"car1");},[setCars,setActiveCar,activeCar,cars]);

  // Auto onboard
  useEffect(()=>{if(onboarded&&!cars.find(c=>c.id===activeCar)&&cars.length>0)setActiveCar(cars[0].id);},[onboarded,cars,activeCar,setActiveCar]);

  // 30-min tips
  useEffect(()=>{
    if(!settings.tips)return;
    const INTERVAL=30*60*1000;
    const check=()=>{if(Date.now()-lastTipTime>=INTERVAL){const idx=tipIdx%AUTO_TIPS.length;setCurrentTip(AUTO_TIPS[idx]);setLastTipTime(Date.now());setTipIdx(idx+1);}};
    const init=setTimeout(check,5000);const iv=setInterval(check,INTERVAL);
    return()=>{clearTimeout(init);clearInterval(iv);};
  },[settings.tips,lastTipTime,tipIdx]); // eslint-disable-line

  const overdueCount=services.filter(s=>s.status==="overdue"||s.status==="warning").length;
  const bodyIssues=BODY_PANELS.filter(p=>body[p.id]?.status==="repair").length;
  const upcomingAppts=appts.filter(a=>new Date(a.date)>=new Date()).length;

  if(!onboarded){
    // Simple onboarding
    const[step,setStep]=useState(0);const[nm,setNm]=useState("");const[fc,setFc]=useState(DEF_CAR);
    const steps=[
      {icon:"⚙",title:"JARVIS AUTO v7",sub:"Гараж · Шины · История ТО · Записи",content:<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{fontSize:14,color:C.t2,fontFamily:S,lineHeight:1.7,textAlign:"center"}}>Полная платформа для управления вашим автомобилем.</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[["⚙","Диагностика","OBD + ИИ"],["🏠","Гараж","Несколько авто"],["🛞","Шины","Давление"],["📅","Записи","К мастеру"]].map(([ic,t,s])=><div key={t} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px",textAlign:"center"}}><div style={{fontSize:20,marginBottom:4}}>{ic}</div><div style={{fontSize:10,color:C.t,fontFamily:M,marginBottom:2}}>{t}</div><div style={{fontSize:10,color:C.t2,fontFamily:S}}>{s}</div></div>)}</div></div>},
      {icon:"👤",title:"КАК ВАС ЗОВУТ?",sub:"Джарвис будет обращаться по имени",content:<Input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Ваше имя"/>},
      {icon:"🚗",title:"ВАШ АВТОМОБИЛЬ",sub:"Базовые данные",content:<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[["МАРКА","make","text","Toyota"],["МОДЕЛЬ","model","text","Camry"],["ГОД","year","number","2019"],["ПРОБЕГ (КМ)","mileage","number","50000"]].map(([l,k,t,ph])=><div key={k}><Lbl mb={4}>{l}</Lbl><Input type={t} value={fc[k]} placeholder={ph} onChange={e=>setFc(p=>({...p,[k]:t==="number"?+e.target.value:e.target.value}))}/></div>)}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><div><Lbl mb={4}>ГОС. НОМЕР</Lbl><Input value={fc.plate} placeholder="А123БВ77" onChange={e=>setFc(p=>({...p,plate:fmtPlate(e.target.value)}))} maxLength={9}/></div><div><Lbl mb={4}>VIN</Lbl><Input value={fc.vin} placeholder="XTA..." onChange={e=>setFc(p=>({...p,vin:fmtVin(e.target.value)}))} maxLength={17}/></div></div>
        <div><Lbl mb={6}>ТОПЛИВО</Lbl><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["АИ-92","АИ-95","АИ-98","Дизель","Газ"].map(f=><button key={f} onClick={()=>setFc(p=>({...p,fuel:f}))} style={{padding:"5px 12px",fontSize:11,fontFamily:S,background:fc.fuel===f?C.oG:"transparent",color:fc.fuel===f?C.o:C.t2,border:`1px solid ${fc.fuel===f?C.o+"60":C.border}`,borderRadius:5,cursor:"pointer"}}>{f}</button>)}</div></div>
      </div>},
    ];
    const cur=steps[step];const valid=[true,nm.trim().length>0,fc.make.trim()&&fc.model.trim()];
    return<div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",fontFamily:M}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center",marginBottom:36}}><div style={{width:44,height:44,borderRadius:"50%",background:C.o,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 24px ${C.o}50`}}><span style={{fontSize:20}}>⚙</span></div><div><div style={{fontSize:18,fontWeight:700,color:C.t}}>JARVIS AUTO</div><div style={{fontSize:9,color:C.t2,letterSpacing:2}}>v7 · AI AUTOMOTIVE PLATFORM</div></div></div>
        <div style={{display:"flex",gap:6,marginBottom:28}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?C.o:C.border,transition:"background .4s"}}/>)}</div>
        <div key={step} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:16,padding:"28px 24px",animation:"fadeUp .35s ease"}}>
          <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:30,marginBottom:10}}>{cur.icon}</div><div style={{fontSize:19,fontWeight:700,color:C.t,marginBottom:5}}>{cur.title}</div><div style={{fontSize:13,color:C.t2,fontFamily:S}}>{cur.sub}</div></div>
          {cur.content}
          <PBtn full onClick={()=>{if(!valid[step])return;if(step<steps.length-1){setStep(s=>s+1);}else{const finalCar={...fc,year:+fc.year,mileage:+fc.mileage};setName(nm.trim()||"Водитель");setCars([finalCar]);setActiveCar(finalCar.id);setOnboarded(true);}}} disabled={!valid[step]} style={{marginTop:18,padding:"14px"}}>{step<steps.length-1?"ПРОДОЛЖИТЬ →":"ВОЙТИ В ДЖАРВИС ⚙"}</PBtn>
          {step>0&&<GBtn full onClick={()=>setStep(s=>s-1)} style={{marginTop:10}}>← НАЗАД</GBtn>}
        </div>
      </div>
    </div>;
  }

  const screens={
    home:<Dashboard name={name} car={car} services={services} diagHistory={diagHistory} expenses={expenses} fuel={fuel} body={body} tires={tires} geo={geoState.geo} setTab={setTab} toast={toast} appts={appts} onRequestGeo={geoState.request} geoLoading={geoState.loading}/>,
    diag:<Diagnostics history={diagHistory} setHistory={setDiagHistory} car={car} toast={toast}/>,
    body:<BodyMap body={body} setBody={setBody} car={car} toast={toast}/>,
    maintain:<Maintain services={services} setServices={setServices} car={car} setCar={setCar} toast={toast}/>,
    finance:<Finance expenses={expenses} setExpenses={setExpenses} fuel={fuel} setFuel={setFuel} car={car} toast={toast}/>,
    more:<More car={car} name={name} cars={cars} activeCar={activeCar} setActiveCar={setActiveCar} addCar={addCar} removeCar={removeCar} toast={toast} setCar={setCar} expenses={expenses} setExpenses={setExpenses} fuel={fuel} setFuel={setFuel} body={body} geo={geoState.geo} onRequestGeo={geoState.request} geoLoading={geoState.loading} appts={appts} setAppts={setAppts} settings={settings} setSettings={setSettings} tires={tires} setTires={setTires} setServices={setServices}/>,
    appts:<Appointments appts={appts} setAppts={setAppts} toast={toast} car={car} geo={geoState.geo}/>,
  };

  return<div style={{fontFamily:M,background:C.bg,minHeight:"100vh",display:"flex",flexDirection:"column",maxWidth:640,margin:"0 auto"}}>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
    <style>{`*{box-sizing:border-box}body{margin:0}input{-webkit-appearance:none}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    <Toasts toasts={toasts}/>
    <TipCard tip={currentTip} onClose={()=>setCurrentTip(null)}/>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 18px",borderBottom:`1px solid ${C.border}`,background:C.bg2,position:"sticky",top:0,zIndex:50}}>
      <div onClick={()=>setTab("home")} style={{width:32,height:32,borderRadius:"50%",background:C.o,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",boxShadow:`0 0 12px ${C.o}50`}}><span style={{fontSize:15}}>⚙</span></div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:C.t,fontFamily:S,letterSpacing:-.3}}>JARVIS AUTO</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontSize:9,color:C.t2,letterSpacing:1,fontFamily:M}}>{car.make} {car.model}</div>
          {car.plate&&<div style={{padding:"0px 6px",background:`${C.o}15`,border:`1px solid ${C.o}30`,borderRadius:4}}><span style={{fontSize:9,fontWeight:700,color:C.o,fontFamily:M,letterSpacing:1}}>{car.plate}</span></div>}
          {cars.length>1&&<div style={{padding:"0px 6px",background:`${C.p}15`,border:`1px solid ${C.p}30`,borderRadius:4}}><span style={{fontSize:8,color:C.p,fontFamily:M}}>{cars.length} авт.</span></div>}
          {geoState.geo?.city&&<div style={{display:"flex",gap:2,alignItems:"center"}}><span style={{fontSize:8}}>📍</span><span style={{fontSize:8,color:C.t2,fontFamily:M}}>{geoState.geo.city}</span></div>}
        </div>
      </div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:5,height:5,borderRadius:"50%",background:C.g,boxShadow:`0 0 6px ${C.g}`}}/><span style={{fontSize:8,color:C.g,fontFamily:M,letterSpacing:1}}>ONLINE</span></div>
    </div>
    {/* Content */}
    <div style={{flex:1,padding:"18px 16px 94px",overflowY:"auto"}}><div key={tab} style={{animation:"fadeUp .25s ease"}}>{screens[tab]||screens.home}</div></div>
    {/* Bottom nav */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:640,background:C.bg2,borderTop:`1px solid ${C.border}`,display:"flex",padding:"8px 0 18px",zIndex:40}}>
      {TABS.map(t=>{const active=tab===t.id;const badge=t.id==="maintain"?overdueCount:t.id==="body"?bodyIssues:t.id==="more"?upcomingAppts:0;return<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",color:active?C.o:C.t2,transition:"color .15s",position:"relative",padding:"4px 0"}}>
        {active&&<div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",width:28,height:2,background:C.o,borderRadius:1}}/>}
        <span style={{fontSize:t.id==="body"?14:19,lineHeight:1}}>{t.icon}</span>
        <span style={{fontSize:7.5,letterSpacing:.8,fontFamily:M}}>{t.label}</span>
        <Badge n={badge} color={t.id==="more"?C.b:C.r}/>
      </button>;})}
    </div>
  </div>;
}
