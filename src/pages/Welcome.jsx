import React from "react";
import { Link } from "react-router-dom";

export default function Welcome() {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Bem-vindo</h1>
      <p>Escolha uma opção para continuar.</p>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <Link to="/login">Login</Link>
        <Link to="/register">Criar conta</Link>
      </div>
    </div>
  );
}
