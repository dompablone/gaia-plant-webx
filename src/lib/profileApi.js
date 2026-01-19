import { supabase } from "./supabase.js";
import { normalizeTriage } from "./triage.js";
import { logWarn, sleep, withTimeout } from "./telemetry.js";

export async function fetchMyProfile(userId) {
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

      await sleep(500 + attempt * 800);
    }
  }

  return null;
}

export async function upsertMyProfile(userId, patch) {
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
      await sleep(400);
    }
  }
  return null;
}
