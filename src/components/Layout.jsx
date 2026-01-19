import { Outlet, Link } from "react-router-dom";

const appWrapper = {
  minHeight: "100vh",
  background: "#f6f6f7",
  display: "flex",
  justifyContent: "center",
  padding: "24px 12px",
};

const card = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  borderRadius: 28,
  boxShadow: "0 20px 50px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

const navStyle = {
  display: "flex",
  gap: 16,
  padding: "16px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  overflowX: "auto",
  whiteSpace: "nowrap",
  fontSize: 14,
};

const navLink = {
  fontWeight: 700,
  color: "#111",
};

const content = {
  padding: "18px 20px 28px",
};

export default function Layout({ children }) {
  return (
    <div style={appWrapper}>
      <div style={card}>
        <nav style={navStyle}>
          <Link to="/app" style={navLink}>
            Dashboard
          </Link>
          <Link to="/app/pagamentos" style={navLink}>
            Pagamentos
          </Link>
          <Link to="/start" style={navLink}>
            Start
          </Link>
          <Link to="/perfil-clinico" style={navLink}>
            Perfil Clínico
          </Link>
          <Link to="/wizard" style={navLink}>
            Wizard
          </Link>
          <Link to="/patologias" style={navLink}>
            Patologias
          </Link>
        </nav>
        <div style={content}>{children ?? <Outlet />}</div>
      </div>
    </div>
  );
}
