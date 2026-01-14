import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const nav = useNavigate();

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(560px, 100%)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 999, background: "#3a8f3a" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 20 }}>Gaia Plant — Cannabis Medicinal</div>
            <div style={{ opacity: 0.7 }}>Saúde & bem-estar (beta)</div>
          </div>
        </div>

        <h1 style={{ marginTop: 18, fontSize: 34, lineHeight: 1.1 }}>Bem-vindo à Gaia Plant</h1>

        <p style={{ opacity: 0.8 }}>
          Crie sua conta ou faça login para montar seu perfil clínico e acessar o app.
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => nav("/auth")}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: "#3a8f3a",
              color: "white",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Criar conta / Fazer login
          </button>

          <button
            onClick={() => nav("/inicio")}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Se você já estiver logado e com perfil completo, o guard te leva."
          >
            Ir para o app
          </button>
        </div>
      </div>
    </div>
  );
}
