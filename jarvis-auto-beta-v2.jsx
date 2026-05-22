import { useState, useRef, useEffect, useCallback } from "react";

// ── Tokens ─────────────────────────────────────────────────────────
const O = "#FF6B00", BG = "#07101e", CARD = "#0c1628", CARD2 = "#080f1c";
const BD = "rgba(255,255,255,0.07)", T = "#dde3f0", T2 = "#4a5d78";
const GREEN = "#22c55e", YELLOW = "#f59e0b", RED = "#ef4444", BLUE = "#3b82f6";

// ── Persistence ────────────────────────────────────────────────────
function usePersisted(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem("ja_" + key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = useCallback(v => setVal(prev => {
    const next = typeof v === "function" ? v(prev) : v;
    try { localStorage.setItem("ja_" + key, JSON.stringify(next)); } catch {}
    return next;
  }), [key]);
  return [val, set];
}

// ── API ────────────────────────────────────────────────────────────
const DIAG_PROMPT = `Ты — Джарвис, ИИ-диагност для автомобилей. Только русский язык.
Ответь строго JSON без markdown:
{"title":"до 6 слов","system":"Двигатель/Трансмиссия/Тормоза/Электрика/Подвеска/Топливная система","description":"2-3 предложения для обычного человека","danger":"низкий|средний|высокий","danger_reason":"1 предложение","can_drive":true/false,"price_min":число,"price_max":число,"price_comment":"что входит","actions":["шаг1","шаг2","шаг3"]}
Если не авто — {"error":"Введите код ошибки OBD или симптом автомобиля."}
Цены РФ 2024, региональные сервисы.`;

async function callAI(prompt, userMsg) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: prompt, messages: [{ role: "user", content: userMsg }] }),
  });
  const d = await r.json();
  return d.content?.find(b => b.type === "text")?.text || "{}";
}

// ── Defaults ───────────────────────────────────────────────────────
const DEF_CAR = { make: "Toyota", model: "Camry", year: 2019, mileage: 52400, vin: "", color: "Белый" };
const DEF_SVC = [
  { id: 1, name: "Моторное масло", lastKm: 45000, lastDate: "2025-02-10", intervalKm: 10000, intervalMonths: 12, status: "ok" },
  { id: 2, name: "Воздушный фильтр", lastKm: 38000, lastDate: "2024-10-15", intervalKm: 20000, intervalMonths: 18, status: "ok" },
  { id: 3, name: "Тормозная жидкость", lastKm: 28000, lastDate: "2022-08-01", intervalKm: 40000, intervalMonths: 24, status: "overdue" },
  { id: 4, name: "Тормозные колодки", lastKm: 40000, lastDate: "2024-08-20", intervalKm: 40000, intervalMonths: 36, status: "ok" },
  { id: 5, name: "Свечи зажигания", lastKm: 20000, lastDate: "2022-05-10", intervalKm: 30000, intervalMonths: 36, status: "overdue" },
  { id: 6, name: "Антифриз", lastKm: 30000, lastDate: "2023-03-15", intervalKm: 60000, intervalMonths: 24, status: "warning" },
  { id: 7, name: "АКПП масло", lastKm: 30000, lastDate: "2023-03-01", intervalKm: 60000, intervalMonths: 48, status: "ok" },
];
const DEF_EXP = [
  { id: 1, date: "2025-04-01", category: "топливо", amount: 3200, note: "АЗС Лукойл" },
  { id: 2, date: "2025-02-10", category: "сервис", amount: 4500, note: "Замена масла + фильтр" },
  { id: 3, date: "2025-03-15", category: "топливо", amount: 2900, note: "АЗС Shell" },
  { id: 4, date: "2025-01-20", category: "страховка", amount: 18000, note: "КАСКО 2025" },
  { id: 5, date: "2025-03-28", category: "топливо", amount: 3100, note: "АЗС Газпром" },
];

// ── Style helpers ──────────────────────────────────────────────────
const fmtRub = n => (n || 0).toLocaleString("ru-RU") + " ₽";
const card = (x = {}) => ({ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: "16px 18px", ...x });
const lbl = (x = {}) => ({ fontSize: 10, color: T2, letterSpacing: 2.5, fontFamily: "mono", marginBottom: 8, ...x });
const inp = (x = {}) => ({ width: "100%", padding: "10px 14px", fontSize: 13, fontFamily: "mono", background: CARD2, border: `1px solid ${BD}`, borderRadius: 8, color: T, outline: "none", boxSizing: "border-box", ...x });
const MONO = "'IBM Plex Mono', monospace";
const SANS = "'IBM Plex Sans', sans-serif";

const dangerCfg = {
  низкий:  { color: GREEN,  bg: "rgba(34,197,94,0.1)",   label: "НИЗКИЙ" },
  средний: { color: YELLOW, bg: "rgba(245,158,11,0.1)",  label: "СРЕДНИЙ" },
  высокий: { color: RED,    bg: "rgba(239,68,68,0.1)",   label: "ВЫСОКИЙ" },
};
const statusCfg = {
  ok:      { color: GREEN,  bg: "rgba(34,197,94,0.1)",  label: "OK" },
  warning: { color: YELLOW, bg: "rgba(245,158,11,0.1)", label: "СКОРО" },
  overdue: { color: RED,    bg: "rgba(239,68,68,0.1)",  label: "ПРОСРОЧЕНО" },
};
const catClr = { топливо: O, сервис: BLUE, страховка: "#8b5cf6", запчасти: YELLOW, штрафы: RED, прочее: T2 };
const calcHealth = s => Math.max(0, 100 - s.filter(x => x.status === "overdue").length * 18 - s.filter(x => x.status === "warning").length * 8);

// ── Animated ring ──────────────────────────────────────────────────
function Ring({ value, max = 100, size = 110, sw = 8, color, label }) {
  const R = (size - sw) / 2, C = 2 * Math.PI * R;
  const pct = Math.min(value / max, 1);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={BD} strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${pct * C} ${C}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: MONO, lineHeight: 1 }}>{value}</div>
        {label && <div style={{ fontSize: 9, color: T2, letterSpacing: 1 }}>{label}</div>}
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────
function Badge({ n }) {
  if (!n) return null;
  return (
    <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 8, color: "white", fontWeight: 700, fontFamily: MONO }}>{n > 9 ? "9+" : n}</span>
    </div>
  );
}

// ── SCREEN: Dashboard ──────────────────────────────────────────────
function Dashboard({ car, services, diagHistory, expenses, setTab }) {
  const health = calcHealth(services);
  const hColor = health >= 75 ? GREEN : health >= 50 ? YELLOW : RED;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const overdue = services.filter(s => s.status === "overdue");
  const warning = services.filter(s => s.status === "warning");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Car hero */}
      <div style={{ ...card(), background: `linear-gradient(135deg, ${CARD} 0%, #0f1f3a 100%)`, borderLeft: `3px solid ${O}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,107,0,0.06)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 10, top: 10, width: 50, height: 50, borderRadius: "50%", background: "rgba(255,107,0,0.04)", pointerEvents: "none" }} />
        <div style={lbl()}>МОЙ АВТОМОБИЛЬ</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T, fontFamily: SANS, letterSpacing: -0.5 }}>{car.make} {car.model}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
          {[car.year, car.color, `${car.mileage.toLocaleString("ru-RU")} км`].map((v, i) => (
            <span key={i} style={{ fontSize: 12, color: i === 2 ? T : T2, fontFamily: i === 2 ? MONO : SANS }}>{v}</span>
          ))}
        </div>
        <button onClick={() => setTab("profile")}
          style={{ marginTop: 12, padding: "5px 12px", fontSize: 10, fontFamily: MONO, background: "transparent", color: O, border: `1px solid rgba(255,107,0,0.3)`, borderRadius: 6, cursor: "pointer", letterSpacing: 1 }}>
          ИЗМЕНИТЬ ДАННЫЕ →
        </button>
      </div>

      {/* Health + stats */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12 }}>
        <div style={{ ...card(), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 20px", gap: 6 }}>
          <div style={lbl({ textAlign: "center", marginBottom: 4 })}>ЗДОРОВЬЕ</div>
          <Ring value={health} color={hColor} label="/ 100" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ ...card(), flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={lbl()}>РАСХОДЫ 2025</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T, fontFamily: MONO }}>{fmtRub(total)}</div>
          </div>
          <div style={{ ...card(), flex: 1, background: overdue.length ? "rgba(239,68,68,0.05)" : CARD, borderColor: overdue.length ? "rgba(239,68,68,0.25)" : BD }}>
            <div style={lbl()}>НУЖЕН СЕРВИС</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: overdue.length ? RED : GREEN, fontFamily: MONO }}>
              {overdue.length + warning.length} позиции
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(overdue.length > 0 || warning.length > 0) && (
        <div style={{ ...card(), background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.18)" }}>
          <div style={lbl({ color: RED })}>⚠ ТРЕБУЕТ ВНИМАНИЯ</div>
          {[...overdue, ...warning].map((s, i, arr) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < arr.length - 1 ? `1px solid rgba(239,68,68,0.1)` : "none" }}>
              <span style={{ fontSize: 13, color: T, fontFamily: SANS }}>{s.name}</span>
              <span style={{ fontSize: 9, color: statusCfg[s.status].color, letterSpacing: 1, fontFamily: MONO }}>{statusCfg[s.status].label}</span>
            </div>
          ))}
          <button onClick={() => setTab("book")}
            style={{ marginTop: 10, padding: "8px", width: "100%", fontSize: 10, fontFamily: MONO, background: "transparent", color: RED, border: `1px solid rgba(239,68,68,0.25)`, borderRadius: 6, cursor: "pointer", letterSpacing: 1 }}>
            ПЕРЕЙТИ В СЕРВИСНУЮ КНИЖКУ →
          </button>
        </div>
      )}

      {/* Diag history */}
      {diagHistory.length > 0 && (
        <div style={card()}>
          <div style={lbl()}>ПОСЛЕДНИЕ ДИАГНОЗЫ</div>
          {diagHistory.slice(0, 3).map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < Math.min(3, diagHistory.length) - 1 ? `1px solid ${BD}` : "none", alignItems: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: dangerCfg[d.danger]?.color || T2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T, fontFamily: SANS }}>{d.title}</div>
                <div style={{ fontSize: 11, color: T2, fontFamily: MONO }}>{d.query} · {d.time}</div>
              </div>
              <span style={{ fontSize: 9, color: dangerCfg[d.danger]?.color || T2, letterSpacing: 1, fontFamily: MONO }}>{dangerCfg[d.danger]?.label}</span>
            </div>
          ))}
          <button onClick={() => setTab("diag")} style={{ marginTop: 10, padding: "8px", width: "100%", fontSize: 10, fontFamily: MONO, background: "transparent", color: O, border: `1px solid rgba(255,107,0,0.25)`, borderRadius: 6, cursor: "pointer", letterSpacing: 1 }}>
            ВСЯ ИСТОРИЯ →
          </button>
        </div>
      )}

      {/* Module status */}
      <div style={{ ...card(), display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "ИИ ДИАГНОСТИКА", st: "АКТИВНА", color: GREEN, tab: "diag" },
          { label: "СЕРВИСНАЯ КНИЖКА", st: "ГОТОВА", color: GREEN, tab: "book" },
          { label: "НАЙТИ СЕРВИС", st: "BETA", color: YELLOW, tab: "map" },
          { label: "ЭВАКУАТОР", st: "СКОРО", color: T2, tab: null },
        ].map(m => (
          <div key={m.label} onClick={() => m.tab && setTab(m.tab)}
            style={{ display: "flex", gap: 8, alignItems: "center", cursor: m.tab ? "pointer" : "default", padding: "4px 0" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 9, color: T2, letterSpacing: 1, fontFamily: MONO }}>{m.label}</div>
              <div style={{ fontSize: 9, color: m.color, letterSpacing: 1, fontFamily: MONO }}>{m.st}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SCREEN: Car Profile ────────────────────────────────────────────
function CarProfile({ car, setCar, setTab }) {
  const [form, setForm] = useState({ ...car });
  const [saved, setSaved] = useState(false);
  const fields = [
    ["МАРКА", "make", "text", "Toyota"],
    ["МОДЕЛЬ", "model", "text", "Camry"],
    ["ГОД ВЫПУСКА", "year", "number", "2019"],
    ["ПРОБЕГ (КМ)", "mileage", "number", "52400"],
    ["VIN-КОД", "vin", "text", "XW8ZZZ61ZJG012345"],
    ["ЦВЕТ", "color", "text", "Белый"],
  ];
  const save = () => {
    setCar({ ...form, year: +form.year, mileage: +form.mileage });
    setSaved(true);
    setTimeout(() => { setSaved(false); setTab("home"); }, 1200);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card()}>
        <div style={lbl()}>ДАННЫЕ АВТОМОБИЛЯ</div>
        {fields.map(([label, key, type, ph]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: T2, letterSpacing: 2, marginBottom: 5, fontFamily: MONO }}>{label}</div>
            <input type={type} value={form[key]} placeholder={ph}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              style={inp()} />
          </div>
        ))}
        <button onClick={save}
          style={{ width: "100%", padding: "12px", background: saved ? GREEN : O, color: "white", border: "none", borderRadius: 8, fontSize: 12, fontFamily: MONO, fontWeight: 700, cursor: "pointer", letterSpacing: 1, transition: "background 0.3s" }}>
          {saved ? "✓ СОХРАНЕНО" : "СОХРАНИТЬ"}
        </button>
      </div>
      <div style={{ ...card(), background: "rgba(255,107,0,0.04)", borderColor: "rgba(255,107,0,0.15)" }}>
        <div style={lbl({ color: O })}>ЧТО БУДЕТ ДАЛЬШЕ</div>
        <div style={{ fontSize: 12, color: T2, fontFamily: SANS, lineHeight: 1.6 }}>
          Следующие версии: автозаполнение по VIN-коду, история владельцев, загрузка фото из ГИБДД, интеграция со страховкой.
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Diagnostics ────────────────────────────────────────────
function Diagnostics({ history, setHistory }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);
  const examples = ["P0301", "P0420", "P0171", "стук при торможении", "не заводится утром", "вибрация 80 км/ч"];

  const run = async (q) => {
    const query = (q !== undefined ? q : input).trim();
    if (!query || loading) return;
    setLoading(true); setResult(null); setErr("");
    try {
      const text = await callAI(DIAG_PROMPT, query);
      const r = JSON.parse(text);
      if (r.error) { setErr(r.error); }
      else {
        setResult(r);
        const entry = { ...r, query, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) };
        setHistory(prev => [entry, ...prev].slice(0, 20));
      }
    } catch { setErr("Ошибка соединения. Попробуй ещё раз."); }
    setLoading(false);
  };

  const reset = () => { setResult(null); setInput(""); inputRef.current?.focus(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card()}>
        <div style={lbl()}>КОД ОШИБКИ ИЛИ СИМПТОМ</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
            placeholder="P0301 или «стучит двигатель»" style={inp({ flex: 1, borderColor: loading ? BD : input ? "rgba(255,107,0,0.4)" : BD, transition: "border-color 0.2s" })} />
          <button onClick={() => run()} disabled={loading || !input.trim()}
            style={{ padding: "10px 18px", background: loading || !input.trim() ? CARD2 : O, color: loading || !input.trim() ? T2 : "white", border: "none", borderRadius: 8, fontSize: 14, fontFamily: MONO, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", minWidth: 52, transition: "background 0.2s" }}>
            {loading ? "·" : "→"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => { setInput(ex); setTimeout(() => run(ex), 20); }}
              style={{ padding: "3px 10px", fontSize: 10, fontFamily: MONO, background: "transparent", color: T2, border: `1px solid ${BD}`, borderRadius: 4, cursor: "pointer", transition: "color 0.15s, border-color 0.15s" }}
              onMouseEnter={e => { e.target.style.color = O; e.target.style.borderColor = O; }}
              onMouseLeave={e => { e.target.style.color = T2; e.target.style.borderColor = BD; }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ ...card(), textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 28, color: O, marginBottom: 14, display: "inline-block", animation: "spin 1.5s linear infinite" }}>⚙</div>
          <div style={{ fontSize: 11, color: T2, letterSpacing: 3 }}>ДИАГНОСТИКА...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {err && !loading && (
        <div style={{ ...card(), background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)", color: RED, fontSize: 13, fontFamily: SANS }}>
          {err}
        </div>
      )}

      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "fadeUp 0.4s ease" }}>
          <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
          <div style={{ ...card(), borderLeft: `3px solid ${O}` }}>
            <div style={{ fontSize: 10, color: T2, letterSpacing: 2.5, fontFamily: MONO, marginBottom: 6 }}>{(result.system || "").toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T, fontFamily: SANS, lineHeight: 1.3 }}>{result.title}</div>
            <div style={{ fontSize: 13, color: T2, marginTop: 8, lineHeight: 1.65, fontFamily: SANS }}>{result.description}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ ...card(), background: dangerCfg[result.danger]?.bg, borderColor: (dangerCfg[result.danger]?.color || T2) + "60" }}>
              <div style={lbl()}>ОПАСНОСТЬ</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: dangerCfg[result.danger]?.color, fontFamily: MONO }}>{dangerCfg[result.danger]?.label}</div>
              <div style={{ fontSize: 11, color: T2, marginTop: 4, fontFamily: SANS, lineHeight: 1.4 }}>{result.danger_reason}</div>
            </div>
            <div style={{ ...card(), background: result.can_drive ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)", borderColor: result.can_drive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ fontSize: 32, color: result.can_drive ? GREEN : RED, marginBottom: 4 }}>{result.can_drive ? "✓" : "✗"}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: result.can_drive ? GREEN : RED, letterSpacing: 1.5, fontFamily: MONO }}>{result.can_drive ? "МОЖНО ЕХАТЬ" : "НЕ ЕХАТЬ"}</div>
            </div>
          </div>

          <div style={card()}>
            <div style={lbl()}>СТОИМОСТЬ РЕМОНТА</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T, fontFamily: MONO }}>{fmtRub(result.price_min)} – {fmtRub(result.price_max)}</div>
            <div style={{ fontSize: 12, color: T2, marginTop: 4, fontFamily: SANS }}>{result.price_comment}</div>
          </div>

          <div style={card()}>
            <div style={lbl()}>ЧТО ДЕЛАТЬ</div>
            {(result.actions || []).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < result.actions.length - 1 ? 10 : 0, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: O, fontFamily: MONO, minWidth: 20, paddingTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 13, color: T, fontFamily: SANS, lineHeight: 1.55 }}>{a}</span>
              </div>
            ))}
          </div>

          <button onClick={reset} style={{ padding: "10px", background: "transparent", border: `1px solid ${BD}`, color: T2, borderRadius: 8, fontSize: 10, fontFamily: MONO, cursor: "pointer", letterSpacing: 1 }}>
            ← НОВЫЙ ЗАПРОС
          </button>
        </div>
      )}

      {history.length > 0 && !result && !loading && (
        <div style={card()}>
          <div style={lbl()}>ИСТОРИЯ ({history.length})</div>
          {history.slice(0, 8).map((d, i) => (
            <div key={i} onClick={() => { setInput(d.query); setTimeout(() => run(d.query), 20); }}
              style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < Math.min(8, history.length) - 1 ? `1px solid ${BD}` : "none", cursor: "pointer", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: dangerCfg[d.danger]?.color || T2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T, fontFamily: SANS }}>{d.title}</div>
                <div style={{ fontSize: 11, color: T2, fontFamily: MONO }}>{d.query} · {d.time}</div>
              </div>
              <span style={{ fontSize: 9, color: T2, fontFamily: MONO }}>↻</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SCREEN: Service Book ───────────────────────────────────────────
function ServiceBook({ services, setServices, car, setCar }) {
  const [editMileage, setEditMileage] = useState(false);
  const [newMileage, setNewMileage] = useState(car.mileage);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), intervalKm: 10000, intervalMonths: 12 });

  const markDone = id => setServices(prev => prev.map(s =>
    s.id === id ? { ...s, lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), status: "ok" } : s
  ));
  const del = id => setServices(prev => prev.filter(s => s.id !== id));
  const addService = () => {
    if (!form.name) return;
    setServices(prev => [...prev, { ...form, id: Date.now(), status: "ok" }]);
    setAdding(false);
    setForm({ name: "", lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), intervalKm: 10000, intervalMonths: 12 });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card()}>
        <div style={lbl()}>ТЕКУЩИЙ ПРОБЕГ</div>
        {editMileage ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={newMileage} onChange={e => setNewMileage(+e.target.value)}
              style={inp({ flex: 1, fontSize: 18, borderColor: O })} />
            <button onClick={() => { setCar(c => ({ ...c, mileage: newMileage })); setEditMileage(false); }}
              style={{ padding: "10px 16px", background: GREEN, color: "white", border: "none", borderRadius: 8, fontSize: 11, fontFamily: MONO, cursor: "pointer", fontWeight: 700 }}>✓</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: T, fontFamily: MONO }}>{car.mileage.toLocaleString("ru-RU")} <span style={{ fontSize: 14, color: T2 }}>км</span></div>
            <button onClick={() => { setEditMileage(true); setNewMileage(car.mileage); }}
              style={{ padding: "6px 14px", background: "transparent", color: O, border: `1px solid rgba(255,107,0,0.3)`, borderRadius: 6, fontSize: 10, fontFamily: MONO, cursor: "pointer", letterSpacing: 1 }}>ОБНОВИТЬ</button>
          </div>
        )}
      </div>

      <div style={card()}>
        <div style={lbl()}>РЕГЛАМЕНТ ТО — {services.length} ПОЗИЦИЙ</div>
        {services.map((s, i) => {
          const cfg = statusCfg[s.status];
          const nextKm = s.lastKm + s.intervalKm;
          const rem = nextKm - car.mileage;
          return (
            <div key={s.id} style={{ padding: "12px 0", borderBottom: i < services.length - 1 ? `1px solid ${BD}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: T, fontFamily: SANS, fontWeight: 500 }}>{s.name}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "2px 8px", borderRadius: 4, background: cfg.bg, color: cfg.color, fontFamily: MONO }}>{cfg.label}</span>
                  <button onClick={() => del(s.id)} style={{ background: "none", border: "none", color: T2, cursor: "pointer", fontSize: 12, padding: "0 2px" }}>×</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: T2, fontFamily: MONO }}>
                {s.lastDate} · {s.lastKm.toLocaleString()} км · каждые {s.intervalKm.toLocaleString()} км
              </div>
              {s.status !== "ok" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: cfg.color, fontFamily: MONO }}>
                    {s.status === "overdue" ? `просрочено на ${Math.abs(rem).toLocaleString()} км` : `осталось ~${rem.toLocaleString()} км`}
                  </span>
                  <button onClick={() => markDone(s.id)}
                    style={{ padding: "2px 10px", fontSize: 10, fontFamily: MONO, background: "rgba(34,197,94,0.12)", color: GREEN, border: `1px solid rgba(34,197,94,0.3)`, borderRadius: 4, cursor: "pointer" }}>
                    СДЕЛАНО ✓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {adding ? (
        <div style={card()}>
          <div style={lbl()}>НОВАЯ ОПЕРАЦИЯ ТО</div>
          {[["НАЗВАНИЕ РАБОТЫ", "name", "text", "Замена ремня ГРМ"],
            ["ПРОБЕГ ПРИ ЗАМЕНЕ", "lastKm", "number", ""],
            ["ДАТА ЗАМЕНЫ", "lastDate", "date", ""],
            ["ИНТЕРВАЛ КМ", "intervalKm", "number", "30000"]].map(([l, k, t, ph]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T2, letterSpacing: 2, marginBottom: 5, fontFamily: MONO }}>{l}</div>
              <input type={t} value={form[k]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [k]: t === "number" ? +e.target.value : e.target.value }))} style={inp()} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addService} style={{ flex: 1, padding: "10px", background: O, color: "white", border: "none", borderRadius: 8, fontSize: 11, fontFamily: MONO, fontWeight: 700, cursor: "pointer" }}>ДОБАВИТЬ</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "transparent", color: T2, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 11, fontFamily: MONO, cursor: "pointer" }}>ОТМЕНА</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: "14px", background: "transparent", border: `1px dashed ${BD}`, color: T2, borderRadius: 12, fontSize: 10, fontFamily: MONO, cursor: "pointer", letterSpacing: 1 }}>
          + ДОБАВИТЬ ОПЕРАЦИЮ ТО
        </button>
      )}
    </div>
  );
}

// ── SCREEN: Expenses ───────────────────────────────────────────────
function Expenses({ expenses, setExpenses }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "топливо", amount: "", note: "" });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {});
  const maxVal = Math.max(...Object.values(byCategory), 1);

  const addExpense = () => {
    if (!form.amount) return;
    setExpenses(prev => [{ ...form, amount: +form.amount, id: Date.now() }, ...prev]);
    setAdding(false);
    setForm({ date: new Date().toISOString().slice(0, 10), category: "топливо", amount: "", note: "" });
  };
  const del = id => setExpenses(prev => prev.filter(e => e.id !== id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...card(), borderLeft: `3px solid ${O}` }}>
        <div style={lbl()}>ИТОГО 2025</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: T, fontFamily: MONO }}>{fmtRub(total)}</div>
        <div style={{ fontSize: 12, color: T2, marginTop: 4, fontFamily: SANS }}>{expenses.length} записей · среднее {fmtRub(Math.round(total / (expenses.length || 1)))} за запись</div>
      </div>

      <div style={card()}>
        <div style={lbl()}>ПО КАТЕГОРИЯМ</div>
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, sum]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: catClr[cat] || T2 }} />
                <span style={{ fontSize: 13, color: T, fontFamily: SANS, textTransform: "capitalize" }}>{cat}</span>
              </div>
              <span style={{ fontSize: 13, color: T, fontFamily: MONO }}>{fmtRub(sum)}</span>
            </div>
            <div style={{ height: 3, background: BD, borderRadius: 2 }}>
              <div style={{ height: 3, background: catClr[cat] || T2, borderRadius: 2, width: `${(sum / maxVal) * 100}%`, transition: "width 0.8s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={card()}>
          <div style={lbl()}>НОВАЯ ЗАПИСЬ</div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: T2, letterSpacing: 2, marginBottom: 6, fontFamily: MONO }}>КАТЕГОРИЯ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.keys(catClr).map(cat => (
                <button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))}
                  style={{ padding: "5px 12px", fontSize: 10, fontFamily: MONO, background: form.category === cat ? (catClr[cat] || T2) + "20" : "transparent", color: form.category === cat ? catClr[cat] : T2, border: `1px solid ${form.category === cat ? (catClr[cat] || T2) + "60" : BD}`, borderRadius: 4, cursor: "pointer" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {[["СУММА (₽)", "amount", "number", "3200"], ["ДАТА", "date", "date", ""], ["ПРИМЕЧАНИЕ", "note", "text", "АЗС Лукойл"]].map(([l, k, t, ph]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T2, letterSpacing: 2, marginBottom: 5, fontFamily: MONO }}>{l}</div>
              <input type={t} value={form[k]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} style={inp()} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={addExpense} style={{ flex: 1, padding: "10px", background: O, color: "white", border: "none", borderRadius: 8, fontSize: 11, fontFamily: MONO, fontWeight: 700, cursor: "pointer" }}>ДОБАВИТЬ</button>
            <button onClick={() => setAdding(false)} style={{ padding: "10px 16px", background: "transparent", color: T2, border: `1px solid ${BD}`, borderRadius: 8, fontSize: 11, fontFamily: MONO, cursor: "pointer" }}>ОТМЕНА</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: "14px", background: "transparent", border: `1px dashed ${BD}`, color: T2, borderRadius: 12, fontSize: 10, fontFamily: MONO, cursor: "pointer", letterSpacing: 1 }}>
          + ДОБАВИТЬ РАСХОД
        </button>
      )}

      <div style={card()}>
        <div style={lbl()}>ВСЕ ЗАПИСИ</div>
        {expenses.map((e, i) => (
          <div key={e.id} style={{ display: "flex", gap: 10, padding: "9px 0", borderBottom: i < expenses.length - 1 ? `1px solid ${BD}` : "none", alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: catClr[e.category] || T2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: T, fontFamily: SANS, textTransform: "capitalize" }}>{e.category}</span>
                <span style={{ fontSize: 13, color: T, fontFamily: MONO, fontWeight: 600 }}>{fmtRub(e.amount)}</span>
              </div>
              <div style={{ fontSize: 11, color: T2, fontFamily: MONO }}>{e.note} · {e.date}</div>
            </div>
            <button onClick={() => del(e.id)} style={{ background: "none", border: "none", color: T2, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SCREEN: Find Service ───────────────────────────────────────────
function FindService({ car }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [err, setErr] = useState("");

  const categories = ["автосервис", "шиномонтаж", "автомойка", "запчасти", "эвакуатор", "техосмотр"];

  const search = async (cat) => {
    const q = cat || query.trim();
    if (!q) return;
    setLoading(true); setResults(null); setErr("");
    const prompt = `Пользователь ищет "${q}" для автомобиля ${car.make} ${car.model} ${car.year}. 
Создай 4 реалистичных (выдуманных для демо) варианта сервиса/услуги. Ответь JSON без markdown:
{"results":[{"name":"Название сервиса","type":"Тип","address":"Улица, дом","rating":4.5,"price":"от 500 ₽","phone":"+7 (999) 123-45-67","hours":"9:00–20:00","tags":["быстро","дёшево"]},...],"tip":"Совет по выбору 1 предложение"}`;
    try {
      const text = await callAI(prompt, q);
      setResults(JSON.parse(text));
    } catch { setErr("Не удалось найти. Попробуй ещё раз."); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card()}>
        <div style={lbl()}>НАЙТИ РЯДОМ</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Шиномонтаж, автосервис, мойка…" style={inp({ flex: 1 })} />
          <button onClick={() => search()} disabled={loading || !query.trim()}
            style={{ padding: "10px 18px", background: loading || !query.trim() ? CARD2 : O, color: loading || !query.trim() ? T2 : "white", border: "none", borderRadius: 8, fontSize: 14, fontFamily: MONO, fontWeight: 700, cursor: "pointer", minWidth: 52 }}>
            {loading ? "·" : "→"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setQuery(cat); search(cat); }}
              style={{ padding: "4px 12px", fontSize: 10, fontFamily: MONO, background: "transparent", color: T2, border: `1px solid ${BD}`, borderRadius: 4, cursor: "pointer" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...card(), background: "rgba(255,107,0,0.04)", borderColor: "rgba(255,107,0,0.15)", display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 20 }}>📍</span>
        <div>
          <div style={{ fontSize: 11, color: O, letterSpacing: 1, fontFamily: MONO }}>DEMO РЕЖИМ</div>
          <div style={{ fontSize: 12, color: T2, fontFamily: SANS }}>В финальной версии — реальные сервисы на карте рядом с вами, рейтинги и бронирование.</div>
        </div>
      </div>

      {loading && (
        <div style={{ ...card(), textAlign: "center", padding: "44px 0" }}>
          <div style={{ fontSize: 26, color: O, marginBottom: 12, display: "inline-block", animation: "spin 1.5s linear infinite" }}>⚙</div>
          <div style={{ fontSize: 11, color: T2, letterSpacing: 3 }}>ПОИСК...</div>
        </div>
      )}

      {err && <div style={{ ...card(), color: RED, fontSize: 13, fontFamily: SANS }}>{err}</div>}

      {results && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.tip && (
            <div style={{ ...card(), background: "rgba(34,197,94,0.05)", borderColor: "rgba(34,197,94,0.2)" }}>
              <div style={lbl({ color: GREEN })}>💡 СОВЕТ</div>
              <div style={{ fontSize: 13, color: T2, fontFamily: SANS }}>{results.tip}</div>
            </div>
          )}
          {(results.results || []).map((s, i) => (
            <div key={i} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T, fontFamily: SANS }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: T2, fontFamily: MONO }}>{s.type}</div>
                </div>
                <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: YELLOW }}>★</span>
                  <span style={{ fontSize: 12, color: T, fontFamily: MONO }}>{s.rating}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: T2, fontFamily: SANS, marginBottom: 4 }}>📍 {s.address}</div>
              <div style={{ fontSize: 12, color: T2, fontFamily: SANS, marginBottom: 4 }}>📞 {s.phone} · {s.hours}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(s.tags || []).map(tag => (
                    <span key={tag} style={{ fontSize: 9, padding: "2px 8px", background: "rgba(255,107,0,0.1)", color: O, borderRadius: 4, fontFamily: MONO, letterSpacing: 1 }}>{tag}</span>
                  ))}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: GREEN, fontFamily: MONO }}>{s.price}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
const TABS = [
  { id: "home",    icon: "⌂", label: "ГЛАВНАЯ" },
  { id: "diag",    icon: "⚙", label: "ДИАГНОСТИКА" },
  { id: "book",    icon: "≡", label: "КНИЖКА" },
  { id: "exp",     icon: "₽", label: "РАСХОДЫ" },
  { id: "map",     icon: "◎", label: "СЕРВИС" },
];

export default function JarvisApp() {
  const [tab, setTab] = useState("home");
  const [car, setCar] = usePersisted("car", DEF_CAR);
  const [services, setServices] = usePersisted("services", DEF_SVC);
  const [diagHistory, setDiagHistory] = usePersisted("diagHistory", []);
  const [expenses, setExpenses] = usePersisted("expenses", DEF_EXP);

  const overdueCount = services.filter(s => s.status === "overdue" || s.status === "warning").length;

  const screens = {
    home:    <Dashboard car={car} services={services} diagHistory={diagHistory} expenses={expenses} setTab={setTab} />,
    diag:    <Diagnostics history={diagHistory} setHistory={setDiagHistory} />,
    book:    <ServiceBook services={services} setServices={setServices} car={car} setCar={setCar} />,
    exp:     <Expenses expenses={expenses} setExpenses={setExpenses} />,
    map:     <FindService car={car} />,
    profile: <CarProfile car={car} setCar={setCar} setTab={setTab} />,
  };

  return (
    <div style={{ fontFamily: MONO, background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 640, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: `1px solid ${BD}`, background: "#05091a", position: "sticky", top: 0, zIndex: 10 }}>
        <div onClick={() => setTab("home")} style={{ width: 34, height: 34, borderRadius: "50%", background: O, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T, fontFamily: SANS, letterSpacing: -0.3 }}>JARVIS AUTO</div>
          <div style={{ fontSize: 8, color: T2, letterSpacing: 2 }}>{car.make} {car.model} · BETA v2</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
          <span style={{ fontSize: 9, color: GREEN, letterSpacing: 1 }}>ONLINE</span>
        </div>
        <button onClick={() => setTab("profile")} style={{ background: "transparent", border: `1px solid ${BD}`, color: T2, borderRadius: 6, fontSize: 10, fontFamily: MONO, cursor: "pointer", padding: "4px 10px", letterSpacing: 1 }}>
          ПРОФИЛЬ
        </button>
      </div>

      {/* Breadcrumb for sub-screens */}
      {tab === "profile" && (
        <div style={{ padding: "10px 18px", borderBottom: `1px solid ${BD}`, background: "#060c1a" }}>
          <button onClick={() => setTab("home")} style={{ background: "none", border: "none", color: T2, fontSize: 11, fontFamily: MONO, cursor: "pointer", padding: 0, letterSpacing: 1 }}>
            ← НАЗАД
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: "18px 16px 100px", overflowY: "auto" }}>
        {screens[tab] || screens["home"]}
      </div>

      {/* Bottom nav */}
      {tab !== "profile" && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 640, display: "flex", background: "#040a16", borderTop: `1px solid ${BD}`, paddingBottom: 16, paddingTop: 8, zIndex: 20 }}>
          {TABS.map(t => {
            const active = tab === t.id;
            const badge = t.id === "book" ? overdueCount : 0;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: active ? O : T2, transition: "color 0.15s", position: "relative" }}>
                {active && <div style={{ position: "absolute", top: -8, width: 24, height: 2, background: O, borderRadius: 1 }} />}
                <span style={{ fontSize: 17, lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 7.5, letterSpacing: 1, fontFamily: MONO }}>{t.label}</span>
                <Badge n={badge} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
