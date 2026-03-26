import { useState } from "react";
import { triggerRefresh } from "../api";

export default function Header() {
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");

  const handleRefresh = async () => {
    setRefreshing(true);
    setMsg("");
    try {
      const result = await triggerRefresh(true);
      setMsg(result);
    } catch {
      setMsg("Refresh failed");
    }
    setRefreshing(false);
  };

  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Clash Meta</h1>
        <p style={styles.subtitle}>Top decks from Path of Legend</p>
      </div>
      <div style={styles.right}>
        <button onClick={handleRefresh} disabled={refreshing} style={styles.btn}>
          {refreshing ? "Refreshing..." : "Refresh Data"}
        </button>
        {msg && <p style={styles.msg}>{msg}</p>}
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 0",
    borderBottom: "1px solid #2a2a4a",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    color: "#8888aa",
    marginTop: 4,
  },
  right: {
    textAlign: "right" as const,
  },
  btn: {
    background: "#1a6aff",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  msg: {
    fontSize: 12,
    color: "#8888aa",
    marginTop: 6,
    maxWidth: 300,
  },
};
