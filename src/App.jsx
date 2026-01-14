// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

import { supabase } from "./lib/supabase.js";
import gaiaIcon from "./assets/gaia-icon.png";
import Layout from "./components/Layout.jsx";
 

// -------------------- Admin auth (server-side via Supabase table) --------------------
// Fallback temporário: enquanto a tabela/políticas não existirem, mantém seu e-mail como admin
const ADMIN_EMAIL_FALLBACK = ["pablo.felix.carvalho@gmail.com"];

async function fetchIsAdmin(userId, session) {
  // Sem sessão, nunca é admin
  if (!userId || !session?.user) return false;

  // 1) Preferência: tabela app_admins (server-side)
  try {
    const { data, error } = await supabase
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    // Se a tabela existir e não deu erro, admin = existe linha
    if (!error) return Boolean(data?.user_id);

    // Se a tabela não existir ainda, cai no fallback
    const msg = String(error?.message || "");
    if (msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation")) {
      const email = (session?.user?.email || "").toLowerCase();
      return ADMIN_EMAIL_FALLBACK.includes(email);
    }

    // Outros erros (RLS etc.) => não admin
    return false;
  } catch {
    const email = (session?.user?.email || "").toLowerCase();
    return ADMIN_EMAIL_FALLBACK.includes(email);
  }
}

/**
 * FLUXO (OFICIAL)
 * /auth -> /start -> /perfil-clinico -> /wizard -> /patologias -> /app
 */

// -------------------- Regras de completude --------------------
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
  // Se não existe linha em `profiles` ainda, o próximo passo é criar o perfil clínico.
  // Retornar "/auth" aqui gera loop infinito: /start -> /auth -> /start...
  if (!profile) return "/perfil-clinico";
  if (!isPersonalComplete(profile)) return "/perfil-clinico";
  if (!isWizardComplete(profile)) return "/wizard";
  if (!hasConditionsSelected(profile)) return "/patologias";
  return "/app";
}


// -------------------- Helpers --------------------
// -------------------- Telemetria (controlada) --------------------
const __warnOnce = new Map();
function logWarn(key, details) {
  // evita spam: 1 log por chave a cada 30s
  const now = Date.now();
  const last = __warnOnce.get(key) || 0;
  if (now - last < 30000) return;
  __warnOnce.set(key, now);
  console.warn(`[GAIA] ${key}`, details || "");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout(promise, ms, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

// normaliza objetos de triagem (aceita boolean legado)
function normalizeTriage(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "boolean") out[k] = { on: v, note: "" };
    else if (v && typeof v === "object") out[k] = { on: Boolean(v.on), note: String(v.note ?? "") };
  }
  return out;
}

async function fetchMyProfile(userId) {
  const cacheKey = userId ? `gaia.profile.cache:${userId}` : "gaia.profile.cache:anon";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const query = supabase
        .from("profiles")
        .select(
          [
            "id",
            "email",
            "full_name",
            "phone",
            "cpf",
            "birth_date",
            "conditions",
            "age_range",
            "used_cannabis",
            "main_reason",
            "has_doctor",
            "main_goal",
            "share_data",
            "tipo",
            "direcionamento",
            "liberacao",
            "health_triage",
            "emotional_triage",
            "onboarding_answers",
            "onboarding_completed",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("id", userId)
        .maybeSingle();

      const { data, error } = await withTimeout(query, 45000, "Supabase timeout ao buscar perfil");

      if (error) throw error;

      const normalized = data
        ? {
            ...data,
            health_triage: normalizeTriage(data.health_triage),
            emotional_triage: normalizeTriage(data.emotional_triage),
          }
        : null;

      if (normalized) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(normalized));
        } catch {}
      }

      return normalized;
    } catch (err) {
      const msg = String(err?.message || err).toLowerCase();
      if (msg.includes("timeout")) {
        logWarn("profile_fetch_timeout", { userId, attempt });
      }
      const isNetwork = msg.includes("timeout") || msg.includes("failed to fetch") || msg.includes("network");
      if (!isNetwork) {
        logWarn("profile_fetch_error", { userId, attempt, message: String(err?.message || err) });
      }

      if (isNetwork && attempt === 0) {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) return JSON.parse(cached);
        } catch {}
      }

      if (!isNetwork || attempt === 2) throw err;

      await new Promise((r) => setTimeout(r, 500 + attempt * 800));
    }
  }

  return null;
}

async function upsertMyProfile(userId, patch) {
  // 2 tentativas em caso de timeout intermitente
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const query = supabase
        .from("profiles")
        .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select("*")
        .maybeSingle();

      const { data, error } = await withTimeout(query, 20000, "Supabase timeout ao salvar perfil");
      if (error) throw error;
      return data ?? null;
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes("timeout")) {
        logWarn("profile_save_timeout", { userId, attempt });
      }
      const isTimeout = msg.toLowerCase().includes("timeout");
      if (isTimeout) {
        logWarn("profile_upsert_timeout", { userId, attempt });
      }
      if (!isTimeout || attempt === 1) throw err;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

const CART_STORAGE_KEY = "gaia.cart.items";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

// -------------------- UI Base --------------------
function Header({ userEmail, onSignOut, signingOut }) {
  const nav = useNavigate();

  return (
    <div style={styles.topbar}>
      <div style={styles.appHeader} onClick={() => nav("/")}>
        <img
          src={gaiaIcon}
          alt="Gaia Plant"
          style={{
            width: 88,
            height: 88,
            marginRight: 12,
          }}
        />
        <div>
          <div style={styles.appTitle}>Gaia Plant</div>
          <div style={styles.appSubtitle}>Cannabis Medicinal</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {userEmail ? (
          <>
            <span style={{ fontSize: 12, opacity: 0.75 }}>{userEmail}</span>
            <Link
              to="/app/pagamentos"
              style={{
                ...styles.btnGhost,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 36,
                borderRadius: 999,
              }}
              aria-label="Abrir pagamentos"
              title="Pagamentos"
            >
              🛒
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={Boolean(signingOut)}
              style={{
                ...styles.btnGhost,
                opacity: signingOut ? 0.7 : 1,
                cursor: signingOut ? "not-allowed" : "pointer",
              }}
            >
              {signingOut ? "Saindo..." : "Sair"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Shell({ session, children, onSignOut, signingOut }) {
  return (
    <div style={styles.page}>
      <Header userEmail={session?.user?.email ?? ""} onSignOut={onSignOut} signingOut={signingOut} />
      <div style={styles.container}>{children}</div>
    </div>
  );
}

function AppLayout({ session, signingOut, onSignOut }) {
  return (
    <Shell session={session} signingOut={signingOut} onSignOut={onSignOut}>
      <Outlet />
    </Shell>
  );
}

function Card({ children }) {
  return (
    <div style={styles.card} className="gaia-force-text">
      {children}
    </div>
  );
}

function GlobalLoading({ title = "Carregando…", subtitle = "", onRetry, onGoLogin }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const isSlow = elapsed >= 10;

  return (
    <Card>
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: 0.75, fontSize: 13 }}>
        {subtitle ||
          (isSlow
            ? "Está demorando mais que o normal. Pode ser instabilidade de rede."
            : "Aguarde um instante…")}
      </div>

      {isSlow ? (
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {onRetry ? (
            <button type="button" style={styles.btn} onClick={onRetry}>
              Tentar novamente
            </button>
          ) : null}

          {onGoLogin ? (
            <button type="button" style={styles.btnGhost} onClick={onGoLogin}>
              Ir para login
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>Tempo: {elapsed}s</div>
    </Card>
  );
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

function SelectButton({ active, title, subtitle, onClick, className = "" }) {
  return (
    <button
      className={className}
      type="button"
      onClick={onClick}
      style={{ ...styles.selectBtn, ...(active ? styles.selectBtnActive : {}) }}
    >
      <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
      {subtitle ? <div style={{ marginTop: 6, opacity: 0.8 }}>{subtitle}</div> : null}
    </button>
  );
}

// -------------------- Auth Pages --------------------
function Welcome() {
  return (
    <div style={{ maxWidth: 360, margin: "0 auto" }}>
      <Card>
        <div style={{ textAlign: "center" }}>
          <img src={gaiaIcon} alt="Gaia Plant" style={{ width: 288, height: 288, marginBottom: 10 }} />
          <h1 style={{ margin: 0, fontSize: 24 }}>Gaia Plant</h1>
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            Faça login ou crie uma conta para continuar.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/criar-conta" style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}>
            Criar conta
          </Link>
          <Link to="/login" style={{ ...styles.btnGhost, textDecoration: "none", display: "inline-block" }}>
            Já tenho conta
          </Link>
        </div>
      </Card>
    </div>
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
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img src={gaiaIcon} alt="Gaia Plant" style={{ width: 240, height: 240 }} />
          <h2 style={styles.authTitle}>Criar conta</h2>
          <p style={styles.authSubtitle}>Preencha seus dados para começar.</p>
        </div>

        <form onSubmit={handleSignup} style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
          <Field label="E-mail">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Senha (mínimo 8 dígitos)">
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
          </Field>

          <button disabled={loading} style={styles.btn}>{loading ? "Criando..." : "Criar conta"}</button>

          <div style={{ marginTop: 12 }}>
            <Link to="/login" style={{ color: "#2f5d36", fontWeight: 700, textDecoration: "none" }}>
              Já tenho conta
            </Link>
          </div>

          {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
        </form>
      </div>
    </div>
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
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img src={gaiaIcon} alt="Gaia Plant" style={{ width: 240, height: 240 }} />
          <h2 style={styles.authTitle}>Login</h2>
          <p style={styles.authSubtitle}>Acesse sua conta para continuar.</p>
        </div>

        <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 320, margin: "0 auto" }}>
          <Field label="E-mail">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Senha">
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" />
          </Field>

          <button disabled={loading} style={styles.btn}>{loading ? "Entrando..." : "Entrar"}</button>

          <div style={{ marginTop: 12 }}>
            <Link to="/criar-conta" style={{ color: "#2f5d36", fontWeight: 700, textDecoration: "none" }}>
              Não tenho conta
            </Link>
          </div>

          {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}

// -------------------- Gate /start (ProfileGate isolado) --------------------
function ProfileGate({ session, profile, loadingProfile, profileError }) {
  const nav = useNavigate();

  useEffect(() => {
    if (loadingProfile) return;

    // Sem sessão: manda para auth
    if (!session?.user) {
      nav("/auth", { replace: true });
      return;
    }

    if (profileError) {
      // OFFLINE OK: tenta usar o cache local do último perfil salvo
      try {
        const uid = session?.user?.id;
        if (uid) {
          const cacheKey = `gaia.profile.cache:${uid}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const cachedProfile = JSON.parse(cached);
            logWarn("profile_gate_offline_cache", { uid });
            nav(getNextRoute(cachedProfile), { replace: true });
            return;
          }
        }
      } catch (e) {
        // se o cache estiver inválido, apenas cai para a UI de erro abaixo
        logWarn("profile_gate_cache_parse_error", { message: String(e?.message || e) });
      }

      // Não redireciona automaticamente para /auth.
      // Mantém a tela de erro com botões (Tentar novamente / Ir para login).
      logWarn("profile_gate_error", { message: String(profileError?.message || profileError) });
      return;
    }

    nav(getNextRoute(profile), { replace: true });
  }, [session, profile, loadingProfile, profileError, nav]);

  if (loadingProfile) {
    return (
      <GlobalLoading
        title="Carregando seu perfil…"
        subtitle="Estamos sincronizando seus dados com o Supabase."
        onRetry={() => window.location.reload()}
        onGoLogin={() => nav("/auth", { replace: true })}
      />
    );
  }

  if (profileError) {
    return (
      <GlobalLoading
        title="Não foi possível carregar"
        subtitle={String(profileError?.message || profileError)}
        onRetry={() => window.location.reload()}
        onGoLogin={() => nav("/auth", { replace: true })}
      />
    );
  }

  return (
    <GlobalLoading
      title="Preparando…"
      subtitle="Redirecionando para o próximo passo."
      onRetry={() => window.location.reload()}
      onGoLogin={() => nav("/auth", { replace: true })}
    />
  );
}

// -------------------- Perfil Clinico --------------------
function ClinicalProfile({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "+55 ");
  const [cpf, setCpf] = useState(profile?.cpf ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [state, setState] = useState(profile?.state ?? "");

  useEffect(() => {
    if (profile && isPersonalComplete(profile)) {
      nav("/wizard", { replace: true });
    }
  }, [profile, nav]);

  function formatBirthDate(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 2));
    if (digits.length >= 3) parts.push(digits.slice(2, 4));
    if (digits.length >= 5) parts.push(digits.slice(4, 8));
    return parts.join("/");
  }

  function formatCPF(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 3));
    if (digits.length >= 4) parts.push(digits.slice(3, 6));
    if (digits.length >= 7) parts.push(digits.slice(6, 9));
    let out = parts.join(".");
    if (digits.length >= 10) out += `-${digits.slice(9, 11)}`;
    return out;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setMsg("");

    try {
      const patch = {
        full_name: fullName.trim(),
        phone: String(phone || "").replace(/[^0-9+\s()-]/g, "").trim(),
        cpf: String(cpf || "").replace(/\D/g, "").trim(),
        birth_date: birthDate.trim(),
        state: state.trim(),
      };
      const fresh = await upsertMyProfile(userId, patch);
      onProfileSaved(fresh);
      nav("/wizard", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <h2 style={{ marginTop: 0, fontSize: 28 }}>Para um direcionamento exclusivo, preencha as informações</h2>
        <p style={{ marginTop: 6, opacity: 0.75 }}>
          <b>IMPORTANTE</b> — Não abrevie essas informações.
        </p>

        <form onSubmit={handleSave}>
          <Field label="Nome completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>

          <Field label="Telefone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>

          <Field label="CPF">
            <Input value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} />
          </Field>

          <Field label="Data de Nascimento">
            <Input value={birthDate} onChange={(e) => setBirthDate(formatBirthDate(e.target.value))} />
          </Field>

          <Field label="Estado">
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              style={{ ...styles.input, appearance: "auto" }}
            >
              <option value="">Selecione</option>
              {[
                "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
              ].map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </Field>

          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving} style={styles.btn}>
              {saving ? "Salvando..." : "Próximo"}
            </button>
          </div>

          {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
        </form>
      </div>
    </div>
  );
}

// -------------------- Wizard --------------------
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
      const fresh = await upsertMyProfile(userId, patch);
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
      <p style={{ marginTop: 6, opacity: 0.75 }}>Isso ajuda a personalizar recomendações.</p>

      <hr style={{ margin: "18px 0", opacity: 0.2 }} />

      <h3 style={{ margin: "0 0 8px" }}>Faixa etária</h3>
      <div style={styles.choiceGrid}>
        {["18-24", "25-34", "35-44", "45-54", "55+"].map((opt) => (
          <SelectButton
            key={opt}
            className="gp-card-link"
            active={ageRange === opt}
            title={opt}
            onClick={() => setAgeRange(opt)}
          />
        ))}
      </div>

      <hr style={{ margin: "22px 0", opacity: 0.2 }} />

      <h3 style={{ margin: "0 0 8px" }}>Objetivos mais procurados</h3>
      <div style={styles.choiceGrid2}>
        {goals.map((g) => (
          <SelectButton
            key={g.key}
            className="gp-card-link"
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
        <button disabled={saving || !canContinue} style={{ ...styles.btn, opacity: saving || !canContinue ? 0.6 : 1 }} onClick={handleSave} type="button">
          {saving ? "Salvando..." : "Continuar"}
        </button>
      </div>

      {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
    </Card>
  );
}

// -------------------- Patologias --------------------
function Patologias({ session, profile, onProfileSaved }) {
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
    setSelectedConditions((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const patch = { conditions: selectedConditions };
      const fresh = await upsertMyProfile(userId, patch);
      const nextProfile = fresh || { ...(profile || {}), ...patch };
      onProfileSaved(nextProfile);
      nav("/app", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar patologias.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ ...styles.authPage, alignItems: "flex-start" }}>
      <div style={{ ...styles.authCard, minHeight: "auto", marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 28 }}>O que você busca tratar ou melhorar?</h2>
        <p style={{ marginTop: 6, opacity: 0.75 }}>Selecione uma ou mais opções.</p>

        <div style={styles.choiceGrid2}>
          {conditions.map((c) => (
            <SelectButton
              key={c}
              className="gp-card-link"
              active={selectedConditions.includes(c)}
              title={c}
              onClick={() => toggle(c)}
            />
          ))}
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" style={styles.btnGhost} onClick={() => nav("/app", { replace: true })}>
            Voltar
          </button>
          <button disabled={saving || selectedConditions.length === 0} style={styles.btn} onClick={handleSave}>
            {saving ? "Salvando..." : "Salvar e continuar"}
          </button>
        </div>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </div>
    </div>
  );
}

// -------------------- AppDashboard (home do app após questionários) --------------------
function AppDashboard({ session, profile }) {
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

  const hasHealth = profile?.health_triage && Object.keys(normalizeTriage(profile.health_triage)).length > 0;
  const hasEmotional = profile?.emotional_triage && Object.keys(normalizeTriage(profile.emotional_triage)).length > 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <p style={{ marginTop: 0, opacity: 0.75 }}>
          Bem-vindo{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. Escolha por onde começar.
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
            <button type="button" style={styles.btn} onClick={() => nav("/app/objetivos")}>Definir objetivo</button>
          ) : null}

          {!hasHealth ? (
            <button type="button" style={styles.btn} onClick={() => nav("/app/saude")}>Responder triagem de saúde</button>
          ) : null}

          {hasHealth && !hasEmotional ? (
            <button type="button" style={styles.btn} onClick={() => nav("/app/emocional")}>Responder triagem emocional</button>
          ) : null}

          {hasHealth && hasEmotional ? (
            <div style={{ opacity: 0.75, fontSize: 14 }}>✅ Triagens preenchidas. Você pode atualizar quando quiser.</div>
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
              boxShadow: whatsappActive ? "0 6px 12px rgba(67, 160, 71, 0.2)" : "0 6px 16px rgba(127, 176, 105, 0.15)",
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

// -------------------- Stubs (páginas do app) --------------------
function Conteudos({ session, isAdmin }) {
  const nav = useNavigate();
  const admin = Boolean(isAdmin);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Conteúdos</h2>
            <p style={{ opacity: 0.75, margin: 0 }}>
              Artigos, vídeos e e‑books para apoiar sua jornada. (placeholder)
            </p>
          </div>

          {admin ? (
            <button type="button" style={styles.btn} onClick={() => nav("/app/admin/conteudos")}>Admin</button>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Biblioteca</h3>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Aqui vamos listar conteúdos publicados. Por enquanto, esta área é um placeholder.
        </p>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900 }}>Guia rápido (exemplo)</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>PDF • 5 páginas • Introdução</div>
          </div>
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900 }}>Vídeo introdutório (exemplo)</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Vídeo • 3 min • Boas práticas</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Produtos() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("");

  const oils = [
    {
      id: "full",
      title: "Óleo de CBD — Espectro Completo",
      desc: "CBD + outros canabinoides naturais. Pode conter traços de THC (limite legal).",
      indications: "Ansiedade persistente, dores crônicas, distúrbios do sono.",
      concentrations: [300, 600, 1000, 1500, 3000],
    },
    {
      id: "broad",
      title: "Óleo de CBD — Espectro Amplo",
      desc: "Sem THC, preserva outros canabinoides e terpenos.",
      indications: "Uso diário, estresse, pessoas sensíveis ao THC.",
      concentrations: [300, 600, 1000, 1500, 3000],
    },
    {
      id: "isolado",
      title: "Óleo de CBD — Isolado",
      desc: "CBD purificado, sem outros canabinoides.",
      indications: "Iniciantes e uso focado e controlado.",
      concentrations: [300, 600, 1000, 1500, 3000],
    },
  ];

  function addToCart(item, concentration) {
    const cart = readCart();
    cart.push({
      id: `${item.id}-${concentration}`,
      title: item.title,
      concentration,
      qty: 1,
    });
    writeCart(cart);
    setMsg(`✅ Adicionado ao carrinho: ${item.title} (${concentration} mg)`);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>Produtos</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Selecione o tipo de óleo e a concentração desejada.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={styles.btnGhost} onClick={() => nav("/app")}>
            Voltar
          </button>
          <button type="button" style={styles.btn} onClick={() => nav("/app/carrinho")}>
            Ver carrinho
          </button>
        </div>
        {msg ? <div style={{ marginTop: 10, color: "#2e7d32", fontSize: 13 }}>{msg}</div> : null}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Óleos de CBD</h3>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {oils.map((oil) => (
            <div
              key={oil.id}
              style={{
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 18 }}>{oil.title}</div>
              <div style={{ opacity: 0.8 }}>{oil.desc}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>Indicado para: {oil.indications}</div>

              <div style={{ marginTop: 6, fontWeight: 700, fontSize: 13 }}>Concentração</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {oil.concentrations.map((mg) => (
                  <button
                    key={mg}
                    type="button"
                    onClick={() => addToCart(oil, mg)}
                    style={{
                      border: "1px solid #7fb069",
                      color: "#2f5d36",
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {mg} mg
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Pagamentos() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>Pagamentos</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Checkout (placeholder). Aqui vamos integrar Pix, cartão e Mercado Pago.
        </p>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Opções</h3>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900 }}>Pix</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>QR Code / Copia e cola (em breve)</div>
          </div>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900 }}>Cartão</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Crédito / Débito (em breve)</div>
          </div>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900 }}>Mercado Pago</div>
            <div style={{ opacity: 0.75, marginTop: 6 }}>Link de pagamento / Checkout Pro (em breve)</div>
          </div>
        </div>

        <p style={{ marginTop: 12, opacity: 0.7, fontSize: 13 }}>
          Para a demo, essa página é a vitrine do fluxo. Depois ligamos no backend.
        </p>
      </Card>
    </div>
  );
}

function Carrinho() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  function clearCart() {
    writeCart([]);
    setItems([]);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>Carrinho</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          {items.length === 0 ? "Nenhum item selecionado ainda." : "Itens selecionados."}
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" style={styles.btn} onClick={() => nav("/app/produtos")}>
            Clique aqui para ver nossos produtos
          </button>
          <button type="button" style={styles.btnGhost} onClick={() => nav("/app/pagamentos")}>
            Ir para pagamentos
          </button>
          {items.length > 0 ? (
            <button type="button" style={styles.btnGhost} onClick={clearCart}>
              Limpar carrinho
            </button>
          ) : null}
        </div>
      </Card>

      {items.length > 0 ? (
        <Card>
          <h3 style={{ marginTop: 0 }}>Resumo</h3>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {items.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 800 }}>{item.title}</div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  Concentração: {item.concentration} mg • Qtd: {item.qty || 1}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Medicos() {
  const doctors = [
    { name: "Dra. Camila Rocha", specialty: "Clínica Integrativa", city: "Belo Horizonte" },
    { name: "Dr. Paulo Mendes", specialty: "Neurologia", city: "São Paulo" },
    { name: "Dra. Júlia Santos", specialty: "Psiquiatria", city: "Rio de Janeiro" },
  ];

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Médicos credenciados</h2>
      <p style={{ opacity: 0.75 }}>Escolha um profissional para iniciar o atendimento.</p>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {doctors.map((doc) => (
          <div
            key={doc.name}
            style={{
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>{doc.name}</div>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                {doc.specialty} • {doc.city}
              </div>
            </div>
            <button type="button" style={styles.btn}>Abrir chat</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Receitas() {
  const nav = useNavigate();

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Receita e Anvisa</h2>
      <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
        Para acessar tratamentos regulamentos, é necessário ter receita médica válida e a autorização
        correspondente. Com a Gaia Plant, o processo é simples e segue as normas brasileiras aplicáveis.
      </p>
      <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
        Clique abaixo para iniciar sua consulta com um profissional credenciado.
      </p>
      <button type="button" style={styles.btn} onClick={() => nav("/app/medicos")}>
        Continuar passo a passo
      </button>
    </Card>
  );
}

function Pedidos() {
  const nav = useNavigate();

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Sua entrega</h2>
      <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
        Aqui você acompanha o andamento do seu processo regulatório e logístico, com atualizações de envio.
      </p>
      <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
        Caso ainda não tenha pedido, explore nossos produtos para iniciar.
      </p>
      <button type="button" style={styles.btn} onClick={() => nav("/app/produtos")}>
        Ver produtos
      </button>
    </Card>
  );
}

function AlertasUso() {
  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Alertas de uso</h2>
      <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
        Produtos à base de canabinoides não substituem avaliação médica. Use somente conforme orientação
        profissional e respeite as doses recomendadas.
      </p>
      <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
        Evite dirigir ou operar máquinas se houver sonolência. Não combine com álcool ou medicações sem
        orientação. Em caso de efeitos adversos, procure assistência médica.
      </p>
      <p style={{ fontWeight: 800, marginTop: 12 }}>MANTENHA FORA DO ALCANCE DE CRIANÇAS.</p>
    </Card>
  );
}

function Perfil({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({});

  // -------------------- Dados pessoais --------------------
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "+55 ");
  const [cpf, setCpf] = useState(profile?.cpf ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");

  // -------------------- Preferências (wizard) --------------------
  const [ageRange, setAgeRange] = useState(profile?.age_range ?? "");
  const [mainReason, setMainReason] = useState(profile?.main_reason ?? "");
  const [mainGoal, setMainGoal] = useState(profile?.main_goal ?? "");

  const [selectedConditions, setSelectedConditions] = useState(() => profile?.conditions ?? []);

  // -------------------- Triagens (editáveis) --------------------
  const [healthTriage, setHealthTriage] = useState(() => normalizeTriage(profile?.health_triage));
  const [emotionalTriage, setEmotionalTriage] = useState(() => normalizeTriage(profile?.emotional_triage));

  const goalOptions = useMemo(
    () => [
      "Melhora do Sono",
      "Mais Calma",
      "Aumento do Foco",
      "Menos Estresse",
      "Controle da Ansiedade",
      "Dor Crônica",
      "Melhora no Esporte",
      "Aumento da Libido",
      "Enxaqueca",
      "Controle da TPM",
    ],
    []
  );

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

  const healthFields = useMemo(
    () => [
      { key: "digestivos", label: "Problemas digestivos", placeholder: "Quanto tempo e quais sintomas?" },
      { key: "evacuar", label: "Dificuldade para evacuar", placeholder: "Com que frequência? Há quanto tempo?" },
      { key: "urinar", label: "Dificuldade para urinar", placeholder: "Explique rapidamente" },
      { key: "cabeca_intensa", label: "Dores de cabeça intensas", placeholder: "Frequência e intensidade" },
      { key: "alimentacao", label: "Problemas com alimentação", placeholder: "Quanto tempo, e qual o problema?" },
      { key: "acorda_cansado", label: "Acorda cansado", placeholder: "Com que frequência?" },
      { key: "fuma", label: "Tabaco (você fuma?)", placeholder: "Com que frequência?" },
      { key: "alcool", label: "Bebida alcoólica", placeholder: "Frequência e tipo de bebida" },
      { key: "ja_usou_cannabis", label: "Já usou cannabis", placeholder: "Com que frequência? Há quanto tempo?" },
      { key: "arritmia", label: "Arritmia cardíaca", placeholder: "Detalhe (se souber)" },
      { key: "psicose", label: "Histórico de psicose/esquizofrenia", placeholder: "Explique brevemente" },
      { key: "tratamento_atual", label: "Faz algum tratamento", placeholder: "Qual tratamento?" },
      { key: "usa_remedios", label: "Uso frequente de remédios", placeholder: "Quais e com que frequência?" },
      { key: "doenca_cronica", label: "Doença crônica", placeholder: "Qual?" },
      { key: "cirurgia", label: "Cirurgia anterior", placeholder: "Qual e quando?" },
      { key: "alergia", label: "Alergia", placeholder: "Qual alergia?" },
    ],
    []
  );

  const emotionalFields = useMemo(
    () => [
      { key: "tristeza", label: "Tristeza", placeholder: "Com qual frequência e motivo?" },
      { key: "foco", label: "Perda de foco", placeholder: "Especifique" },
      { key: "memoria", label: "Memória", placeholder: "Há quanto tempo e qual intensidade?" },
      { key: "irritado_triste", label: "Irritabilidade / tristeza", placeholder: "Com que frequência?" },
      { key: "estresse", label: "Estresse", placeholder: "Quais os motivos?" },
      { key: "panico", label: "Episódios de pânico", placeholder: "Com que frequência e há quanto tempo?" },
      { key: "diagnostico_psicose", label: "Diagnóstico de psicose", placeholder: "Há quanto tempo?" },
      { key: "familia_psicose", label: "Parente com psicose", placeholder: "Qual parente?" },
      { key: "diagnostico_ans_depr", label: "Diagnóstico ansiedade/depressão", placeholder: "Há quanto tempo?" },
      {
        key: "sintomas_emocionais",
        label: "Sintomas emocionais (seleção)",
        placeholder: "Ex: Ansiedade, sensação de vazio, estresse elevado...",
      },
    ],
    []
  );

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "+55 ");
    setCpf(profile?.cpf ?? "");
    setBirthDate(profile?.birth_date ?? "");

    setAgeRange(profile?.age_range ?? "");
    setMainReason(profile?.main_reason ?? "");
    setMainGoal(profile?.main_goal ?? "");

    setSelectedConditions(profile?.conditions ?? []);

    setHealthTriage(normalizeTriage(profile?.health_triage));
    setEmotionalTriage(normalizeTriage(profile?.emotional_triage));
  }, [profile]);

  function digitsOnly(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function isValidBirthDateBR(v) {
    const s = String(v || "").trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false;
    const [dd, mm, yyyy] = s.split("/").map((x) => parseInt(x, 10));
    if (!dd || !mm || !yyyy) return false;
    if (yyyy < 1900 || yyyy > new Date().getFullYear()) return false;
    if (mm < 1 || mm > 12) return false;
    const lastDay = new Date(yyyy, mm, 0).getDate();
    if (dd < 1 || dd > lastDay) return false;
    return true;
  }

  function isValidCPF(cpfValue) {
    const cpfDigits = digitsOnly(cpfValue);
    if (cpfDigits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

    const calcCheck = (base, factor) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factor - i);
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };

    const base9 = cpfDigits.slice(0, 9);
    const d1 = calcCheck(base9, 10);
    const base10 = cpfDigits.slice(0, 10);
    const d2 = calcCheck(base10, 11);

    return d1 === parseInt(cpfDigits[9], 10) && d2 === parseInt(cpfDigits[10], 10);
  }

  function isValidPhone(phoneValue) {
    const d = digitsOnly(phoneValue);
    return d.length >= 10;
  }

  function formatBirthDate(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
    const parts = [];
    if (digits.length > 0) parts.push(digits.slice(0, 2));
    if (digits.length >= 3) parts.push(digits.slice(2, 4));
    if (digits.length >= 5) parts.push(digits.slice(4, 8));
    return parts.join("/");
  }

  function validateAll() {
    const next = {};

    if (!String(fullName || "").trim()) next.fullName = "Informe seu nome completo.";
    if (!isValidPhone(phone)) next.phone = "Telefone inválido (coloque DDD).";
    if (!isValidCPF(cpf)) next.cpf = "CPF inválido.";
    if (!isValidBirthDateBR(birthDate)) next.birthDate = "Data inválida (DD/MM/AAAA).";

    if (ageRange && !["18-24", "25-34", "35-44", "45-54", "55+"].includes(ageRange)) {
      next.ageRange = "Faixa etária inválida.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function toggleCondition(item) {
    setSelectedConditions((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }

  function toggleTriage(setter, key) {
    setter((prev) => {
      const cur = prev[key] ?? { on: false, note: "" };
      const nextOn = !cur.on;
      return { ...prev, [key]: { ...cur, on: nextOn, note: nextOn ? cur.note : "" } };
    });
  }

  function setTriageNote(setter, key, note) {
    setter((prev) => {
      const cur = prev[key] ?? { on: false, note: "" };
      return { ...prev, [key]: { ...cur, note } };
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setMsg("");

    const ok = validateAll();
    if (!ok) return;

    setSaving(true);
    try {
      const patch = {
        full_name: String(fullName || "").trim(),
        phone: String(phone || "").trim(),
        cpf: String(cpf || "").trim(),
        birth_date: String(birthDate || "").trim(),
        age_range: ageRange || null,
        main_reason: mainReason || null,
        main_goal: mainGoal || null,
        conditions: selectedConditions,
        health_triage: healthTriage,
        emotional_triage: emotionalTriage,
      };

      const fresh = await upsertMyProfile(userId, patch);
      onProfileSaved?.(fresh);
      setMsg("✅ Perfil atualizado com sucesso.");
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !saving;

  function TriageEditor({ title, subtitle, fields, value, onToggle, onNote }) {
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        {subtitle ? <p style={{ opacity: 0.75, marginTop: 6 }}>{subtitle}</p> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {fields.map((f) => {
            const row = value?.[f.key] ?? { on: false, note: "" };
            const active = Boolean(row.on);

            return (
              <div key={f.key} style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
                <button
                  type="button"
                  onClick={onToggle(f.key)}
                  disabled={saving}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: active ? "2px solid #43a047" : "2px solid rgba(0,0,0,0.12)",
                    borderRadius: 14,
                    padding: 14,
                    background: active ? "rgba(67,160,71,0.08)" : "#fff",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                  aria-pressed={active}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{f.label}</div>
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 900,
                        background: active ? "#43a047" : "rgba(0,0,0,0.10)",
                        color: active ? "#fff" : "#111",
                      }}
                    >
                      {active ? "ATIVO" : "INATIVO"}
                    </div>
                  </div>
                </button>

                {active ? (
                  <div style={{ marginTop: 10 }}>
                    <Input
                      value={row.note || ""}
                      onChange={(e) => onNote(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      disabled={saving}
                    />
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>Você pode detalhar o máximo que quiser.</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>Meu perfil</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Atualize seus dados e preferências. Você pode ajustar quando quiser.
        </p>
      </Card>

      <Card>
        <form onSubmit={handleSave} style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Dados pessoais</h3>

          <Field label="Nome completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={saving} />
            {errors.fullName ? <div style={{ color: "#b00020", fontSize: 12, marginTop: 6 }}>{errors.fullName}</div> : null}
          </Field>

          <Field label="Telefone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} placeholder="+55 31 99999-9999" />
            {errors.phone ? <div style={{ color: "#b00020", fontSize: 12, marginTop: 6 }}>{errors.phone}</div> : null}
          </Field>

          <Field label="CPF">
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} disabled={saving} placeholder="000.000.000-00" />
            {errors.cpf ? <div style={{ color: "#b00020", fontSize: 12, marginTop: 6 }}>{errors.cpf}</div> : null}
          </Field>

          <Field label="Data de nascimento">
            <Input value={birthDate} onChange={(e) => setBirthDate(formatBirthDate(e.target.value))} disabled={saving} placeholder="DD/MM/AAAA" />
            {errors.birthDate ? <div style={{ color: "#b00020", fontSize: 12, marginTop: 6 }}>{errors.birthDate}</div> : null}
          </Field>

          <hr style={{ margin: "8px 0", opacity: 0.2 }} />

          <h3 style={{ margin: 0 }}>Preferências (triagem)</h3>

          <Field label="Faixa etária">
            <select
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              disabled={saving}
              style={{ ...styles.input, appearance: "auto" }}
            >
              <option value="">—</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55+">55+</option>
            </select>
            {errors.ageRange ? <div style={{ color: "#b00020", fontSize: 12, marginTop: 6 }}>{errors.ageRange}</div> : null}
          </Field>

          <Field label="Motivo principal">
            <select
              value={mainReason}
              onChange={(e) => setMainReason(e.target.value)}
              disabled={saving}
              style={{ ...styles.input, appearance: "auto" }}
            >
              <option value="">—</option>
              <option value="Saúde">Saúde</option>
              <option value="Bem-estar">Bem-estar</option>
              <option value="Curiosidade">Curiosidade</option>
              <option value="Lazer">Lazer</option>
              <option value="Outro">Outro</option>
            </select>
          </Field>

          <Field label="Objetivo principal">
            <select
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              disabled={saving}
              style={{ ...styles.input, appearance: "auto" }}
            >
              <option value="">—</option>
              {goalOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>

          <Field label="Condições selecionadas">
            <div className="gaia-force-text">
              <div style={styles.choiceGrid2}>
                {conditions.map((c) => (
                  <SelectButton
                    key={c}
                    className="gp-card-link"
                    active={selectedConditions.includes(c)}
                    title={c}
                    onClick={() => toggleCondition(c)}
                  />
                ))}
              </div>
              <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                Selecionadas: <b>{selectedConditions.length}</b>
              </div>
            </div>
          </Field>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={!canSave}
              style={{ ...styles.btn, flex: 1, padding: "14px 18px" }}
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                if (saving) return;
                try {
                  setSaving(true);

                  const patch = {
                    full_name: String(fullName || "").trim(),
                    phone: String(phone || "").trim(),
                    cpf: String(cpf || "").trim(),
                    birth_date: String(birthDate || "").trim(),
                    age_range: ageRange || null,
                    main_reason: mainReason || null,
                    main_goal: mainGoal || null,
                    conditions: selectedConditions,
                    health_triage: healthTriage,
                    emotional_triage: emotionalTriage,
                  };

                  const fresh = await upsertMyProfile(userId, patch);
                  onProfileSaved?.(fresh);
                  nav("/app", { replace: true });
                } catch (err) {
                  setMsg(err?.message || "Erro ao salvar perfil.");
                } finally {
                  setSaving(false);
                }
              }}
              style={{ ...styles.btnGhost, flex: 1, padding: "14px 18px" }}
            >
              Salvar e voltar
            </button>
          </div>

          {msg ? (
            <div style={{ marginTop: 4, color: msg.startsWith("✅") ? "#2e7d32" : "#b00020", fontSize: 13 }}>
              {msg}
            </div>
          ) : null}
        </form>
      </Card>

      <TriageEditor
        title="Triagem de saúde"
        subtitle="Toque em um item para ativar/desativar. Quando ativo, você pode escrever detalhes abaixo."
        fields={healthFields}
        value={healthTriage}
        onToggle={(k) => () => toggleTriage(setHealthTriage, k)}
        onNote={(k, v) => setTriageNote(setHealthTriage, k, v)}
      />

      <TriageEditor
        title="Triagem emocional"
        subtitle="Escolha o que faz sentido e detalhe quando quiser."
        fields={emotionalFields}
        value={emotionalTriage}
        onToggle={(k) => () => toggleTriage(setEmotionalTriage, k)}
        onNote={(k, v) => setTriageNote(setEmotionalTriage, k, v)}
      />

      <Card>
        <p style={{ margin: 0, opacity: 0.75, fontSize: 13 }}>
          Dica: essas informações são suas. Você pode voltar e editar quando quiser.
        </p>
      </Card>
    </div>
  );
}

function Historico({ profile }) {
  const nav = useNavigate();

  const health = normalizeTriage(profile?.health_triage);
  const emo = normalizeTriage(profile?.emotional_triage);

  // Produtos (MVP): lemos de onboarding_answers.products para não depender de novas colunas
  const products = profile?.onboarding_answers?.products || {};
  const favorites = Array.isArray(products.favorites) ? products.favorites : [];
  const purchased = Array.isArray(products.purchased) ? products.purchased : [];

  function renderTriageSection(title, triageObj) {
    const entries = Object.entries(triageObj || {}).filter(([, v]) => Boolean(v?.on));

    return (
      <div style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 8 }}>{title}</h3>

        {entries.length === 0 ? (
          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Nenhuma resposta marcada aqui ainda.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {entries.map(([key, v]) => (
              <div
                key={key}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{key.replace(/_/g, " ")}</div>
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      background: "#43a047",
                      color: "#fff",
                    }}
                  >
                    ATIVO
                  </div>
                </div>

                {String(v?.note || "").trim() ? (
                  <div style={{ marginTop: 8, opacity: 0.8 }}>{v.note}</div>
                ) : (
                  <div style={{ marginTop: 8, opacity: 0.6, fontSize: 13 }}>Sem detalhes adicionais.</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Meu histórico</h2>
            <p style={{ opacity: 0.75, margin: 0 }}>Resumo do que você respondeu.</p>
          </div>
          <button type="button" style={styles.btnGhost} onClick={() => nav("/app", { replace: true })}>
            Voltar
          </button>
        </div>
      </Card>

      <Card>
        {renderTriageSection("Saúde", health)}
        {renderTriageSection("Emocional", emo)}
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Produtos</h3>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Em breve você vai ver aqui seus produtos preferidos e adquiridos. (MVP)
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Preferidos</div>
            {favorites.length === 0 ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>Nenhum produto marcado como preferido ainda.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {favorites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Adquiridos</div>
            {purchased.length === 0 ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>Nenhuma compra registrada ainda.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {purchased.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" style={styles.btn} onClick={() => nav("/app/produtos")}>Ir para Produtos</button>
          <button type="button" style={styles.btnGhost} onClick={() => nav("/app/pagamentos")}>Ir para Pagamentos</button>
        </div>
      </Card>
    </div>
  );
}

// -------------------- Admin Guard --------------------
function RequireAdmin({ session, isAdmin, children }) {
  if (!session?.user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return children;
}

// -------------------- Admin: Conteúdos (upload + listagem básica via Supabase Storage) --------------------
function AdminContents({ session }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("ebook");
  const [file, setFile] = useState(null);

  async function loadFiles() {
    setMsg("");
    try {
      const { data, error } = await supabase.storage
        .from("contents")
        .list("uploads", { limit: 100, offset: 0, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      setFiles(data ?? []);
    } catch (err) {
      // bucket pode não existir ainda — mostramos instrução clara
      setFiles([]);
      setMsg(
        err?.message ||
          "Não foi possível listar arquivos. Verifique se o bucket 'contents' existe no Supabase Storage."
      );
    }
  }

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function handleUpload(e) {
    e.preventDefault();
    setMsg("");

    if (!file) {
      setMsg("Selecione um arquivo para enviar.");
      return;
    }

    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const path = `uploads/${stamp}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("contents")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (upErr) throw upErr;

      // tenta gerar URL pública (funciona se o bucket estiver público)
      const { data: pub } = supabase.storage.from("contents").getPublicUrl(path);
      const url = pub?.publicUrl ?? "";

      setTitle("");
      setKind("ebook");
      setFile(null);

      setMsg(`✅ Upload concluído${url ? `: ${url}` : "."}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setMsg(err?.message || "Erro ao enviar arquivo. Verifique o bucket 'contents' e permissões.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Admin • Conteúdos</h2>
            <p style={{ opacity: 0.75, margin: 0 }}>
              Envie vídeos, e‑books e arquivos para download via Supabase Storage.
            </p>
          </div>
          <button type="button" style={styles.btnGhost} onClick={() => nav("/app/conteudos")}>Voltar</button>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Upload</h3>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Requisito: criar um bucket chamado <b>contents</b> no Supabase Storage (pode ser público para facilitar o MVP).
        </p>

        <form onSubmit={handleUpload} style={{ display: "grid", gap: 12 }}>
          <Field label="Título (opcional)">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Guia de introdução" disabled={busy} />
          </Field>

          <Field label="Tipo">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={busy}
              style={{ ...styles.input, appearance: "auto" }}
            >
              <option value="ebook">E‑book (PDF)</option>
              <option value="video">Vídeo</option>
              <option value="arquivo">Arquivo</option>
            </select>
          </Field>

          <Field label="Arquivo">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
            />
          </Field>

          <button type="submit" disabled={busy} style={{ ...styles.btn, width: "100%" }}>
            {busy ? "Enviando..." : "Enviar"}
          </button>

          {msg ? (
            <div style={{ marginTop: 4, color: msg.startsWith("✅") ? "#2e7d32" : "#b00020", fontSize: 13 }}>
              {msg}
            </div>
          ) : null}
        </form>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Arquivos no bucket</h3>
          <button type="button" style={styles.btnGhost} disabled={busy} onClick={() => setRefreshKey((k) => k + 1)}>
            Atualizar
          </button>
        </div>

        {files.length === 0 ? (
          <p style={{ opacity: 0.75, marginTop: 10 }}>
            Nenhum arquivo listado (ou bucket não configurado).
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {files.map((f) => {
              const { data: pub } = supabase.storage.from("contents").getPublicUrl(`uploads/${f.name}`);
              const url = pub?.publicUrl ?? "";
              return (
                <div
                  key={f.name}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{f.name}</div>
                    <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                      {f.metadata?.size ? `${Math.round(f.metadata.size / 1024)} KB` : ""}
                    </div>
                  </div>

                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ ...styles.btn, textDecoration: "none", display: "inline-block" }}
                    >
                      Abrir
                    </a>
                  ) : (
                    <div style={{ opacity: 0.75, fontSize: 12 }}>Bucket privado: sem URL pública</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// -------------------- AppHome (Objetivos clicáveis + salva no Supabase) --------------------
function AppHome({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const objetivos = useMemo(
    () => [
      { titulo: "Melhora do Sono", descricao: "Ajuda para dormir e manter o descanso." },
      { titulo: "Mais Calma", descricao: "Controle da agitação e do nervosismo diário." },
      { titulo: "Aumento do Foco", descricao: "Mais concentração nas suas atividades." },
      { titulo: "Menos Estresse", descricao: "Melhora do estresse e exaustão diária." },
      { titulo: "Controle da Ansiedade", descricao: "Busca por mais equilíbrio emocional." },
      { titulo: "Dor Crônica", descricao: "Alívio de dores constantes." },
      { titulo: "Melhora no Esporte", descricao: "Mais energia e menos fadiga muscular." },
      { titulo: "Aumento da Libido", descricao: "Recupere a sensação de prazer." },
      { titulo: "Enxaqueca", descricao: "Alívio para dores de cabeça fortes." },
      { titulo: "Controle da TPM", descricao: "Controle para mudanças de humor e irritação." },
    ],
    []
  );

  async function handlePickGoal(titulo) {
    setSaving(true);
    setMsg("");
    try {
      // salva a triagem no perfil (você pode trocar o campo depois, mas assim já funciona hoje)
      const fresh = await upsertMyProfile(userId, { main_goal: titulo });
      onProfileSaved(fresh);
      nav("/app/saude", { replace: true });
      setMsg(`✅ Salvo: ${titulo}`);
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
        <p style={{ margin: 0, opacity: 0.75 }}>Selecione o principal objetivo</p>
      </div>

      <Card>
        <h3 style={{ marginTop: 0, color: "#2e7d32" }}>Objetivos Mais Procurados</h3>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {objetivos.map((item) => {
            const active = profile?.main_goal === item.titulo;
            return (
              <button
                key={item.titulo}
                type="button"
                disabled={saving}
                onClick={() => handlePickGoal(item.titulo)}
                style={{
                  textAlign: "left",
                  border: active ? "2px solid #43a047" : "2px solid #111",
                  borderRadius: 14,
                  padding: 14,
                  background: "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{item.titulo}</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>{item.descricao}</div>
              </button>
            );
          })}
        </div>

        {msg ? <p style={{ marginTop: 12, color: msg.startsWith("✅") ? "#2e7d32" : "#b00020" }}>{msg}</p> : null}
      </Card>
    </div>
  );
}

// -------------------- Triagem Resumo --------------------
function TriagemResumo({ profile }) {
  const nav = useNavigate();

  return (
    <Card>
      <h2 style={{ marginTop: 0 }}>Triagem salva ✅</h2>
      <p style={{ opacity: 0.8 }}>
        Objetivo principal: <b>{profile?.main_goal || "—"}</b>
      </p>
      <button
        type="button"
        onClick={() => nav("/app/saude", { replace: true })}
        style={{ ...styles.btn, marginTop: 14, width: "100%" }}
      >
        Próximo
      </button>
    </Card>
  );
}

// -------------------- Saúde (questionário estilo “blis”) --------------------
function HealthTriage({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const questions = useMemo(
    () => [
      { key: "digestivos", label: "Tem problemas digestivos?", placeholder: "Quanto tempo e quais sintomas?" },
      { key: "evacuar", label: "Tem dificuldades para evacuar?", placeholder: "Com que frequência? Há quanto tempo?" },
      { key: "urinar", label: "Tem dificuldades para urinar?", placeholder: "Explique rapidamente" },
      { key: "cabeca_intensa", label: "Tem dores de cabeças intensas?", placeholder: "Frequência e intensidade" },
      { key: "alimentacao", label: "Possui problemas com alimentação?", placeholder: "Quanto tempo, e qual o problema?" },
      { key: "acorda_cansado", label: "Acorda cansado?", placeholder: "Com que frequência?" },
      { key: "fuma", label: "Você fuma?", placeholder: "Com que frequência?" },
      { key: "alcool", label: "Faz uso de bebida alcoólica?", placeholder: "Frequência e tipo de bebida" },
      { key: "ja_usou_cannabis", label: "Já usou cannabis (maconha)?", placeholder: "Com que frequência? Há quanto tempo?" },
      { key: "arritmia", label: "Possui arritmia cardíaca?", placeholder: "Detalhe (se souber)" },
      { key: "psicose", label: "Histórico de psicose / esquizofrenia?", placeholder: "Explique brevemente" },
      { key: "tratamento_atual", label: "Atualmente, faz algum tratamento?", placeholder: "Qual tratamento?" },
      { key: "usa_remedios", label: "Faz uso frequente de remédios?", placeholder: "Quais e com que frequência?" },
      { key: "doenca_cronica", label: "Possui alguma doença crônica?", placeholder: "Qual?" },
      { key: "cirurgia", label: "Já fez alguma cirurgia?", placeholder: "Qual e quando?" },
      { key: "alergia", label: "Possui alguma alergia?", placeholder: "Qual alergia?" },
    ],
    []
  );

  const [answers, setAnswers] = useState(() => normalizeTriage(profile?.health_triage));

  useEffect(() => {
    setAnswers(normalizeTriage(profile?.health_triage));
  }, [profile]);

  function toggle(key) {
    setAnswers((prev) => {
      const cur = prev[key] ?? { on: false, note: "" };
      const nextOn = !cur.on;
      return { ...prev, [key]: { ...cur, on: nextOn, note: nextOn ? cur.note : "" } };
    });
  }

  function setNote(key, note) {
    setAnswers((prev) => {
      const cur = prev[key] ?? { on: false, note: "" };
      return { ...prev, [key]: { ...cur, note } };
    });
  }

  async function handleNext() {
    setSaving(true);
    setMsg("");
    try {
      const patch = { health_triage: answers };
      const fresh = await upsertMyProfile(userId, patch);
      onProfileSaved(fresh);
      nav("/app/emocional", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar triagem de saúde.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ margin: 0, fontSize: 26 }}>Sobre a sua saúde</h2>
        <p style={{ marginTop: 8, opacity: 0.75 }}>Responda com muita atenção.</p>
      </Card>

      <Card>
        <div className="gaia-force-text">
          <div style={{ display: "grid", gap: 14 }}>
            {questions.map((q) => {
              const row = answers?.[q.key] ?? { on: false, note: "" };
              const on = Boolean(row.on);

              return (
                <div key={q.key} style={{ padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ fontWeight: 800 }}>{q.label}</div>

                    <button
                      type="button"
                      onClick={() => toggle(q.key)}
                      disabled={saving}
                      style={{
                        width: 56,
                        height: 32,
                        borderRadius: 999,
                        border: "1px solid rgba(0,0,0,0.2)",
                        background: on ? "#43a047" : "#333",
                        position: "relative",
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.7 : 1,
                      }}
                      aria-pressed={on}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 3,
                          left: on ? 28 : 4,
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          background: "#fff",
                          transition: "left 120ms ease",
                        }}
                      />
                    </button>
                  </div>

                  {on ? (
                    <div style={{ marginTop: 10 }}>
                      <Input
                        value={row.note || ""}
                        onChange={(e) => setNote(q.key, e.target.value)}
                        placeholder={q.placeholder}
                        disabled={saving}
                        style={{ borderRadius: 12 }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          style={{
            ...styles.btn,
            width: "100%",
            marginTop: 16,
            padding: "14px 18px",
            borderRadius: 999,
            fontSize: 16,
          }}
        >
          {saving ? "Salvando..." : "Próximo"}
        </button>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </Card>
    </div>
  );
}

// -------------------- Emocional (questionário) --------------------
function EmotionalTriage({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const questions = useMemo(
    () => [
      { key: "tristeza", label: "Sente muita tristeza?", placeholder: "Com qual frequência e motivo?" },
      { key: "foco", label: "Perde o foco facilmente?", placeholder: "Especifique" },
      { key: "memoria", label: "Tem problemas de memória?", placeholder: "Há quanto tempo, e qual a intensidade?" },
      { key: "irritado_triste", label: "Fica facilmente irritado ou triste?", placeholder: "Com que frequência?" },
      { key: "estresse", label: "Possui problemas com estresse?", placeholder: "Quais os motivos?" },
      { key: "panico", label: "Já teve episódios de pânico?", placeholder: "Com que frequência e há quanto tempo?" },
      { key: "diagnostico_psicose", label: "Já recebeu diagnóstico de esquizofrenia ou psicose?", placeholder: "Há quanto tempo?" },
      { key: "familia_psicose", label: "Algum parente próximo tem esquizofrenia ou psicose?", placeholder: "Qual parente?" },
      { key: "diagnostico_ans_depr", label: "Já teve diagnóstico de ansiedade ou depressão?", placeholder: "Há quanto tempo?" },
    ],
    []
  );

  const [answers, setAnswers] = useState(() => normalizeTriage(profile?.emotional_triage));

  useEffect(() => {
    setAnswers(normalizeTriage(profile?.emotional_triage));
  }, [profile]);

  function toggle(key) {
    setAnswers((prev) => {
      const cur = prev[key] ?? { on: false, note: "" };
      const nextOn = !cur.on;
      return { ...prev, [key]: { ...cur, on: nextOn, note: nextOn ? cur.note : "" } };
    });
  }

  function setNote(key, note) {
    setAnswers((prev) => {
      const cur = prev[key] ?? { on: false, note: "" };
      return { ...prev, [key]: { ...cur, note } };
    });
  }

  async function handleNext() {
    setSaving(true);
    setMsg("");
    try {
      const patch = { emotional_triage: answers };
      const fresh = await upsertMyProfile(userId, patch);
      onProfileSaved(fresh);

      // Próximo passo: sintomas emocionais multi-seleção.
      nav("/app/emocional/sintomas", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar triagem emocional.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ margin: 0, fontSize: 26 }}>Sobre o seu estado emocional atual</h2>
        <p style={{ marginTop: 8, opacity: 0.75 }}>Responda com muita atenção.</p>
      </Card>

      <Card>
        <div style={{ display: "grid", gap: 14 }}>
          {questions.map((q) => {
            const row = answers?.[q.key] ?? { on: false, note: "" };
            const on = Boolean(row.on);

            return (
              <div key={q.key} style={{ padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>{q.label}</div>

                  <button
                    type="button"
                    onClick={() => toggle(q.key)}
                    disabled={saving}
                    style={{
                      width: 56,
                      height: 32,
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.2)",
                      background: on ? "#43a047" : "#333",
                      position: "relative",
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                    aria-pressed={on}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: on ? 28 : 4,
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: "#fff",
                        transition: "left 120ms ease",
                      }}
                    />
                  </button>
                </div>

                {on ? (
                  <div style={{ marginTop: 10 }}>
                    <Input
                      value={row.note || ""}
                      onChange={(e) => setNote(q.key, e.target.value)}
                      placeholder={q.placeholder}
                      disabled={saving}
                      style={{ borderRadius: 12 }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={saving}
          style={{
            ...styles.btn,
            width: "100%",
            marginTop: 16,
            padding: "14px 18px",
            borderRadius: 999,
            fontSize: 16,
          }}
        >
          {saving ? "Salvando..." : "Próximo"}
        </button>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </Card>
    </div>
  );
}

// -------------------- Sintomas emocionais (multi-seleção) --------------------
function EmotionalSymptoms({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const options = useMemo(
    () => [
      "Ansiedade",
      "Crises de pânico",
      "Tristeza constante",
      "Irritabilidade",
      "Falta de motivação",
      "Dificuldade de concentração",
      "Pensamentos acelerados",
      "Oscilação de humor",
      "Sensação de vazio",
      "Estresse elevado",
      "Dificuldade para dormir",
      "Pesadelos / sono agitado",
      "Apetite alterado",
      "Isolamento social",
    ],
    []
  );

  const [selected, setSelected] = useState(() => {
    const saved = normalizeTriage(profile?.emotional_triage)?.sintomas_emocionais?.note || "";
    const listPart = saved.split("|")[0].trim();
    const arr = listPart ? listPart.split(",").map((s) => s.trim()).filter(Boolean) : [];
    return new Set(arr);
  });

  const [note, setNote] = useState(() => {
    const saved = normalizeTriage(profile?.emotional_triage)?.sintomas_emocionais?.note || "";
    const parts = saved.split("|");
    return parts.length > 1 ? parts.slice(1).join("|").trim() : "";
  });

  useEffect(() => {
    const saved = normalizeTriage(profile?.emotional_triage)?.sintomas_emocionais?.note || "";
    const listPart = saved.split("|")[0].trim();
    const arr = listPart ? listPart.split(",").map((s) => s.trim()).filter(Boolean) : [];
    setSelected(new Set(arr));

    const parts = saved.split("|");
    setNote(parts.length > 1 ? parts.slice(1).join("|").trim() : "");
  }, [profile]);

  function toggle(opt) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const selectedArr = Array.from(selected);
      const noteTrim = note.trim();

      // ✅ Salva dentro do JSON existente `emotional_triage` (sem depender de novas colunas no Supabase)
      // Guardamos os sintomas como um item especial compatível com normalizeTriage.
      const mergedEmo = {
        ...normalizeTriage(profile?.emotional_triage),
        sintomas_emocionais: {
          on: selectedArr.length > 0,
          note: selectedArr.join(", ") + (noteTrim ? ` | ${noteTrim}` : ""),
        },
      };

      const patch = { emotional_triage: mergedEmo };
      const fresh = await upsertMyProfile(userId, patch);
      onProfileSaved(fresh);

      // Próximo passo: dashboard do app
      nav("/app", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar sintomas emocionais.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ margin: 0, fontSize: 26 }}>Como você está se sentindo ultimamente?</h2>
        <p style={{ marginTop: 8, opacity: 0.75 }}>
          Selecione tudo o que fizer sentido. Você pode alterar depois.
        </p>
      </Card>

      <Card>
        <div className="gaia-force-text">
          <div style={styles.choiceGrid2}>
            {options.map((opt) => (
              <SelectButton
                key={opt}
                className="gp-card-link"
                active={selected.has(opt)}
                title={opt}
                onClick={() => toggle(opt)}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Field label="Algo a acrescentar? (opcional)">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: crises à noite, piora aos domingos, gatilhos, etc."
              disabled={saving}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            ...styles.btn,
            width: "100%",
            marginTop: 8,
            padding: "14px 18px",
            borderRadius: 999,
            fontSize: 16,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>

        <button
          type="button"
          onClick={() => nav("/app/emocional", { replace: true })}
          disabled={saving}
          style={{
            ...styles.btnGhost,
            width: "100%",
            marginTop: 10,
            padding: "14px 18px",
            borderRadius: 999,
            fontSize: 16,
            opacity: saving ? 0.7 : 1,
          }}
        >
          Voltar
        </button>

        {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
      </Card>
    </div>
  );
}


// -------------------- Guards --------------------
function RequireAuth({ session, children }) {
  if (!session?.user) return <Navigate to="/auth" replace />;
  return children;
}

function RequireBasicProfile({ session, profile, children }) {
  if (!session?.user) return <Navigate to="/auth" replace />;
  if (!profile || !isPersonalComplete(profile)) return <Navigate to="/perfil-clinico" replace />;
  return children;
}

function RequireProfileComplete({ session, profile, loadingProfile, profileError, children }) {
  const nav = useNavigate();

  if (!session?.user) return <Navigate to="/auth" replace />;

  // Se deu erro ao carregar perfil (timeout, RLS, rede, etc.), não fica preso em "Carregando..."
  if (profileError) {
    return (
      <Card>
        <h3 style={{ marginTop: 0 }}>Não consegui carregar seu perfil</h3>
        <p style={{ opacity: 0.8, marginTop: 6 }}>
          {String(profileError?.message || profileError)}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" style={styles.btn} onClick={() => nav(0)}>
            Tentar novamente
          </button>
          <Link to="/auth" style={{ ...styles.btnGhost, textDecoration: "none" }}>
            Ir para login
          </Link>
        </div>
      </Card>
    );
  }

  // Enquanto está carregando, mostra loading
  if (loadingProfile) {
    return (
      <Card>
        <div style={{ opacity: 0.75 }}>Carregando...</div>
      </Card>
    );
  }

  if (!profile) return <Navigate to="/perfil-clinico" replace />;

  if (!isPersonalComplete(profile)) return <Navigate to="/perfil-clinico" replace />;
  if (!isWizardComplete(profile)) return <Navigate to="/wizard" replace />;
  if (!hasConditionsSelected(profile)) return <Navigate to="/patologias" replace />;

  return children;
}

// -------------------- App (carrega session/profile + rotas) --------------------
export default function App() {
  const nav = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [isAdminFlag, setIsAdminFlag] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const fetchSeqRef = useRef(0);
  const lastLoadedUserIdRef = useRef(null);
  const inFlightProfileRef = useRef(null);
  const signingOutRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);

  async function loadProfileFor(userId) {
    if (!userId) return;

    if (lastLoadedUserIdRef.current === userId && profile && !profileError) {
      return;
    }

    if (inFlightProfileRef.current?.userId === userId && inFlightProfileRef.current?.promise) {
      return inFlightProfileRef.current.promise;
    }

    const seq = ++fetchSeqRef.current;
    setLoadingProfile(true);
    setProfileError(null);

    const promise = (async () => {
      try {
        const p = await fetchMyProfile(userId);
        if (seq !== fetchSeqRef.current) return;
        setProfile(p);
        lastLoadedUserIdRef.current = userId;
      } catch (err) {
        if (seq !== fetchSeqRef.current) return;
        setProfile(null);
        setProfileError(err);
      } finally {
        if (seq !== fetchSeqRef.current) return;
        setLoadingProfile(false);
        if (inFlightProfileRef.current?.userId === userId) inFlightProfileRef.current = null;
      }
    })();

    inFlightProfileRef.current = { userId, promise };
    return promise;
  }

  async function loadAdminFor(userId, sess) {
    setLoadingAdmin(true);
    try {
      const ok = await fetchIsAdmin(userId, sess);
      setIsAdminFlag(Boolean(ok));
    } catch {
      setIsAdminFlag(false);
    } finally {
      setLoadingAdmin(false);
    }
  }

  useEffect(() => {
    let unsub = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const sess = data?.session ?? null;
        setSession(sess);
        setAuthChecked(true);

        if (sess?.user?.id) {
          await loadProfileFor(sess.user.id);
          await loadAdminFor(sess.user.id, sess);
        } else {
          lastLoadedUserIdRef.current = null;
          inFlightProfileRef.current = null;
          setProfile(null);
          setProfileError(null);
          setLoadingProfile(false);
          setIsAdminFlag(false);
        }
      } catch (err) {
        setSession(null);
        setProfile(null);
        setProfileError(err);
        setLoadingProfile(false);
        setIsAdminFlag(false);
        setAuthChecked(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setAuthChecked(true);
      setSession(newSession);

      if (_event === "INITIAL_SESSION") {
        return;
      }

      const newUserId = newSession?.user?.id || null;

      if (newUserId) {
        if (lastLoadedUserIdRef.current !== newUserId) {
          await loadProfileFor(newUserId);
        }
        await loadAdminFor(newUserId, newSession);
      } else {
        fetchSeqRef.current++;
        lastLoadedUserIdRef.current = null;
        inFlightProfileRef.current = null;
        setProfile(null);
        setProfileError(null);
        setLoadingProfile(false);
        setIsAdminFlag(false);
      }
    });

    unsub = sub?.subscription;

    return () => {
      fetchSeqRef.current++;
      lastLoadedUserIdRef.current = null;
      inFlightProfileRef.current = null;
      unsub?.unsubscribe?.();
    };
  }, []);

  async function handleSignOut() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      logWarn("signout_error", { message: String(err?.message || err) });
    } finally {
      fetchSeqRef.current++;
      lastLoadedUserIdRef.current = null;
      inFlightProfileRef.current = null;

      setSession(null);
      setProfile(null);
      setProfileError(null);
      setLoadingProfile(false);
      setIsAdminFlag(false);

      nav("/auth", { replace: true });

      signingOutRef.current = false;
      setSigningOut(false);
      setAuthChecked(true);
    }
  }

  if (!authChecked) {
    return (
      <div style={styles.page}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "60px 16px" }}>
          <div style={{ ...styles.card, textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Carregando sessão…</div>
            <div style={{ marginTop: 10, opacity: 0.75 }}>Aguarde um instante.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session?.user ? "/start" : "/auth"} replace />} />

      <Route path="/auth" element={session?.user ? <Navigate to="/start" replace /> : <Welcome />} />
      <Route path="/login" element={session?.user ? <Navigate to="/start" replace /> : <Login />} />
      <Route path="/criar-conta" element={session?.user ? <Navigate to="/start" replace /> : <Signup />} />

      <Route
        path="/start"
        element={
          <RequireAuth session={session}>
            <ProfileGate session={session} profile={profile} loadingProfile={loadingProfile} profileError={profileError} />
          </RequireAuth>
        }
      />

      <Route
        path="/perfil-clinico"
        element={
          <RequireAuth session={session}>
            <ClinicalProfile session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
          </RequireAuth>
        }
      />

      <Route
        path="/wizard"
        element={
          <RequireAuth session={session}>
            <Wizard session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
          </RequireAuth>
        }
      />

      <Route
        path="/patologias"
        element={
          <RequireAuth session={session}>
            <Patologias session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
          </RequireAuth>
        }
      />

      <Route
        path="/app"
        element={
          <RequireAuth session={session}>
            <Layout session={session} onSignOut={handleSignOut} signingOut={signingOut} />
          </RequireAuth>
        }
      >
        <Route
          index
          element={
            <RequireProfileComplete session={session} profile={profile} loadingProfile={loadingProfile} profileError={profileError}>
              <AppDashboard session={session} profile={profile} />
            </RequireProfileComplete>
          }
        />

        <Route
          path="perfil"
          element={
            <RequireProfileComplete session={session} profile={profile} loadingProfile={loadingProfile} profileError={profileError}>
              <Perfil session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
            </RequireProfileComplete>
          }
        />

        <Route
          path="saude"
          element={
            <RequireProfileComplete session={session} profile={profile} loadingProfile={loadingProfile} profileError={profileError}>
              <HealthTriage session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
            </RequireProfileComplete>
          }
        />

        <Route
          path="emocional"
          element={
            <RequireProfileComplete session={session} profile={profile} loadingProfile={loadingProfile} profileError={profileError}>
              <EmotionalTriage session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
            </RequireProfileComplete>
          }
        />

        <Route
          path="emocional/sintomas"
          element={
            <RequireProfileComplete session={session} profile={profile} loadingProfile={loadingProfile} profileError={profileError}>
              <EmotionalSymptoms session={session} profile={profile} onProfileSaved={(p) => setProfile(p)} />
            </RequireProfileComplete>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={session?.user ? "/start" : "/auth"} replace />} />
    </Routes>
  );
}

// -------------------- Styles --------------------
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
  appHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  appLogo: {
    width: 36,
    height: 36,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: "20px",
  },
  appSubtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  authPage: {
    minHeight: "100vh",
    background: "#e9efe8",
    padding: "16px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  authCard: {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
    minHeight: "82vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
  },
  authTitle: {
    margin: "10px 0 6px",
    fontSize: 22,
    color: "#2f5d36",
  },
  authSubtitle: {
    margin: 0,
    fontSize: 13,
    opacity: 0.75,
  },
  logoDot: { width: 18, height: 18, borderRadius: 6, background: "#2e7d32" },
  container: {
    maxWidth: 420,
    width: "100%",
    boxSizing: "border-box",
    margin: "0 auto",
    padding: "16px 12px 28px",
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
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
  choiceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  choiceGrid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
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
