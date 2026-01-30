import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import GAIA_ICON from "../assets/gaia-icon.png";
import { supabase, SUPABASE_ENV_OK } from "../lib/supabase.js";

const headerStyles = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  background: "#fff",
  borderBottom: "1px solid rgba(15, 23, 42, 0.10)",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const brandStyles = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: 16,
};

const actionGroup = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const iconButtonStyle = {
  width: 44,
  height: 44,
  borderRadius: 999,
  padding: 0,
  minWidth: 44,
  justifyContent: "center",
  fontSize: 20,
};

export function PhoneFrameLayout() {
  return (
    <div className="min-h-screen" style={{ background: "#f2f3f5", display: "flex", justifyContent: "center" }}>
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

export default function Layout() {
  const nav = useNavigate();

  async function handleSignOut() {
    try {
      if (SUPABASE_ENV_OK && supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      nav("/login", { replace: true });
    }
  }

  return (
    <div>
      <header style={headerStyles}>
        <Link to="/app" style={brandStyles} aria-label="Gaia Plant">
          <img src={GAIA_ICON} alt="Gaia Plant" width={32} height={32} style={{ borderRadius: "50%" }} />
          <span>Gaia Plant</span>
        </Link>

        <div style={actionGroup}>
          <Link
            to="/app/produtos"
            className="gaia-btn gaia-btn-ghost"
            style={iconButtonStyle}
            aria-label="Carrinho"
            title="Carrinho"
          >
            🛒
          </Link>
          <Link
            to="/app/perfil"
            className="gaia-btn gaia-btn-ghost"
            style={iconButtonStyle}
            aria-label="Perfil"
            title="Perfil"
          >
            👤
          </Link>
          <button type="button" onClick={handleSignOut} className="gaia-btn gaia-btn-primary">
            Sair
          </button>
        </div>
      </header>

      <main style={{ padding: "14px" }}>
        <Outlet />
      </main>
    </div>
  );
}
