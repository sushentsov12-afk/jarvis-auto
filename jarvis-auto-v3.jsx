import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

/* ═══════════════════════════════════════════
   TOKENS
═══════════════════════════════════════════ */
const C = {
  bg: "#060c18", bg2: "#08101f", card: "#0b1628", card2: "#0d1a30",
  border: "rgba(255,255,255,0.07)", border2: "rgba(255,255,255,0.12)",
  orange: "#FF6B00", orangeD: "#cc5500", orangeG: "rgba(255,107,0,0.12)",
  text: "#dde3f0", text2: "#5a7090", text3: "#3a5070",
  green: "#22c55e", greenG: "rgba(34,197,94,0.1)",
  yellow: "#f59e0b", yellowG: "rgba(245,158,11,0.1)",
  red: "#ef4444", redG: "rgba(239,68,68,0.1)",
  blue: "#3b82f6", purple: "#8b5cf6",
};
const M = "'IBM Plex Mono', monospace";
const S = "'IBM Plex Sans', sans-serif";

/* ═══════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════ */
function usePersist(key, init) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem("ja3_" + key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = useCallback(fn => setV(prev => {
    const next = typeof fn === "function" ? fn(prev) : fn;
    try { localStorage.setItem("ja3_" + key, JSON.stringify(next)); } catch {}
    return next;
  }), [key]);
  return [v, set];
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

/* ═══════════════════════════════════════════
   AI
═══════════════════════════════════════════ */
const DIAG_SYS = `Ты — Джарвис, ИИ-диагност для автомобилей. Только русский язык.
Ответь строго JSON без markdown и backticks:
{"title":"название до 6 слов","system":"Двигатель|Трансмиссия|Тормоза|Электрика|Подвеска|Топливная система|Охлаждение|Выхлопная система","description":"2-3 понятных предложения без жаргона","danger":"низкий|средний|высокий","danger_reason":"1 предложение","can_drive":true|false,"urgency":"сегодня|3 дня|1 неделя|1 месяц","price_min":число,"price_max":число,"price_comment":"что входит","actions":["шаг1","шаг2","шаг3"],"parts":["деталь1","деталь2"]}
Если не авто — {"error":"Введите код ошибки OBD-II или симптом вашего автомобиля."}
Цены: региональные сервисы РФ 2024. Будь точным и честным.`;

const TIPS_SYS = `Ты — Джарвис, персональный автосоветник. Только русский язык. Пиши дружелюбно, как опытный механик-друг.
Пользователь задаёт вопрос или просит совет. Ответь полезно, конкретно, без воды (3-5 абзацев max).
Не нужно JSON — просто текст.`;

const FIND_SYS = `Создай 4 демо-записи автосервисов для запроса пользователя. Только русский язык. JSON без markdown:
{"tip":"полезный совет по выбору","results":[{"name":"название","type":"тип","address":"улица, дом","rating":4.7,"reviews":142,"price":"от 500 ₽","phone":"+7 (900) 123-45-67","hours":"9:00–21:00","wait":"~20 мин","tags":["быстро","честно","гарантия"]}]}
Пиши реалистичные выдуманные адреса. ТОЛЬКО JSON.`;

async function ai(system, userMsg, maxTokens = 1000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages: [{ role: "user", content: userMsg }] }),
  });
  const d = await r.json();
  return d.content?.find(b => b.type === "text")?.text || "";
}

/* ═══════════════════════════════════════════
   DEFAULTS
═══════════════════════════════════════════ */
const DEF_CAR = { make: "Toyota", model: "Camry", year: 2019, mileage: 52400, color: "Белый перламутр", fuel: "Бензин АИ-95", vin: "" };
const DEF_SVC = [
  { id: 1, name: "Моторное масло", icon: "🛢", lastKm: 45000, lastDate: "2025-02-10", intervalKm: 10000, intervalMo: 12, status: "ok" },
  { id: 2, name: "Воздушный фильтр", icon: "💨", lastKm: 38000, lastDate: "2024-10-15", intervalKm: 20000, intervalMo: 18, status: "ok" },
  { id: 3, name: "Тормозная жидкость", icon: "🔴", lastKm: 28000, lastDate: "2022-08-01", intervalKm: 40000, intervalMo: 24, status: "overdue" },
  { id: 4, name: "Тормозные колодки", icon: "⬛", lastKm: 40000, lastDate: "2024-08-20", intervalKm: 40000, intervalMo: 36, status: "ok" },
  { id: 5, name: "Свечи зажигания", icon: "⚡", lastKm: 20000, lastDate: "2022-05-10", intervalKm: 30000, intervalMo: 36, status: "overdue" },
  { id: 6, name: "Антифриз", icon: "🧊", lastKm: 30000, lastDate: "2023-03-15", intervalKm: 60000, intervalMo: 24, status: "warning" },
  { id: 7, name: "АКПП масло", icon: "⚙️", lastKm: 30000, lastDate: "2023-03-01", intervalKm: 60000, intervalMo: 48, status: "ok" },
  { id: 8, name: "Салонный фильтр", icon: "🌬", lastKm: 42000, lastDate: "2024-12-01", intervalKm: 15000, intervalMo: 12, status: "warning" },
];
const DEF_EXP = [
  { id: 1, date: "2025-05-02", cat: "топливо", amount: 3200, note: "АЗС Лукойл" },
  { id: 2, date: "2025-04-18", cat: "сервис", amount: 4500, note: "Замена масла + фильтр" },
  { id: 3, date: "2025-04-05", cat: "топливо", amount: 2900, note: "АЗС Shell" },
  { id: 4, date: "2025-03-20", cat: "страховка", amount: 18000, note: "КАСКО 2025" },
  { id: 5, date: "2025-03-12", cat: "топливо", amount: 3100, note: "АЗС Газпром" },
  { id: 6, date: "2025-02-28", cat: "запчасти", amount: 2200, note: "Щётки стеклоочист." },
  { id: 7, date: "2025-02-10", cat: "сервис", amount: 1200, note: "Диагностика подвески" },
  { id: 8, date: "2025-01-22", cat: "топливо", amount: 3400, note: "АЗС BP" },
  { id: 9, date: "2025-01-08", cat: "штрафы", amount: 1500, note: "ГИБДД" },
];
const CAT_CLR = { топливо: C.orange, сервис: C.blue, страховка: C.purple, запчасти: C.yellow, штрафы: C.red, прочее: C.text2 };

/* ═══════════════════════════════════════════
   UTILS
═══════════════════════════════════════════ */
const rub = n => (n || 0).toLocaleString("ru-RU") + " ₽";
const calcHealth = s => Math.max(0, Math.min(100, 100 - s.filter(x => x.status === "overdue").length * 18 - s.filter(x => x.status === "warning").length * 8));
const statusCfg = {
  ok:      { color: C.green,  bg: C.greenG,  label: "OK",         icon: "✓" },
  warning: { color: C.yellow, bg: C.yellowG, label: "СКОРО",      icon: "⚠" },
  overdue: { color: C.red,    bg: C.redG,    label: "ПРОСРОЧЕНО", icon: "✗" },
};
const dangerCfg = {
  "низкий":  { color: C.green,  bg: C.greenG,  label: "НИЗКИЙ"  },
  "средний": { color: C.yellow, bg: C.yellowG, label: "СРЕДНИЙ" },
  "высокий": { color: C.red,    bg: C.redG,    label: "ВЫСОКИЙ" },
};
const urgencyClr = { "сегодня": C.red, "3 дня": C.red, "1 неделя": C.yellow, "1 месяц": C.green };

/* ═══════════════════════════════════════════
   ATOMS
═══════════════════════════════════════════ */
function Ring({ val, max = 100, size = 108, sw = 8, color, children }) {
  const R = (size - sw) / 2, C2 = 2 * Math.PI * R, pct = val / max;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={R} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${pct * C2} ${C2}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>{children}</div>
    </div>
  );
}

function Badge({ n }) {
  if (!n) return null;
  return <div style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, borderRadius: 9, background: C.red, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${C.bg}` }}>
    <span style={{ fontSize: 8, color: "white", fontWeight: 700, fontFamily: M }}>{n > 9 ? "9+" : n}</span>
  </div>;
}

function Pill({ children, color = C.orange, bg }) {
  return <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "2px 9px", borderRadius: 20, background: bg || color + "20", color, fontFamily: M, whiteSpace: "nowrap" }}>{children}</span>;
}

function Divider() { return <div style={{ height: 1, background: C.border, margin: "4px 0" }} />; }

function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", ...style, cursor: onClick ? "pointer" : "default" }}>{children}</div>;
}

function Lbl({ children, color = C.text2, style = {} }) {
  return <div style={{ fontSize: 10, color, letterSpacing: 2.5, fontFamily: M, marginBottom: 8, ...style }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text", style = {} }) {
  return <input type={type} value={value} onChange={onChange} placeholder={placeholder}
    style={{ width: "100%", padding: "11px 14px", fontSize: 13, fontFamily: M, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, outline: "none", boxSizing: "border-box", ...style }}
    onFocus={e => e.target.style.borderColor = C.orange} onBlur={e => e.target.style.borderColor = C.border} />;
}

function PrimaryBtn({ children, onClick, disabled, style = {} }) {
  return <button onClick={onClick} disabled={disabled}
    style={{ padding: "12px 20px", background: disabled ? C.card2 : C.orange, color: disabled ? C.text3 : "white", border: "none", borderRadius: 10, fontSize: 12, fontFamily: M, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", letterSpacing: 1, transition: "background 0.2s, transform 0.1s", ...style }}
    onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
    onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}>{children}</button>;
}

function GhostBtn({ children, onClick, style = {} }) {
  return <button onClick={onClick}
    style={{ padding: "10px 18px", background: "transparent", color: C.text2, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 11, fontFamily: M, cursor: "pointer", letterSpacing: 1, ...style }}>{children}</button>;
}

function Spinner() {
  return <>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    <div style={{ textAlign: "center", padding: "44px 0" }}>
      <div style={{ fontSize: 28, color: C.orange, display: "inline-block", animation: "spin 1.4s linear infinite" }}>⚙</div>
      <div style={{ marginTop: 14, fontSize: 10, color: C.text2, letterSpacing: 3, fontFamily: M }}>ОБРАБОТКА...</div>
    </div>
  </>;
}

function Toasts({ toasts }) {
  const typeClr = { success: C.green, error: C.red, info: C.orange };
  return <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 608, zIndex: 999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
    {toasts.map(t => (
      <div key={t.id} style={{ background: C.card2, border: `1px solid ${typeClr[t.type] || C.orange}40`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: C.text, fontFamily: S, display: "flex", gap: 10, alignItems: "center", animation: "fadeUp 0.3s ease", boxShadow: `0 4px 24px rgba(0,0,0,0.5)` }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: typeClr[t.type] || C.orange, flexShrink: 0 }} />
        {t.msg}
      </div>
    ))}
  </div>;
}

/* ═══════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════ */
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [car, setCar] = useState({ make: "", model: "", year: new Date().getFullYear() - 3, mileage: 50000, color: "Белый", fuel: "Бензин АИ-95" });

  const steps = [
    {
      icon: "⚙", title: "JARVIS AUTO", sub: "ИИ-платформа для вашего автомобиля",
      content: <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 15, color: C.text2, fontFamily: S, lineHeight: 1.7, textAlign: "center" }}>
          Диагностика по коду ошибки, сервисная книжка, учёт расходов и поиск мастеров — всё в одном месте.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          {[["⚙", "ИИ-диагностика", "OBD-коды и симптомы"], ["📋", "Сервисная книжка", "Контроль ТО"], ["₽", "Учёт расходов", "Аналитика"], ["🔍", "Найти сервис", "Рядом с вами"]].map(([ic, t, s]) => (
            <div key={t} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{ic}</div>
              <div style={{ fontSize: 11, color: C.text, fontFamily: M, marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 10, color: C.text2, fontFamily: S }}>{s}</div>
            </div>
          ))}
        </div>
      </div>,
      action: "НАЧАТЬ →",
      valid: true,
    },
    {
      icon: "👤", title: "КАК ВАС ЗОВУТ?", sub: "Джарвис будет обращаться к вам лично",
      content: <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше имя" />
        <div style={{ fontSize: 12, color: C.text2, fontFamily: S, textAlign: "center" }}>Имя используется только внутри приложения</div>
      </div>,
      action: "ПРОДОЛЖИТЬ →",
      valid: name.trim().length > 0,
    },
    {
      icon: "🚗", title: "ВАШ АВТОМОБИЛЬ", sub: "Введите данные — Джарвис настроится под него",
      content: <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[["МАРКА", "make", "text", "Toyota"], ["МОДЕЛЬ", "model", "text", "Camry"], ["ГОД", "year", "number", "2019"], ["ПРОБЕГ (КМ)", "mileage", "number", "50000"]].map(([l, k, t, ph]) => (
          <div key={k}>
            <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 5, fontFamily: M }}>{l}</div>
            <Input type={t} value={car[k]} placeholder={ph} onChange={e => setCar(p => ({ ...p, [k]: t === "number" ? +e.target.value : e.target.value }))} />
          </div>
        ))}
      </div>,
      action: "ВОЙТИ В ДЖАРВИС ⚙",
      valid: car.make.trim() && car.model.trim() && car.year > 1990 && car.mileage >= 0,
    },
  ];

  const cur = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: M }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 36 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${C.orange}50` }}>
            <span style={{ fontSize: 20 }}>⚙</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>JARVIS AUTO</div>
            <div style={{ fontSize: 9, color: C.text2, letterSpacing: 2 }}>AI AUTOMOTIVE PLATFORM</div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? C.orange : C.border, transition: "background 0.4s" }} />
          ))}
        </div>

        {/* Card */}
        <div key={step} style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 16, padding: "28px 24px", animation: "fadeUp 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{cur.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: -0.3, marginBottom: 6 }}>{cur.title}</div>
            <div style={{ fontSize: 13, color: C.text2, fontFamily: S }}>{cur.sub}</div>
          </div>
          {cur.content}
          <PrimaryBtn onClick={() => { if (!cur.valid) return; step < steps.length - 1 ? setStep(s => s + 1) : onDone(name.trim() || "Водитель", { ...car, year: +car.year, mileage: +car.mileage }); }} disabled={!cur.valid} style={{ width: "100%", marginTop: 20, padding: "14px" }}>{cur.action}</PrimaryBtn>
          {step > 0 && <GhostBtn onClick={() => setStep(s => s - 1)} style={{ width: "100%", marginTop: 10 }}>← НАЗАД</GhostBtn>}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 10, color: C.text3, letterSpacing: 1 }}>BETA · ДАННЫЕ ХРАНЯТСЯ НА ВАШЕМ УСТРОЙСТВЕ</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN: DASHBOARD
═══════════════════════════════════════════ */
function Dashboard({ name, car, services, diagHistory, expenses, setTab, toast }) {
  const health = calcHealth(services);
  const hColor = health >= 75 ? C.green : health >= 50 ? C.yellow : C.red;
  const hLabel = health >= 75 ? "ОТЛИЧНО" : health >= 50 ? "ВНИМАНИЕ" : "КРИТИЧНО";
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const overdue = services.filter(s => s.status === "overdue");
  const warning = services.filter(s => s.status === "warning");
  const timeOfDay = new Date().getHours();
  const greeting = timeOfDay < 12 ? "Доброе утро" : timeOfDay < 18 ? "Добрый день" : "Добрый вечер";

  // Expense trend last 4 weeks
  const weeklyData = useMemo(() => {
    const weeks = ["4 нед", "3 нед", "2 нед", "Эта"];
    const now = new Date();
    return weeks.map((w, i) => {
      const from = new Date(now); from.setDate(from.getDate() - (4 - i) * 7);
      const to = new Date(now); to.setDate(to.getDate() - (3 - i) * 7);
      const sum = expenses.filter(e => { const d = new Date(e.date); return d >= from && d < to; }).reduce((s, e) => s + e.amount, 0);
      return { w, sum };
    });
  }, [expenses]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}`}</style>

      {/* Greeting */}
      <div style={{ marginBottom: -4 }}>
        <div style={{ fontSize: 13, color: C.text2, fontFamily: S }}>{greeting}, {name}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: S, letterSpacing: -0.4 }}>{car.make} {car.model}</div>
        <div style={{ fontSize: 11, color: C.text2, fontFamily: M }}>{car.year} · {car.color} · {car.mileage.toLocaleString("ru-RU")} км</div>
      </div>

      {/* Health hero */}
      <Card style={{ background: `linear-gradient(135deg, ${C.card} 0%, #0f1f3a 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,107,0,0.05)" }} />
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Ring val={health} color={hColor} size={100} sw={9}>
            <div style={{ fontSize: 22, fontWeight: 700, color: hColor, fontFamily: M, lineHeight: 1 }}>{health}</div>
            <div style={{ fontSize: 8, color: C.text2, letterSpacing: 0.5 }}>/ 100</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <Lbl>ЗДОРОВЬЕ АВТО</Lbl>
            <div style={{ fontSize: 20, fontWeight: 700, color: hColor, fontFamily: M, marginBottom: 4 }}>{hLabel}</div>
            <div style={{ fontSize: 12, color: C.text2, fontFamily: S, lineHeight: 1.5 }}>
              {overdue.length > 0 ? `${overdue.length} операций просрочено — нужен сервис` :
               warning.length > 0 ? `${warning.length} операций скоро истекут` :
               "Все регламентные операции в норме"}
            </div>
            {overdue.length > 0 && (
              <button onClick={() => setTab("maintain")} style={{ marginTop: 8, padding: "4px 12px", fontSize: 10, fontFamily: M, background: `${C.red}20`, color: C.red, border: `1px solid ${C.red}40`, borderRadius: 6, cursor: "pointer", letterSpacing: 1, animation: "pulse 2s infinite" }}>
                ЗАПИСАТЬСЯ В СЕРВИС →
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "РАСХОДЫ", value: rub(totalExp), sub: `${expenses.length} записей`, color: C.text, tab: "finance" },
          { label: "ПРОСРОЧЕНО", value: overdue.length, sub: "операций ТО", color: overdue.length ? C.red : C.green, tab: "maintain" },
          { label: "ДИАГНОЗОВ", value: diagHistory.length, sub: "в истории", color: C.text, tab: "diag" },
        ].map(({ label, value, sub, color, tab }) => (
          <Card key={label} onClick={() => setTab(tab)} style={{ padding: "12px 14px", cursor: "pointer" }}>
            <Lbl style={{ marginBottom: 4 }}>{label}</Lbl>
            <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: M, marginBottom: 2 }}>{value}</div>
            <div style={{ fontSize: 10, color: C.text2, fontFamily: S }}>{sub}</div>
          </Card>
        ))}
      </div>

      {/* Alert block */}
      {(overdue.length + warning.length > 0) && (
        <Card style={{ background: `${C.red}06`, borderColor: `${C.red}25` }}>
          <Lbl color={C.red}>⚠ НУЖНО СДЕЛАТЬ</Lbl>
          {[...overdue, ...warning].slice(0, 4).map((s, i, arr) => (
            <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span style={{ fontSize: 16 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontFamily: S }}>{s.name}</div>
              </div>
              <Pill color={statusCfg[s.status].color}>{statusCfg[s.status].label}</Pill>
            </div>
          ))}
          <button onClick={() => setTab("maintain")} style={{ marginTop: 10, width: "100%", padding: "9px", fontSize: 10, fontFamily: M, background: "transparent", color: C.text2, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", letterSpacing: 1 }}>
            ОТКРЫТЬ СЕРВИСНУЮ КНИЖКУ →
          </button>
        </Card>
      )}

      {/* Expense sparkline */}
      <Card>
        <Lbl>РАСХОДЫ ПО НЕДЕЛЯМ</Lbl>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={weeklyData}>
            <XAxis dataKey="w" tick={{ fontSize: 10, fill: C.text2, fontFamily: M }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: M, color: C.text }} formatter={v => [rub(v), "Расходы"]} />
            <Line type="monotone" dataKey="sum" stroke={C.orange} strokeWidth={2} dot={{ fill: C.orange, r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent diagnoses */}
      {diagHistory.length > 0 && (
        <Card>
          <Lbl>ПОСЛЕДНИЕ ДИАГНОЗЫ</Lbl>
          {diagHistory.slice(0, 3).map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dangerCfg[d.danger]?.color || C.text2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontFamily: S }}>{d.title}</div>
                <div style={{ fontSize: 10, color: C.text2, fontFamily: M }}>{d.query} · {d.time}</div>
              </div>
              <Pill color={dangerCfg[d.danger]?.color}>{dangerCfg[d.danger]?.label}</Pill>
            </div>
          ))}
          <button onClick={() => setTab("diag")} style={{ marginTop: 10, width: "100%", padding: "8px", fontSize: 10, fontFamily: M, background: "transparent", color: C.orange, border: `1px solid ${C.orange}30`, borderRadius: 8, cursor: "pointer", letterSpacing: 1 }}>
            ВСЯ ИСТОРИЯ ДИАГНОЗОВ →
          </button>
        </Card>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { icon: "⚙", label: "ДИАГНОСТИКА", sub: "Ввести код ошибки", tab: "diag", color: C.orange },
          { icon: "🔍", label: "НАЙТИ СЕРВИС", sub: "Поиск мастеров", tab: "more", color: C.blue },
        ].map(a => (
          <Card key={a.label} onClick={() => setTab(a.tab)} style={{ cursor: "pointer", borderColor: `${a.color}25`, display: "flex", gap: 10, alignItems: "center", padding: "14px" }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: a.color, fontFamily: M, letterSpacing: 1 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: C.text2, fontFamily: S }}>{a.sub}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN: DIAGNOSTICS
═══════════════════════════════════════════ */
function Diagnostics({ history, setHistory, car, toast }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const ref = useRef(null);
  const examples = ["P0301", "P0420", "P0171", "P0300", "стук при торможении", "не заводится утром", "вибрация 80 км/ч", "дёргается при разгоне"];

  const run = async (q) => {
    const query = (q !== undefined ? q : input).trim();
    if (!query || loading) return;
    setLoading(true); setResult(null); setErr("");
    try {
      const context = `Автомобиль: ${car.make} ${car.model} ${car.year}, пробег ${car.mileage.toLocaleString()} км. Запрос: ${query}`;
      const text = await ai(DIAG_SYS, context);
      const r = JSON.parse(text);
      if (r.error) setErr(r.error);
      else {
        setResult(r);
        setHistory(prev => [{ ...r, query, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }, ...prev].slice(0, 30));
        toast("Диагноз получен", "success");
      }
    } catch { setErr("Ошибка соединения. Проверьте интернет и попробуйте ещё раз."); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Card>
        <Lbl>КОД ОШИБКИ OBD-II ИЛИ СИМПТОМ</Lbl>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input ref={ref} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
            placeholder="P0301 или «стучит при разгоне»"
            style={{ flex: 1, padding: "11px 14px", fontSize: 13, fontFamily: M, background: C.bg2, border: `1px solid ${input ? C.orange + "60" : C.border}`, borderRadius: 9, color: C.text, outline: "none", transition: "border-color 0.2s" }} />
          <PrimaryBtn onClick={() => run()} disabled={loading || !input.trim()} style={{ padding: "11px 20px", fontSize: 16 }}>→</PrimaryBtn>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => { setInput(ex); setTimeout(() => run(ex), 20); }}
              style={{ padding: "4px 10px", fontSize: 10, fontFamily: M, background: "transparent", color: C.text2, border: `1px solid ${C.border}`, borderRadius: 5, cursor: "pointer" }}
              onMouseEnter={e => { e.target.style.color = C.orange; e.target.style.borderColor = C.orange; }}
              onMouseLeave={e => { e.target.style.color = C.text2; e.target.style.borderColor = C.border; }}>{ex}</button>
          ))}
        </div>
      </Card>

      {loading && <Card><Spinner /></Card>}
      {err && !loading && <Card style={{ background: C.redG, borderColor: `${C.red}30`, color: C.red, fontSize: 13, fontFamily: S }}>{err}</Card>}

      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.35s ease" }}>
          {/* Main */}
          <Card style={{ borderLeft: `3px solid ${C.orange}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <Lbl style={{ marginBottom: 0 }}>{(result.system || "").toUpperCase()}</Lbl>
              {result.urgency && <Pill color={urgencyClr[result.urgency] || C.text2}>{result.urgency}</Pill>}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.text, fontFamily: S, lineHeight: 1.3, marginBottom: 10 }}>{result.title}</div>
            <div style={{ fontSize: 13, color: C.text2, fontFamily: S, lineHeight: 1.65 }}>{result.description}</div>
          </Card>

          {/* Danger + drive */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Card style={{ background: dangerCfg[result.danger]?.bg, borderColor: (dangerCfg[result.danger]?.color || C.text2) + "50" }}>
              <Lbl>ОПАСНОСТЬ</Lbl>
              <div style={{ fontSize: 16, fontWeight: 700, color: dangerCfg[result.danger]?.color, fontFamily: M, marginBottom: 4 }}>{dangerCfg[result.danger]?.label}</div>
              <div style={{ fontSize: 11, color: C.text2, fontFamily: S, lineHeight: 1.45 }}>{result.danger_reason}</div>
            </Card>
            <Card style={{ background: result.can_drive ? C.greenG : C.redG, borderColor: (result.can_drive ? C.green : C.red) + "40", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "16px 12px" }}>
              <div style={{ fontSize: 34, color: result.can_drive ? C.green : C.red, marginBottom: 6 }}>{result.can_drive ? "✓" : "✗"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: result.can_drive ? C.green : C.red, letterSpacing: 1.5, fontFamily: M }}>{result.can_drive ? "МОЖНО ЕХАТЬ" : "НЕ ЕХАТЬ"}</div>
            </Card>
          </div>

          {/* Price */}
          <Card>
            <Lbl>СТОИМОСТЬ РЕМОНТА</Lbl>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.text, fontFamily: M, marginBottom: 4 }}>{rub(result.price_min)} – {rub(result.price_max)}</div>
            <div style={{ fontSize: 12, color: C.text2, fontFamily: S }}>{result.price_comment}</div>
          </Card>

          {/* Parts */}
          {result.parts?.length > 0 && (
            <Card>
              <Lbl>ВОЗМОЖНО ПОТРЕБУЮТСЯ</Lbl>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.parts.map(p => <Pill key={p} color={C.blue}>{p}</Pill>)}
              </div>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <Lbl>ЧТО ДЕЛАТЬ</Lbl>
            {(result.actions || []).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < result.actions.length - 1 ? 12 : 0, alignItems: "flex-start" }}>
                <div style={{ minWidth: 22, height: 22, borderRadius: "50%", background: C.orange + "20", border: `1px solid ${C.orange}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.orange, fontFamily: M }}>{i + 1}</span>
                </div>
                <span style={{ fontSize: 13, color: C.text, fontFamily: S, lineHeight: 1.55 }}>{a}</span>
              </div>
            ))}
          </Card>

          <GhostBtn onClick={() => { setResult(null); setInput(""); ref.current?.focus(); }} style={{ width: "100%" }}>← НОВЫЙ ЗАПРОС</GhostBtn>
        </div>
      )}

      {/* History */}
      {history.length > 0 && !result && !loading && (
        <Card>
          <Lbl>ИСТОРИЯ ДИАГНОЗОВ ({history.length})</Lbl>
          {history.slice(0, 10).map((d, i) => (
            <div key={i} onClick={() => { setInput(d.query); setTimeout(() => run(d.query), 20); }}
              style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < Math.min(10, history.length) - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", borderRadius: 6, margin: "0 -4px", padding: "9px 4px" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dangerCfg[d.danger]?.color || C.text2, flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontFamily: S }}>{d.title}</div>
                <div style={{ fontSize: 10, color: C.text2, fontFamily: M }}>{d.query} · {d.time}</div>
              </div>
              <Pill color={dangerCfg[d.danger]?.color}>{dangerCfg[d.danger]?.label}</Pill>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN: SERVICE BOOK
═══════════════════════════════════════════ */
function Maintain({ services, setServices, car, setCar, toast }) {
  const [editKm, setEditKm] = useState(false);
  const [newKm, setNewKm] = useState(car.mileage);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "🔧", lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), intervalKm: 10000, intervalMo: 12 });
  const [filter, setFilter] = useState("all");

  const filtered = services.filter(s => filter === "all" || s.status === filter);
  const sorted = [...filtered].sort((a, b) => { const o = { overdue: 0, warning: 1, ok: 2 }; return o[a.status] - o[b.status]; });

  const markDone = id => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), status: "ok" } : s));
    toast("Отмечено как выполнено ✓", "success");
  };
  const del = id => { setServices(prev => prev.filter(s => s.id !== id)); toast("Операция удалена", "info"); };

  const addSvc = () => {
    if (!form.name) return;
    setServices(prev => [...prev, { ...form, id: Date.now(), status: "ok" }]);
    setAdding(false);
    setForm({ name: "", icon: "🔧", lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), intervalKm: 10000, intervalMo: 12 });
    toast("Операция добавлена", "success");
  };

  const health = calcHealth(services);
  const hColor = health >= 75 ? C.green : health >= 50 ? C.yellow : C.red;

  const iconOptions = ["🛢", "💨", "🔴", "⬛", "⚡", "🧊", "⚙️", "🌬", "🔧", "🔩", "💧", "🛞"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Mileage */}
      <Card>
        <Lbl>ТЕКУЩИЙ ПРОБЕГ</Lbl>
        {editKm ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Input type="number" value={newKm} onChange={e => setNewKm(+e.target.value)} style={{ flex: 1, fontSize: 18, borderColor: C.orange }} />
            <PrimaryBtn style={{ background: C.green, padding: "10px 16px", fontSize: 14 }} onClick={() => { setCar(c => ({ ...c, mileage: newKm })); setEditKm(false); toast(`Пробег обновлён: ${newKm.toLocaleString()} км`, "success"); }}>✓</PrimaryBtn>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, color: C.text, fontFamily: M }}>{car.mileage.toLocaleString("ru-RU")}</span>
              <span style={{ fontSize: 14, color: C.text2, fontFamily: M, marginLeft: 6 }}>км</span>
            </div>
            <button onClick={() => { setEditKm(true); setNewKm(car.mileage); }}
              style={{ padding: "6px 14px", fontSize: 10, fontFamily: M, background: C.orangeG, color: C.orange, border: `1px solid ${C.orange}40`, borderRadius: 7, cursor: "pointer", letterSpacing: 1 }}>ОБНОВИТЬ</button>
          </div>
        )}
      </Card>

      {/* Health summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "ПРОСРОЧЕНО", val: services.filter(s => s.status === "overdue").length, color: C.red },
          { label: "СКОРО", val: services.filter(s => s.status === "warning").length, color: C.yellow },
          { label: "В НОРМЕ", val: services.filter(s => s.status === "ok").length, color: C.green },
        ].map(({ label, val, color }) => (
          <Card key={label} style={{ padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: M }}>{val}</div>
            <div style={{ fontSize: 9, color: C.text2, letterSpacing: 1.5, fontFamily: M, marginTop: 2 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 6 }}>
        {[["all", "ВСЕ"], ["overdue", "ПРОСРОЧЕНО"], ["warning", "СКОРО"], ["ok", "OK"]].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{ padding: "5px 12px", fontSize: 9, fontFamily: M, borderRadius: 6, cursor: "pointer", letterSpacing: 1, border: `1px solid ${filter === val ? C.orange : C.border}`, background: filter === val ? C.orangeG : "transparent", color: filter === val ? C.orange : C.text2, transition: "all 0.15s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Services list */}
      <Card>
        <Lbl>РЕГЛАМЕНТ ТО — {services.length} ПОЗИЦИЙ</Lbl>
        {sorted.map((s, i) => {
          const cfg = statusCfg[s.status];
          const nextKm = s.lastKm + s.intervalKm;
          const rem = nextKm - car.mileage;
          const pct = Math.max(0, Math.min(1, (car.mileage - s.lastKm) / s.intervalKm));
          return (
            <div key={s.id} style={{ padding: "12px 0", borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 14, color: C.text, fontFamily: S, fontWeight: 500 }}>{s.name}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Pill color={cfg.color}>{cfg.icon} {cfg.label}</Pill>
                  <button onClick={() => del(s.id)} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>×</button>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, background: C.border, borderRadius: 2, marginBottom: 6 }}>
                <div style={{ height: 3, background: cfg.color, borderRadius: 2, width: `${pct * 100}%`, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 11, color: C.text2, fontFamily: M, marginBottom: s.status !== "ok" ? 8 : 0 }}>
                {s.lastDate} · {s.lastKm.toLocaleString()} км · каждые {s.intervalKm.toLocaleString()} км / {s.intervalMo} мес
              </div>
              {s.status !== "ok" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: cfg.color, fontFamily: M }}>
                    {s.status === "overdue" ? `⚠ просрочено на ${Math.abs(rem).toLocaleString()} км` : `→ осталось ~${rem.toLocaleString()} км`}
                  </span>
                  <button onClick={() => markDone(s.id)}
                    style={{ padding: "3px 12px", fontSize: 10, fontFamily: M, background: C.greenG, color: C.green, border: `1px solid ${C.green}40`, borderRadius: 5, cursor: "pointer", letterSpacing: 0.5 }}>
                    СДЕЛАНО ✓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      {/* Add form */}
      {adding ? (
        <Card>
          <Lbl>НОВАЯ ОПЕРАЦИЯ ТО</Lbl>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 6, fontFamily: M }}>ИКОНКА</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {iconOptions.map(ic => (
                <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))}
                  style={{ padding: "4px 8px", fontSize: 16, background: form.icon === ic ? C.orangeG : "transparent", border: `1px solid ${form.icon === ic ? C.orange : C.border}`, borderRadius: 6, cursor: "pointer" }}>{ic}</button>
              ))}
            </div>
          </div>
          {[["НАЗВАНИЕ РАБОТЫ", "name", "text", "Замена ремня ГРМ"], ["ПРОБЕГ ПРИ ЗАМЕНЕ (КМ)", "lastKm", "number", ""], ["ДАТА ЗАМЕНЫ", "lastDate", "date", ""], ["ИНТЕРВАЛ КМ", "intervalKm", "number", "30000"]].map(([l, k, t, ph]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 5, fontFamily: M }}>{l}</div>
              <Input type={t} value={form[k]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [k]: t === "number" ? +e.target.value : e.target.value }))} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryBtn onClick={addSvc} style={{ flex: 1 }}>ДОБАВИТЬ</PrimaryBtn>
            <GhostBtn onClick={() => setAdding(false)}>ОТМЕНА</GhostBtn>
          </div>
        </Card>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: "14px", background: "transparent", border: `1px dashed ${C.border}`, color: C.text2, borderRadius: 12, fontSize: 10, fontFamily: M, cursor: "pointer", letterSpacing: 1 }}>
          + ДОБАВИТЬ ОПЕРАЦИЮ ТО
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN: FINANCE
═══════════════════════════════════════════ */
function Finance({ expenses, setExpenses, toast }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), cat: "топливо", amount: "", note: "" });
  const [view, setView] = useState("list");

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => ({ ...acc, [e.cat]: (acc[e.cat] || 0) + e.amount }), {});
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  const monthly = useMemo(() => {
    const m = {};
    expenses.forEach(e => {
      const k = e.date.slice(0, 7);
      m[k] = (m[k] || 0) + e.amount;
    });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, sum]) => ({ month: month.slice(5), sum }));
  }, [expenses]);

  const add = () => {
    if (!form.amount) return;
    setExpenses(prev => [{ ...form, amount: +form.amount, id: Date.now() }, ...prev]);
    setAdding(false);
    setForm({ date: new Date().toISOString().slice(0, 10), cat: "топливо", amount: "", note: "" });
    toast("Расход добавлен", "success");
  };
  const del = id => { setExpenses(prev => prev.filter(e => e.id !== id)); toast("Запись удалена", "info"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Total */}
      <Card style={{ borderLeft: `3px solid ${C.orange}` }}>
        <Lbl>ИТОГО РАСХОДОВ 2025</Lbl>
        <div style={{ fontSize: 30, fontWeight: 700, color: C.text, fontFamily: M, marginBottom: 4 }}>{rub(total)}</div>
        <div style={{ fontSize: 12, color: C.text2, fontFamily: S }}>
          {expenses.length} записей · среднее {rub(Math.round(total / (expenses.length || 1)))} за запись
        </div>
      </Card>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 6 }}>
        {[["list", "СПИСОК"], ["chart", "ГРАФИКИ"], ["cat", "КАТЕГОРИИ"]].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ flex: 1, padding: "7px 0", fontSize: 9, fontFamily: M, borderRadius: 7, cursor: "pointer", letterSpacing: 1, border: `1px solid ${view === v ? C.orange : C.border}`, background: view === v ? C.orangeG : "transparent", color: view === v ? C.orange : C.text2 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Charts */}
      {view === "chart" && (
        <Card>
          <Lbl>РАСХОДЫ ПО МЕСЯЦАМ</Lbl>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={monthly}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.text2, fontFamily: M }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.text2, fontFamily: M }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
              <Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, fontFamily: M, color: C.text }} formatter={v => [rub(v), ""]} />
              <Line type="monotone" dataKey="sum" stroke={C.orange} strokeWidth={2.5} dot={{ fill: C.orange, r: 4 }} activeDot={{ r: 6, fill: C.orange }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Categories */}
      {view === "cat" && (
        <Card>
          <Lbl>ПО КАТЕГОРИЯМ</Lbl>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <PieChart width={120} height={120}>
              <Pie data={pieData} cx={55} cy={55} innerRadius={32} outerRadius={55} dataKey="value" strokeWidth={0}>
                {pieData.map((e, i) => <Cell key={i} fill={CAT_CLR[e.name] || C.text2} />)}
              </Pie>
            </PieChart>
            <div style={{ flex: 1 }}>
              {pieData.sort((a, b) => b.value - a.value).map(({ name, value }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_CLR[name] || C.text2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: C.text, fontFamily: S, textTransform: "capitalize" }}>{name}</span>
                      <span style={{ fontSize: 12, color: C.text, fontFamily: M }}>{rub(value)}</span>
                    </div>
                    <div style={{ height: 2, background: C.border, borderRadius: 1, marginTop: 3 }}>
                      <div style={{ height: 2, background: CAT_CLR[name] || C.text2, borderRadius: 1, width: `${(value / total) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Add form */}
      {adding ? (
        <Card>
          <Lbl>НОВАЯ ЗАПИСЬ</Lbl>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 7, fontFamily: M }}>КАТЕГОРИЯ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.keys(CAT_CLR).map(cat => (
                <button key={cat} onClick={() => setForm(p => ({ ...p, cat }))}
                  style={{ padding: "5px 12px", fontSize: 11, fontFamily: M, background: form.cat === cat ? (CAT_CLR[cat] || C.text2) + "20" : "transparent", color: form.cat === cat ? CAT_CLR[cat] : C.text2, border: `1px solid ${form.cat === cat ? (CAT_CLR[cat] || C.text2) + "60" : C.border}`, borderRadius: 5, cursor: "pointer", textTransform: "capitalize" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {[["СУММА (₽)", "amount", "number", "3200"], ["ДАТА", "date", "date", ""], ["ПРИМЕЧАНИЕ", "note", "text", "АЗС Лукойл"]].map(([l, k, t, ph]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 5, fontFamily: M }}>{l}</div>
              <Input type={t} value={form[k]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryBtn onClick={add} style={{ flex: 1 }}>ДОБАВИТЬ</PrimaryBtn>
            <GhostBtn onClick={() => setAdding(false)}>ОТМЕНА</GhostBtn>
          </div>
        </Card>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: "14px", background: "transparent", border: `1px dashed ${C.border}`, color: C.text2, borderRadius: 12, fontSize: 10, fontFamily: M, cursor: "pointer", letterSpacing: 1 }}>
          + ДОБАВИТЬ РАСХОД
        </button>
      )}

      {/* List */}
      {view === "list" && (
        <Card>
          <Lbl>ВСЕ ЗАПИСИ ({expenses.length})</Lbl>
          {expenses.map((e, i) => (
            <div key={e.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < expenses.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "center" }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: CAT_CLR[e.cat] || C.text2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.text, fontFamily: S, textTransform: "capitalize" }}>{e.cat}</span>
                  <span style={{ fontSize: 13, color: C.text, fontFamily: M, fontWeight: 600 }}>{rub(e.amount)}</span>
                </div>
                <div style={{ fontSize: 11, color: C.text2, fontFamily: M }}>{e.note} · {e.date}</div>
              </div>
              <button onClick={() => del(e.id)} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 15, padding: "0 4px" }}>×</button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCREEN: MORE (sub-screens)
═══════════════════════════════════════════ */
function More({ car, name, toast, setCar, expenses, setExpenses, setServices }) {
  const [sub, setSub] = useState(null);

  const menu = [
    { id: "service", icon: "🔍", label: "НАЙТИ СЕРВИС", sub: "Автосервисы, шиномонтаж, мойки" },
    { id: "tips",    icon: "💡", label: "СОВЕТЫ ДЖАРВИСА", sub: "ИИ-ответы на вопросы об авто" },
    { id: "sos",     icon: "🆘", label: "ЭКСТРЕННАЯ ПОМОЩЬ", sub: "ДТП, поломка, инструкции" },
    { id: "profile", icon: "🚗", label: "МОЙ АВТОМОБИЛЬ", sub: "Редактировать данные" },
    { id: "export",  icon: "📤", label: "ЭКСПОРТ ДАННЫХ", sub: "Сервисная книжка и расходы" },
    { id: "reset",   icon: "🔄", label: "СБРОСИТЬ ДАННЫЕ", sub: "Вернуть к заводским настройкам" },
  ];

  if (sub === "service") return <FindService car={car} toast={toast} onBack={() => setSub(null)} />;
  if (sub === "tips")    return <AiTips car={car} onBack={() => setSub(null)} />;
  if (sub === "sos")     return <Emergency car={car} onBack={() => setSub(null)} />;
  if (sub === "profile") return <CarProfile car={car} setCar={setCar} toast={toast} onBack={() => setSub(null)} />;
  if (sub === "export")  return <Export car={car} name={name} expenses={expenses} onBack={() => setSub(null)} />;

  const handleReset = () => {
    if (window.confirm("Сбросить все данные? Это действие нельзя отменить.")) {
      ["ja3_car", "ja3_services", "ja3_diagHistory", "ja3_expenses", "ja3_onboarded", "ja3_name"].forEach(k => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: S, marginBottom: 4 }}>Ещё</div>
      <Card>
        {menu.map((m, i) => (
          <div key={m.id}>
            <div onClick={() => m.id === "reset" ? handleReset() : setSub(m.id)}
              style={{ display: "flex", gap: 12, padding: "13px 0", alignItems: "center", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: m.id === "reset" ? C.red : C.text, fontFamily: S }}>{m.label}</div>
                <div style={{ fontSize: 11, color: C.text2, fontFamily: S }}>{m.sub}</div>
              </div>
              <span style={{ fontSize: 16, color: C.text2 }}>›</span>
            </div>
            {i < menu.length - 1 && <Divider />}
          </div>
        ))}
      </Card>

      <Card style={{ background: `${C.orange}08`, borderColor: `${C.orange}20`, textAlign: "center", padding: "20px" }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>⚙</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.orange, fontFamily: M, letterSpacing: 1, marginBottom: 4 }}>JARVIS AUTO BETA v3</div>
        <div style={{ fontSize: 12, color: C.text2, fontFamily: S }}>Производство: Claude · Данные: ваше устройство</div>
      </Card>
    </div>
  );
}

function FindService({ car, toast, onBack }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const cats = ["автосервис", "шиномонтаж", "автомойка", "запчасти", "эвакуатор", "техосмотр"];

  const search = async (q) => {
    const query_ = (q || query).trim(); if (!query_) return;
    setLoading(true); setData(null);
    try {
      const text = await ai(FIND_SYS, `Ищу: "${query_}" для ${car.make} ${car.model} ${car.year}`);
      setData(JSON.parse(text));
    } catch { toast("Ошибка поиска", "error"); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: S }}>Найти сервис</div>
      </div>
      <Card style={{ background: `${C.orange}06`, borderColor: `${C.orange}20` }}>
        <div style={{ fontSize: 11, color: C.orange, fontFamily: M, letterSpacing: 1, marginBottom: 4 }}>📍 DEMO РЕЖИМ</div>
        <div style={{ fontSize: 12, color: C.text2, fontFamily: S }}>Джарвис генерирует демо-варианты. В финальной версии — реальные сервисы на карте рядом с вами.</div>
      </Card>
      <Card>
        <Lbl>ЧТО ИЩЕМ</Lbl>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Шиномонтаж, замена масла…" style={{ flex: 1 }} />
          <PrimaryBtn onClick={() => search()} disabled={loading || !query.trim()} style={{ padding: "11px 18px", fontSize: 15 }}>→</PrimaryBtn>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {cats.map(c => <button key={c} onClick={() => { setQuery(c); search(c); }}
            style={{ padding: "4px 11px", fontSize: 10, fontFamily: M, background: "transparent", color: C.text2, border: `1px solid ${C.border}`, borderRadius: 5, cursor: "pointer" }}>{c}</button>)}
        </div>
      </Card>
      {loading && <Card><Spinner /></Card>}
      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.tip && <Card style={{ background: C.greenG, borderColor: `${C.green}25` }}><div style={{ fontSize: 12, color: C.text, fontFamily: S }}>💡 {data.tip}</div></Card>}
          {(data.results || []).map((s, i) => (
            <Card key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.text, fontFamily: S }}>{s.name}</div>
                  <Pill color={C.blue}>{s.type}</Pill>
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <span style={{ color: C.yellow }}>★</span>
                  <span style={{ fontSize: 13, color: C.text, fontFamily: M }}>{s.rating}</span>
                  <span style={{ fontSize: 10, color: C.text2, fontFamily: S }}>({s.reviews})</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.text2, fontFamily: S, marginBottom: 4 }}>📍 {s.address}</div>
              <div style={{ fontSize: 12, color: C.text2, fontFamily: S, marginBottom: 4 }}>📞 {s.phone} · {s.hours}</div>
              <div style={{ fontSize: 12, color: C.text2, fontFamily: S, marginBottom: 8 }}>⏱ Ожидание: {s.wait}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(s.tags || []).map(t => <Pill key={t} color={C.orange}>{t}</Pill>)}</div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.green, fontFamily: M }}>{s.price}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AiTips({ car, onBack }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: "jarvis", text: `Привет! Я Джарвис — ваш личный автоэксперт. Задайте любой вопрос о вашем ${car.make} ${car.model} или об автомобилях в целом.` },
  ]);
  const bottomRef = useRef(null);
  const suggestions = ["Как часто менять масло?", "Что такое P0420?", "Признаки износа колодок", "Зимняя vs летняя резина"];

  const send = async (q) => {
    const msg = (q || input).trim(); if (!msg || loading) return;
    setMsgs(p => [...p, { role: "user", text: msg }]);
    setInput(""); setLoading(true);
    try {
      const context = `Авто: ${car.make} ${car.model} ${car.year}, пробег ${car.mileage.toLocaleString()} км. Вопрос: ${msg}`;
      const text = await ai(TIPS_SYS, context, 600);
      setMsgs(p => [...p, { role: "jarvis", text }]);
    } catch { setMsgs(p => [...p, { role: "jarvis", text: "Извините, ошибка соединения." }]); }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>⚙</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: S }}>Советы Джарвиса</div>
            <div style={{ fontSize: 10, color: C.green, fontFamily: M, letterSpacing: 1 }}>ONLINE</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 200 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.role === "user" ? C.orange : C.card, border: m.role === "jarvis" ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 13, color: m.role === "user" ? "white" : C.text, fontFamily: S, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.text2, animation: `pulse 1.4s ease ${i * 0.2}s infinite` }} />)}</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!msgs.some(m => m.role === "user") && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {suggestions.map(s => <button key={s} onClick={() => send(s)}
            style={{ padding: "5px 12px", fontSize: 11, fontFamily: S, background: C.card, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 20, cursor: "pointer" }}>{s}</button>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Задайте вопрос…" style={{ flex: 1 }} />
        <PrimaryBtn onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: "11px 18px", fontSize: 15 }}>↑</PrimaryBtn>
      </div>
    </div>
  );
}

function Emergency({ car, onBack }) {
  const [step, setStep] = useState(null);
  const guides = {
    dtb: { title: "ДТП — ПЕРВЫЕ ШАГИ", color: C.red, steps: ["Включите аварийную сигнализацию", "Убедитесь, что все живы — при пострадавших звоните 112", "Выставьте знак аварийной остановки: в городе — 15м, на трассе — 30м", "Не перемещайте автомобили до приезда ГАИ (если есть пострадавшие)", "Сфотографируйте место ДТП, повреждения, номера, следы торможения", "Возьмите данные у всех участников: ФИО, телефон, страховка, гос. номер", "Заполните Европротокол при отсутствии пострадавших и согласии обеих сторон", "Уведомите страховую компанию в течение 5 рабочих дней"] },
    flat: { title: "ПРОБИТОЕ КОЛЕСО", color: C.yellow, steps: ["Плавно снижайте скорость, не тормозите резко", "Включите аварийку, прижмитесь к правой обочине", "Установите знак аварийной остановки", "Убедитесь, что авто стоит на ровной твёрдой поверхности, поставьте на ручник", "Достаньте запасное колесо, домкрат и баллонный ключ", "Ослабьте болты на 1 оборот (колесо на земле), затем поднимайте домкрат под специальную точку", "Замените колесо, затяните болты крест-накрест", "После — проверьте давление на запаске и болты через 50 км"] },
    battery: { title: "НЕ ЗАВОДИТСЯ (АКБ)", color: C.yellow, steps: ["Проверьте: щёлкает стартер? Слабый звук = скорее всего АКБ", "Попробуйте 'прикурить': найдите помогающий автомобиль", "Подключите красный провод к + вашей АКБ, затем к + доноров", "Подключите чёрный провод к - донора, другой конец — к металлу кузова вашего авто (не к -АКБ!)", "Заведите донора, подождите 5 минут", "Заводите свой автомобиль", "После старта дайте авто поработать 20-30 минут (зарядка АКБ)"] },
    overheat: { title: "ПЕРЕГРЕВ ДВИГАТЕЛЯ", color: C.red, steps: ["Немедленно остановитесь! Продолжение езды = замена двигателя", "Заглушите мотор, включите аварийку", "НЕ открывайте крышку радиатора сразу — горячая жидкость под давлением!", "Дождитесь остывания двигателя — минимум 30 минут", "Только после остывания осторожно откройте крышку тряпкой", "Проверьте уровень охлаждающей жидкости — при необходимости долейте", "Проверьте утечки, ремень помпы, термостат", "Если причина неизвестна — вызовите эвакуатор, не рискуйте двигателем"] },
  };

  if (step) {
    const g = guides[step];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setStep(null)} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: g.color, fontFamily: S }}>{g.title}</div>
        </div>
        <Card>
          {g.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < g.steps.length - 1 ? `1px solid ${C.border}` : "none", alignItems: "flex-start" }}>
              <div style={{ minWidth: 26, height: 26, borderRadius: "50%", background: g.color + "20", border: `1px solid ${g.color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: g.color, fontFamily: M }}>{i + 1}</span>
              </div>
              <span style={{ fontSize: 13, color: C.text, fontFamily: S, lineHeight: 1.6 }}>{s}</span>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: S }}>Экстренная помощь</div>
      </div>

      <a href="tel:112" style={{ textDecoration: "none" }}>
        <Card style={{ background: `${C.red}12`, borderColor: `${C.red}40`, textAlign: "center", padding: "20px", cursor: "pointer" }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🆘</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.red, fontFamily: M, letterSpacing: 2 }}>ЗВОНОК 112</div>
          <div style={{ fontSize: 12, color: C.text2, fontFamily: S, marginTop: 4 }}>Нажмите для вызова экстренных служб</div>
        </Card>
      </a>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { id: "dtb", icon: "💥", label: "ДТП", sub: "Что делать при аварии", color: C.red },
          { id: "flat", icon: "🛞", label: "ПРОБИТОЕ КОЛЕСО", sub: "Пошаговая замена", color: C.yellow },
          { id: "battery", icon: "🔋", label: "НЕ ЗАВОДИТСЯ", sub: "Прикурить автомобиль", color: C.yellow },
          { id: "overheat", icon: "🌡", label: "ПЕРЕГРЕВ", sub: "Что делать срочно", color: C.red },
        ].map(({ id, icon, label, sub, color }) => (
          <Card key={id} onClick={() => setStep(id)} style={{ cursor: "pointer", borderColor: `${color}25`, padding: "14px" }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: M, letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 11, color: C.text2, fontFamily: S }}>{sub}</div>
          </Card>
        ))}
      </div>

      <Card>
        <Lbl>ПОЛЕЗНЫЕ НОМЕРА</Lbl>
        {[["112", "Единая экстренная служба"], ["800-200-37-71", "Страховая (ОСАГО)"], ["088", "Служба газа"], ["101", "Пожарная охрана"]].map(([num, name]) => (
          <a key={num} href={`tel:${num}`} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}`, textDecoration: "none" }}>
            <span style={{ fontSize: 13, color: C.text, fontFamily: S }}>{name}</span>
            <span style={{ fontSize: 13, color: C.orange, fontFamily: M, fontWeight: 700 }}>{num}</span>
          </a>
        ))}
      </Card>
    </div>
  );
}

function CarProfile({ car, setCar, toast, onBack }) {
  const [form, setForm] = useState({ ...car });
  const [saved, setSaved] = useState(false);
  const fuelTypes = ["Бензин АИ-92", "Бензин АИ-95", "Бензин АИ-98", "Дизель", "Газ (LPG)", "Гибрид", "Электро"];

  const save = () => {
    setCar({ ...form, year: +form.year, mileage: +form.mileage });
    setSaved(true);
    toast("Данные автомобиля сохранены", "success");
    setTimeout(() => { setSaved(false); onBack(); }, 1200);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: S }}>Мой автомобиль</div>
      </div>
      <Card>
        {[["МАРКА", "make", "text", "Toyota"], ["МОДЕЛЬ", "model", "text", "Camry"], ["ГОД", "year", "number", "2019"], ["ПРОБЕГ (КМ)", "mileage", "number", "52000"], ["VIN", "vin", "text", "XTA..."], ["ЦВЕТ", "color", "text", "Белый перламутр"]].map(([l, k, t, ph]) => (
          <div key={k} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 5, fontFamily: M }}>{l}</div>
            <Input type={t} value={form[k]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.text2, letterSpacing: 2, marginBottom: 7, fontFamily: M }}>ТИП ТОПЛИВА</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {fuelTypes.map(f => (
              <button key={f} onClick={() => setForm(p => ({ ...p, fuel: f }))}
                style={{ padding: "5px 12px", fontSize: 11, fontFamily: S, background: form.fuel === f ? C.orangeG : "transparent", color: form.fuel === f ? C.orange : C.text2, border: `1px solid ${form.fuel === f ? C.orange + "60" : C.border}`, borderRadius: 5, cursor: "pointer" }}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <PrimaryBtn onClick={save} style={{ width: "100%", padding: "13px", background: saved ? C.green : C.orange }}>
          {saved ? "✓ СОХРАНЕНО" : "СОХРАНИТЬ ДАННЫЕ"}
        </PrimaryBtn>
      </Card>
    </div>
  );
}

function Export({ car, name, expenses, onBack }) {
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => ({ ...acc, [e.cat]: (acc[e.cat] || 0) + e.amount }), {});

  const download = () => {
    const lines = [
      `JARVIS AUTO — ОТЧЁТ`, `Владелец: ${name}`, `Автомобиль: ${car.make} ${car.model} ${car.year}`, `Пробег: ${car.mileage.toLocaleString()} км`, `Дата: ${new Date().toLocaleDateString("ru-RU")}`, ``,
      `=== РАСХОДЫ ===`, `Итого: ${rub(totalExp)}`,
      ...Object.entries(byCategory).map(([cat, sum]) => `  ${cat}: ${rub(sum)}`), ``,
      `=== ЗАПИСИ ===`,
      ...expenses.map(e => `${e.date}  ${e.cat.padEnd(12)}  ${String(e.amount).padStart(8)} ₽  ${e.note}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `jarvis-auto-export-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.text2, cursor: "pointer", fontSize: 18, padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: S }}>Экспорт данных</div>
      </div>
      <Card>
        <Lbl>СВОДКА ДЛЯ ЭКСПОРТА</Lbl>
        <div style={{ fontSize: 13, color: C.text, fontFamily: S, lineHeight: 1.7 }}>
          <div>👤 Владелец: {name}</div>
          <div>🚗 {car.make} {car.model} {car.year}</div>
          <div>📍 Пробег: {car.mileage.toLocaleString()} км</div>
          <div>💳 Записей расходов: {expenses.length}</div>
          <div>💰 Итого: {rub(totalExp)}</div>
        </div>
        <PrimaryBtn onClick={download} style={{ width: "100%", marginTop: 16, padding: "13px" }}>📥 СКАЧАТЬ ОТЧЁТ .TXT</PrimaryBtn>
      </Card>
      <Card style={{ background: `${C.blue}08`, borderColor: `${C.blue}25` }}>
        <div style={{ fontSize: 12, color: C.text2, fontFamily: S, lineHeight: 1.6 }}>
          В следующей версии: экспорт в PDF с графиками, история ТО, отчёт для страховой.
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════ */
const TABS = [
  { id: "home",     icon: "⌂",  label: "ГЛАВНАЯ" },
  { id: "diag",     icon: "⚙",  label: "ДИАГНОЗ" },
  { id: "maintain", icon: "≡",  label: "СЕРВИС" },
  { id: "finance",  icon: "₽",  label: "ФИНАНСЫ" },
  { id: "more",     icon: "···", label: "ЕЩЁ" },
];

export default function JarvisApp() {
  const [onboarded, setOnboarded] = usePersist("onboarded", false);
  const [name, setName] = usePersist("name", "");
  const [car, setCar] = usePersist("car", {});
  const [services, setServices] = usePersist("services", DEF_SVC);
  const [diagHistory, setDiagHistory] = usePersist("diagHistory", []);
  const [expenses, setExpenses] = usePersist("expenses", DEF_EXP);
  const [tab, setTab] = useState("home");
  const { toasts, show: toast } = useToast();

  const overdueCount = services.filter(s => s.status === "overdue" || s.status === "warning").length;

  if (!onboarded) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <Onboarding onDone={(n, c) => { setName(n); setCar(c); setOnboarded(true); }} />
      </>
    );
  }

  const screens = {
    home:     <Dashboard name={name} car={car} services={services} diagHistory={diagHistory} expenses={expenses} setTab={setTab} toast={toast} />,
    diag:     <Diagnostics history={diagHistory} setHistory={setDiagHistory} car={car} toast={toast} />,
    maintain: <Maintain services={services} setServices={setServices} car={car} setCar={setCar} toast={toast} />,
    finance:  <Finance expenses={expenses} setExpenses={setExpenses} toast={toast} />,
    more:     <More car={car} name={name} toast={toast} setCar={setCar} expenses={expenses} setExpenses={setExpenses} setServices={setServices} />,
  };

  return (
    <div style={{ fontFamily: M, background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 640, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; } input { -webkit-appearance: none; } @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <Toasts toasts={toasts} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", borderBottom: `1px solid ${C.border}`, background: C.bg2, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", boxShadow: `0 0 12px ${C.orange}50` }} onClick={() => setTab("home")}>
          <span style={{ fontSize: 15 }}>⚙</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: S, letterSpacing: -0.3 }}>JARVIS AUTO</div>
          <div style={{ fontSize: 9, color: C.text2, letterSpacing: 1.5, fontFamily: M }}>{car.make} {car.model} · {car.mileage?.toLocaleString("ru-RU")} км</div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
          <span style={{ fontSize: 8, color: C.green, fontFamily: M, letterSpacing: 1 }}>ONLINE</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "18px 16px 94px", overflowY: "auto" }}>
        <div key={tab} style={{ animation: "fadeUp 0.25s ease" }}>
          {screens[tab] || screens["home"]}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 640, background: C.bg2, borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 18px", zIndex: 40 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          const badge = t.id === "maintain" ? overdueCount : 0;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: active ? C.orange : C.text2, transition: "color 0.15s", position: "relative", padding: "4px 0" }}>
              {active && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, background: C.orange, borderRadius: 1 }} />}
              <span style={{ fontSize: 19, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ fontSize: 8, letterSpacing: 1, fontFamily: M }}>{t.label}</span>
              <Badge n={badge} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
