import React, { useEffect, useRef, useState } from "react";

import Card from "../../components/ui/Card.jsx";
import SelectButton from "../../components/ui/SelectButton.jsx";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "../../lib/constants/ui.js";
import { fetchMyProfile, upsertMyProfile } from "../../lib/profileApi.js";
import { normalizeTriage } from "../../lib/triage.js";

const AGE_RANGES = [
  { value: "18-24", label: "18-24" },
  { value: "25-34", label: "25-34" },
  { value: "35-44", label: "35-44" },
  { value: "45-54", label: "45-54" },
  { value: "55+", label: "55+" },
];

const GOAL_OPTIONS = [
  { value: "Melhora do Sono", label: "Melhora do Sono" },
  { value: "Mais Calma", label: "Mais Calma" },
  { value: "Aumento do Foco", label: "Aumento do Foco" },
  { value: "Menos Estresse", label: "Menos Estresse" },
  { value: "Controle da Ansiedade", label: "Controle da Ansiedade" },
  { value: "Dor Crônica", label: "Dor Crônica" },
  { value: "Melhora no Esporte", label: "Melhora no Esporte" },
  { value: "Aumento da Libido", label: "Aumento da Libido" },
  { value: "Enxaqueca", label: "Enxaqueca" },
  { value: "Controle da TPM", label: "Controle da TPM" },
];

const HEALTH_FIELDS = [
  { key: "cabeca_intensa", label: "Dores de cabeça intensas", placeholder: "Frequência e intensidade" },
  { key: "alimentacao", label: "Problemas com alimentação", placeholder: "Quanto tempo, e qual o problema?" },
  { key: "acorda_cansado", label: "Acorda cansado?", placeholder: "Com que frequência?" },
  { key: "fuma", label: "Você fuma?", placeholder: "Com que frequência?" },
  { key: "alcool", label: "Uso de bebidas alcoólicas", placeholder: "Frequência e tipo de bebida" },
  { key: "ja_usou_cannabis", label: "Já usou cannabis?", placeholder: "Com que frequência? Há quanto tempo?" },
  { key: "arritmia", label: "Possui arritmia cardíaca?", placeholder: "Detalhe (se souber)" },
  { key: "psicose", label: "Histórico de psicose / esquizofrenia?", placeholder: "Explique brevemente" },
];

const EMOTIONAL_FIELDS = [
  { key: "tristeza", label: "Sente tristeza constante?", placeholder: "Com qual frequência e motivo?" },
  { key: "foco", label: "Perde o foco facilmente?", placeholder: "Especifique" },
  { key: "memoria", label: "Tem problemas de memória?", placeholder: "Há quanto tempo e intensidade?" },
  { key: "estresse", label: "Tem problemas com estresse?", placeholder: "Quais os motivos?" },
];

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
  return <input {...rest} style={style} className={`${INPUT_CLASS} ${className}`} />;
}

const TriageNote = React.memo(function TriageNote({ initialValue, placeholder, disabled, onCommit }) {
  const ref = useRef(null);
  const latest = useRef(initialValue || "");

  useEffect(() => {
    latest.current = initialValue || "";
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.value = latest.current;
  }, [initialValue]);

  return (
    <textarea
      ref={ref}
      defaultValue={initialValue || ""}
      onChange={(e) => {
        latest.current = e.target.value;
      }}
      onBlur={() => onCommit(latest.current)}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      className={`${INPUT_CLASS} resize-none`}
    />
  );
});

function TriageEditor({ title, fields, value, onToggle, onNote, saving }) {
  return (
    <Card>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

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
                onClick={() => onToggle(f.key)}
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

export default function Perfil({ session, profile, onProfileSaved }) {
  const userId = session?.user?.id;

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "+55 ");
  const [cpf, setCpf] = useState(profile?.cpf ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [state, setState] = useState(profile?.state ?? "");

  const [ageRange, setAgeRange] = useState(profile?.age_range ?? "");
  const [mainReason, setMainReason] = useState(profile?.main_reason ?? "");
  const [mainGoal, setMainGoal] = useState(profile?.main_goal ?? "");

  const [healthTriage, setHealthTriage] = useState(() => normalizeTriage(profile?.health_triage));
  const [emotionalTriage, setEmotionalTriage] = useState(() => normalizeTriage(profile?.emotional_triage));

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "+55 ");
    setCpf(profile.cpf ?? "");
    setBirthDate(profile.birth_date ?? "");
    setState(profile.state ?? "");
    setAgeRange(profile.age_range ?? "");
    setMainGoal(profile.main_goal ?? "");
    setMainReason(profile.main_reason ?? "");
    setHealthTriage(normalizeTriage(profile.health_triage));
    setEmotionalTriage(normalizeTriage(profile.emotional_triage));
  }, [profile]);

  async function saveProfileAndReload(id, patch) {
    await upsertMyProfile(id, patch);
    return await fetchMyProfile(id);
  }

  function toggleField(setter, key) {
    setter((prev) => {
      const current = prev[key] ?? { on: false, note: "" };
      const nextOn = !current.on;
      return { ...prev, [key]: { ...current, on: nextOn, note: nextOn ? current.note : "" } };
    });
  }

  function setFieldNote(setter, key, note) {
    setter((prev) => {
      const current = prev[key] ?? { on: false, note: "" };
      return { ...prev, [key]: { ...current, note } };
    });
  }

  function countActive(triage) {
    return Object.values(triage || {}).filter((row) => row?.on).length;
  }

  function calculateAge(value) {
    if (!value) return null;
    const [dd, mm, yyyy] = value.split("/").map((p) => parseInt(p, 10));
    if (!dd || !mm || !yyyy) return null;
    const birth = new Date(yyyy, mm - 1, dd);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setMsg("");

    setSaving(true);
    try {
      const patch = {
        full_name: String(fullName || "").trim(),
        phone: String(phone || "").trim(),
        cpf: String(cpf || "").trim(),
        birth_date: String(birthDate || "").trim(),
        state: String(state || "").trim() || null,
        age_range: ageRange || null,
        main_reason: mainReason || null,
        main_goal: mainGoal || null,
        health_triage: healthTriage,
        emotional_triage: emotionalTriage,
      };
      const fresh = await saveProfileAndReload(userId, patch);
      onProfileSaved?.(fresh);
      setMsg("✅ Perfil atualizado.");
    } catch (err) {
      setMsg(err?.message || "Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  }

  const conditionCount = Array.isArray(profile?.conditions) ? profile.conditions.length : 0;
  const healthActiveCount = countActive(healthTriage);
  const emotionalActiveCount = countActive(emotionalTriage);
  const age = calculateAge(birthDate);

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        display: "grid",
        gap: 16,
        padding: "20px 16px",
        width: "100%",
      }}
    >
      <Card>
        <h2 style={{ marginTop: 0 }}>Meu perfil</h2>
        <p style={{ opacity: 0.75, marginTop: 6 }}>Dados pessoais e clínicos em um só lugar.</p>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <div>Nome: {fullName || "—"}</div>
          <div>CPF: {cpf || "—"}</div>
          <div>Telefone: {phone || "—"}</div>
          <div>Data de nascimento: {birthDate || "—"}</div>
          <div>Idade: {age !== null ? `${age} anos` : "—"}</div>
          <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
            Condições selecionadas: {conditionCount} • Saúde ativa: {healthActiveCount} • Emocional ativo:{" "}
            {emotionalActiveCount}
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Dados pessoais</h3>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Field label="Nome completo">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="CPF">
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
          </Field>
          <Field label="Data de nascimento">
            <Input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </Field>
          <Field label="Estado">
            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0 }}>Informações clínicas</h3>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <Field label="Faixa etária">
            <SelectButton value={ageRange} onChange={setAgeRange} options={AGE_RANGES} />
          </Field>
          <Field label="Motivo principal">
            <Input
              value={mainReason}
              onChange={(e) => setMainReason(e.target.value)}
              placeholder="Ex: Saúde, bem-estar, curiosidade..."
            />
          </Field>
          <Field label="Objetivo principal">
            <SelectButton value={mainGoal} onChange={setMainGoal} options={GOAL_OPTIONS} />
          </Field>
        </div>
      </Card>

      <TriageEditor
        title="Triagem de saúde"
        fields={HEALTH_FIELDS}
        value={healthTriage}
        onToggle={(key) => toggleField(setHealthTriage, key)}
        onNote={(key, note) => setFieldNote(setHealthTriage, key, note)}
        saving={saving}
      />

      <TriageEditor
        title="Triagem emocional"
        fields={EMOTIONAL_FIELDS}
        value={emotionalTriage}
        onToggle={(key) => toggleField(setEmotionalTriage, key)}
        onNote={(key, note) => setFieldNote(setEmotionalTriage, key, note)}
        saving={saving}
      />

      <button type="button" disabled={saving} className={PRIMARY_BUTTON_CLASS} onClick={handleSave}>
        {saving ? "Salvando..." : "Salvar perfil"}
      </button>

      {msg ? <div style={{ color: "#2e7d32", fontSize: 13 }}>{msg}</div> : null}
    </div>
  );
}
