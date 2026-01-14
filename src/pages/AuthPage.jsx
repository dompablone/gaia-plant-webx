import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Conta criada. Agora faça login.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // após login: o guard resolve se vai para perfil clínico ou inicio
        nav("/inicio", { replace: true });
      }
    } catch (err) {
      setMsg(err?.message ?? "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(520px, 100%)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 22 }}>{mode === "signup" ? "Criar conta" : "Entrar"}</div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>Gaia Plant — Cannabis Medicinal</div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu email"
            type="email"
            required
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            type="password"
            required
            style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
          />

          <button
            disabled={busy}
            style={{
              padding: "14px 16px",
              borderRadius: 12,
              border: "none",
              background: "#3a8f3a",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            {busy ? "Aguarde…" : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        {msg && <div style={{ marginTop: 12, color: "#b00020" }}>{msg}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 800 }}
          >
            {mode === "signup" ? "Já tenho conta" : "Quero criar conta"}
          </button>

          <button
            onClick={() => nav("/")}
            style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", opacity: 0.7 }}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
