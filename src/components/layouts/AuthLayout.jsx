import React from "react";
import { Outlet, Link } from "react-router-dom";
import GAIA_ICON from "../../assets/gaia-icon.png";

export default function AuthLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7f8",
        display: "flex",
        justifyContent: "center",
        padding: "18px 14px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
        }}
        className="gaia-auth-grid"
      >
        {/* Left panel (desktop only) */}
        <aside
          className="gaia-auth-left"
          style={{
            display: "none",
            borderRadius: 22,
            overflow: "hidden",
            border: "1px solid rgba(15,23,42,0.10)",
            background:
              "linear-gradient(135deg, rgba(22,163,74,0.95), rgba(21,128,61,0.92))",
            color: "#fff",
            padding: 28,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={GAIA_ICON}
              alt="Gaia Plant"
              style={{ height: 44, width: "auto", objectFit: "contain" }}
            />
            <div style={{ fontWeight: 900, fontSize: 18 }}>Gaia Plant</div>
          </div>

          <div style={{ marginTop: 18, fontSize: 34, fontWeight: 950, lineHeight: 1.05 }}>
            Cannabis medicinal <br /> com clareza e segurança.
          </div>

          <div style={{ marginTop: 12, opacity: 0.92, fontSize: 14, lineHeight: 1.5, maxWidth: 420 }}>
            Conteúdos educativos, triagem guiada e um caminho simples até o seu acompanhamento.
            Tudo em um fluxo curto e objetivo.
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/conteudos" className="gaia-btn gaia-btn-mist" style={{ color: "#fff" }}>
              Ver conteúdos
            </Link>
            <Link to="/criar-conta" className="gaia-btn gaia-btn-outline" style={{ borderColor: "rgba(255,255,255,0.65)", color: "#fff" }}>
              Criar conta
            </Link>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 28,
              right: 28,
              opacity: 0.75,
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            * Informação educativa. Não substitui avaliação médica.
          </div>
        </aside>

        {/* Right panel (always) */}
        <main
          style={{
            borderRadius: 22,
            border: "1px solid rgba(15,23,42,0.10)",
            background: "#fff",
            boxShadow: "0 18px 60px rgba(15,23,42,0.10)",
            padding: 18,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420 }}>
            {/* Mobile brand header */}
            <div className="gaia-auth-mobilebrand" style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={GAIA_ICON} alt="Gaia Plant" style={{ height: 38, width: "auto" }} />
                <div style={{ fontWeight: 950, fontSize: 18, color: "#0f172a" }}>Gaia Plant</div>
              </div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Faça login, crie conta, ou explore conteúdos antes de se cadastrar.
              </div>
            </div>

            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
