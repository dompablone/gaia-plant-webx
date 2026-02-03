// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { supabase, SUPABASE_ENV_OK, SUPABASE_ENV_ERROR } from "./lib/supabase.js";
import { fetchMyProfile, upsertMyProfile } from "./lib/profileApi.js";
import { logWarn } from "./lib/telemetry.js";
import { normalizeTriage, isPersonalComplete, isWizardComplete, hasConditionsSelected, getNextRoute } from "./lib/triage.js";
import { styles } from "./styles/inlineStyles.js";
import { GAIA_ICON, PRIMARY_BUTTON_CLASS, GHOST_BUTTON_CLASS, INPUT_CLASS } from "./lib/constants/ui.js";
import Card from "./components/ui/Card.jsx";
import AppDashboard from "./pages/app/AppDashboard.jsx";
import Perfil from "./pages/app/Perfil.jsx";
import Medicos from "./pages/app/Medicos.jsx";
import Layout from "./components/Layout.jsx";
import SelectButton from "./components/ui/SelectButton.jsx";
console.log("APP BOOT");
console.log("SUPABASE INIT", import.meta.env.VITE_SUPABASE_URL);
// -------------------- Helpers --------------------
async function saveProfileAndReload(userId, patch) {
  await upsertMyProfile(userId, patch);
  return await fetchMyProfile(userId);
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
// -------------------- Favorites (MVP: localStorage) --------------------
const FAVORITES_STORAGE_KEY = "gaia.favorites.items";

function readFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeFavorites(items) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items || []));
  } catch {}
}

function toggleFavorite(productId) {
  const current = readFavorites();
  const set = new Set(current);
  if (set.has(productId)) set.delete(productId);
  else set.add(productId);
  const next = Array.from(set);
  writeFavorites(next);
  return next;
}

function isFavorite(productId) {
  return readFavorites().includes(productId);
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

// -------------------- Auth Pages --------------------
function EmailConfirmado() {
  return (
    <div style={styles.authPage}>
      <div style={styles.authCard}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img src={GAIA_ICON} alt="Gaia Plant" style={{ width: 180, height: 180 }} />
          <h2 style={styles.authTitle}>E-mail confirmado ✅</h2>
          <p style={styles.authSubtitle}>
            Sua conta foi confirmada com sucesso. Agora você já pode entrar na Gaia Plant.
          </p>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Link to="/login" className="gaia-btn gaia-btn-primary gaia-btn-block">
            Voltar para o login
          </Link>
          <Link to="/auth" className="gaia-btn gaia-btn-ghost gaia-btn-block">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
function Welcome() {
  return (
    <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "center", padding: "20px 16px" }}>
      <Card>
        <div style={{ textAlign: "center" }}>
          <img src={GAIA_ICON} alt="Gaia Plant" style={{ width: 220, height: "auto", marginBottom: 10 }} />
          <p style={{ opacity: 0.75, marginTop: 8 }}>
            Faça login ou crie uma conta para continuar.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", marginTop: 14 }}>
          <Link to="/login" className="gaia-btn gaia-btn-primary gaia-btn-block">
            Já tenho conta
          </Link>
          <Link
            to="/criar-conta"
            className="gaia-btn gaia-btn-outline gaia-btn-block"
            style={{ color: "#111" }}
          >
            Criar conta
          </Link>
          <Link to="/conteudos" className="gaia-btn gaia-btn-mist gaia-btn-block">
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

          <Link to="/conteudos" className="gaia-btn gaia-btn-ghost gaia-btn-block mt-2">
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

    let cancelled = false;

    (async () => {
      try {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (cancelled) return;

        if (error) {
          setLinkError("Não foi possível validar o link. Solicite novamente.");
          return;
        }

        setFormReady(true);
      } catch {
        if (!cancelled) {
          setLinkError("Não foi possível validar o link. Solicite novamente.");
        }
      } finally {
        if (cancelled) return;

        setLoadingLink(false);
        const cleanUrl = window.location.pathname + window.location.search;
        if (window?.history?.replaceState) {
          window.history.replaceState(null, document.title, cleanUrl);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
// -------------------- GlobalLoading --------------------
function GlobalLoading({ title = "Carregando…", subtitle = "", onRetry, onGoLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f8", padding: "24px 16px", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: 16, boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "3px solid rgba(0,0,0,0.12)",
                borderTopColor: "#43a047",
                animation: "gaiaSpin 0.9s linear infinite",
              }}
            />
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
              {subtitle ? <div style={{ opacity: 0.75, fontSize: 13 }}>{subtitle}</div> : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {typeof onRetry === "function" ? (
              <button type="button" onClick={onRetry} className={GHOST_BUTTON_CLASS}>
                Tentar novamente
              </button>
            ) : null}
            {typeof onGoLogin === "function" ? (
              <button type="button" onClick={onGoLogin} className={PRIMARY_BUTTON_CLASS}>
                Ir para login
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 10, opacity: 0.65, fontSize: 12 }}>
            Se isso persistir, atualize a página ou faça login novamente.
          </div>
        </div>
      </div>

      <style>{`@keyframes gaiaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// -------------------- Gate /start (ProfileGate isolado) --------------------
function ProfileGate({ session, profile, loadingProfile, profileError }) {
  const nav = useNavigate();

  if (loadingProfile) {
    return <div style={{ padding: 20 }}>Carregando perfil…</div>;
  }

  if (!session?.user) {
    return <Navigate to="/auth" replace />;
  }

  if (profileError) {
    return (
      <Card>
        <h3>Erro ao carregar perfil</h3>
        <p>{String(profileError)}</p>
        <button onClick={() => nav(0)}>Tentar novamente</button>
      </Card>
    );
  }

  if (!profile || !isPersonalComplete(profile)) {
    return <Navigate to="/perfil-clinico" replace />;
  }

  if (!isWizardComplete(profile)) {
    return <Navigate to="/wizard" replace />;
  }

  if (!hasConditionsSelected(profile)) {
    return <Navigate to="/patologias" replace />;
  }

  return <Navigate to="/app" replace />;
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

    if (!userId) {
      setMsg("Sessão inválida. Faça login novamente.");
      return;
    }

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
      await upsertMyProfile(userId, patch);
const fresh = await fetchMyProfile(userId);
      onProfileSaved?.(fresh);
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

  const [mainGoal, setMainGoal] = useState(profile?.main_goal ?? "");

  const parseReason = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return String(value)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const [selectedReasons, setSelectedReasons] = useState(() => new Set(parseReason(profile?.main_reason)));

  useEffect(() => {
    setSelectedReasons(new Set(parseReason(profile?.main_reason)));
  }, [profile?.main_reason]);

  function toggleReason(label) {
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const goals = useMemo(
    () => [
      { key: "Melhora do Sono", sub: "Ajuda para dormir e manter o descanso." },
      { key: "Mais Calma", sub: "Controle da agitação e do nervosismo diário." },
      { key: "Aumento do Foco", sub: "Mais concentração nas suas atividades." },
      { key: "Alzheimer", sub: "Suporte para memória, rotina e qualidade de vida." },
      { key: "Menos Estresse", sub: "Melhora do estresse e exaustão diária." },
      { key: "Burnout", sub: "Exaustão mental e emocional (rotina e recuperação)." },
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
    if (saving) return;

    setSaving(true);
    setMsg("");

    if (!userId) {
      setMsg("Sessão inválida. Faça login novamente.");
      setSaving(false);
      return;
    }

    const ok = Boolean(mainGoal && selectedReasons.size > 0);
    if (!ok) {
      setMsg("Preencha todas as informações para continuar.");
      setSaving(false);
      return;
    }

    try {
      const patch = {
        main_goal: mainGoal,
        main_reason: Array.from(selectedReasons).join(", "),
      };
      const fresh = await saveProfileAndReload(userId, patch);
      onProfileSaved?.(fresh);
      nav("/patologias", { replace: true });
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar wizard.");
    } finally {
      setSaving(false);
    }
  }

  const canContinue = Boolean(mainGoal && selectedReasons.size > 0);

  const reasonOptions = ["Saúde", "Bem-estar", "Curiosidade", "Lazer", "Outro"];
  const progress = canContinue ? 100 : mainGoal ? 66 : 33;

  return (
    <div style={{ minHeight: "100vh", background: "#f6f7f8", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <Card>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>Onboarding</div>
              <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800 }}>Passo 2 de 3</div>
            </div>

            <div style={{ height: 10, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#16a34a",
                  borderRadius: 999,
                  transition: "width 240ms ease",
                }}
              />
            </div>

            <div style={{ marginTop: 6 }}>
              <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.15 }}>Só mais um passo</h2>
              <p style={{ marginTop: 8, marginBottom: 0, opacity: 0.75 }}>
                Isso ajuda a personalizar recomendações.
              </p>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ margin: "0 0 10px" }}>Objetivos mais procurados</h3>
              <div style={{ display: "grid", gap: 10 }}>
                {goals.map((g) => {
                  const active = mainGoal === g.key;
                  return (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => setMainGoal(g.key)}
                      disabled={saving}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 14,
                        borderRadius: 16,
                        border: active ? "2px solid #16a34a" : "1px solid rgba(15,23,42,0.14)",
                        background: active ? "rgba(22,163,74,0.10)" : "#fff",
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>{g.key}</div>
                          <div style={{ opacity: 0.75, fontSize: 13 }}>{g.sub}</div>
                        </div>
                        <div
                          style={{
                            marginTop: 2,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            border: active ? "6px solid #16a34a" : "2px solid rgba(15,23,42,0.18)",
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h3 style={{ margin: "0 0 10px" }}>Qual é o principal motivo?</h3>
              <p style={{ marginTop: 0, marginBottom: 10, opacity: 0.7, fontSize: 13 }}>
                Você pode selecionar mais de um.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {reasonOptions.map((m) => {
                  const active = selectedReasons.has(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleReason(m)}
                      disabled={saving}
                      className={`gaia-btn ${active ? "gaia-btn-primary" : "gaia-btn-outline"}`}
                      style={{ padding: "10px 14px" }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <button
                disabled={saving || !canContinue}
                onClick={handleSave}
                type="button"
                className={`gaia-btn gaia-btn-primary gaia-btn-block ${saving || !canContinue ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {saving ? "Salvando..." : "Continuar"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => nav("/perfil-clinico", { replace: true })}
                className="gaia-btn gaia-btn-ghost gaia-btn-block"
              >
                Voltar
              </button>
            </div>

            {msg ? <p style={{ marginTop: 6, color: "#b00020" }}>{msg}</p> : null}
          </div>
        </Card>
      </div>
    </div>
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
    if (saving) return;

    setSaving(true);
    setMsg("");

    if (!userId) {
      setMsg("Sessão inválida. Faça login novamente.");
      setSaving(false);
      return;
    }

    if (!Array.isArray(selectedConditions) || selectedConditions.length === 0) {
      setMsg("Selecione pelo menos uma opção para continuar.");
      setSaving(false);
      return;
    }

    try {
      const patch = { conditions: selectedConditions };
      const fresh = await saveProfileAndReload(userId, patch);
      const nextProfile = fresh ?? { ...(profile || {}), ...patch };
      onProfileSaved?.(nextProfile);
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
            onClick={() => nav("/wizard", { replace: true })}
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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={GHOST_BUTTON_CLASS}
              onClick={() => nav("/app", { replace: true })}
            >
              Voltar
            </button>

            {admin ? (
              <button
                type="button"
                className={PRIMARY_BUTTON_CLASS}
                onClick={() => nav("/app/admin/conteudos", { replace: true })}
              >
                Admin
              </button>
            ) : null}
          </div>
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
  const [, forceFavRefresh] = useState(0);

  useEffect(() => {
    const onFav = () => forceFavRefresh((x) => x + 1);
    window.addEventListener("gaia:favorites", onFav);
    return () => window.removeEventListener("gaia:favorites", onFav);
  }, []);

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
          {oils.map((oil) => {
            const favoriteId = oil.id ?? oil.title;
            const favorite = isFavorite(favoriteId);
            return (
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{oil.title}</div>
                  <button
                    type="button"
                    className="gaia-btn gaia-btn-ghost"
                    style={{
                      width: 44,
                      height: 44,
                      minWidth: 44,
                      borderRadius: 999,
                      padding: 0,
                      fontSize: 18,
                    }}
                    aria-label="Favoritar produto"
                    title={favorite ? "Remover dos favoritos" : "Marcar como favorito"}
                    aria-pressed={favorite}
                    onClick={() => {
                      toggleFavorite(favoriteId);
                      window.dispatchEvent(new Event("gaia:favorites"));
                    }}
                  >
                    {favorite ? "⭐️" : "☆"}
                  </button>
                </div>
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
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Pagamentos() {
  const nav = useNavigate();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card>
        <h2 style={{ marginTop: 0 }}>Pagamentos</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>
          Checkout (placeholder). Aqui vamos integrar Pix, cartão e Mercado Pago.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={() => nav("/app", { replace: true })} className={GHOST_BUTTON_CLASS}>
            Voltar
          </button>
        </div>
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
  { key: "doenca_autoimune", label: "Possui doença autoimune?", placeholder: "Se quiser, especifique qual(is) e há quanto tempo." },
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

function Historico({ profile }) {
  const nav = useNavigate();
  const [favorites, setFavorites] = useState(() => readFavorites());

  useEffect(() => {
    const onFav = () => setFavorites(readFavorites());
    window.addEventListener("gaia:favorites", onFav);
    return () => window.removeEventListener("gaia:favorites", onFav);
  }, []);

  const health = normalizeTriage(profile?.health_triage);
  const emo = normalizeTriage(profile?.emotional_triage);

  // Produtos (MVP): lemos de onboarding_answers.products para não depender de novas colunas
  const products = profile?.onboarding_answers?.products || {};
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

      <Card>
        <h3 style={{ marginTop: 0 }}>Favoritos</h3>

        {favorites.length === 0 ? (
          <p style={{ opacity: 0.75, marginTop: 8 }}>Você ainda não marcou nenhum produto como favorito.</p>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {favorites.map((id) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: 800 }}>{id}</div>
                <button
                  type="button"
                  className="gaia-btn gaia-btn-ghost"
                  style={{ width: 44, height: 44, minWidth: 44, borderRadius: 999, padding: 0, fontSize: 18 }}
                  aria-label="Remover dos favoritos"
                  title="Remover dos favoritos"
                  onClick={() => {
                    toggleFavorite(id);
                    window.dispatchEvent(new Event("gaia:favorites"));
                  }}
                >
                  ★
                </button>
              </div>
            ))}

            <Link to="/app/produtos" className="gaia-link" style={{ marginTop: 6 }}>
              Ver produtos
            </Link>
          </div>
        )}
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
      { titulo: "Alzheimer", descricao: "Suporte para memória, rotina e qualidade de vida." },
      { titulo: "Menos Estresse", descricao: "Melhora do estresse e exaustão diária." },
      { titulo: "Burnout", descricao: "Exaustão mental e emocional (rotina e recuperação)." },
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

// -------------------- App (carrega session/profile + rotas) --------------------
export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  if (!SUPABASE_ENV_OK) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          background: "#f6f7f8",
        }}
      >
        <Card>
          <h2 style={{ marginTop: 0 }}>Configuração necessária</h2>
          <p style={{ opacity: 0.8, lineHeight: 1.5 }}>{SUPABASE_ENV_ERROR}</p>
          <p style={{ opacity: 0.7, fontSize: 13 }}>
            Depois de configurar as variáveis na Vercel, faça um Redeploy.
          </p>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data?.session ?? null);
      })
      .finally(() => {
        setSessionLoading(false);
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

  if (sessionLoading) {
    return <div style={{ padding: 12, color: "#2f5d36" }}>Carregando…</div>;
  }

  return (
    <Routes>
  {/* ================= ROTAS PÚBLICAS ================= */}
  <Route element={<AuthLayout />}>
    <Route index element={<Welcome />} />
    <Route path="/email-confirmado" element={<EmailConfirmado />} />
    <Route path="/auth" element={<Welcome />} />
    <Route path="/login" element={<Login />} />
    <Route path="/criar-conta" element={<Signup />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/conteudos" element={<PublicConteudos />} />
  </Route>

  {/* ================= FLUXO DE ONBOARDING ================= */}
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

  {/* ================= APP LOGADO ================= */}
  <Route element={<Layout />}>
    <Route path="/app" element={<Layout />}>
      <Route index element={<AppDashboard session={session} profile={profile} />} />
      <Route path="perfil" element={<Perfil session={session} profile={profile} onProfileSaved={setProfile} />} />
      <Route path="historico" element={<Historico profile={profile} />} />
      <Route path="produtos" element={<Produtos />} />
      <Route path="carrinho" element={<Carrinho />} />
      <Route path="pagamentos" element={<Pagamentos />} />
      <Route path="conteudos" element={<Conteudos session={session} isAdmin={isAdmin} />} />
      <Route path="medicos" element={<Medicos />} />
      <Route path="receitas" element={<Receitas />} />
      <Route path="pedidos" element={<Pedidos />} />
      <Route path="alertas" element={<AlertasUso />} />
      <Route
        path="saude"
        element={<HealthTriage session={session} profile={profile} onProfileSaved={setProfile} />}
      />
      <Route
        path="emocional"
        element={<EmotionalTriage session={session} profile={profile} onProfileSaved={setProfile} />}
      />
      <Route
        path="emocional/sintomas"
        element={<EmotionalSymptoms session={session} profile={profile} onProfileSaved={setProfile} />}
      />
    </Route>
  </Route>

  {/* ================= FALLBACK ================= */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
);
}
