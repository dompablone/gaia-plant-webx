import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function PerfilClinico() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const profileData = data ?? { id: user.id, email: user.email ?? null };
      setProfile(profileData);
      setFullName(profileData.full_name ?? "");
      setPhone(profileData.phone ?? "");
      setCpf(profileData.cpf ?? "");
      setBirthDate(profileData.birth_date ?? "");
    })();
  }, []);

  async function saveAndFinish() {
    if (!profile?.id) return;
    setBusy(true);

    try {
      const patch = {
        full_name: fullName,
        phone,
        cpf,
        birth_date: birthDate,
        profile_completed: true,
      };

      const { error } = await supabase.from("profiles").update(patch).eq("id", profile.id);

      if (error) throw error;

      nav("/inicio", { replace: true });
    } catch (err) {
      alert(err?.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <div style={{ padding: 24 }}>Carregando perfil…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Vamos começar criando o seu perfil clínico</h1>
      <div style={{ opacity: 0.7, marginBottom: 18 }}>IMPORTANTE — Não abrevie essas informações.</div>

      {/* Aqui você encaixa as telas do wizard que você já tem.
          Por enquanto deixei campos básicos só pra prova de fluxo. */}

      <div
        style={{
          display: "grid",
          gap: 12,
          border: "1px solid rgba(0,0,0,0.08)",
          padding: 16,
          borderRadius: 16,
        }}
      >
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nome completo"
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Telefone (+55...)"
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
        />
        <input
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
          placeholder="CPF"
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
        />
        <input
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          placeholder="Data de nascimento (DD/MM/AAAA)"
          style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,0.14)" }}
        />

        <button
          disabled={busy}
          onClick={saveAndFinish}
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
          {busy ? "Salvando…" : "Concluir e entrar no app"}
        </button>
      </div>
    </div>
  );
}
