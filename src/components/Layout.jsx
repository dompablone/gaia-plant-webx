import React from "react";
import { Outlet, NavLink } from "react-router-dom";

import { supabase } from "../lib/supabase.js";
import GAIA_ICON from "../assets/gaia-icon.png";

// Phone frame wrapper (mobile view on desktop)
function Frame({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 12px",
        background: "#f5f6f8",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          minHeight: "calc(100vh - 48px)",
          background: "#fafafa",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 28,
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
// Wrapper for public/auth routes where Layout header should not appear
export function PhoneFrameLayout() {
  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center">
      <div className="w-full max-w-[430px] bg-neutral-50 border border-neutral-200 rounded-[28px] shadow-xl">
        <Outlet />
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <NavLink to="/app" className="flex items-center gap-2 min-w-0">
            <img src={GAIA_ICON} alt="Gaia Plant" className="shrink-0" style={{ width: 16, height: 16 }} />
            <span className="text-sm font-semibold text-neutral-900 truncate">Gaia Plant</span>
          </NavLink>

          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to="/app/produtos"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-xl text-neutral-900 shadow-sm"
              aria-label="Carrinho"
              title="Carrinho"
            >
              🛒
            </NavLink>

            <NavLink
              to="/app/perfil"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-xl text-neutral-900 shadow-sm"
              aria-label="Meu perfil"
              title="Meu perfil"
            >
              👤
            </NavLink>

            <button
              type="button"
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } finally {
                  window.location.assign("/login");
                }
              }}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm"
              aria-label="Sair"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">{children ?? <Outlet />}</main>
    </>
  );
}
