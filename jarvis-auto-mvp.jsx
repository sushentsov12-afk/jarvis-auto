import { useState, useRef } from "react";

const SYSTEM_PROMPT = `Ты — Джарвис, ИИ-диагност для автомобилей. Отвечай ТОЛЬКО на русском языке.

Пользователь вводит код ошибки OBD (например, P0301) или описывает симптом.

Ответь строго в JSON формате без markdown, без backticks:
{
  "title": "Короткое название проблемы (до 6 слов)",
  "system": "Система автомобиля (Двигатель / Трансмиссия / Тормоза / Электрика / Подвеска и т.д.)",
  "description": "Понятное объяснение проблемы для обычного человека (2-3 предложения, без технического жаргона)",
  "danger": "низкий" | "средний" | "высокий",
  "danger_reason": "Одно предложение — почему именно такой уровень опасности",
  "can_drive": true | false,
  "price_min": число в рублях (минимум),
  "price_max": число в рублях (максимум),
  "price_comment": "Что входит в стоимость (1 предложение)",
  "actions": ["действие 1", "действие 2", "действие 3"]
}

Цены давай реалистичные для России 2024 года (региональные сервисы, не дилеры).
Если введён явно не автомобильный запрос — верни { "error": "Это не похоже на автомобильную проблему. Введите код ошибки OBD или опишите симптом." }`;

export default function JarvisAuto() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: input.trim() }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(text);
      if (parsed.error) {
        setError(parsed.error);
      } else {
        setResult(parsed);
      }
    } catch (e) {
      setError("Ошибка соединения. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const dangerConfig = {
    "низкий": { color: "#22c55e", bg: "rgba(34,197,94,0.1)", label: "НИЗКИЙ" },
    "средний": { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", label: "СРЕДНИЙ" },
    "высокий": { color: "#ef4444", bg: "rgba(239,68,68,0.1)", label: "ВЫСОКИЙ" },
  };

  const examples = ["P0301", "P0420", "стук при торможении", "не заводится утром"];

  return (
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      background: "transparent",
      padding: "0",
      maxWidth: 640,
      margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      
      <h2 className="sr-only">Jarvis Auto — ИИ диагностика автомобиля</h2>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid var(--color-border-tertiary)",
        paddingBottom: 16, marginBottom: 24,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "#FF6B00",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: -0.5 }}>
            JARVIS AUTO
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: 2, marginTop: 1 }}>
            ИИ-ДИАГНОСТИКА
          </div>
        </div>
      </div>

      {/* Input area */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", letterSpacing: 1, marginBottom: 8 }}>
          КОД ОШИБКИ ИЛИ СИМПТОМ
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyze()}
            placeholder="Например: P0301 или «стучит двигатель»"
            style={{
              flex: 1,
              padding: "10px 14px",
              fontSize: 14,
              fontFamily: "'IBM Plex Mono', monospace",
              border: "1px solid var(--color-border-secondary)",
              borderRadius: 6,
              background: "var(--color-background-secondary)",
              color: "var(--color-text-primary)",
              outline: "none",
            }}
          />
          <button
            onClick={analyze}
            disabled={loading || !input.trim()}
            style={{
              padding: "10px 20px",
              background: loading ? "var(--color-background-secondary)" : "#FF6B00",
              color: loading ? "var(--color-text-secondary)" : "white",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: 1,
              transition: "background 0.2s",
              minWidth: 100,
            }}
          >
            {loading ? "..." : "АНАЛИЗ →"}
          </button>
        </div>
      </div>

      {/* Quick examples */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 28 }}>
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => { setInput(ex); setTimeout(analyze, 50); }}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace",
              background: "var(--color-background-secondary)",
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 4,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          textAlign: "center", padding: "40px 0",
          color: "var(--color-text-secondary)", fontSize: 13, letterSpacing: 2,
        }}>
          <div style={{ marginBottom: 12, fontSize: 24 }}>⚙</div>
          ДИАГНОСТИКА...
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "14px 16px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 8,
          color: "#ef4444",
          fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Title card */}
          <div style={{
            background: "var(--color-background-secondary)",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 10,
            padding: "16px 18px",
            borderLeft: "3px solid #FF6B00",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", letterSpacing: 2, marginBottom: 6 }}>
              {result.system?.toUpperCase()}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)", fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.3 }}>
              {result.title}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 10, lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {result.description}
            </div>
          </div>

          {/* Danger + Can drive */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{
              background: dangerConfig[result.danger]?.bg || "var(--color-background-secondary)",
              border: `1px solid ${dangerConfig[result.danger]?.color || "var(--color-border-tertiary)"}`,
              borderRadius: 8, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--color-text-secondary)", marginBottom: 6 }}>ОПАСНОСТЬ</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: dangerConfig[result.danger]?.color, marginBottom: 4 }}>
                {dangerConfig[result.danger]?.label}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.4 }}>
                {result.danger_reason}
              </div>
            </div>

            <div style={{
              background: result.can_drive ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${result.can_drive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: 8, padding: "12px 14px",
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{result.can_drive ? "✓" : "✗"}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: result.can_drive ? "#22c55e" : "#ef4444", letterSpacing: 1 }}>
                {result.can_drive ? "МОЖНО ЕХАТЬ" : "НЕ ЕХАТЬ"}
              </div>
            </div>
          </div>

          {/* Price */}
          <div style={{
            background: "var(--color-background-secondary)",
            border: "1px solid var(--color-border-tertiary)",
            borderRadius: 8, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--color-text-secondary)", marginBottom: 8 }}>СТОИМОСТЬ РЕМОНТА</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {result.price_min?.toLocaleString("ru-RU")} – {result.price_max?.toLocaleString("ru-RU")} ₽
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {result.price_comment}
            </div>
          </div>

          {/* Actions */}
          {result.actions?.length > 0 && (
            <div style={{
              background: "var(--color-background-secondary)",
              border: "1px solid var(--color-border-tertiary)",
              borderRadius: 8, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--color-text-secondary)", marginBottom: 10 }}>ЧТО ДЕЛАТЬ</div>
              {result.actions.map((action, i) => (
                <div key={i} style={{
                  display: "flex", gap: 10, alignItems: "flex-start",
                  marginBottom: i < result.actions.length - 1 ? 8 : 0,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "#FF6B00",
                    fontFamily: "'IBM Plex Mono', monospace",
                    minWidth: 18, paddingTop: 2,
                  }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Reset */}
          <button
            onClick={() => { setResult(null); setInput(""); inputRef.current?.focus(); }}
            style={{
              background: "none", border: "1px solid var(--color-border-tertiary)",
              color: "var(--color-text-secondary)", padding: "8px", borderRadius: 6,
              fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
              cursor: "pointer", letterSpacing: 1,
            }}
          >
            ← НОВЫЙ ЗАПРОС
          </button>
        </div>
      )}
    </div>
  );
}
