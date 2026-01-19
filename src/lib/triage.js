export function normalizeTriage(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "boolean") out[k] = { on: v, note: "" };
    else if (v && typeof v === "object") out[k] = { on: Boolean(v.on), note: String(v.note ?? "") };
  }
  return out;
}

export function isPersonalComplete(p) {
  return Boolean(p?.full_name && p?.phone && p?.cpf && p?.birth_date);
}

export function isWizardComplete(p) {
  return Boolean(p?.age_range && p?.main_goal && p?.main_reason);
}

export function hasConditionsSelected(p) {
  return Array.isArray(p?.conditions) && p.conditions.length > 0;
}

export function isProfileComplete(p) {
  return isPersonalComplete(p) && isWizardComplete(p) && hasConditionsSelected(p);
}

export function getNextRoute(profile) {
  if (!profile) return "/perfil-clinico";
  if (!isPersonalComplete(profile)) return "/perfil-clinico";
  if (!isWizardComplete(profile)) return "/wizard";
  if (!hasConditionsSelected(profile)) return "/patologias";
  return "/app";
}
