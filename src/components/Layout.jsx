import React from "react";
import { Link } from "react-router-dom";
import { GAIA_ICON } from "../lib/constants/ui.js";

/**
 * Layout do APP (área logada / conteúdo interno)
 * - Export default: Layout
 * - Named export: PhoneFrameLayout (para simular tela de telemóvel em desktop)
 */

export function PhoneFrameLayout({ children, maxWidth = 430 }) {
  return (
    <div className="gaia-viewport">
      <div className="mx-auto w-full" style={{ maxWidth }}>
        <div
          className="w-full overflow-hidden border"
          style={{ borderRadius: 28, background: "#fff" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children, title, rightSlot }) {
  return (
    <div className="gaia-viewport">
      <header
        className="w-full"
        style={{
          background: "#fff",
          borderBottom: "1px solid rgba(15,23,42,0.12)",
        }}
      >
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: 980,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Link
            to="/inicio"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <img
              src={GAIA_ICON}
              alt="Gaia Plant"
              style={{ width: 28, height: 28, objectFit: "contain" }}
            />
            <div style={{ fontWeight: 900, color: "#0f172a" }}>Gaia Plant</div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {title ? (
              <div style={{ fontWeight: 800, color: "#0f172a", opacity: 0.9 }}>{title}</div>
            ) : null}
            {rightSlot || null}
          </div>
        </div>
      </header>

      <main className="w-full" style={{ padding: "18px 16px" }}>
        <div className="mx-auto w-full" style={{ maxWidth: 980 }}>
          {children}
        </div>
      </main>
    </div>
  );
}