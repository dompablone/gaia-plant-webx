import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
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

export default function Layout({
  children,
  title,
  rightSlot,
  maxWidth = 430,
  framed = true,
}) {
  const location = useLocation();
  const rawPath = location.pathname.replace(/\/+$/, "");
  const normalizedPath = rawPath || "/";
  const hideHeader =
    normalizedPath === "/app" || normalizedPath === "/app/inicio";

  const headerContent = (
    <header
      className="w-full"
      style={{
        background: "#fff",
        borderBottom: "1px solid rgba(15,23,42,0.10)",
      }}
    >
      <div
        className="w-full"
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Link
          to="/app"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            minWidth: 0,
          }}
        >
          <img
            src={GAIA_ICON}
            alt="Gaia Plant"
            style={{ width: 28, height: 28, objectFit: "contain" }}
          />
          <div
            style={{
              fontWeight: 900,
              color: "#0f172a",
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Gaia Plant
          </div>
        </Link>

        {(title || rightSlot) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {title ? (
              <div
                style={{
                  fontWeight: 800,
                  color: "#0f172a",
                  opacity: 0.9,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 220,
                }}
              >
                {title}
              </div>
            ) : null}
            {rightSlot || null}
          </div>
        )}
      </div>
    </header>
  );

  const Inner = (
    <>
      {!hideHeader && headerContent}
      <main className="w-full" style={{ padding: "18px 18px" }}>
        <div className="w-full" style={{ maxWidth: "100%" }}>
          {children != null ? children : <Outlet />}
        </div>
      </main>
    </>
  );

  if (!framed) {
    return <div className="gaia-viewport">{Inner}</div>;
  }

  return (
    <div className="gaia-viewport">
      <div className="mx-auto w-full" style={{ maxWidth }}>
        <div
          className="w-full"
          style={{
            borderRadius: 28,
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.10)",
            boxShadow:
              "0 10px 30px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)",
            overflow: "hidden",
          }}
        >
          {Inner}
        </div>
      </div>
    </div>
  );
}
