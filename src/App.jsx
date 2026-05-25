import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ComposedChart } from "recharts";
import { useAuth } from "./AuthContext.jsx";
import AuthScreen from "./AuthScreen.jsx";
import UserMenu from "./UserMenu.jsx";
import SyncIndicator from "./SyncIndicator.jsx";
import { OBD_DATABASE as OBD_DB, lookupOBD, OBD_STATS } from "./obdDatabase.js";
import { decodeVin, applyVinToCar } from "./vinDecoder.js";
import { useFirestoreSync } from "./useFirestoreSync.js";
import GarageScreen, { makeNewCarId, makeEmptyCar } from "./GarageScreen.jsx";
import VisionAI from "./VisionAI.jsx";

/* ── COLORS & FONTS ──────────────────────────────────────────────── */
const C={bg:"#060c18",bg2:"#08101f",card:"#0b1628",card2:"#0d1a30",border:"rgba(255,255,255,0.07)",border2:"rgba(255,255,255,0.14)",o:"#FF6B00",oG:"rgba(255,107,0,0.1)",oD:"rgba(255,107,0,0.05)",t:"#dde3f0",t2:"#5a7090",t3:"#2e4060",g:"#22c55e",gG:"rgba(34,197,94,0.1)",y:"#f59e0b",yG:"rgba(245,158,11,0.1)",r:"#ef4444",rG:"rgba(239,68,68,0.1)",b:"#3b82f6",bG:"rgba(59,130,246,0.1)",p:"#8b5cf6",pG:"rgba(139,92,246,0.1)",teal:"#14b8a6"};
const M="'IBM Plex Mono',monospace",S="'IBM Plex Sans',sans-serif";

/* ── BODY PANELS ─────────────────────────────────────────────────── */
const PANEL_STATUS=[{id:"ok",label:"НОРМА",color:C.g,icon:"✓"},{id:"scratch",label:"ЦАРАПИНА",color:C.y,icon:"∼"},{id:"dent",label:"ВМЯТИНА",color:C.o,icon:"◎"},{id:"repair",label:"РЕМОНТ",color:C.r,icon:"⚠"},{id:"fixed",label:"ГОТОВО",color:C.b,icon:"✔"}];
const PS=Object.fromEntries(PANEL_STATUS.map(s=>[s.id,s]));
const nextStatus=cur=>{const i=PANEL_STATUS.findIndex(s=>s.id===cur);return PANEL_STATUS[(i+1)%PANEL_STATUS.length].id;};
const BODY_PANELS=[{id:"bumper_f",name:"Передний бампер",path:"M 55,10 L 145,10 L 150,35 L 50,35 Z"},{id:"hood",name:"Капот",path:"M 50,35 L 150,35 L 148,110 L 52,110 Z"},{id:"fender_fl",name:"Крыло пер. лев.",path:"M 30,40 L 52,40 L 52,110 L 30,110 Z"},{id:"fender_fr",name:"Крыло пер. прав.",path:"M 148,40 L 170,40 L 170,110 L 148,110 Z"},{id:"windshield_f",name:"Лобовое стекло",path:"M 52,110 L 148,110 L 145,140 L 55,140 Z"},{id:"door_fl",name:"Дверь пер. лев.",path:"M 28,112 L 52,112 L 52,195 L 28,195 Z"},{id:"door_fr",name:"Дверь пер. прав.",path:"M 148,112 L 172,112 L 172,195 L 148,195 Z"},{id:"roof",name:"Крыша",path:"M 55,140 L 145,140 L 145,230 L 55,230 Z"},{id:"door_rl",name:"Дверь зад. лев.",path:"M 28,195 L 52,195 L 52,270 L 28,270 Z"},{id:"door_rr",name:"Дверь зад. прав.",path:"M 148,195 L 172,195 L 172,270 L 148,270 Z"},{id:"windshield_r",name:"Заднее стекло",path:"M 55,230 L 145,230 L 148,260 L 52,260 Z"},{id:"quarter_l",name:"Крыло зад. лев.",path:"M 28,270 L 52,270 L 52,345 L 30,345 Z"},{id:"quarter_r",name:"Крыло зад. прав.",path:"M 148,270 L 172,270 L 170,345 L 148,345 Z"},{id:"trunk",name:"Крышка багажника",path:"M 52,260 L 148,260 L 150,345 L 50,345 Z"},{id:"bumper_r",name:"Задний бампер",path:"M 50,345 L 150,345 L 145,370 L 55,370 Z"},{id:"wheel_fl",name:"Колесо пер. лев.",path:"M 8,55 L 28,55 L 28,105 L 8,105 Z",wheel:true},{id:"wheel_fr",name:"Колесо пер. прав.",path:"M 172,55 L 192,55 L 192,105 L 172,105 Z",wheel:true},{id:"wheel_rl",name:"Колесо зад. лев.",path:"M 8,250 L 28,250 L 28,300 L 8,300 Z",wheel:true},{id:"wheel_rr",name:"Колесо зад. прав.",path:"M 172,250 L 192,250 L 192,300 L 172,300 Z",wheel:true}];
const DEF_BODY=Object.fromEntries(BODY_PANELS.map(p=>[p.id,{status:"ok",note:""}]));

/* ── DEFAULTS ────────────────────────────────────────────────────── */
const DEF_TIRES={fl:{pos:"Перед лев.",pressure:2.2,target:2.2,lastCheck:""},fr:{pos:"Перед прав.",pressure:2.1,target:2.2,lastCheck:""},rl:{pos:"Зад. лев.",pressure:2.1,target:2.1,lastCheck:""},rr:{pos:"Зад. прав.",pressure:2.0,target:2.1,lastCheck:""}};
const DEF_CAR={id:"car1",make:"Toyota",model:"Camry",year:2019,mileage:52400,color:"Белый перламутр",fuel:"АИ-95",vin:"",plate:""};
const DEF_SVC=[{id:1,name:"Моторное масло",icon:"🛢",lastKm:45000,lastDate:"2025-02-10",intervalKm:10000,intervalMo:12,status:"ok",history:[]},{id:2,name:"Воздушный фильтр",icon:"💨",lastKm:38000,lastDate:"2024-10-15",intervalKm:20000,intervalMo:18,status:"ok",history:[]},{id:3,name:"Тормозная жидкость",icon:"🔴",lastKm:28000,lastDate:"2022-08-01",intervalKm:40000,intervalMo:24,status:"overdue",history:[]},{id:4,name:"Тормозные колодки",icon:"⬛",lastKm:40000,lastDate:"2024-08-20",intervalKm:40000,intervalMo:36,status:"ok",history:[]},{id:5,name:"Свечи зажигания",icon:"⚡",lastKm:20000,lastDate:"2022-05-10",intervalKm:30000,intervalMo:36,status:"overdue",history:[]},{id:6,name:"Антифриз",icon:"🧊",lastKm:30000,lastDate:"2023-03-15",intervalKm:60000,intervalMo:24,status:"warning",history:[]},{id:7,name:"АКПП масло",icon:"⚙️",lastKm:30000,lastDate:"2023-03-01",intervalKm:60000,intervalMo:48,status:"ok",history:[]},{id:8,name:"Салонный фильтр",icon:"🌬",lastKm:42000,lastDate:"2024-12-01",intervalKm:15000,intervalMo:12,status:"warning",history:[]}];
const DEF_EXP=[{id:1,date:"2025-05-10",cat:"топливо",amount:3200,note:"АЗС Лукойл"},{id:2,date:"2025-04-18",cat:"сервис",amount:4500,note:"Замена масла"},{id:3,date:"2025-04-03",cat:"топливо",amount:2900,note:"АЗС Shell"},{id:4,date:"2025-03-20",cat:"страховка",amount:18000,note:"КАСКО 2025"},{id:5,date:"2025-03-12",cat:"топливо",amount:3100,note:"АЗС Газпром"},{id:6,date:"2025-02-28",cat:"запчасти",amount:2200,note:"Щётки"},{id:7,date:"2025-01-22",cat:"топливо",amount:3400,note:"АЗС BP"},{id:8,date:"2024-12-15",cat:"сервис",amount:6800,note:"Замена колодок"},{id:9,date:"2024-11-20",cat:"топливо",amount:3100,note:"АЗС Роснефть"},{id:10,date:"2024-10-05",cat:"страховка",amount:5200,note:"ОСАГО продление"}];
const DEF_FUEL=[{id:1,date:"2025-05-10",liters:45,cost:3200,odometer:52400,station:"АЗС Лукойл"},{id:2,date:"2025-04-03",liters:42,cost:2900,odometer:51650,station:"АЗС Shell"},{id:3,date:"2025-03-12",liters:43,cost:3100,odometer:50900,station:"АЗС Газпром"},{id:4,date:"2025-01-22",liters:47,cost:3400,odometer:49800,station:"АЗС BP"},{id:5,date:"2024-12-10",liters:44,cost:3000,odometer:48900,station:"АЗС Роснефть"}];
const DEF_DOCS=[{id:1,name:"ОСАГО",icon:"📄",expires:"2025-11-15",note:"Ингосстрах"},{id:2,name:"КАСКО",icon:"🛡",expires:"2026-01-20",note:"АльфаСтрахование"},{id:3,name:"Техосмотр",icon:"🔍",expires:"2025-08-01",note:"2 года"},{id:4,name:"Права",icon:"🪪",expires:"2030-05-14",note:"Категория B"}];
const CAT_CLR={топливо:C.o,сервис:C.b,страховка:C.p,запчасти:C.y,штрафы:C.r,прочее:C.t2};

/* ── UTILS ───────────────────────────────────────────────────────── */
function usePersist(key,init){const[v,setV]=useState(()=>{try{const s=localStorage.getItem("ja9_"+key);return s?JSON.parse(s):init}catch{return init}});const set=useCallback(fn=>setV(prev=>{const next=typeof fn==="function"?fn(prev):fn;try{localStorage.setItem("ja9_"+key,JSON.stringify(next))}catch{}return next}),[key]);return[v,set];}
function useToast(){const[toasts,setToasts]=useState([]);const show=useCallback((msg,type="info",dur=3000)=>{const id=Date.now();setToasts(p=>[...p,{id,msg,type}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),dur);},[]);return{toasts,show};}
const rub=n=>(n||0).toLocaleString("ru-RU")+" ₽";
const sCfg={ok:{color:C.g,bg:C.gG,label:"OK",icon:"✓"},warning:{color:C.y,bg:C.yG,label:"СКОРО",icon:"⚠"},overdue:{color:C.r,bg:C.rG,label:"ПРОСРОЧЕНО",icon:"✗"}};
const dCfg={"низкий":{color:C.g,bg:C.gG,label:"НИЗКИЙ"},"средний":{color:C.y,bg:C.yG,label:"СРЕДНИЙ"},"высокий":{color:C.r,bg:C.rG,label:"ВЫСОКИЙ"}};
const urgClr={"сегодня":C.r,"3 дня":C.r,"1 неделя":C.y,"1 месяц":C.g};
const daysUntil=d=>Math.round((new Date(d)-new Date())/86400000);
const docStatus=d=>{const days=daysUntil(d);return days<0?"overdue":days<30?"warning":"ok";};
const fmtPlate=v=>v.toUpperCase().replace(/[^А-ЯA-Z0-9]/g,"").slice(0,9);
const fmtVin=v=>v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,17);
function calcSvcStatus(svc,mileage){const kmUsed=mileage-svc.lastKm;const moUsed=(Date.now()-new Date(svc.lastDate))/(1000*60*60*24*30);const kmPct=kmUsed/svc.intervalKm;const moPct=svc.intervalMo>0?moUsed/svc.intervalMo:0;const worst=Math.max(kmPct,moPct);if(worst>=1)return"overdue";if(worst>=0.85)return"warning";return"ok";}
function recalcAll(svcs,mileage){return svcs.map(s=>({...s,status:calcSvcStatus(s,mileage)}));}
const calcHealth=s=>Math.max(0,Math.min(100,100-s.filter(x=>x.status==="overdue").length*18-s.filter(x=>x.status==="warning").length*8));
const tirePressureStatus=p=>{if(p<1.6||p>3.0)return{color:C.r,label:"КРИТИЧНО"};if(p<1.9||p>2.6)return{color:C.y,label:"НИЗКОЕ"};return{color:C.g,label:"НОРМА"};};
const AUTO_TIPS=[{icon:"🛢",tip:"Проверьте уровень масла — 2 минуты защищают двигатель стоимостью 200+ тысяч рублей."},{icon:"💨",tip:"Правильное давление в шинах снижает расход топлива до 3% и продлевает срок службы резины."},{icon:"💧",tip:"Проверьте охлаждающую жидкость. Перегрев двигателя = ремонт на 100-300 тысяч рублей."},{icon:"🔦",tip:"Проверьте все фонари. Неработающий стоп-сигнал — штраф и угроза безопасности на дороге."},{icon:"⚡",tip:"Изношенные свечи увеличивают расход топлива до 15% и снижают динамику разгона."},{icon:"🛞",tip:"Дисбаланс колёс ускоряет износ подвески. Балансировка стоит 500-800 ₽ за колесо."},{icon:"🔴",tip:"Скрипящие тормоза — сигнал износа колодок. Это вопрос безопасности, не откладывайте."},{icon:"🌬",tip:"Забитый салонный фильтр снижает КПД кондиционера и ухудшает качество воздуха в салоне."}];

/* ── ATOMS ───────────────────────────────────────────────────────── */
function Ring({val,max=100,size=108,sw=9,color,children}){const R=(size-sw)/2,C2=2*Math.PI*R,pct=Math.min(val/max,1);return<div style={{position:"relative",width:size,height:size}}><svg width={size} height={size} style={{transform:"rotate(-90deg)",display:"block"}}><circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={`${pct*C2} ${C2}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>{children}</div></div>;}
function Badge({n,color=C.r}){if(!n)return null;return<div style={{position:"absolute",top:-5,right:-5,minWidth:17,height:17,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",border:`2px solid ${C.bg}`}}><span style={{fontSize:8,color:"white",fontWeight:700,fontFamily:M}}>{n>9?"9+":n}</span></div>;}
const Pill=({children,color=C.o})=><span style={{fontSize:9,fontWeight:700,letterSpacing:.8,padding:"2px 9px",borderRadius:20,background:color+"22",color,fontFamily:M,whiteSpace:"nowrap"}}>{children}</span>;
const Card=({children,style={},onClick})=><div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",...style,cursor:onClick?"pointer":"default"}}>{children}</div>;
const Lbl=({children,color=C.t2,mb=8,style={}})=><div style={{fontSize:10,color,letterSpacing:2.5,fontFamily:M,marginBottom:mb,...style}}>{children}</div>;
function Input({value,onChange,placeholder,type="text",style={},maxLength,onKeyDown,autoFocus}){return<input autoFocus={autoFocus} type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} maxLength={maxLength} style={{width:"100%",padding:"11px 14px",fontSize:13,fontFamily:M,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:9,color:C.t,outline:"none",boxSizing:"border-box",...style}} onFocus={e=>e.target.style.borderColor=C.o} onBlur={e=>e.target.style.borderColor=C.border}/>;}
function PBtn({children,onClick,disabled,full,color=C.o,style={}}){return<button onClick={onClick} disabled={disabled} style={{padding:"12px 20px",background:disabled?C.card2:color,color:disabled?C.t3:"white",border:"none",borderRadius:10,fontSize:12,fontFamily:M,fontWeight:700,cursor:disabled?"not-allowed":"pointer",letterSpacing:1,width:full?"100%":undefined,opacity:disabled?.5:1,...style}} onMouseEnter={e=>!disabled&&(e.currentTarget.style.opacity=".85")} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>{children}</button>;}
function GBtn({children,onClick,full,style={}}){return<button onClick={onClick} style={{padding:"10px 18px",background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontSize:11,fontFamily:M,cursor:"pointer",letterSpacing:1,width:full?"100%":undefined,...style}}>{children}</button>;}
function Spinner(){return<div style={{textAlign:"center",padding:"44px 0"}}><div style={{fontSize:28,color:C.o,display:"inline-block",animation:"spin 1.4s linear infinite"}}>⚙</div><div style={{marginTop:14,fontSize:10,color:C.t2,letterSpacing:3,fontFamily:M}}>ОБРАБОТКА...</div></div>;}
function Toasts({toasts}){const tc={success:C.g,error:C.r,info:C.o,tip:C.b};return<div style={{position:"fixed",top:66,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:608,zIndex:999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>{toasts.map(t=><div key={t.id} style={{background:C.card2,border:`1px solid ${C.border2}`,borderRadius:10,padding:"12px 16px",fontSize:12,color:C.t,fontFamily:S,display:"flex",alignItems:"center",gap:10,animation:"slideIn .3s ease"}}>📢 {t.msg}</div>)}</div>;}

/* ────────────────────────────────────────────────────────────────── */
/*                         ГЛАВНЫЙ КОМПОНЕНТ                         */
/* ────────────────────────────────────────────────────────────────── */

export default function App() {
  // ── Auth & User ──────────────────────────────────────────────────
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  // ── Main State ───────────────────────────────────────────────────
  const [car, setCar]             = usePersist("car", DEF_CAR);
  const [services, setServices]   = usePersist("services", DEF_SVC);
  const [expenses, setExpenses]   = usePersist("expenses", DEF_EXP);
  const [fuel, setFuel]           = usePersist("fuel", DEF_FUEL);
  const [diagHistory, setDiagHistory] = usePersist("diag", []);
  const [body, setBody]           = usePersist("body", DEF_BODY);
  const [tires, setTires]         = usePersist("tires", DEF_TIRES);
  const [docs, setDocs]           = usePersist("docs", DEF_DOCS);
  const [appts, setAppts]         = usePersist("appts", []);

  // ── Firestore Sync ───────────────────────────────────────────────
  const { cloudReady, cloudError } = useFirestoreSync({
    uid, car, setCar, services, setServices, expenses, setExpenses,
    fuel, setFuel, diagHistory, setDiagHistory, body, setBody,
    tires, setTires, docs, setDocs, appts, setAppts,
  });

  // ── UI State ─────────────────────────────────────────────────────
  const [tab, setTab]             = useState("dash");
  const [activeProfile, setActiveProfile] = useState(false);
  const [toast, showToast]        = useToast();
  const [diagInput, setDiagInput] = useState("");
  const [diagResult, setDiagResult] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState("");
  const [mileageInput, setMileageInput] = useState(car.mileage || 52400);

  // ── Мобильное меню ───────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Синхронизируем услуги когда меняется пробег
  useEffect(() => {
    setCar(prev => ({ ...prev, mileage: mileageInput }));
    setServices(recalcAll(services, mileageInput));
  }, [mileageInput, setCar, setServices, services]);

  // ── Анимация при загрузке ──────────────────────────────────��─────
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes ja-fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
      @keyframes ja-spin { to { transform:rotate(360deg) } }
      @keyframes ja-pulse { 0%,100% { opacity:.15 } 50% { opacity:.4 } }
      @keyframes slideIn { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }
      .ja-fade { animation: ja-fadeUp .5s ease both }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Если не авторизован ──────────────────────────────────────────
  if (authLoading) {
    return <Spinner />;
  }

  if (!user) {
    return <AuthScreen />;
  }

  // ── Если облако еще не готово ────────────────────────────────────
  if (!cloudReady) {
    return <Spinner />;
  }

  if (cloudError) {
    console.warn("[App] Cloud error (работаем с localStorage):", cloudError);
  }

  // ─────────────────────────────────────────────────────────────────
  //                  ПРОФИЛЬ / ГАРАЖ (МОДАЛЬНОЕ ОКНО)
  // ─────────────────────────────────────────────────────────────────
  if (activeProfile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", padding: "16px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}`,
          }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.t, fontFamily: S }}>
              ⚙ Мой гараж
            </h1>
            <button onClick={() => setActiveProfile(false)} style={{
              background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.t2,
            }}>×</button>
          </div>
          <GarageScreen car={car} setCar={setCar} onClose={() => setActiveProfile(false)} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  //                    ГЛАВНЫЙ ИНТЕРФЕЙС
  // ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <style>{`
        @keyframes ja-fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes ja-spin { to { transform:rotate(360deg) } }
        @keyframes ja-pulse { 0%,100% { opacity:.15 } 50% { opacity:.4 } }
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
        borderBottom: `1px solid ${C.border2}`,
        padding: "14px 16px",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 16,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: C.o,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t, fontFamily: S }}>
                JARVIS AUTO
              </div>
              <div style={{ fontSize: 8, color: C.t2, fontFamily: M, letterSpacing: 2 }}>
                v9.1 · CLOUD SYNC
              </div>
            </div>
          </div>

          {/* Info */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            fontSize: 11, color: C.t2, fontFamily: M,
            textAlign: "right",
          }}>
            <div>
              <div style={{ color: C.t, fontSize: 12, fontWeight: 600 }}>
                {car.make} {car.model}
              </div>
              <div>{(car.mileage || 0).toLocaleString()} км</div>
            </div>
            {/* Sync Status */}
            <SyncIndicator />
            {/* User Menu */}
            <UserMenu onProfileClick={() => setActiveProfile(true)} />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10, marginBottom: 24,
        }}>
          {[
            { id: "dash", label: "📊 ДАШБОРД", icon: "📊" },
            { id: "diag", label: "🔍 ДИАГНОСТИКА", icon: "🔍" },
            { id: "vision", label: "📷 VISION AI", icon: "📷" },
            { id: "maintain", label: "🔧 ТО", icon: "🔧" },
            { id: "finance", label: "💰 ФИНАНСЫ", icon: "💰" },
            { id: "body", label: "🚗 КУЗОВ", icon: "🚗" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "12px 16px", borderRadius: 10,
              background: tab === t.id ? C.o : C.card2,
              border: `1px solid ${tab === t.id ? C.o + "50" : C.border}`,
              color: tab === t.id ? "white" : C.t2,
              fontSize: 11, fontFamily: M, fontWeight: 700,
              cursor: "pointer", letterSpacing: 1,
              transition: "all .2s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: ДАШБОРД ──────────────────────────────────────────── */}
        {tab === "dash" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {/* Health Score */}
            <Card style={{ gridColumn: "span 1" }}>
              <Lbl>ЗДОРОВЬЕ АВТО</Lbl>
              <Ring val={calcHealth(services)} max={100} size={120} color={
                calcHealth(services) > 70 ? C.g :
                calcHealth(services) > 40 ? C.y : C.r
              }>
                <span style={{ fontSize: 24, fontWeight: 700, color: C.t }}>
                  {Math.round(calcHealth(services))}%
                </span>
              </Ring>
            </Card>

            {/* Services Status */}
            <Card>
              <Lbl>ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ</Lbl>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {services.slice(0, 3).map(s => {
                  const cfg = sCfg[s.status];
                  return (
                    <div key={s.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 10px", background: cfg.bg, borderRadius: 8, border: `1px solid ${cfg.color}22`,
                    }}>
                      <span style={{ fontSize: 11, color: C.t, fontFamily: S, fontWeight: 500 }}>
                        {s.icon} {s.name}
                      </span>
                      <span style={{
                        fontSize: 8, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: cfg.color + "25", color: cfg.color, fontFamily: M,
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Last Expenses */}
            <Card>
              <Lbl>ПОСЛЕДНИЕ РАСХОДЫ</Lbl>
              {expenses.slice(0, 3).map(e => (
                <div key={e.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingBottom: 8, marginBottom: 8, borderBottom: `1px solid ${C.border}`,
                  fontSize: 11, color: C.t2, fontFamily: S,
                }}>
                  <span>{e.cat}</span>\n                  <strong style={{ color: C.t }}>{rub(e.amount)}</strong>\n                </div>\n              ))}\n            </Card>\n          </div>\n        )}\n\n        {/* ── TAB: ДИАГНОСТИКА ──────────────────────────────────────── */}\n        {tab === \"diag\" && (\n          <div>\n            <Card style={{ marginBottom: 16 }}>\n              <Lbl>ВВЕ­ДИ ТЕ КОД OBD-II</Lbl>\n              <div style={{ display: \"flex\", gap: 10 }}>\n                <Input\n                  value={diagInput}\n                  onChange={e => setDiagInput(e.target.value)}\n                  placeholder=\"P0301, P0420 или опиши симптом\"\n                  onKeyDown={e => e.key === \"Enter\" && analyzeDiag()}\n                  autoFocus\n                />\n                <PBtn onClick={analyzeDiag} disabled={diagLoading || !diagInput}>\n                  {diagLoading ? \"...\" : \"🔍\"}\n                </PBtn>\n              </div>\n              {diagError && <div style={{ marginTop: 10, color: C.r, fontSize: 11 }}>⚠ {diagError}</div>}\n            </Card>\n\n            {diagResult && (\n              <Card style={{  marginBottom: 16, borderLeft: `3px solid ${diagResult.danger === \"высокий\" ? C.r : diagResult.danger === \"средний\" ? C.y : C.g}` }}>\n                <div style={{ display: \"flex\", justifyContent: \"space-between\", alignItems: \"center\", marginBottom: 12 }}>\n                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.t, fontFamily: S }}>\n                    {diagResult.title}\n                  </h2>\n                  <Pill color={dCfg[diagResult.danger].color}>\n                    {dCfg[diagResult.danger].label}\n                  </Pill>\n                </div>\n                <p style={{ fontSize: 12, color: C.t2, fontFamily: S, lineHeight: 1.6, marginBottom: 12 }}>\n                  {diagResult.description}\n                </p>\n                <div style={{ display: \"grid\", gridTemplateColumns: \"1fr 1fr\", gap: 10, marginBottom: 12 }}>\n                  <div style={{ padding: 10, background: C.bg2, borderRadius: 8 }}>\n                    <Lbl mb={4} style={{ fontSize: 9 }}>МОЖНО ЕХАТЬ</Lbl>\n                    <div style={{ fontSize: 18, fontWeight: 700, color: diagResult.can_drive ? C.g : C.r }}>\n                      {diagResult.can_drive ? \"✓ ДА\" : \"✗ НЕТ\"}\n                    </div>\n                  </div>\n                  <div style={{ padding: 10, background: C.bg2, borderRadius: 8 }}>\n                    <Lbl mb={4} style={{ fontSize: 9 }}>СРОЧНОСТЬ</Lbl>\n                    <div style={{ fontSize: 13, fontWeight: 600, color: urgClr[diagResult.urgency] || C.t }}>\n                      {diagResult.urgency || \"—\"}\n                    </div>\n                  </div>\n                </div>\n              </Card>\n            )}\n          </div>\n        )}\n\n        {/* ── TAB: VISION AI ───────────────────────────────────────── */}\n        {tab === \"vision\" && (\n          <VisionAI car={car} />\n        )}\n\n        {/* ── TAB: ТО ───────────────────────────────────────────────── */}\n        {tab === \"maintain\" && (\n          <div>\n            <Card style={{ marginBottom: 16 }}>\n              <Lbl>ПРОБЕГ</Lbl>\n              <div style={{ display: \"flex\", gap: 10, alignItems: \"center\" }}>\n                <Input\n                  type=\"number\"\n                  value={mileageInput}\n                  onChange={e => setMileageInput(parseInt(e.target.value) || 0)}\n                />\n                <span style={{ fontSize: 11, color: C.t2, fontFamily: M, whiteSpace: \"nowrap\" }}>км</span>\n              </div>\n            </Card>\n\n            <div style={{ display: \"grid\", gap: 12 }}>\n              {services.map(s => {\n                const cfg = sCfg[s.status];\n                const used = mileageInput - s.lastKm;\n                const pct = Math.min((used / s.intervalKm) * 100, 100);\n                return (\n                  <Card key={s.id}>\n                    <div style={{ display: \"flex\", justifyContent: \"space-between\", marginBottom: 8 }}>\n                      <div>\n                        <span style={{ fontSize: 13, fontWeight: 600, color: C.t, fontFamily: S }}>\n                          {s.icon} {s.name}\n                        </span>\n                        <div style={{ fontSize: 10, color: C.t2, fontFamily: M, marginTop: 2 }}>\n                          Последний раз: {s.lastKm.toLocaleString()} км\n                        </div>\n                      </div>\n                      <span style={{ fontSize: 9, fontWeight: 700, padding: \"3px 10px\", borderRadius: 20, background: cfg.color + \"22\", color: cfg.color }}>\n                        {cfg.label}\n                      </span>\n                    </div>\n                    <div style={{ background: C.bg2, height: 8, borderRadius: 4, overflow: \"hidden\" }}>\n                      <div style={{ height: \"100%\", width: pct + \"%\", background: cfg.color, transition: \"width .3s\" }} />\n                    </div>\n                  </Card>\n                );\n              })}\n            </div>\n          </div>\n        )}\n\n        {/* ── TAB: ФИНАНСЫ ──────────────────────────────────────────── */}\n        {tab === \"finance\" && (\n          <div>\n            <Card style={{ marginBottom: 16 }}>\n              <Lbl>ОБЩИЕ РАСХОДЫ</Lbl>\n              <div style={{ fontSize: 24, fontWeight: 700, color: C.o, fontFamily: M }}>\n                {rub(expenses.reduce((a, e) => a + e.amount, 0))}\n              </div>\n              <div style={{ fontSize: 10, color: C.t2, fontFamily: S, marginTop: 4 }}>\n                {expenses.length} транзакций\n              </div>\n            </Card>\n\n            <div style={{ display: \"grid\", gap: 12 }}>\n              {expenses.slice(0, 5).map(e => (\n                <Card key={e.id} style={{ display: \"flex\", justifyContent: \"space-between\", alignItems: \"center\" }}>\n                  <div>\n                    <div style={{ fontSize: 12, fontWeight: 600, color: C.t, fontFamily: S }}>{e.note}</div>\n                    <div style={{ fontSize: 10, color: C.t2, fontFamily: M }}>{e.date}</div>\n                  </div>\n                  <div style={{ fontSize: 14, fontWeight: 700, color: CAT_CLR[e.cat] || C.t }}>\n                    {rub(e.amount)}\n                  </div>\n                </Card>\n              ))}\n            </div>\n          </div>\n        )}\n\n        {/* ── TAB: КУЗОВ ────────────────────────────────────────────── */}\n        {tab === \"body\" && (\n          <Card>\n            <Lbl mb={16}>ИНТЕРАКТИВНАЯ СХЕМА КУЗОВА</Lbl>\n            <div style={{ display: \"flex\", justifyContent: \"center\" }}>\n              <svg width=\"100%\" maxWidth=\"300\" viewBox=\"0 0 200 400\" style={{ background: C.bg2, borderRadius: 10 }}>\n                {BODY_PANELS.map(p => {\n                  const status = body[p.id]?.status || \"ok\";\n                  const cfg = PS[status];\n                  return (\n                    <path key={p.id} d={p.path} fill=\"none\" stroke={cfg.color} strokeWidth=\"2\"\n                      style={{ cursor: \"pointer\", opacity: 0.8 }}\n                      onClick={() => setBody(prev => ({\n                        ...prev,\n                        [p.id]: { ...prev[p.id], status: nextStatus(status) }\n                      }))}\n                      title={p.name}\n                    />\n                  );\n                })}\n              </svg>\n            </div>\n          </Card>\n        )}\n      </div>\n\n      {/* ── TOASTS ────────────────────────────────────────────────── */}\n      <Toasts toasts={toast.toasts} />\n    </div>\n  );\n\n  // ── Helper: Анализ диагностики ────────────────────────────────────\n  async function analyzeDiag() {\n    if (!diagInput.trim()) return;\n    setDiagLoading(true);\n    setDiagError(\"\");\n    setDiagResult(null);\n\n    try {\n      const idToken = await user.getIdToken();\n      const res = await fetch(\n        import.meta.env.VITE_FUNCTIONS_URL + \"/analyzeDiagnosis\",\n        {\n          method: \"POST\",\n          headers: {\n            \"Content-Type\": \"application/json\",\n            \"Authorization\": `Bearer ${idToken}`,\n          },\n          body: JSON.stringify({\n            query: diagInput,\n            carMake: car.make,\n            carModel: car.model,\n            carYear: car.year,\n            carMileage: car.mileage,\n            carFuel: car.fuel,\n          }),\n        }\n      );\n\n      const data = await res.json();\n      if (data.error) {\n        setDiagError(data.error);\n      } else {\n        setDiagResult(data);\n        setDiagHistory(prev => [{ ...data, id: Date.now(), query: diagInput }, ...prev].slice(0, 50));\n        setDiagInput(\"\");\n        showToast(\"✓ Диагностика выполнена\", \"success\");\n      }\n    } catch (err) {\n      console.error(err);\n      setDiagError(\"Ошибка подключения. Проверьте интернет и VITE_FUNCTIONS_URL.\");\n    }\n    setDiagLoading(false);\n  }\n}\n