import { Outlet, Link } from "react-router-dom";

export default function Layout() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Gaia App</h2>

      <nav style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/pagamentos">Pagamentos</Link>
        <Link to="/start">Start</Link>
        <Link to="/perfil-clinico">Perfil Clínico</Link>
        <Link to="/wizard">Wizard</Link>
        <Link to="/patologias">Patologias</Link>
      </nav>

      <hr />

      <div style={{ marginTop: 20 }}>
        <Outlet />
      </div>
    </div>
  );
}