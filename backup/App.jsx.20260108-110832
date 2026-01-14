import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabase.js";

/**
 * Fluxo fixo:
 * /auth -> /start -> /perfil-clinico -> /wizard -> /patologias -> /app
 */

// ---- Regras de completude ----
function isPersonalComplete(p) {
  return Boolean(p?.full_name && p?.phone && p?.cpf && p?.birth_date);
}
function isWizardComplete(p) {
  return Boolean(p?.age_range && p?.main_goal && p?.main_reason);
}
function hasConditionsSelected(p) {
  return Array.isArray(p?.conditions) && p.conditions.length > 0;
}
function isProfileComplete(p) {
  return isPersonalComplete(p) && isWizardComplete(p) && hasConditionsSelected(p);
}

function getNextRoute(profile) {
  if (!profile) return "/perfil-clinico";
  if (!isPersonalComplete(profile)) return "/perfil-clinico";
  if (!isWizardComplete(profile)) return "/wizard";
  if (!hasConditionsSelected(profile)) return "/patologias";
  return "/app";
}

// ---- helpers ----
function withTimeout(promise, ms, label = "Timeout") {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

// ---- Supabase helpers ----
async function fetchMyProfile(userId) {
  const query = supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  const { data, error } = await withTimeout(query, 8000, "Supabase timeout ao buscar perfil");
  if (error) throw error;
  return data ?? null;
}

async function upsertMyProfile(userId, patch) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

// ---- UI base ----
function Header({ userEmail, onSignOut }) {
  return (
    <div style={styles.topbar}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={styles.logoDot} />
        <div>
          <div style={{ fontWeight: 800 }}>Gaia Plant — Cannabis Medicinal</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Saúde & bem-estar (beta)</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {userEmail ? (
          <>
            <span style={{ fontSize: 12, opacity: 0.75 }}>{userEmail}</span>
            <button onClick={onSignOut} style={styles.btnGhost}>
              Sair
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Shell({ session, children, onSignOut }) {
  return (
    <div style={styles.page}>
      <Header userEmail={session?.user?.email ?? ""} onSignOut={onSignOut} />
      <div style={styles.container}>{children}</div>
    </div>
  );
}

function Card({ children }) {
  return <div style={styles.card}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  return <input {...props} style={{ ...styles.input, ...(props.style || {}) }} />;
}

function SelectButton({ active, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...styles.selectBtn, ...(active ? styles.selectBtnActive : {}) }}
    >
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
      {subtitle ? <div style={{ marginTop: 6, opacity: 0.8 }}>{subtitle}</div> : null}
    </button>
  );
}

// ---- Páginas Auth ----
function Welcome() {
  return (
    <Card>
      <h1 style={{ margin: 0, fontSize: 34 }}>Bem-vindo à Gaia Plant</h1>
      <p style={{ opacity: 0.75, marginTop: 10 }}>
        Seu app de saúde e bem-estar. Faça login ou crie uma conta para continuar.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        <Link to="/criar-conta" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
          Criar conta
        </Link>
        <Link to="/login" style={{ ...styles.btnGhost, textDecoration: "none", display: "inline-block" }}>
          Já tenho conta (Login)
        </Link>
      </div>
    </Card>
  );
}

function Signup() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
      if (error) throw error;

      if (data?.session?.user) nav("/start", { replace: true });
      else setMsg("Conta criada. Verifique seu e-mail para confirmar e depois faça login.");
    } catch (err) {
      setMsg(err?.message || "Erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Criar conta</h2>
      <form onSubmit={handleSignup}>
        <Field label="E-mail">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@dominio.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Senha (mínimo 8 dígitos)">
          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="********"
            autoComplete="new-password"
          />
        </Field>

        <button disabled={loading} style={styles.btn}>
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div style={{ marginTop: 12 }}>
          <Link to="/login" style={{ opacity: 0.8 }}>
            Já tenho conta
          </Link>
        </div>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </form>
    </Card>
  );
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      nav("/start", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <form onSubmit={handleLogin}>
        <Field label="E-mail">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seuemail@dominio.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="********"
            autoComplete="current-password"
          />
        </Field>

        <button disabled={loading} style={styles.btn}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={{ marginTop: 12 }}>
          <Link to="/criar-conta" style={{ opacity: 0.8 }}>
            Não tenho conta
          </Link>
        </div>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </form>
    </Card>
  );
}

// ---- Gates ----
function StartGate({ profile, loadingProfile, profileError }) {
  const nav = useNavigate();

  useEffect(() => {
    if (loadingProfile) return;

    if (profileError) {
      nav("/perfil-clinico", { replace: true });
      return;
    }

    const next = getNextRoute(profile);
    nav(next, { replace: true });
  }, [profile, loadingProfile, profileError, nav]);

  return (
    <Card>
      <div style={{ opacity: 0.75 }}>Carregando próximo passo...</div>
      {profileError ? (
        <div style={{ marginTop: 10, color: "#b00020", fontSize: 13 }}>
          {String(profileError?.message || profileError)}
        </div>
      ) : null}
    </Card>
  );
}

// ---- Perfil clínico ----
function ClinicalProfile({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "+55 ");
  const [cpf, setCpf] = useState(profile?.cpf ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");

  useEffect(() => {
    if (!profile) return;
    if (isPersonalComplete(profile)) nav("/wizard", { replace: true });
  }, [profile, nav]);

  function formatBirthDate(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 2));
    if (digits.length >= 3) parts.push(digits.slice(2, 4));
    if (digits.length >= 5) parts.push(digits.slice(4, 8));
    return parts.join("/");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const patch = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        cpf: cpf.trim(),
        birth_date: birthDate.trim(),
      };

      await upsertMyProfile(userId, patch);
      const fresh = await fetchMyProfile(userId);
      onProfileSaved(fresh);
      nav("/wizard", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, fontSize: 34 }}>Vamos começar criando o seu perfil clínico</h2>
      <p style={{ marginTop: 6, opacity: 0.75 }}>
        <b>IMPORTANTE</b> — Não abrevie essas informações.
      </p>

      <form onSubmit={handleSave}>
        <Field label="Nome completo">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ex: João Morais Pereira da Silva"
          />
        </Field>

        <Field label="Telefone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+55 31 99979-3193"
          />
        </Field>

        <Field label="CPF">
          <Input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="Ex: 999.999.999-99"
          />
        </Field>

        <Field label="Data de Nascimento">
          <Input
            value={birthDate}
            onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
            placeholder="Ex: 01/01/1990"
          />
        </Field>

        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button disabled={saving} style={styles.btn}>
            {saving ? "Salvando..." : "Próximo"}
          </button>
        </div>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </form>
    </Card>
  );
}

// ---- Wizard (clicáveis) ----
function Wizard({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [ageRange, setAgeRange] = useState(profile?.age_range ?? "");
  const [mainGoal, setMainGoal] = useState(profile?.main_goal ?? "");
  const [mainReason, setMainReason] = useState(profile?.main_reason ?? "");

  const goals = useMemo(
    () => [
      { key: "Melhora do Sono", sub: "Ajuda para dormir e manter o descanso." },
      { key: "Mais Calma", sub: "Controle da agitação e do nervosismo diário." },
      { key: "Aumento do Foco", sub: "Mais concentração nas suas atividades." },
      { key: "Menos Estresse", sub: "Melhora do estresse e exaustão diária." },
      { key: "Controle da Ansiedade", sub: "Busca por mais equilíbrio emocional." },
      { key: "Dor Crônica", sub: "Alívio de dores constantes." },
      { key: "Melhora no Esporte", sub: "Mais energia e menos fadiga muscular." },
      { key: "Aumento da Libido", sub: "Recupere a sensação de prazer." },
      { key: "Enxaqueca", sub: "Alívio para dores de cabeça fortes." },
      { key: "Controle da TPM", sub: "Controle para mudanças de humor e irritação." },
    ],
    []
  );

  useEffect(() => {
    if (profile && !isPersonalComplete(profile)) nav("/perfil-clinico", { replace: true });
    if (profile && isWizardComplete(profile)) nav("/patologias", { replace: true });
  }, [profile, nav]);

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const patch = {
        age_range: ageRange,
        main_goal: mainGoal,
        main_reason: mainReason,
      };

      await upsertMyProfile(userId, patch);
      const fresh = await fetchMyProfile(userId);
      onProfileSaved(fresh);
      nav("/patologias", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar wizard.");
    } finally {
      setSaving(false);
    }
  }

  const canContinue = Boolean(ageRange && mainGoal && mainReason);

  return (
    <Card>
      <h2 style={{ marginTop: 0, fontSize: 32 }}>Só mais um passo 👇</h2>
      <p style={{ marginTop: 6, opacity: 0.75 }}>
        Isso ajuda a personalizar recomendações. Você pode ajustar depois.
      </p>

      <hr style={{ margin: "18px 0", opacity: 0.2 }} />

      <h3 style={{ margin: "0 0 8px" }}>Faixa etária</h3>
      <p style={{ marginTop: 0, opacity: 0.7 }}>Ajuda a personalizar recomendações e linguagem.</p>
      <div style={styles.choiceGrid}>
        {["18-24", "25-34", "35-44", "45-54", "55+"].map((opt) => (
          <SelectButton
            key={opt}
            active={ageRange === opt}
            title={opt}
            onClick={() => setAgeRange(opt)}
          />
        ))}
      </div>

      <hr style={{ margin: "22px 0", opacity: 0.2 }} />

      <h3 style={{ margin: "0 0 8px" }}>Objetivos mais procurados</h3>
      <p style={{ marginTop: 0, opacity: 0.7 }}>Selecione 1 objetivo (por enquanto).</p>
      <div style={styles.choiceGrid2}>
        {goals.map((g) => (
          <SelectButton
            key={g.key}
            active={mainGoal === g.key}
            title={g.key}
            subtitle={g.sub}
            onClick={() => setMainGoal(g.key)}
          />
        ))}
      </div>

      <hr style={{ margin: "22px 0", opacity: 0.2 }} />

      <h3 style={{ margin: "0 0 8px" }}>Qual é o principal motivo?</h3>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["Saúde", "Bem-estar", "Curiosidade", "Lazer", "Outro"].map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMainReason(m)}
            style={{ ...styles.pill, ...(mainReason === m ? styles.pillActive : {}) }}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <button
          disabled={saving || !canContinue}
          style={{ ...styles.btn, opacity: saving || !canContinue ? 0.6 : 1 }}
          onClick={handleSave}
          type="button"
        >
          {saving ? "Salvando..." : "Continuar"}
        </button>

        <button type="button" style={styles.btnGhost} onClick={() => nav("/perfil-clinico")}>
          Voltar
        </button>
      </div>

      {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
    </Card>
  );
}

// ---- Patologias ----
function Patologias({ session, profile, onProfileSaved = () => {} }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedConditions, setSelectedConditions] = useState(() => profile?.conditions ?? []);

  const conditions = useMemo(
    () => [
      "Ansiedade",
      "Insónia / Distúrbios do sono",
      "Dor crónica",
      "Fibromialgia",
      "Enxaqueca",
      "Depressão",
      "Stress / Burnout",
      "TDAH (foco e atenção)",
      "Epilepsia / Convulsões",
      "Espasticidade (ex: Esclerose Múltipla)",
      "Náusea e vómitos (ex: quimioterapia)",
      "Apetite baixo / Caquexia",
      "Dor neuropática",
      "Inflamação crónica",
      "Artrite",
      "TPM intensa",
      "TEPT (stress pós-traumático)",
      "Autismo (suporte de sintomas)",
      "Glaucoma (casos específicos)",
    ],
    []
  );

  useEffect(() => {
    if (profile && !isPersonalComplete(profile)) nav("/perfil-clinico", { replace: true });
    if (profile && !isWizardComplete(profile)) nav("/wizard", { replace: true });
  }, [profile, nav]);

  function toggle(item) {
    setSelectedConditions((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const patch = { conditions: selectedConditions };
      await upsertMyProfile(userId, patch);

      const fresh = await fetchMyProfile(userId);
      onProfileSaved(fresh);
      nav("/app", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar patologias.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 style={{ marginTop: 0, fontSize: 28 }}>O que você busca tratar ou melhorar?</h2>
      <p style={{ marginTop: 6, opacity: 0.75 }}>Selecione uma ou mais opções. (Você pode ajustar depois.)</p>

      <div style={styles.choiceGrid2}>
        {conditions.map((c) => (
          <SelectButton
            key={c}
            active={selectedConditions.includes(c)}
            title={c}
            onClick={() => toggle(c)}
          />
        ))}
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <button
          disabled={saving || selectedConditions.length === 0}
          style={styles.btn}
          onClick={handleSave}
        >
          {saving ? "Salvando..." : "Concluir e entrar"}
        </button>

        <button type="button" style={styles.btnGhost} onClick={() => nav("/wizard")}>
          Voltar
        </button>
      </div>

      {selectedConditions.length === 0 ? (
        <p style={{ marginTop: 10, opacity: 0.7 }}>Selecione pelo menos 1 opção para continuar.</p>
      ) : null}

      {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
    </Card>
  );
}

// ---- Home do App ----
function AppHome() {
  const objetivos = [
    { id: "sono", titulo: "Melhora do Sono", descricao: "Ajuda para dormir e manter o descanso." },
    { id: "calma", titulo: "Mais Calma", descricao: "Controle da agitação e do nervosismo diário." },
    { id: "foco", titulo: "Aumento do Foco", descricao: "Mais concentração nas suas atividades." },
    { id: "estresse", titulo: "Menos Estresse", descricao: "Melhora do estresse e exaustão diária." },
    { id: "ansiedade", titulo: "Controle da Ansiedade", descricao: "Busca por mais equilíbrio emocional." },
    { id: "dor", titulo: "Dor Crônica", descricao: "Alívio de dores constantes." },
    { id: "esporte", titulo: "Melhora no Esporte", descricao: "Mais energia e menos fadiga muscular." },
    { id: "libido", titulo: "Aumento da Libido", descricao: "Recupere a sensação de prazer." },
    { id: "enxaqueca", titulo: "Enxaqueca", descricao: "Alívio para dores de cabeça fortes." },
    { id: "tpm", titulo: "Controle da TPM", descricao: "Controle para mudanças de humor e irritação." },
  ];

  const outrosMotivos = [
    "TDAH",
    "Depressão",
    "Fibromialgia",
    "Parkinson",
    "Burnout",
    "Epilepsia",
    "Alzheimer",
    "Redução de Vícios",
    "Autismo (TEA)",
    "Obesidade",
    "Bruxismo",
    "Menopausa",
    "Câncer (suporte)",
    "Esclerose Múltipla",
    "Asma",
    "Demência",
    "Glaucoma",
    "Cuidados Paliativos",
    "Anorexia",
    "Outros",
  ];

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);
    })();
  }, []);

  async function handleSelectGoal(goalId, goalTitle) {
    if (!userId) {
      setMsg("Sessão inválida. Faça login novamente.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const { error } = await supabase.from("profiles").update({ main_goal: goalTitle }).eq("id", userId);
      if (error) throw error;
      setMsg(`Objetivo salvo: ${goalTitle}`);
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar objetivo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 30 }}>Gaia Plant</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>Selecione o principal objetivo que busca com o tratamento</p>
      </div>

      <Card>
        <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Objetivos Mais Procurados</h3>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          {objetivos.map((item) => (
            <div
              key={item.id}
              onClick={() => handleSelectGoal(item.id, item.titulo)}
              style={{
                border: "2px solid #111",
                borderRadius: 14,
                padding: 14,
                background: saving ? "#f4f4f4" : "#fff",
                cursor: "pointer",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{item.titulo}</div>
              <div style={{ fontSize: 14, color: "#111", opacity: 0.8 }}>{item.descricao}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Outros Motivos</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {outrosMotivos.map((motivo) => (
            <button
              key={motivo}
              type="button"
              style={{
                textAlign: "left",
                padding: 14,
                borderRadius: 14,
                border: "2px solid #111",
                background: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
              onClick={() => alert(motivo)}
            >
              {motivo}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, textAlign: "center" }}>Informações Importantes</h3>
        <div
          style={{
            lineHeight: 1.6,
            color: "#111",
            opacity: 0.9,
            fontSize: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <p style={{ margin: 0 }}>
            Tratamentos com fitocanabinoides não são destinados ao uso recreativo nem à “cura imediata”
            de doenças. Pessoas grávidas, amamentando ou tentando engravidar não devem realizar esses
            tratamentos sem orientação expressa do médico.
          </p>
          <p style={{ margin: 0 }}>
            Não interrompa nem substitua tratamentos em andamento sem falar com seu médico. As opções
            acima servem apenas para organizar sua queixa principal e apoiar a avaliação clínica.
          </p>
          <p style={{ margin: 0 }}>
            A avaliação e a prescrição, quando indicadas, são feitas exclusivamente por profissionais
            habilitados, conforme normas da ANVISA.
          </p>
          <p style={{ margin: 0 }}>
            As informações sobre saúde, estado emocional e rotina serão usadas apenas para apoiar essa
            avaliação e manter seu atendimento seguro, de acordo com nossa Política de Privacidade.
          </p>
          <p style={{ margin: 0 }}>
            A Gaia Plant não realiza venda, intermediação ou promoção comercial de produtos derivados de cannabis.
          </p>
        </div>
      </Card>

      {msg ? (
        <div style={{ textAlign: "center", color: msg.includes("Erro") ? "#b00020" : "#166534", fontWeight: 700 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}

// ---- Guards ----
function RequireAuth({ session, children }) {
  if (!session?.user) return <Navigate to="/auth" replace />;
  return children;
}

function RequireBasicProfile({ session, profile, children }) {
  if (!session?.user) return <Navigate to="/auth" replace />;
  if (!profile || !isPersonalComplete(profile)) return <Navigate to="/perfil-clinico" replace />;
  return children;
}

function RequireProfileComplete({ session, profile, children }) {
  if (!session?.user) return <Navigate to="/auth" replace />;

  if (!profile) {
    return (
      <Card>
        <div style={{ opacity: 0.75 }}>Carregando...</div>
      </Card>
    );
  }

  if (!isPersonalComplete(profile)) return <Navigate to="/perfil-clinico" replace />;
  if (!isWizardComplete(profile)) return <Navigate to="/wizard" replace />;
  if (!hasConditionsSelected(profile)) return <Navigate to="/patologias" replace />;

  return children;
}

// ---- Router principal ----
function RouterApp() {
  const [session, setSession] = useState(null);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const fetchSeqRef = useRef(0);

  async function loadProfileFor(userId) {
    const seq = ++fetchSeqRef.current;
    setLoadingProfile(true);
    setProfileError(null);

    try {
      const p = await fetchMyProfile(userId);
      if (seq !== fetchSeqRef.current) return;
      setProfile(p);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      setProfile(null);
      setProfileError(err);
    } finally {
      if (seq !== fetchSeqRef.current) return;
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sess = data?.session ?? null;
        setSession(sess);

        if (sess?.user?.id) {
          await loadProfileFor(sess.user.id);
        } else {
          fetchSeqRef.current++;
          setProfile(null);
          setProfileError(null);
          setLoadingProfile(false);
        }
      } catch (err) {
        setSession(null);
        setProfile(null);
        setProfileError(err);
        setLoadingProfile(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user?.id) {
        await loadProfileFor(newSession.user.id);
      } else {
        fetchSeqRef.current++;
        setProfile(null);
        setProfileError(null);
        setLoadingProfile(false);
      }
    });

    unsub = sub?.subscription;

    return () => {
      fetchSeqRef.current++;
      unsub?.unsubscribe?.();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    fetchSeqRef.current++;
    setProfile(null);
    setProfileError(null);
    setLoadingProfile(false);
  }

  return (
    <Shell session={session} onSignOut={handleSignOut}>
      <Routes>
        <Route path="/" element={<Navigate to="/start" replace />} />

        <Route path="/auth" element={session ? <Navigate to="/start" replace /> : <Welcome />} />
        <Route path="/criar-conta" element={session ? <Navigate to="/start" replace /> : <Signup />} />
        <Route path="/login" element={session ? <Navigate to="/start" replace /> : <Login />} />

        <Route
          path="/start"
          element={
            !session ? (
              <Navigate to="/auth" replace />
            ) : (
              <StartGate profile={profile} loadingProfile={loadingProfile} profileError={profileError} />
            )
          }
        />

        <Route
          path="/perfil-clinico"
          element={
            !session ? (
              <Navigate to="/auth" replace />
            ) : (
              <ClinicalProfile session={session} profile={profile} onProfileSaved={setProfile} />
            )
          }
        />

        <Route
          path="/wizard"
          element={
            !session ? (
              <Navigate to="/auth" replace />
            ) : (
              <Wizard session={session} profile={profile} onProfileSaved={setProfile} />
            )
          }
        />

        <Route
          path="/patologias"
          element={
            !session ? (
              <Navigate to="/auth" replace />
            ) : (
              <Patologias session={session} profile={profile} onProfileSaved={setProfile} />
            )
          }
        />

        <Route
          path="/app"
          element={
            !session ? (
              <Navigate to="/auth" replace />
            ) : !isProfileComplete(profile) ? (
              <Navigate to={getNextRoute(profile)} replace />
            ) : (
              <AppHome />
            )
          }
        />

        <Route path="*" element={<Navigate to="/start" replace />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return <RouterApp />;
}

// ---- styles ----
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f8",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
    color: "#111",
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    background: "rgba(246,247,248,0.9)",
    backdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoDot: { width: 18, height: 18, borderRadius: 6, background: "#2e7d32" },
  container: { maxWidth: 920, margin: "0 auto", padding: "22px 16px 40px" },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    outline: "none",
    fontSize: 14,
  },
  btn: {
    background: "#43a047",
    color: "#fff",
    border: "none",
    padding: "12px 18px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
  },
  btnGhost: {
    background: "transparent",
    color: "#111",
    border: "1px solid rgba(0,0,0,0.2)",
    padding: "12px 18px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
  },
  choiceGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  choiceGrid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  selectBtn: {
    textAlign: "left",
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "2px solid rgba(0,0,0,0.12)",
    background: "#fff",
    cursor: "pointer",
  },
  selectBtnActive: {
    border: "2px solid #43a047",
    boxShadow: "0 10px 24px rgba(67, 160, 71, 0.18)",
  },
  pill: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  pillActive: { border: "1px solid #43a047", background: "rgba(67,160,71,0.10)" },
};
