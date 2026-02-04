import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { GAIA_ICON, PRIMARY_BUTTON_CLASS } from "../../lib/constants/ui.js";
import { normalizeTriage } from "../../lib/triage.js";

export default function AppDashboard({ profile }) {
  const nav = useNavigate();
  const whatsappMessage = encodeURIComponent(
    `Olá sou ${profile?.full_name ?? "um paciente"}, gostaria de mais informações !`
  );
  const [whatsappActive, setWhatsappActive] = useState(false);

  const cards = [
    {
      title: "Conteúdos educativos personalizados",
      emoji: "📚",
      desc: "Guias, e-books e curadoria alinhada ao seu objetivo.",
      to: "/app/conteudos",
    },
    {
      title: "Produtos",
      emoji: "💧",
      desc: "Óleos, kits e suplementos recomendados pelo seu cuidado.",
      to: "/app/produtos",
    },
    {
      title: "Agende uma consulta online",
      emoji: "🩺",
      desc: "Escolha um médico e dê o próximo passo do acompanhamento.",
      to: "/app/medicos",
    },
    {
      title: "Meu perfil",
      emoji: "🧾",
      desc: "Revise seus dados, preferências e metas clínicas.",
      to: "/app/perfil",
    },
    {
      title: "Meu histórico",
      emoji: "🕘",
      desc: "Veja o que já respondeu e atualize quando quiser.",
      to: "/app/historico",
    },
  ];

  const quickLinks = [
    { title: "Receitas", emoji: "🧾", to: "/app/receitas" },
    { title: "Pedidos", emoji: "📦", to: "/app/pedidos" },
    { title: "Alertas de uso", emoji: "⚠️", to: "/app/alertas" },
  ];

  const hasHealth =
    profile?.health_triage &&
    Object.keys(normalizeTriage(profile.health_triage)).length > 0;
  const hasEmotional =
    profile?.emotional_triage &&
    Object.keys(normalizeTriage(profile.emotional_triage)).length > 0;

  const goalBadge = profile?.main_goal;
  const greetingName = profile?.full_name?.split(" ")[0] ?? "Pablo";
  const heroSubtext = "Este é o seu painel de cuidado personalizado";

  const mainAction =
    !hasHealth
      ? { label: "Responder triagem de saúde", path: "/app/saude" }
      : hasHealth && !hasEmotional
      ? { label: "Responder triagem emocional", path: "/app/emocional" }
      : null;

  function handleWhatsApp() {
    setWhatsappActive(true);
    window.open(
      `https://wa.me/5531995298192?text=${whatsappMessage}`,
      "_blank",
      "noopener"
    );
  }

  const actionCardStyle = {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 22,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    padding: "18px 18px",
    boxShadow: "0 14px 26px rgba(15,23,42,0.10)",
    textAlign: "left",
    cursor: "pointer",
    transition: "transform 180ms ease",
  };

  const badgeLabel = goalBadge || "Objetivo não definido";

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        paddingBottom: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <img
              src={GAIA_ICON}
              alt="Gaia Plant"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
            <span
              style={{
                fontWeight: 900,
                fontSize: 18,
                color: "#0f172a",
                letterSpacing: 0.2,
              }}
            >
              Gaia Plant
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#475467",
              letterSpacing: "0.2px",
            }}
          >
            Cuidados clínicos com toque humano.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="gaia-btn gaia-btn-ghost"
            style={{
              padding: "10px 14px",
              fontSize: 12,
              borderRadius: 14,
            }}
            onClick={() => nav("/app/carrinho")}
          >
            Carrinho
          </button>
          <button
            type="button"
            className="gaia-btn gaia-btn-outline"
            style={{
              padding: "10px 14px",
              fontSize: 12,
              borderRadius: 14,
            }}
            onClick={() => nav("/sair")}
          >
            Sair
          </button>
        </div>
      </div>

      <div
        style={{
          borderRadius: 24,
          padding: "24px 22px",
          background: "linear-gradient(180deg, rgba(236,253,243,0.95), #fff)",
          border: "1px solid rgba(22,163,74,0.25)",
          boxShadow: "0 20px 35px rgba(15,23,42,0.12)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          Olá, {greetingName}
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: 15,
            color: "#475467",
          }}
        >
          {heroSubtext}
        </p>
      </div>

      <div
        style={{
          borderRadius: 28,
          background: "#f8fbf8",
          padding: "24px 22px",
          border: "1px solid rgba(22,163,74,0.35)",
          boxShadow: "0 18px 28px rgba(22,163,74,0.14)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#166534",
              }}
            >
              Recomendado para você
            </p>
            <span
              style={{
                marginTop: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  borderRadius: 999,
                  padding: "4px 14px",
                  fontWeight: 700,
                  fontSize: 13,
                  background: goalBadge ? "#0f172a" : "#e2e8f0",
                  color: goalBadge ? "#fff" : "#0f172a",
                }}
              >
                {badgeLabel}
              </span>
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#475467",
            }}
          >
            {goalBadge
              ? "Personalizamos sua jornada para este foco."
              : "Atualize suas metas no perfil para reforçar esse card."}
          </p>
        </div>
        <p
          style={{
            margin: 0,
            color: "#1e293b",
            lineHeight: 1.6,
          }}
        >
          {goalBadge
            ? `Seu plano Gaia se ajusta a ${goalBadge.toLowerCase()}, equilibrando rotina, suporte e foco clínico.`
            : "Sem objetivo registrado, o plano continua genérico. Defina o foco principal no perfil para receber recomendações mais precisas."}
        </p>
        {mainAction ? (
          <button
            type="button"
            className={`${PRIMARY_BUTTON_CLASS} w-full`}
            style={{
              borderRadius: 18,
              padding: "16px 0",
              fontSize: 15,
            }}
            onClick={() => nav(mainAction.path)}
          >
            {mainAction.label}
          </button>
        ) : (
          <div
            style={{
              marginTop: 6,
              textAlign: "center",
              color: "#475467",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Triagens concluídas. Continue acompanhando sua jornada.
          </div>
        )}
      </div>

      <section
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Ações principais
          </p>
          <span
            style={{
              fontSize: 12,
              color: "#475467",
            }}
          >
            Escolha com tranquilidade
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {cards.map((c) => (
            <button
              key={c.to}
              type="button"
              onClick={() => nav(c.to)}
              style={actionCardStyle}
            >
              <div
                style={{
                  fontSize: 40,
                  lineHeight: "40px",
                }}
              >
                {c.emoji}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {c.title}
                </div>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#475467",
                    fontSize: 14,
                    lineHeight: 1.4,
                  }}
                >
                  {c.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          borderRadius: 24,
          padding: "18px 16px",
          background: "#fff",
          border: "1px solid rgba(15,23,42,0.08)",
          boxShadow: "0 12px 20px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Acesso rápido
          </p>
          <span
            style={{
              fontSize: 12,
              color: "#475467",
            }}
          >
            Toque e explore
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          }}
        >
          {quickLinks.map((q) => (
            <button
              key={q.to}
              type="button"
              onClick={() => nav(q.to)}
              style={{
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.08)",
                background: "#f9fafb",
                padding: "14px 12px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minHeight: 110,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: "28px" }}>{q.emoji}</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#111927",
                  textAlign: "center",
                }}
              >
                {q.title}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="gaia-gradient-panel"
        style={{
          padding: "24px 22px",
          borderRadius: 32,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          Precisa conversar com um especialista?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.6,
            opacity: 0.9,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          O mesmo tom calmo que te recebeu antes do login segue aqui para lembrar que a Gaia Plant é um cuidado médico responsável, guiado por pessoas.
        </p>
        <button
          type="button"
          onClick={handleWhatsApp}
          style={{
            marginTop: 8,
            width: "100%",
            border: "none",
            borderRadius: 18,
            padding: "16px 0",
            fontWeight: 800,
            fontSize: 15,
            background: whatsappActive ? "#4ade80" : "#fff",
            color: "#0f172a",
            boxShadow: "0 12px 22px rgba(0,0,0,0.25)",
            cursor: "pointer",
            transition: "background 200ms ease, color 200ms ease",
          }}
        >
          Fale com especialista
        </button>
      </section>
    </div>
  );
}
