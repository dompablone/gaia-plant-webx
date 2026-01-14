import { Outlet, Link, useNavigate } from "react-router-dom";
import gaiaLogo from "../assets/gaia-icon.png";

export default function Layout({ onSignOut }) {
  const nav = useNavigate();
  const iconScale = 1.5;
  const actionButtonStyle = {
    padding: `${8 * iconScale}px ${10 * iconScale}px`,
    borderRadius: 999,
    border: "1px solid #7fb069",
    color: "#2f5d36",
    fontWeight: 700,
    fontSize: 12 * iconScale,
    background: "#fff",
    boxShadow: "0 6px 16px rgba(127, 176, 105, 0.18)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#e9efe8", padding: 16 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          aspectRatio: "9 / 16",
          minHeight: "100vh",
          maxHeight: "92vh",
          margin: "0 auto",
          background: "#f6f7f8",
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        <nav
          style={{
            padding: 12,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 8,
            background: "#f6f7f8",
          }}
        >
          <Link
            to="/app"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              justifySelf: "start",
            }}
          >
            <img src={gaiaLogo} alt="Gaia Plant" style={{ width: 96, height: 96 }} />
          </Link>

          <div />

          <div style={{ display: "flex", alignItems: "center", gap: 8, justifySelf: "end" }}>
            <button
              type="button"
              onClick={() => nav(-1)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #7fb069",
                color: "#2f5d36",
                fontWeight: 700,
                fontSize: 12,
                background: "#fff",
                boxShadow: "0 6px 16px rgba(127, 176, 105, 0.18)",
                cursor: "pointer",
              }}
            >
              Voltar
            </button>
            <Link
              to="/app/carrinho"
              style={{
                textDecoration: "none",
                ...actionButtonStyle,
              }}
            >
              🛒
            </Link>
            <Link
              to="/perfil-clinico"
              style={{
                textDecoration: "none",
                ...actionButtonStyle,
              }}
            >
              Perfil
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              style={{
                ...actionButtonStyle,
                cursor: "pointer",
              }}
            >
              Sair
            </button>
          </div>
        </nav>

        <main
          style={{
            padding: 14,
            overflowY: "auto",
            overflowX: "hidden",
            maxHeight: "calc(92vh - 72px)",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
