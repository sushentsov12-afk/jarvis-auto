import React from "react";
import { firebaseConfig, missingEnv } from "../firebaseConfig";

export default function DebugPanel() {
  if (import.meta.env.PROD && missingEnv.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "10px",
        right: "10px",
        zIndex: 99999,
        background: "#111",
        color: "#fff",
        padding: "12px",
        borderRadius: "8px",
        maxWidth: "400px",
        fontSize: "12px",
        fontFamily: "monospace"
      }}
    >
      <div><strong>Firebase Debug</strong></div>

      {missingEnv.length > 0 ? (
        <>
          <div style={{ color: "#ff6b6b" }}>
            Missing ENV:
          </div>
          <ul>
            {missingEnv.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      ) : (
        <div style={{ color: "#51cf66" }}>
          Firebase ENV OK
        </div>
      )}

      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(
          {
            authDomain: firebaseConfig.authDomain,
            projectId: firebaseConfig.projectId
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
