import { useAuth } from "./AuthContext.jsx";

export default function UserMenu({ onProfileClick }) {
  const { signOut } = useAuth();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        onClick={onProfileClick}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer"
        }}
      >
        Профиль
      </button>

      <button
        onClick={signOut}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer"
        }}
      >
        Выход
      </button>
    </div>
  );
}