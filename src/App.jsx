// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";

import { supabase } from "./lib/supabase.js";
import { fetchMyProfile, upsertMyProfile } from "./lib/profileApi.js";
import { logWarn } from "./lib/telemetry.js";
import { normalizeTriage, isPersonalComplete, isWizardComplete, hasConditionsSelected, getNextRoute } from "./lib/triage.js";
import { styles } from "./styles/inlineStyles.js";

const GAIA_ICON = "/gaia-icon.png";
const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-emerald-600 text-white font-semibold px-4 py-2 transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed";
const GHOST_BUTTON_CLASS =
  "rounded-full border border-neutral-300 bg-white px-4 py-2 font-semibold hover:bg-neutral-100 transition";
const INPUT_CLASS =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
import Layout from "./components/Layout.jsx";
import SelectButton from "./components/ui/SelectButton.jsx";

/**
 * FLUXO (OFICIAL)
 * /auth -> /start -> /perfil-clinico -> /wizard -> /patologias -> /app
 */

async function saveProfileAndReload(userId, patch) {
  await upsertMyProfile(userId, patch);
  return await fetchMyProfile(userId);
}


// -------------------- Helpers --------------------

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

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border border-neutral-200 shadow-sm p-4 gaia-force-text ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{label}</div>
      {children}
    </div>
  );
}

function Input(props) {
  const { className = "", style, ...rest } = props;
  return (
    <input
      {...rest}
      style={style}
      className={`${INPUT_CLASS} ${className}`}
    />
  );
}

function GlobalLoading({ title, subtitle, onRetry, onGoLogin }) {
  return (
    <div style={{ ...styles.authPage, padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 24 }}>{title || "Carregando..."}</h2>
          {subtitle ? <p style={{ opacity: 0.75, marginTop: 8 }}>{subtitle}</p> : null}
          <div className="flex flex-wrap gap-2 mt-4">
            {onRetry ? (
              <button type="button" className={`${PRIMARY_BUTTON_CLASS} flex-1`} onClick={onRetry}>
                Tentar novamente
              </button>
            ) : null}
            {onGoLogin ? (
              <button type="button" className={`${GHOST_BUTTON_CLASS} flex-1`} onClick={onGoLogin}>
                Voltar pro login
              </button>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

// -------------------- Auth Pages --------------------
function Welcome() {
  return (
    <div style={{ maxWidth: 360, margin: "0 auto" }}>
      <Card>
        <div style={{ textAlign: "center" }}>
          <img src={GAIA_ICON} alt="Gaia Plant" style={{ width: 288, height: 288, marginBottom: 10 }} />
          <h1 style={{ margin: 0, fontSize: 24 }}>Gaia Plant</h1>
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            Faça login ou crie uma conta para continuar.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-4">
          <Link to="/criar-conta" className={`${PRIMARY_BUTTON_CLASS} inline-flex items-center justify-center no-underline`}>
            Criar conta
          </Link>
          <Link to="/login" className={`${GHOST_BUTTON_CLASS} inline-flex items-center justify-center no-underline`}>
            Já tenho conta
          </Link>
          <Link to="/conteudos" className={`${GHOST_BUTTON_CLASS} inline-flex items-center justify-center no-underline`}>
            Entenda mais antes de se cadastrar
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
          <img src={GAIA_ICON} alt="Gaia Plant" style={{ width: 240, height: 240 }} />
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

          <button disabled={loading} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            {loading ? "Criando..." : "Criar conta"}
          </button>

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
  const [recoverMsg, setRecoverMsg] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);

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

  async function handleForgotPassword() {
    setRecoverMsg("");
    if (!email) {
      setRecoverMsg("Informe seu e-mail acima para receber o link de recuperação.");
      return;
    }

    setRecoverLoading(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setRecoverMsg("Verifique seu e-mail para redefinir a senha.");
    } catch (err) {
      setRecoverMsg(err?.message || "Erro ao enviar o link de recuperação.");
    } finally {
      setRecoverLoading(false);
    }
  }

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img src={GAIA_ICON} alt="Gaia Plant" style={{ width: 240, height: 240 }} />
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

          <button disabled={loading} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <button
            type="button"
            disabled={recoverLoading}
            onClick={handleForgotPassword}
            className={`${GHOST_BUTTON_CLASS} mt-2 w-full text-sm`}
          >
            {recoverLoading ? "Enviando..." : "Esqueci minha senha"}
          </button>
          {recoverMsg ? (
            <p
              style={{
                marginTop: 8,
                color: recoverMsg.startsWith("Erro") ? "#b00020" : "#2e7d32",
                fontSize: 13,
              }}
            >
              {recoverMsg}
            </p>
          ) : null}

          <Link
            to="/conteudos"
            className={`${GHOST_BUTTON_CLASS} inline-flex items-center justify-center w-full mt-2 text-sm no-underline`}
          >
            Entenda mais antes de se cadastrar
          </Link>

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

function ResetPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [linkError, setLinkError] = useState("");
  const [formError, setFormError] = useState("");
  const [loadingLink, setLoadingLink] = useState(true);
  const [formReady, setFormReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const hash = window?.location?.hash ?? "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (!access_token || !refresh_token || type !== "recovery") {
      setLinkError("Link inválido ou expirado. Solicite novamente.");
      setLoadingLink(false);
      return;
    }

    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setLinkError("Não foi possível validar o link. Solicite novamente.");
          return;
        }
        setFormReady(true);
      })
      .catch(() => {
        setLinkError("Não foi possível validar o link. Solicite novamente.");
      })
      .finally(() => {
        setLoadingLink(false);
        const cleanUrl = window.location.pathname + window.location.search;
        if (window?.history?.replaceState) {
          window.history.replaceState(null, document.title, cleanUrl);
        }
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formReady || processing) return;

    setFormError("");

    if (password.length < 8) {
      setFormError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem.");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      nav("/login", { replace: true });
    } catch (err) {
      setFormError(err?.message || "Não foi possível atualizar a senha.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <h2 style={{ marginTop: 0, fontSize: 28 }}>Redefinir senha</h2>
        <p style={{ marginTop: 6, opacity: 0.75 }}>Digite uma nova senha para voltar a acessar sua conta.</p>

        {loadingLink && !linkError ? (
          <p style={{ marginTop: 12, opacity: 0.8 }}>Validando link...</p>
        ) : linkError ? (
          <p style={{ marginTop: 12, color: "#b00020" }}>{linkError}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field label="Nova senha">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
              />
            </Field>

            <Field label="Confirmar senha">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Field>

            {formError ? (
              <p style={{ marginTop: 12, color: "#b00020" }}>{formError}</p>
            ) : null}

            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={
                  processing ||
                  !formReady ||
                  password.length < 8 ||
                  password !== confirmPassword
                }
                className={`${PRIMARY_BUTTON_CLASS} w-full`}
              >
                {processing ? "Atualizando..." : "Atualizar senha"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// -------------------- Gate /start (ProfileGate isolado) --------------------
function ProfileGate({ session, profile, loadingProfile, profileError }) {
  const nav = useNavigate();
  const lastTargetRef = useRef(null);
  const userId = session?.user?.id;

  useEffect(() => {
    if (loadingProfile) return;

    if (!userId) {
      lastTargetRef.current = "/auth";
      nav("/auth", { replace: true });
      return;
    }

    if (profileError) {
      logWarn("profile_gate_error", { message: String(profileError?.message || profileError) });
      return;
    }

    const target = getNextRoute(profile);
    if (!target || target === lastTargetRef.current) return;

    lastTargetRef.current = target;
    nav(target, { replace: true });
  }, [loadingProfile, userId, profile, profileError, nav]);

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
  const [cpfError, setCpfError] = useState("");

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

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
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
    return digitsOnly(phoneValue).length >= 10;
  }

  function isValidBirthDateBR(value) {
    const s = String(value || "").trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false;
    const [dd, mm, yyyy] = s.split("/").map((x) => parseInt(x, 10));
    if (!dd || !mm || !yyyy) return false;
    if (yyyy < 1900 || yyyy > new Date().getFullYear()) return false;
    if (mm < 1 || mm > 12) return false;
    const lastDay = new Date(yyyy, mm, 0).getDate();
    if (dd < 1 || dd > lastDay) return false;
    return true;
  }

  function handleCpfBlur() {
    if (!cpf) {
      setCpfError("");
      return;
    }
    setCpfError(isValidCPF(cpf) ? "" : "CPF inválido.");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;

    setMsg("");
    setCpfError("");

    const nameValue = String(fullName || "").trim();
    if (!nameValue) {
      setMsg("Informe seu nome completo.");
      return;
    }

    if (!isValidPhone(phone)) {
      setMsg("Telefone inválido (coloque DDD).");
      return;
    }

    if (!isValidCPF(cpf)) {
      setCpfError("CPF inválido.");
      return;
    }

    const birthValue = String(birthDate || "").trim();
    if (!birthValue || !isValidBirthDateBR(birthValue)) {
      setMsg("Data inválida (DD/MM/AAAA).");
      return;
    }

    const stateValue = String(state || "").trim();
    if (!stateValue) {
      setMsg("Informe o estado.");
      return;
    }

    setSaving(true);
    try {
      const patch = {
        full_name: nameValue,
        phone: String(phone || "").replace(/[^0-9+\s()-]/g, "").trim(),
        cpf: digitsOnly(cpf),
        birth_date: birthValue,
        state: stateValue,
      };
      const fresh = await saveProfileAndReload(userId, patch);
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
            <Input
              value={cpf}
              onChange={(e) => {
                setCpf(formatCPF(e.target.value));
                if (cpfError) setCpfError("");
              }}
              onBlur={handleCpfBlur}
            />
            {cpfError ? (
              <p style={{ marginTop: 4, fontSize: 12, color: "#b00020" }}>{cpfError}</p>
            ) : null}
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

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={saving || Boolean(cpfError) || digitsOnly(cpf).length !== 11}
              className={`${PRIMARY_BUTTON_CLASS} w-full`}
            >
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
      const fresh = await saveProfileAndReload(userId, patch);
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

      <div className="flex gap-2 mt-4">
        <button
          disabled={saving || !canContinue}
          onClick={handleSave}
          type="button"
          className={`${PRIMARY_BUTTON_CLASS} w-full ${saving || !canContinue ? "opacity-60 cursor-not-allowed" : ""}`}
        >
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
    if (!profile) return;

    if (!isPersonalComplete(profile)) {
      nav("/perfil-clinico", { replace: true });
      return;
    }

    if (!isWizardComplete(profile)) {
      nav("/wizard", { replace: true });
      return;
    }

    if (hasConditionsSelected(profile)) {
      nav("/app", { replace: true });
    }
  }, [profile, nav]);

  function toggle(item) {
    setSelectedConditions((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const patch = { conditions: selectedConditions };
      const fresh = await saveProfileAndReload(userId, patch);
      const nextProfile = fresh ?? { ...(profile || {}), ...patch };
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

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => nav("/app", { replace: true })}
            className={GHOST_BUTTON_CLASS}
          >
            Voltar
          </button>
          <button
            disabled={saving || selectedConditions.length === 0}
            onClick={handleSave}
            className={`${PRIMARY_BUTTON_CLASS} flex-1`}
          >
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
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-left`}
              onClick={() => nav("/app/objetivos")}
            >
              Definir objetivo
            </button>
          ) : null}

          {!hasHealth ? (
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-left`}
              onClick={() => nav("/app/saude")}
            >
              Responder triagem de saúde
            </button>
          ) : null}

          {hasHealth && !hasEmotional ? (
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full text-left`}
              onClick={() => nav("/app/emocional")}
            >
              Responder triagem emocional
            </button>
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
            <button
              type="button"
              className={`${PRIMARY_BUTTON_CLASS} w-full`}
              onClick={() => nav("/app/admin/conteudos")}
            >
              Admin
            </button>
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

function PublicConteudos() {
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f8", padding: "24px 16px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", display: "grid", gap: 16 }}>
        <Card>
          <h2 style={{ marginTop: 0 }}>Conteúdos Gaia</h2>
          <p style={{ opacity: 0.8 }}>
            Explore vídeos, e-books e materiais educativos sobre cannabis medicinal sem precisar fazer login.
          </p>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
              <div style={{ fontWeight: 900 }}>Vídeo introdutório</div>
              <div style={{ opacity: 0.75 }}>3 min • Boas práticas para iniciar</div>
            </div>
            <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,0.12)", background: "#fff" }}>
              <div style={{ fontWeight: 900 }}>Guia rápido</div>
              <div style={{ opacity: 0.75 }}>PDF • 5 páginas • Como usar com segurança</div>
            </div>
          </div>
          <Link
            to="/criar-conta"
            className={`${PRIMARY_BUTTON_CLASS} inline-flex items-center justify-center w-full mt-3`}
          >
            Quero cadastrar
          </Link>
        </Card>
      </div>
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

        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={() => nav("/app")} className={GHOST_BUTTON_CLASS}>
            Voltar
          </button>
          <button
            type="button"
            onClick={() => nav("/app/carrinho")}
            className={`${PRIMARY_BUTTON_CLASS} flex-1`}
          >
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

        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className={`${PRIMARY_BUTTON_CLASS} flex-1`}
            onClick={() => nav("/app/produtos")}
          >
            Clique aqui para ver nossos produtos
          </button>
          <button
            type="button"
            className={GHOST_BUTTON_CLASS}
            onClick={() => nav("/app/pagamentos")}
          >
            Ir para pagamentos
          </button>
          {items.length > 0 ? (
            <button type="button" className={GHOST_BUTTON_CLASS} onClick={clearCart}>
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
            <button type="button" className={PRIMARY_BUTTON_CLASS}>Abrir chat</button>
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
      <button
        type="button"
        className={`${PRIMARY_BUTTON_CLASS} w-full mt-3`}
        onClick={() => nav("/app/medicos")}
      >
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
      <button
        type="button"
        className={`${PRIMARY_BUTTON_CLASS} w-full mt-3`}
        onClick={() => nav("/app/produtos")}
      >
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

const HEALTH_FIELDS = [
  { key: "cabeca_intensa", label: "Dores de cabeça intensas", placeholder: "Frequência e intensidade" },
  { key: "alimentacao", label: "Problemas com alimentação", placeholder: "Quanto tempo, e qual o problema?" },
  { key: "acorda_cansado", label: "Acorda cansado?", placeholder: "Com que frequência?" },
  { key: "fuma", label: "Você fuma?", placeholder: "Com que frequência?" },
  { key: "alcool", label: "Uso de bebidas alcoólicas", placeholder: "Frequência e tipo de bebida" },
  { key: "ja_usou_cannabis", label: "Já usou cannabis?", placeholder: "Com que frequência? Há quanto tempo?" },
  { key: "arritmia", label: "Possui arritmia cardíaca?", placeholder: "Detalhe (se souber)" },
  { key: "psicose", label: "Histórico de psicose / esquizofrenia?", placeholder: "Explique brevemente" },
  { key: "tratamento_atual", label: "Faz algum tratamento?", placeholder: "Qual tratamento?" },
  { key: "usa_remedios", label: "Uso frequente de remédios?", placeholder: "Quais e com que frequência?" },
  { key: "doenca_cronica", label: "Possui doença crônica?", placeholder: "Qual?" },
  { key: "cirurgia", label: "Fez alguma cirurgia?", placeholder: "Qual e quando?" },
  { key: "alergia", label: "Possui alergia?", placeholder: "Qual alergia?" },
];

const EMOTIONAL_FIELDS = [
  { key: "tristeza", label: "Sente tristeza constante?", placeholder: "Com qual frequência e motivo?" },
  { key: "foco", label: "Perde o foco facilmente?", placeholder: "Especifique" },
  { key: "memoria", label: "Tem problemas de memória?", placeholder: "Há quanto tempo e intensidade?" },
  { key: "irritado_triste", label: "Fica irritado ou triste facilmente?", placeholder: "Com que frequência?" },
  { key: "estresse", label: "Tem problemas com estresse?", placeholder: "Quais os motivos?" },
  { key: "panico", label: "Já teve episódios de pânico?", placeholder: "Frequência e há quanto tempo?" },
  { key: "diagnostico_psicose", label: "Teve diagnóstico de esquizofrenia ou psicose?", placeholder: "Há quanto tempo?" },
  { key: "familia_psicose", label: "Parente próximo com esquizofrenia ou psicose?", placeholder: "Qual parente?" },
  { key: "diagnostico_ans_depr", label: "Já teve diagnóstico de ansiedade ou depressão?", placeholder: "Há quanto tempo?" },
];

const TriageNote = React.memo(function TriageNote({ initialValue, placeholder, disabled, onCommit }) {
  const ref = useRef(null);
  const latestRef = useRef(initialValue || "");

  // If the stored value changes externally, update the textarea ONLY when it's not focused
  useEffect(() => {
    latestRef.current = initialValue || "";
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.value = latestRef.current;
  }, [initialValue]);

  return (
    <textarea
      ref={ref}
      defaultValue={initialValue || ""}
      onChange={(e) => {
        latestRef.current = e.target.value;
      }}
      onBlur={() => onCommit(latestRef.current)}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      className={`${INPUT_CLASS} resize-none`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    />
  );
});

function TriageEditor({ title, subtitle, fields, value, onToggle, onNote, saving }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {subtitle ? <p style={{ opacity: 0.75, marginTop: 6 }}>{subtitle}</p> : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {fields.map((f) => {
          const row = value?.[f.key] ?? { on: false, note: "" };
          const active = Boolean(row.on);

          return (
            <div
              key={f.key}
              style={{
                padding: 14,
                borderRadius: 16,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "#fff",
              }}
            >
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
                  <TriageNote
                    initialValue={row.note || ""}
                    placeholder={f.placeholder}
                    disabled={saving}
                    onCommit={(txt) => onNote(f.key, txt)}
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

      const fresh = await saveProfileAndReload(userId, patch);
      onProfileSaved?.(fresh);
      setMsg("✅ Perfil atualizado com sucesso.");
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = !saving;


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

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!canSave}
              className={`${PRIMARY_BUTTON_CLASS} flex-1`}
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

                  const fresh = await saveProfileAndReload(userId, patch);
                  onProfileSaved?.(fresh);
                  nav("/app", { replace: true });
                } catch (err) {
                  setMsg(err?.message || "Erro ao salvar perfil.");
                } finally {
                  setSaving(false);
                }
              }}
              className={`${GHOST_BUTTON_CLASS} flex-1`}
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
        saving={saving}
      />

      <TriageEditor
        title="Triagem emocional"
        subtitle="Escolha o que faz sentido e detalhe quando quiser."
        fields={emotionalFields}
        value={emotionalTriage}
        onToggle={(k) => () => toggleTriage(setEmotionalTriage, k)}
        onNote={(k, v) => setTriageNote(setEmotionalTriage, k, v)}
        saving={saving}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Meu histórico</h2>
            <p style={{ opacity: 0.75, margin: 0 }}>Resumo do que você respondeu.</p>
          </div>
          <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => nav("/app", { replace: true })}>
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

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            className={`${PRIMARY_BUTTON_CLASS} flex-1`}
            onClick={() => nav("/app/produtos")}
          >
            Ir para Produtos
          </button>
          <button
            type="button"
            className={GHOST_BUTTON_CLASS}
            onClick={() => nav("/app/pagamentos")}
          >
            Ir para Pagamentos
          </button>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 6 }}>Admin • Conteúdos</h2>
            <p style={{ opacity: 0.75, margin: 0 }}>
              Envie vídeos, e‑books e arquivos para download via Supabase Storage.
            </p>
          </div>
          <button type="button" className={GHOST_BUTTON_CLASS} onClick={() => nav("/app/conteudos")}>Voltar</button>
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

          <button type="submit" disabled={busy} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Arquivos no bucket</h3>
          <button
            type="button"
            className={GHOST_BUTTON_CLASS}
            disabled={busy}
            onClick={() => setRefreshKey((k) => k + 1)}
          >
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
                      className={`${PRIMARY_BUTTON_CLASS} inline-flex items-center no-underline`}
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
      const fresh = await saveProfileAndReload(userId, { main_goal: titulo });
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
        className={`${PRIMARY_BUTTON_CLASS} w-full mt-3`}
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
      const fresh = await saveProfileAndReload(userId, patch);
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

      <TriageEditor
        title="Triagem de saúde"
        subtitle="Toque em um item para ativar/desativar. Quando ativo, você pode escrever detalhes abaixo."
        fields={HEALTH_FIELDS}
        value={answers}
        onToggle={(key) => () => toggle(key)}
        onNote={(key, value) => setNote(key, value)}
        saving={saving}
      />

      <button
        type="button"
        onClick={handleNext}
        disabled={saving}
        className={`${PRIMARY_BUTTON_CLASS} w-full mt-4`}
      >
        {saving ? "Salvando..." : "Próximo"}
      </button>

      {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
    </div>
  );
}

// -------------------- Emocional (questionário) --------------------
function EmotionalTriage({ session, profile, onProfileSaved }) {
  const nav = useNavigate();
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

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
      const fresh = await saveProfileAndReload(userId, patch);
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

      <TriageEditor
        title="Triagem emocional"
        subtitle="Escolha o que faz sentido e detalhe quando quiser."
        fields={EMOTIONAL_FIELDS}
        value={answers}
        onToggle={(key) => () => toggle(key)}
        onNote={(key, value) => setNote(key, value)}
        saving={saving}
      />

      <button
        type="button"
        onClick={handleNext}
        disabled={saving}
        className={`${PRIMARY_BUTTON_CLASS} w-full mt-4`}
      >
        {saving ? "Salvando..." : "Próximo"}
      </button>

      {msg ? <p style={{ marginTop: 12, color: "#b00020" }}>{msg}</p> : null}
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
      const fresh = await saveProfileAndReload(userId, patch);
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
          className={`${PRIMARY_BUTTON_CLASS} w-full mt-3`}
        >
          {saving ? "Salvando..." : "Salvar e continuar"}
        </button>

        <button
          type="button"
          onClick={() => nav("/app/emocional", { replace: true })}
          disabled={saving}
          className={`${GHOST_BUTTON_CLASS} w-full mt-3`}
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
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => nav(0)}>
            Tentar novamente
          </button>
          <Link to="/auth" className={`${GHOST_BUTTON_CLASS} inline-flex items-center no-underline`}>
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
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return;
    }

    setLoadingProfile(true);
    fetchMyProfile(session.user.id)
      .then((p) => setProfile(p))
      .catch((e) => setProfileError(e))
      .finally(() => setLoadingProfile(false));
  }, [session]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={session ? "/start" : "/auth"} replace />} />

      <Route path="/auth" element={<Welcome />} />
      <Route path="/conteudos" element={<PublicConteudos />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/criar-conta" element={<Signup />} />

      <Route
        path="/start"
        element={
          <ProfileGate
            session={session}
            profile={profile}
            loadingProfile={loadingProfile}
            profileError={profileError}
          />
        }
      />

      <Route
        path="/perfil-clinico"
        element={
          <ClinicalProfile
            session={session}
            profile={profile}
            onProfileSaved={setProfile}
          />
        }
      />

      <Route
        path="/wizard"
        element={
          <Wizard
            session={session}
            profile={profile}
            onProfileSaved={setProfile}
          />
        }
      />

      <Route
        path="/patologias"
        element={
          <Patologias
            session={session}
            profile={profile}
            onProfileSaved={setProfile}
          />
        }
      />

      <Route element={<Layout />}>
        <Route path="/app">
          <Route index element={<AppDashboard session={session} profile={profile} />} />
          <Route path="perfil" element={<div style={{ padding: 20 }}>PERFIL ROTA OK</div>} />
          <Route path="historico" element={<Historico profile={profile} />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="carrinho" element={<Carrinho />} />
          <Route path="pagamentos" element={<Pagamentos />} />
          <Route path="conteudos" element={<Conteudos session={session} isAdmin={isAdmin} />} />
          <Route path="medicos" element={<Medicos />} />
          <Route path="receitas" element={<Receitas />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="alertas" element={<AlertasUso />} />
          <Route path="saude" element={<HealthTriage session={session} profile={profile} onProfileSaved={setProfile} />} />
          <Route path="emocional" element={<EmotionalTriage session={session} profile={profile} onProfileSaved={setProfile} />} />
          <Route path="emocional/sintomas" element={<EmotionalSymptoms session={session} profile={profile} onProfileSaved={setProfile} />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
