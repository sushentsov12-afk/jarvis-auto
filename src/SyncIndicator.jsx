import { useState, useEffect } from "react";
import { onSyncStatusChange } from "./firestoreSync.js";

const M = "'IBM Plex Mono', monospace";

const STATUS_CFG = {
  idle:    { color: "#5a7090", label: "—",        dot: "#5a7090",  anim: false },
  syncing: { color: "#f59e0b", label: "SYNC...",  dot: "#f59e0b",  anim: true  },
  synced:  { color: "#22c55e", label: "CLOUD ✓",  dot: "#22c55e",  anim: false },
  error:   { color: "#ef4444", label: "ERR",      dot: "#ef4444",  anim: false },
  offline: { color: "#5a7090", label: "ОФЛАЙН",   dot: "#5a7090",  anim: false },
};

export default function SyncIndicator() {
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    const unsub = onSyncStatusChange(setStatus);
    setStatus(navigator.onLine ? "idle" : "offline");
    return unsub;
  }, []);

  const cfg = STATUS_CFG[status] || STATUS_CFG.idle;

  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: cfg.dot,
        boxShadow: status === "synced" ? `0 0 6px ${cfg.dot}` : "none",
        animation: cfg.anim ? "ja-pulse 1s ease infinite" : "none",
      }} />
      <span style={{
        fontSize: 8, color: cfg.color,
        fontFamily: M, letterSpacing: 1,
        transition: "color .3s",
      }}>
        {cfg.label}
      </span>
    </div>
  );
}
