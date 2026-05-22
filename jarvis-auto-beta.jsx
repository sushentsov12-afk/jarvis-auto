import { useState, useRef } from "react";

// ── Design tokens ──────────────────────────────────────────────────
const O = "#FF6B00";
const BG = "#07101e";
const CARD = "#0c1628";
const CARD2 = "#0a1320";
const BD = "rgba(255,255,255,0.07)";
const T = "#dde3f0";
const T2 = "#5c6e8a";
const GREEN = "#22c55e";
const YELLOW = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#3b82f6";

// ── Claude API ─────────────────────────────────────────────────────
const DIAG_PROMPT = `Ты — Джарвис, ИИ-диагност для автомобилей. Отвечай ТОЛЬКО на русском языке.
Пользователь вводит код ошибки OBD или симптом.
Ответь строго в JSON (без markdown, без backticks):
{"title":"название до 6 слов","system":"система авто","description":"объяснение 2-3 предложения для обычного человека","danger":"низкий|средний|высокий","danger_reason":"одно предложение","can_drive":true|false,"price_min":число,"price_max":число,"price_comment":"что входит 1 предложение","actions":["шаг 1","шаг 2","шаг 3"]}
Цены для России 2024 года. Не авто-запрос → {"error":"Введите код ошибки OBD или симптом."}`;

async function diagnoseCar(query) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: DIAG_PROMPT,
      messages: [{ role: "user", content: query }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "{}";
  return JSON.parse(text);
}

// ── Initial data ───────────────────────────────────────────────────
const INIT_CAR = { make: "Toyota", model: "Camry", year: 2019, mileage: 52400 };

const INIT_SERVICES = [
  { id: 1, name: "Моторное масло", lastKm: 45000, lastDate: "2025-02-10", intervalKm: 10000, intervalMonths: 12, status: "ok" },
  { id: 2, name: "Воздушный фильтр", lastKm: 38000, lastDate: "2024-10-15", intervalKm: 20000, intervalMonths: 18, status: "ok" },
  { id: 3, name: "Тормозная жидкость", lastKm: 28000, lastDate: "2022-08-01", intervalKm: 40000, intervalMonths: 24, status: "overdue" },
  { id: 4, name: "Тормозные колодки", lastKm: 40000, lastDate: "2024-08-20", intervalKm: 40000, intervalMonths: 36, status: "ok" },
  { id: 5, name: "Свечи зажигания", lastKm: 20000, lastDate: "2022-05-10", intervalKm: 30000, intervalMonths: 36, status: "overdue" },
  { id: 6, name: "Антифриз", lastKm: 30000, lastDate: "2023-03-15", intervalKm: 60000, intervalMonths: 24, status: "warning" },
  { id: 7, name: "АКПП масло", lastKm: 30000, lastDate: "2023-03-01", intervalKm: 60000, intervalMonths: 48, status: "ok" },
];

const INIT_EXPENSES = [
  { id: 1, date: "2025-04-01", category: "топливо", amount: 3200, note: "АЗС Лукойл" },
  { id: 2, date: "2025-02-10", category: "сервис", amount: 4500, note: "Замена масла + фильтр" },
  { id: 3, date: "2025-03-15", category: "топливо", amount: 2900, note: "АЗС Shell" },
  { id: 4, date: "2025-01-20", category: "страховка", amount: 18000, note: "КАСКО 2025" },
  { id: 5, date: "2025-03-28", category: "топливо", amount: 3100, note: "АЗС Газпром" },
];

// ── Helpers ────────────────────────────────────────────────────────
function calcHealth(services) {
  const overdue = services.filter(s => s.status === "overdue").length;
  const warning = services.filter(s => s.status === "warning").length;
  return Math.max(0, 100 - overdue * 18 - warning * 8);
}
const fmtRub = n => (n || 0).toLocaleString("ru-RU") + " ₽";

const dangerCfg = {
  "низкий":  { color: GREEN,  bg: "rgba(34,197,94,0.1)",  label: "НИЗКИЙ" },
  "средний": { color: YELLOW, bg: "rgba(245,158,11,0.1)", label: "СРЕДНИЙ" },
  "высокий": { color: RED,    bg: "rgba(239,68,68,0.1)",  label: "ВЫСОКИЙ" },
};
const statusCfg = {
  ok:      { color: GREEN,  label: "OK",         bg: "rgba(34,197,94,0.1)" },
  warning: { color: YELLOW, label: "СКОРО",      bg: "rgba(245,158,11,0.1)" },
  overdue: { color: RED,    label: "ПРОСРОЧЕНО", bg: "rgba(239,68,68,0.1)" },
};
const catColors = { топливо: O, сервис: BLUE, страховка: "#8b5cf6", запчасти: YELLOW, штрафы: RED, прочее: T2 };

// ── Shared style helpers ───────────────────────────────────────────
const card = (extra = {}) => ({
  background: CARD, border: `1px solid ${BD}`, borderRadius: 12,
  padding: "16px 18px", ...extra,
});
const lbl = (extra = {}) => ({
  fontSize: 10, color: T2, letterSpacing: 2.5,
  fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8, ...extra,
});
const btn = (primary, extra = {}) => ({
  padding: "10px 18px", background: primary ? O : "transparent",
  color: primary ? "white" : T2, border: primary ? "none" : `1px solid ${BD}`,
  borderRadius: 8, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
  fontWeight: 600, cursor: "pointer", letterSpacing: 1, ...extra,
});

// ── Dashboard ──────────────────────────────────────────────────────
function Dashboard({ car, services, diagHistory, expenses }) {
  const health = calcHealth(services);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const overdue = services.filter(s => s.status === "overdue");
  const hColor = health >= 75 ? GREEN : health >= 50 ? YELLOW : RED;
  const R = 48, sw = 7, C2 = 2 * Math.PI * R;
  const dash = (health / 100) * C2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Car card */}
      <div style={card({ background: "linear-gradient(135deg, #0c1628 0%, #0f1f3a 100%)", borderLeft: `3px solid ${O}`, position: "relative", overflow: "hidden" })}>
        <div style={{ position: "absolute", right: -24, top: -24, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,107,0,0.07)" }} />
        <div style={lbl()}>МОЙ АВТОМОБИЛЬ</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: -0.5 }}>
          {car.make} {car.model}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
          <span style={{ fontSize: 12, color: T2 }}>{car.year}</span>
          <span style={{ fontSize: 12, color: T2 }}>·</span>
          <span style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Mono', monospace" }}>{car.mileage.toLocaleString("ru-RU")} км</span>
        </div>
      </div>

      {/* Health + stats */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12 }}>
        <div style={card({ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 20px" })}>
          <div style={lbl({ textAlign: "center", marginBottom: 12 })}>ЗДОРОВЬЕ</div>
          <div style={{ position: "relative", width: 112, height: 112 }}>
            <svg width={112} height={112} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={56} cy={56} r={R} fill="none" stroke={BD} strokeWidth={sw} />
              <circle cx={56} cy={56} r={R} fill="none" stroke={hColor} strokeWidth={sw}
                strokeDasharray={`${dash} ${C2}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: hColor, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>{health}</div>
              <div style={{ fontSize: 9, color: T2, letterSpacing: 1 }}>/ 100</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={card({ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" })}>
            <div style={lbl()}>РАСХОДЫ 2025</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: T, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtRub(total)}</div>
          </div>
          <div style={card({
            flex: 1,
            background: overdue.length ? "rgba(239,68,68,0.05)" : CARD,
            borderColor: overdue.length ? "rgba(239,68,68,0.25)" : BD,
          })}>
            <div style={lbl()}>ПРОСРОЧЕНО ТО</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: overdue.length ? RED : GREEN, fontFamily: "'IBM Plex Mono', monospace" }}>
              {overdue.length} позиции
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div style={card({ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.2)" })}>
          <div style={lbl({ color: RED })}>⚠ ТРЕБУЕТ ВНИМАНИЯ</div>
          {overdue.map((s, i) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < overdue.length - 1 ? `1px solid rgba(239,68,68,0.1)` : "none" }}>
              <span style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.name}</span>
              <span style={{ fontSize: 10, color: RED, letterSpacing: 1 }}>ПРОСРОЧЕНО</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent diagnoses */}
      {diagHistory.length > 0 && (
        <div style={card()}>
          <div style={lbl()}>ПОСЛЕДНИЕ ДИАГНОЗЫ</div>
          {diagHistory.slice(0, 3).map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < Math.min(diagHistory.length, 3) - 1 ? `1px solid ${BD}` : "none" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: dangerCfg[d.danger]?.color || T2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Sans', sans-serif" }}>{d.title}</div>
                <div style={{ fontSize: 11, color: T2 }}>{d.query} · {d.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div style={card({ display: "flex", gap: 16, flexWrap: "wrap" })}>
        {[
          { label: "ИИ ДИАГНОСТИКА", status: "ACTIVE", color: GREEN },
          { label: "СЕРВИСНАЯ КНИЖКА", status: "READY", color: GREEN },
          { label: "OBD2 СКАНЕР", status: "BETA", color: YELLOW },
          { label: "ЭВАКУАТОР", status: "СКОРО", color: T2 },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 10, color: T2, letterSpacing: 1 }}>{item.label}</span>
            <span style={{ fontSize: 9, color: item.color, letterSpacing: 1 }}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Diagnostics ────────────────────────────────────────────────────
function Diagnostics({ history, setHistory }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);
  const examples = ["P0301", "P0420", "стук при торможении", "не заводится утром", "вибрация 80 км/ч"];

  const run = async (q) => {
    const query = (q || input).trim();
    if (!query || loading) return;
    setLoading(true); setResult(null); setErr("");
    try {
      const r = await diagnoseCar(query);
      if (r.error) setErr(r.error);
      else {
        setResult(r);
        setHistory(prev => [{ ...r, query, time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) }, ...prev]);
      }
    } catch { setErr("Ошибка соединения. Попробуй ещё раз."); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={card()}>
        <div style={lbl()}>КОД ОШИБКИ ИЛИ СИМПТОМ</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
            placeholder="P0301 или «стучит двигатель»"
            style={{ flex: 1, padding: "10px 14px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", background: CARD2, border: `1px solid ${BD}`, borderRadius: 8, color: T, outline: "none" }} />
          <button onClick={() => run()} disabled={loading || !input.trim()}
            style={{ padding: "10px 20px", background: loading || !input.trim() ? CARD2 : O, color: loading || !input.trim() ? T2 : "white", border: "none", borderRadius: 8, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1, minWidth: 56, transition: "background 0.2s" }}>
            {loading ? "…" : "→"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {examples.map(ex => (
            <button key={ex} onClick={() => { setInput(ex); setTimeout(() => run(ex), 10); }}
              style={{ padding: "3px 10px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", background: "transparent", color: T2, border: `1px solid ${BD}`, borderRadius: 4, cursor: "pointer" }}>
              {ex}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={card({ textAlign: "center", padding: "44px 0", color: T2, fontSize: 12, letterSpacing: 3 })}>
          <div style={{ fontSize: 24, marginBottom: 12, display: "inline-block", animation: "spin 2s linear infinite" }}>⚙</div>
          <br />ДИАГНОСТИКА...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {err && !loading && (
        <div style={card({ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.25)", color: RED, fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif" })}>
          {err}
        </div>
      )}

      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={card({ borderLeft: `3px solid ${O}` })}>
            <div style={lbl()}>{(result.system || "").toUpperCase()}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: T, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.3 }}>{result.title}</div>
            <div style={{ fontSize: 13, color: T2, marginTop: 8, lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif" }}>{result.description}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={card({ background: dangerCfg[result.danger]?.bg, borderColor: dangerCfg[result.danger]?.color + "80" })}>
              <div style={lbl()}>ОПАСНОСТЬ</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: dangerCfg[result.danger]?.color }}>{dangerCfg[result.danger]?.label}</div>
              <div style={{ fontSize: 11, color: T2, marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.4 }}>{result.danger_reason}</div>
            </div>
            <div style={card({
              background: result.can_drive ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
              borderColor: result.can_drive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center",
            })}>
              <div style={{ fontSize: 28, marginBottom: 4, color: result.can_drive ? GREEN : RED }}>{result.can_drive ? "✓" : "✗"}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: result.can_drive ? GREEN : RED, letterSpacing: 1 }}>
                {result.can_drive ? "МОЖНО ЕХАТЬ" : "НЕ ЕХАТЬ"}
              </div>
            </div>
          </div>

          <div style={card()}>
            <div style={lbl()}>СТОИМОСТЬ РЕМОНТА</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T, fontFamily: "'IBM Plex Mono', monospace" }}>
              {fmtRub(result.price_min)} – {fmtRub(result.price_max)}
            </div>
            <div style={{ fontSize: 12, color: T2, marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>{result.price_comment}</div>
          </div>

          <div style={card()}>
            <div style={lbl()}>ЧТО ДЕЛАТЬ</div>
            {(result.actions || []).map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < result.actions.length - 1 ? 8 : 0 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: O, fontFamily: "'IBM Plex Mono', monospace", minWidth: 20, paddingTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.5 }}>{a}</span>
              </div>
            ))}
          </div>

          <button onClick={() => { setResult(null); setInput(""); inputRef.current?.focus(); }}
            style={{ padding: "10px", background: "transparent", border: `1px solid ${BD}`, color: T2, borderRadius: 8, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", letterSpacing: 1 }}>
            ← НОВЫЙ ЗАПРОС
          </button>
        </div>
      )}

      {history.length > 0 && !result && !loading && (
        <div style={card()}>
          <div style={lbl()}>ИСТОРИЯ ({history.length})</div>
          {history.slice(0, 6).map((d, i) => (
            <div key={i} onClick={() => { setInput(d.query); setTimeout(() => run(d.query), 10); }}
              style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(history.length, 6) - 1 ? `1px solid ${BD}` : "none", cursor: "pointer" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: dangerCfg[d.danger]?.color || T2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Sans', sans-serif" }}>{d.title}</div>
                <div style={{ fontSize: 11, color: T2 }}>{d.query} · {d.time}</div>
              </div>
              <span style={{ fontSize: 11, color: T2 }}>↻</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Service Book ───────────────────────────────────────────────────
function ServiceBook({ services, setServices, car, setCar }) {
  const [editMileage, setEditMileage] = useState(false);
  const [newMileage, setNewMileage] = useState(car.mileage);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), intervalKm: 10000, intervalMonths: 12 });

  const markDone = id => setServices(prev => prev.map(s =>
    s.id === id ? { ...s, lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), status: "ok" } : s
  ));
  const addService = () => {
    if (!form.name) return;
    setServices(prev => [...prev, { ...form, id: Date.now(), status: "ok" }]);
    setAdding(false);
    setForm({ name: "", lastKm: car.mileage, lastDate: new Date().toISOString().slice(0, 10), intervalKm: 10000, intervalMonths: 12 });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Mileage */}
      <div style={card()}>
        <div style={lbl()}>ТЕКУЩИЙ ПРОБЕГ</div>
        {editMileage ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" value={newMileage} onChange={e => setNewMileage(+e.target.value)}
              style={{ flex: 1, padding: "8px 12px", fontSize: 16, fontFamily: "'IBM Plex Mono', monospace", background: CARD2, border: `1px solid ${O}`, borderRadius: 6, color: T, outline: "none" }} />
            <button onClick={() => { setCar(c => ({ ...c, mileage: newMileage })); setEditMileage(false); }}
              style={btn(true, { padding: "8px 14px", fontSize: 11 })}>СОХРАНИТЬ</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: T, fontFamily: "'IBM Plex Mono', monospace" }}>{car.mileage.toLocaleString("ru-RU")} км</div>
            <button onClick={() => { setEditMileage(true); setNewMileage(car.mileage); }}
              style={btn(false, { padding: "6px 12px", fontSize: 10 })}>ОБНОВИТЬ</button>
          </div>
        )}
      </div>

      {/* Services */}
      <div style={card()}>
        <div style={lbl()}>РЕГЛАМЕНТ ТО ({services.length} позиций)</div>
        {services.map((s, i) => {
          const cfg = statusCfg[s.status];
          const nextKm = s.lastKm + s.intervalKm;
          const remaining = nextKm - car.mileage;
          return (
            <div key={s.id} style={{ padding: "12px 0", borderBottom: i < services.length - 1 ? `1px solid ${BD}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: T, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>{s.name}</span>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, padding: "2px 8px", borderRadius: 4, background: cfg.bg, color: cfg.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T2, marginBottom: s.status !== "ok" ? 6 : 0 }}>
                Последний раз: {s.lastDate} · {s.lastKm.toLocaleString()} км
              </div>
              {s.status !== "ok" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: cfg.color }}>
                    {s.status === "overdue"
                      ? `Просрочено на ${Math.abs(remaining).toLocaleString()} км`
                      : `Осталось ~${remaining.toLocaleString()} км`}
                  </span>
                  <button onClick={() => markDone(s.id)}
                    style={{ padding: "2px 10px", fontSize: 10, background: "rgba(34,197,94,0.15)", color: GREEN, border: "1px solid rgba(34,197,94,0.4)", borderRadius: 4, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace" }}>
                    СДЕЛАНО ✓
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {adding ? (
        <div style={card()}>
          <div style={lbl()}>НОВАЯ ОПЕРАЦИЯ</div>
          {[["Название работы", "name", "text", "Замена ремня ГРМ"],
            ["Пробег при замене", "lastKm", "number", ""],
            ["Дата замены", "lastDate", "date", ""],
            ["Интервал км", "intervalKm", "number", "30000"]].map(([label, key, type, ph]) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: T2, letterSpacing: 1, marginBottom: 4 }}>{label.toUpperCase()}</div>
              <input type={type} value={form[key]} placeholder={ph}
                onChange={e => setForm(p => ({ ...p, [key]: type === "number" ? +e.target.value : e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", background: CARD2, border: `1px solid ${BD}`, borderRadius: 6, color: T, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addService} style={btn(true, { flex: 1, padding: "10px" })}>ДОБАВИТЬ</button>
            <button onClick={() => setAdding(false)} style={btn(false, { padding: "10px 16px" })}>ОТМЕНА</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: "14px", background: "transparent", border: `1px dashed ${BD}`, color: T2, borderRadius: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", letterSpacing: 1 }}>
          + ДОБАВИТЬ ОПЕРАЦИЮ
        </button>
      )}
    </div>
  );
}

// ── Expenses ───────────────────────────────────────────────────────
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Total */}
      <div style={card({ borderLeft: `3px solid ${O}` })}>
        <div style={lbl()}>ИТОГО 2025</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: T, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtRub(total)}</div>
        <div style={{ fontSize: 12, color: T2, marginTop: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
          {expenses.length} записей · среднее {fmtRub(Math.round(total / (expenses.length || 1)))}
        </div>
      </div>

      {/* Category bars */}
      <div style={card()}>
        <div style={lbl()}>ПО КАТЕГОРИЯМ</div>
        {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, sum]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: T, fontFamily: "'IBM Plex Sans', sans-serif", textTransform: "capitalize" }}>{cat}</span>
              <span style={{ fontSize: 12, color: T, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtRub(sum)}</span>
            </div>
            <div style={{ height: 4, background: BD, borderRadius: 2 }}>
              <div style={{ height: 4, background: catColors[cat] || T2, borderRadius: 2, width: `${(sum / maxVal) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Add */}
      {adding ? (
        <div style={card()}>
          <div style={lbl()}>НОВАЯ ЗАПИСЬ</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: T2, letterSpacing: 1, marginBottom: 6 }}>КАТЕГОРИЯ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["топливо", "сервис", "запчасти", "страховка", "штрафы", "прочее"].map(cat => (
                <button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))}
                  style={{ padding: "4px 10px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                    background: form.category === cat ? (catColors[cat] || T2) + "25" : "transparent",
                    color: form.category === cat ? catColors[cat] || T : T2,
                    border: `1px solid ${form.category === cat ? (catColors[cat] || T2) + "70" : BD}`,
                    borderRadius: 4, cursor: "pointer" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {[["СУММА (₽)", "amount", "number", "3200"], ["ДАТА", "date", "date", ""], ["ПРИМЕЧАНИЕ", "note", "text", "АЗС Лукойл"]].map(([label, key, type, ph]) => (
            <div key={key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: T2, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
              <input type={type} value={form[key]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", background: CARD2, border: `1px solid ${BD}`, borderRadius: 6, color: T, outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={addExpense} style={btn(true, { flex: 1, padding: "10px" })}>ДОБАВИТЬ</button>
            <button onClick={() => setAdding(false)} style={btn(false, { padding: "10px 16px" })}>ОТМЕНА</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          style={{ padding: "14px", background: "transparent", border: `1px dashed ${BD}`, color: T2, borderRadius: 12, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", letterSpacing: 1 }}>
          + ДОБАВИТЬ РАСХОД
        </button>
      )}

      {/* List */}
      <div style={card()}>
        <div style={lbl()}>ВСЕ ЗАПИСИ</div>
        {expenses.map((e, i) => (
          <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: i < expenses.length - 1 ? `1px solid ${BD}` : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColors[e.category] || T2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Sans', sans-serif", textTransform: "capitalize" }}>{e.category}</span>
                <span style={{ fontSize: 13, color: T, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{fmtRub(e.amount)}</span>
              </div>
              <div style={{ fontSize: 11, color: T2 }}>{e.note} · {e.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────
const TABS = [
  { id: "home", icon: "⌂", label: "ГЛАВНАЯ" },
  { id: "diag", icon: "⚙", label: "ДИАГНОСТИКА" },
  { id: "book", icon: "≡", label: "КНИЖКА" },
  { id: "exp",  icon: "₽", label: "РАСХОДЫ" },
];

export default function JarvisApp() {
  const [tab, setTab] = useState("home");
  const [car, setCar] = useState(INIT_CAR);
  const [services, setServices] = useState(INIT_SERVICES);
  const [diagHistory, setDiagHistory] = useState([]);
  const [expenses, setExpenses] = useState(INIT_EXPENSES);

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: BG, minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 640, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${BD}`, background: BG, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: O, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: -0.3 }}>JARVIS AUTO</div>
          <div style={{ fontSize: 9, color: T2, letterSpacing: 2 }}>BETA · ИИ-ПЛАТФОРМА</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN }} />
          <span style={{ fontSize: 9, color: GREEN, letterSpacing: 1 }}>ONLINE</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "18px 16px 90px", overflowY: "auto" }}>
        {tab === "home" && <Dashboard car={car} services={services} diagHistory={diagHistory} expenses={expenses} />}
        {tab === "diag" && <Diagnostics history={diagHistory} setHistory={setDiagHistory} />}
        {tab === "book" && <ServiceBook services={services} setServices={setServices} car={car} setCar={setCar} />}
        {tab === "exp"  && <Expenses expenses={expenses} setExpenses={setExpenses} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 640, display: "flex", background: "#050d18", borderTop: `1px solid ${BD}`, padding: "8px 0 14px", zIndex: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: tab === t.id ? O : T2, transition: "color 0.15s" }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 8, letterSpacing: 1, fontFamily: "'IBM Plex Mono', monospace" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
