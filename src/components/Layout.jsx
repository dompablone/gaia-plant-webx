import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import GAIA_ICON from "../assets/gaia-icon.png";
import { supabase, SUPABASE_ENV_OK } from "../lib/supabase.js";

export function PhoneFrameLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "#f2f3f5", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 28,
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}

const styles = {
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(0,0,0,0.10)",
  },
  headerInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 14px",
  },
  brand: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "#0f172a",
    minWidth: 0,
  },
  brandText: {
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 0.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  iconBtn: {
    width: 40,
    height: 36,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 999,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.14)",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
  },
  logout: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 999,
    background: "#16a34a",
    border: "1px solid #16a34a",
    color: "#fff",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
  },
  main: { padding: "14px" },
};

export default function Layout() {
  const nav = useNavigate();

  async function handleSignOut() {
    try {
      if (SUPABASE_ENV_OK && supabase) await supabase.auth.signOut();
    } finally {
      nav("/login", { replace: true });
    }
  }

  return (
    <div>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link to="/app" style={styles.brand} aria-label="Gaia Plant">
            <img src={GAIA_ICON} alt="" style={{ width: 18, height: 18, display: "block" }} />
            <span style={styles.brandText}>Gaia Plant</span>
          </Link>

          <div style={styles.actions}>
            <Link to="/app/produtos" style={styles.iconBtn} aria-label="Carrinho" title="Carrinho">
              🛒
            </Link>
            <Link to="/app/perfil" style={styles.iconBtn} aria-label="Perfil" title="Perfil">
              👤
            </Link>
            <button type="button" onClick={handleSignOut} style={styles.logout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
