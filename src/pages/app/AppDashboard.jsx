

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card.jsx";
import { PRIMARY_BUTTON_CLASS } from "../../lib/constants/ui.js";
import { normalizeTriage } from "../../lib/triage.js";

// -------------------- AppDashboard (home do app após questionários) --------------------
export default function AppDashboard({ session, profile }) {
  const nav = useNavigate();
  const whatsappMessage = encodeURIComponent(
    `Olá sou ${profile?.full_name ?? "um paciente"}, gostaria de mais informações !`
  );
  const [whatsappActive, setWhatsappActive] = useState(false);

  const cards = [
    {
      title: "Conteúdos educativos personalizados",
      emoji: "📚",
      desc: "Guias, e-books e conteúdos recomendados.",
      to: "/app/conteudos",
    },
    {
      title: "Produtos",
      emoji: "💧",
      desc: "Catálogo de óleos e kits (MVP).",
      to: "/app/produtos",
    },
    {
      title: "Agende uma consulta online",
      emoji: "🩺",
      desc: "Escolha um médico e inicie um atendimento.",
      to: "/app/medicos",
    },
    {
      title: "Meu perfil",
      emoji: "🧾",
      desc: "Revise e edite seus dados e preferências.",
      to: "/app/perfil",
    },
    {
      title: "Meu histórico",
      emoji: "🕘",
      desc: "Veja o que você respondeu e atualize quando quiser.",
      to: "/app/historico",
    },
  ];

  const quickLinks = [
    { title: "Receitas", emoji: "🧾", to: "/app/receitas" },
    { title: "Pedidos", emoji: "📦", to: "/app/pedidos" },
    { title: "Alertas de uso", emoji: "⚠️", to: "/app/alertas" },
  ];

  const cardButtonStyle = {
    textAlign: "left",
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    cursor: "pointer",
    color: "#111",
    fontWeight: 700,
  };

  const hasHealth =
    profile?.health_triage && Object.keys(normalizeTriage(profile.health_triage)).length > 0;
  const hasEmotional =
    profile?.emotional_triage && Object.keys(normalizeTriage(profile.emotional_triage)).length > 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <p style={{ marginTop: 0, opacity: 0.75 }}>
          Bem-vindo{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. Escolha por onde
          começar.
        </p>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Recomendado para você</h3>
        <p style={{ marginTop: 6, opacity: 0.75 }}>
          {profile?.main_goal ? (
            <>
              Objetivo principal: <b>{profile.main_goal}</b>
            </>
          ) : (
            <>Defina um objetivo para personalizar sua jornada.</>
          )}
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {!profile?.main_goal ? (
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-left`}
              onClick={() => nav("/app/objetivos")}
            >
              Definir objetivo
            </button>
          ) : null}

          {!hasHealth ? (
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-left`}
              onClick={() => nav("/app/saude")}
            >
              Responder triagem de saúde
            </button>
          ) : null}

          {hasHealth && !hasEmotional ? (
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-left`}
              onClick={() => nav("/app/emocional")}
            >
              Responder triagem emocional
            </button>
          ) : null}

          {hasHealth && hasEmotional ? (
            <div style={{ opacity: 0.75, fontSize: 14 }}>
              ✅ Triagens preenchidas. Você pode atualizar quando quiser.
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div style={{ display: "grid", gap: 12 }}>
          {cards.map((c) => (
            <button
              key={c.to}
              type="button"
              className="gp-card-link"
              onClick={() => nav(c.to)}
              style={cardButtonStyle}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 44, lineHeight: "44px" }}>{c.emoji}</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{c.title}</div>
                  <div style={{ marginTop: 6, opacity: 0.75 }}>{c.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Acesso rápido</h3>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {quickLinks.map((q) => (
            <button
              key={q.to}
              type="button"
              className="gp-card-link"
              onClick={() => nav(q.to)}
              style={{
                width: 100,
                height: 100,
                borderRadius: 999,
                border: "2px solid #7fb069",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(127, 176, 105, 0.18)",
                color: "#2f5d36",
              }}
            >
              <div style={{ fontSize: 28, lineHeight: "28px" }}>{q.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 11, textAlign: "center" }}>{q.title}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setWhatsappActive(true);
              window.open(`https://wa.me/5531995298192?text=${whatsappMessage}`, "_blank", "noopener");
            }}
            style={{
              borderRadius: 999,
              border: "2px solid #7fb069",
              padding: "14px 36px",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              background: whatsappActive ? "#43a047" : "#fff",
              color: whatsappActive ? "#fff" : "#2f5d36",
              boxShadow: whatsappActive
                ? "0 6px 12px rgba(67, 160, 71, 0.2)"
                : "0 6px 16px rgba(127, 176, 105, 0.15)",
              transition: "background 200ms, color 200ms",
            }}
          >
            Fale com especialista
          </button>
        </div>
      </Card>
    </div>
  );
}