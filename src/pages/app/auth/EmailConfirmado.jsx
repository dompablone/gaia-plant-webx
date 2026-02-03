import { Link } from "react-router-dom";

export default function EmailConfirmado() {
  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>E-mail confirmado com sucesso ✅</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>
        Bem-vindo à Gaia Plant 🌱<br />
        Agora você já pode voltar ao login e entrar na sua conta.
      </p>

      <Link to="/login" style={{
        display: "inline-block",
        padding: "12px 18px",
        borderRadius: 12,
        border: "1px solid #16a34a",
        textDecoration: "none"
      }}>
        Voltar ao login
      </Link>
    </div>
  );
}