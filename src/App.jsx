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
const C={bg:"#060c18",bg2:"#08101f",card:"#0b1628",card2:"#0d1a30",border:"rgba(255,255,255,0.07)",border2:"rgba(255,255,255,0.14)",o:"#FF6B00",oG:"rgba(255,107,0,0.1)",oD:"rgba(255,107,0,0.05)",t:"#ffffff",t2:"#a0aec0",g:"#10b981",gG:"rgba(16,185,129,0.1)",gD:"rgba(16,185,129,0.05)",y:"#f59e0b",yG:"rgba(245,158,11,0.1)",yD:"rgba(245,158,11,0.05)",r:"#ef4444",rG:"rgba(239,68,68,0.1)",rD:"rgba(239,68,68,0.05)",b:"#3b82f6",bG:"rgba(59,130,246,0.1)",bD:"rgba(59,130,246,0.05)",p:"#a855f7",pG:"rgba(168,85,247,0.1)",pD:"rgba(168,85,247,0.05)"};
const M="'IBM Plex Mono',monospace",S="'IBM Plex Sans',sans-serif";

/* ── BODY PANELS ─────────────────────────────────────────────────── */
const PANEL_STATUS=[{id:"ok",label:"НОРМА",color:C.g,icon:"✓"},{id:"scratch",label:"ЦАРАПИНА",color:C.y,icon:"∼"},{id:"dent",label:"ВМЯТИНА",color:C.o,icon:"◎"},{id:"repair",label:"РЕМОНТ",color:C.r,icon:"✗"}];
const PS=Object.fromEntries(PANEL_STATUS.map(s=>[s.id,s]));
const nextStatus=cur=>{const i=PANEL_STATUS.findIndex(s=>s.id===cur);return PANEL_STATUS[(i+1)%PANEL_STATUS.length].id;};
const BODY_PANELS=[{id:"bumper_f",name:"Передний бампер",path:"M 55,10 L 145,10 L 150,35 L 50,35 Z"},{id:"hood",name:"Капот",path:"M 50,35 L 150,35 L 148,110 L 52,110 Z"},{id:"fender_l",name:"Крыло лев.",path:"M 30,50 L 50,50 L 50,120 L 30,120 Z"},{id:"fender_r",name:"Крыло прав.",path:"M 150,50 L 170,50 L 170,120 L 150,120 Z"},{id:"door_fl",name:"Дверь пер. лев.",path:"M 50,110 L 90,110 L 88,175 L 48,175 Z"},{id:"door_fr",name:"Дверь пер. прав.",path:"M 110,110 L 150,110 L 152,175 L 112,175 Z"},{id:"door_rl",name:"Дверь зад. лев.",path:"M 48,175 L 88,175 L 86,200 L 46,200 Z"},{id:"door_rr",name:"Дверь зад. прав.",path:"M 112,175 L 152,175 L 154,200 L 114,200 Z"},{id:"trunk",name:"Крышка багажника",path:"M 52,110 L 148,110 L 150,145 L 50,145 Z"}];
const DEF_BODY=Object.fromEntries(BODY_PANELS.map(p=>[p.id,{status:"ok",note:""}]));

/* ── DEFAULTS ────────────────────────────────────────────────────── */
const DEF_TIRES={fl:{pos:"Перед лев.",pressure:2.2,target:2.2,lastCheck:""},fr:{pos:"Перед прав.",pressure:2.1,target:2.2,lastCheck:""},rl:{pos:"Зад. лев.",pressure:2.1,target:2.2,lastCheck:""},rr:{pos:"Зад. прав.",pressure:2.0,target:2.2,lastCheck:""}};
const DEF_CAR={id:"car1",make:"Toyota",model:"Camry",year:2019,mileage:52400,color:"Белый перламутр",fuel:"АИ-95",vin:"",plate:""};
const DEF_SVC=[{id:1,name:"Моторное масло",icon:"🛢",lastKm:45000,lastDate:"2025-02-10",intervalKm:10000,intervalMo:12,status:"ok",history:[]},{id:2,name:"Воздушный фильтр",icon:"💨",lastKm:30000,lastDate:"2024-08-15",intervalKm:15000,intervalMo:24,status:"ok",history:[]},{id:3,name:"Салонный фильтр",icon:"❄",lastKm:25000,lastDate:"2024-11-20",intervalKm:10000,intervalMo:12,status:"warning",history:[]},{id:4,name:"Тормозная жидкость",icon:"🛑",lastKm:0,lastDate:"2024-05-30",intervalKm:0,intervalMo:24,status:"ok",history:[]},{id:5,name:"Охлаждающая жидкость",icon:"🌡",lastKm:0,lastDate:"2023-12-01",intervalKm:0,intervalMo:36,status:"ok",history:[]}];
const DEF_EXP=[{id:1,date:"2025-05-10",cat:"топливо",amount:3200,note:"АЗС Лукойл"},{id:2,date:"2025-04-18",cat:"сервис",amount:4500,note:"Замена масла"},{id:3,date:"2025-04-10",cat:"запчасти",amount:2100,note:"Лампочки"}];
const DEF_FUEL=[{id:1,date:"2025-05-10",liters:45,cost:3200,odometer:52400,station:"АЗС Лукойл"},{id:2,date:"2025-04-03",liters:42,cost:2900,odometer:51650,station:"АЗС Shell"},{id:3,date:"2025-03-25",liters:50,cost:3500,odometer:50200,station:"АЗС Роснефть"}];
const DEF_DOCS=[{id:1,name:"ОСАГО",icon:"📄",expires:"2025-11-15",note:"Ингосстрах"},{id:2,name:"КАСКО",icon:"🛡",expires:"2026-01-20",note:"АльфаСтраховани"},{id:3,name:"ТО техническое",icon:"🔧",expires:"2025-07-10",note:"Сертификат"}];
const CAT_CLR={топливо:C.o,сервис:C.b,страховка:C.p,запчасти:C.y,штрафы:C.r,прочее:C.t2};

/* ── UTILS ───────────────────────────────────────────────────────── */
  function usePersist(key, init){
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem("ja9_" + key);
      return s ? JSON.parse(s) : init;
    } catch {
      return init;
    }
  });

  const set = useCallback(fn => {
    setV(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;

      try {
        localStorage.setItem("ja9_" + key, JSON.stringify(next));
      } catch (e) {
        console.warn("[Persist] Save failed:", e);
      }

      return next;
    });
  }, [key]);

  return [v, set];
}

function useToast(){
  const[toasts,setToasts]=useState([]);
  const show=useCallback((msg,type="info",dur=3000)=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),dur)
  },[]);
  return{toasts,show}
}

const rub=n=>(n||0).toLocaleString("ru-RU")+" ₽";
const sCfg={ok:{color:C.g,bg:C.gG,label:"OK",icon:"✓"},warning:{color:C.y,bg:C.yG,label:"СКОРО",icon:"⚠"},overdue:{color:C.r,bg:C.rG,label:"ПРОСРОЧЕНО",icon:"✗"}};
const dCfg={"низкий":{color:C.g,bg:C.gG,label:"НИЗКИЙ"},"средний":{color:C.y,bg:C.yG,label:"СРЕДНИЙ"},"высокий":{color:C.r,bg:C.rG,label:"ВЫСОКИЙ"}};
const urgClr={"сегодня":C.r,"3 дня":C.r,"1 неделя":C.y,"1 месяц":C.g};
const daysUntil=d=>Math.round((new Date(d)-new Date())/86400000);
const docStatus=d=>{const days=daysUntil(d);return days<0?"overdue":days<30?"warning":"ok";};
const fmtPlate=v=>v.toUpperCase().replace(/[^А-ЯA-Z0-9]/g,"").slice(0,9);
const fmtVin=v=>v.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,17);

function calcSvcStatus(svc,mileage){
  const kmUsed=mileage-svc.lastKm;
  const moUsed=(Date.now()-new Date(svc.lastDate))/(1000*60*60*24*30);
  const kmPct=kmUsed/svc.intervalKm;
  const moPct=svc.intervalMo?moUsed/svc.intervalMo:0;
  const maxPct=Math.max(kmPct,moPct);
  if(maxPct>=1)return"overdue";
  if(maxPct>=0.8)return"warning";
  return"ok"
}

function recalcAll(svcs,mileage){
  return svcs.map(s=>({...s,status:calcSvcStatus(s,mileage)}))
}

const calcHealth=s=>Math.max(0,Math.min(100,100-s.filter(x=>x.status==="overdue").length*18-s.filter(x=>x.status==="warning").length*8));
const tirePressureStatus=p=>{
  if(p<1.6||p>3.0)return{color:C.r,label:"КРИТИЧНО"};
  if(p<1.9||p>2.6)return{color:C.y,label:"НИЗКОЕ"};
  return{color:C.g,label:"НОРМА"}
};

const AUTO_TIPS=[
  {icon:"🛢",tip:"Проверьте уровень масла — 2 минуты защищают двигатель стоимостью 200+ тысяч рублей."},
  {icon:"⚙",tip:"Регулярное ТО — лучшая инвестиция в надежность автомобиля."},
  {icon:"🔧",tip:"Диагностика OBD перед покупкой поможет избежать дорогого ремонта."},
  {icon:"💨",tip:"Замена воздушного фильтра улучшит расход топлива на 5-10%."},
  {icon:"🛞",tip:"Правильное давление в шинах экономит топливо и продлевает ресурс."}
];

/* ── ATOMS ───────────────────────────────────────────────────────── */
function Ring({val,max=100,size=108,sw=9,color,children}){
  const R=(size-sw)/2,C2=2*Math.PI*R,pct=Math.min(val/max,1);
  const offset=C2*(1-pct);
  return(
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={C.border} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={C2} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {children}
      </div>
    </div>
  )
}

function Badge({n,color=C.r}){
  if(!n)return null;
  return(
    <div style={{position:"absolute",top:-5,right:-5,minWidth:17,height:17,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"white",fontFamily:M}}>
      {n}
    </div>
  )
}

const Pill=({children,color=C.o})=>(
  <span style={{fontSize:9,fontWeight:700,letterSpacing:.8,padding:"2px 9px",borderRadius:20,background:color+"22",color,fontFamily:M,whiteSpace:"nowrap"}}>
    {children}
  </span>
);

const Card=({children,style={},onClick})=>(
  <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 18px",...style,cursor:onClick?"pointer":"default",transition:"all .2s"}}>
    {children}
  </div>
);

const Lbl=({children,color=C.t2,mb=8,style={}})=>(
  <div style={{fontSize:10,color,letterSpacing:2.5,fontFamily:M,marginBottom:mb,...style}}>
    {children}
  </div>
);

function Input({value,onChange,placeholder,type="text",style={},maxLength,onKeyDown,autoFocus}){
  return(
    <input autoFocus={autoFocus} type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} maxLength={maxLength} style={{width:"100%",padding:"10px 12px",background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,color:C.t,fontFamily:S,fontSize:13,...style}} />
  )
}

function PBtn({children,onClick,disabled,full,color=C.o,style={}}){
  return(
    <button onClick={onClick} disabled={disabled} style={{padding:"12px 20px",background:disabled?C.card2:color,color:disabled?C.t2:"white",border:"none",borderRadius:10,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:S,width:full?"100%":"auto",...style}}>
      {children}
    </button>
  )
}

function GBtn({children,onClick,full,style={}}){
  return(
    <button onClick={onClick} style={{padding:"10px 18px",background:"transparent",color:C.t2,border:`1px solid ${C.border}`,borderRadius:10,fontWeight:600,cursor:"pointer",fontFamily:S,width:full?"100%":"auto",...style}}>
      {children}
    </button>
  )
}

function Spinner(){
  return(
    <div style={{textAlign:"center",padding:"44px 0"}}>
      <div style={{fontSize:28,color:C.o,display:"inline-block",animation:"spin 1.4s linear infinite"}}>⚙</div>
      <div style={{fontSize:10,color:C.t2,marginTop:12,fontFamily:M,letterSpacing:2}}>ЗАГРУЗКА...</div>
    </div>
  )
}

function Toasts({toasts}){
  const tc={success:C.g,error:C.r,info:C.o,tip:C.b};
  return(
    <div style={{position:"fixed",top:66,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:600,zIndex:999}}>
      {toasts.map(t=>(
        <div key={t.id} style={{background:tc[t.type]||C.card,color:"white",padding:"12px 16px",borderRadius:8,marginBottom:8,fontFamily:S,fontSize:12,animation:"slideIn .3s ease"}}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

function BackHeader({title,onBack,right}){
  return(
    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.t2,fontSize:20,cursor:"pointer"}}>←</button>
      <h2 style={{fontSize:16,fontWeight:700,color:C.t,fontFamily:S,flex:1}}>{title}</h2>
      {right}
    </div>
  )
}

function ProgressBar({remaining}){
  const pct=Math.max(0,Math.min(1,remaining));
  const c=pct>0.5?C.g:pct>0.2?C.y:C.r;
  return(
    <div style={{height:4,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
      <div style={{height:"100%",width:pct*100+"%",background:c,transition:"all .3s"}}/>
    </div>
  )
}

function TipPopup({tip,onClose}){
  if(!tip)return null;
  return(
    <div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:480,zIndex:200,animation:"slideUp .3s ease"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{fontSize:24,flexShrink:0}}>{tip.icon}</span>
        <div style={{flex:1}}>
          <p style={{fontSize:12,color:C.t,fontFamily:S,margin:0}}>{tip.tip}</p>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.t2,cursor:"pointer",fontSize:18}}>×</button>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*                         ГЛАВНЫЙ КОМПОНЕНТ                              */
/* ────────────────────────────────────────────────────────────────────── */

export default function App(){
  const {user,loading:authLoading}=useAuth();
  const uid=user?.uid;
  const [car, setCar] = useState(DEF_CAR);
  const [services, setServices] = useState(DEF_SVC);
  const [expenses, setExpenses] = useState(DEF_EXP);
  const [fuel, setFuel] = useState(DEF_FUEL);
  const [body, setBody] = useState(DEF_BODY);
  const [docs, setDocs] = useState(DEF_DOCS);
  const [tires, setTires] = useState(DEF_TIRES);
  const [appts, setAppts] = useState([]);
  const{cloudReady,cloudError}=useFirestoreSync({uid,car,setCar,services,setServices,expenses,setExpenses,fuel,setFuel,diagHistory,setDiagHistory,body,setBody,tires,setTires,docs,setDocs,appts,setAppts});

  const[tab,setTab]=useState("dash");
  const[activeProfile,setActiveProfile]=useState(false);
  const{toasts,show:showToast}=useToast();
  const[mileageInput,setMileageInput]=useState(car.mileage||52400);
  const[mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const[currentTip,setCurrentTip]=useState(null);
  const[tipIdx,setTipIdx]=useState(0);
  const[lastTipTime,setLastTipTime]=useState(0);

  const INTERVAL=15000;

  useEffect(() => {
  setCar(prev => ({ ...prev, mileage: mileageInput }));
  setServices(prev => recalcAll(prev, mileageInput));
}, [mileageInput]);

  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`
      @keyframes ja-fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      @keyframes ja-spin{to{transform:rotate(360deg)}}
      @keyframes ja-pulse{0%,100%{opacity:.15}50%{opacity:.4}}
      @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      .ja-fade{animation:ja-fadeUp .5s ease both}
      body{margin:0;padding:0;font-family:'IBM Plex Sans',sans-serif}
    `;
    document.head.appendChild(style);
  },[]);

  useEffect(()=>{
    const check=()=>{
      if(Date.now()-lastTipTime>=INTERVAL){
        const idx=tipIdx%AUTO_TIPS.length;
        setCurrentTip(AUTO_TIPS[idx]);
        setLastTipTime(Date.now());
        setTipIdx(idx+1);
      }
    };
    const timer=setInterval(check,INTERVAL);
    return()=>clearInterval(timer);
  },[tipIdx,lastTipTime]);

  if(authLoading)return<Spinner/>;
  if(!user)return<AuthScreen/>;
  if(!cloudReady)return<Spinner/>;

  if(cloudError)console.warn("[App] Cloud error:",cloudError);

  if(activeProfile){
    return(
      <div style={{background:C.bg,minHeight:"100vh",padding:"16px"}}>
        <div style={{maxWidth:800,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,paddingBottom:16,borderBottom:`1px solid ${C.border}`}}>
            <h1 style={{fontSize:20,fontWeight:700,color:C.t,fontFamily:S}}>⚙ Мой гараж</h1>
            <button onClick={()=>setActiveProfile(false)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2}}>×</button>
          </div>
          <GarageScreen car={car} setCar={setCar} onClose={()=>setActiveProfile(false)}/>
        </div>
      </div>
    );
  }

  return(
    <div style={{background:C.bg,minHeight:"100vh",paddingBottom:80}}>
      <style>{`
        @keyframes ja-fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ja-spin{to{transform:rotate(360deg)}}
        @keyframes ja-pulse{0%,100%{opacity:.15}50%{opacity:.4}}
      `}</style>

      <div style={{position:"sticky",top:0,zIndex:100,background:`linear-gradient(180deg,${C.bg} 0%,${C.bg2} 100%)`,borderBottom:`1px solid ${C.border2}`,padding:"14px 16px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:C.o,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🤖</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.t,fontFamily:S}}>JARVIS AUTO</div>
              <div style={{fontSize:8,color:C.t2,fontFamily:M,letterSpacing:2}}>v9.1 · CLOUD SYNC</div>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:16,fontSize:11,color:C.t2,fontFamily:M,textAlign:"right"}}>
            <div>
              <div style={{color:C.t,fontSize:12,fontWeight:600}}>{car.make} {car.model}</div>
              <div>{(car.mileage||0).toLocaleString()} км</div>
            </div>
            <SyncIndicator/>
            <UserMenu onProfileClick={()=>setActiveProfile(true)}/>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 16px"}}>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))",gap:10,marginBottom:24}}>
          {[{id:"dash",label:"📊 ДАШБОРД"},{id:"diag",label:"🔍 ДИАГНОСТИКА"},{id:"vision",label:"📷 VISION AI"},{id:"maintain",label:"🔧 ТО"},{id:"finance",label:"💰 ФИНАНСЫ"},{id:"body",label:"🚗 КУЗОВ"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 16px",borderRadius:10,background:tab===t.id?C.o:C.card2,border:`1px solid ${tab===t.id?C.o+"50":C.border}`,color:tab===t.id?"white":C.t2,fontSize:11,fontFamily:M,fontWeight:700,cursor:"pointer",letterSpacing:1,transition:"all .2s"}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="dash"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16}}>
            <Card>
              <Lbl>ЗДОРОВЬЕ АВТО</Lbl>
              <Ring val={calcHealth(services)} max={100} size={120} color={calcHealth(services)>70?C.g:calcHealth(services)>40?C.y:C.r}>
                <span style={{fontSize:24,fontWeight:700,color:C.t}}>{Math.round(calcHealth(services))}%</span>
              </Ring>
            </Card>

            <Card>
              <Lbl>ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ</Lbl>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {services.slice(0,3).map(s=>{
                  const cfg=sCfg[s.status];
                  return(
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:cfg.bg,borderRadius:8,border:`1px solid ${cfg.color}22`}}>
                      <span style={{fontSize:11,color:C.t,fontFamily:S,fontWeight:500}}>{s.icon} {s.name}</span>
                      <span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:20,background:cfg.color+"25",color:cfg.color,fontFamily:M}}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <Lbl>ПОСЛЕДНИЕ РАСХОДЫ</Lbl>
              {expenses.slice(0,3).map(e=>(
                <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.border}`,fontSize:11,color:C.t2,fontFamily:S}}>
                  <span>{e.cat}</span>
                  <strong style={{color:C.t}}>{rub(e.amount)}</strong>
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab==="maintain"&&(
          <Card>
            <Lbl>ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ</Lbl>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {services.map(s=>(
                <div key={s.id} style={{padding:12,background:C.card2,borderRadius:8,border:`1px solid ${sCfg[s.status].color}22`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:13,fontWeight:600,color:C.t}}>{s.icon} {s.name}</span>
                    <Pill color={sCfg[s.status].color}>{sCfg[s.status].label}</Pill>
                  </div>
                  <div style={{fontSize:11,color:C.t2,fontFamily:M}}>Интервал: {s.intervalKm}км или {s.intervalMo}мес.</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab==="finance"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:16}}>
            <Card>
              <Lbl>РАСХОДЫ (ПОСЛЕДНИЕ 30 ДНЕЙ)</Lbl>
              {expenses.length>0?(
                <div>
                  {expenses.slice(0,5).map(e=>(
                    <div key={e.id} style={{display:"flex",justifyContent:"space-between",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                      <span style={{color:C.t2}}>{e.date}</span>
                      <span style={{color:CAT_CLR[e.cat]||C.t}}><strong>{rub(e.amount)}</strong></span>
                    </div>
                  ))}
                </div>
              ):<div style={{color:C.t2,fontSize:11}}>Нет записей</div>}
            </Card>

            <Card>
              <Lbl>ТОПЛИВО</Lbl>
              {fuel.length>0?(
                <div>
                  {fuel.slice(0,3).map(f=>(
                    <div key={f.id} style={{fontSize:11,paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.border}`}}>
                      <div style={{color:C.t}}>{f.liters}л @ {rub(f.cost)}</div>
                      <div style={{color:C.t2,fontSize:9}}>{f.date}</div>
                    </div>
                  ))}
                </div>
              ):<div style={{color:C.t2,fontSize:11}}>Нет записей</div>}
            </Card>
          </div>
        )}

        {tab==="body"&&(
          <Card>
            <Lbl>СОСТОЯНИЕ КУЗОВА</Lbl>
            <svg viewBox="0 0 200 240" style={{width:"100%",height:"auto",margin:"20px 0"}}>
              {BODY_PANELS.map(p=>{
                const status=body[p.id]?.status||"ok";
                const cfg=PS[status];
                return(
                  <g key={p.id}>
                    <path d={p.path} fill={cfg.color+"20"} stroke={cfg.color} strokeWidth="2"/>
                    <title>{p.name}: {cfg.label}</title>
                  </g>
                );
              })}
            </svg>
          </Card>
        )}

      </div>

          <Toasts toasts={toasts}/>
      <TipPopup tip={currentTip} onClose={()=>setCurrentTip(null)}/>
      <DebugPanel />
</div>
);
}

