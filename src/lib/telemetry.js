const __warnOnce = new Map();

export function logWarn(key, details) {
  const now = Date.now();
  const last = __warnOnce.get(key) || 0;
  if (now - last < 30000) return;
  __warnOnce.set(key, now);
  console.warn(`[GAIA] ${key}`, details || "");
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout(promise, ms, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(msg)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}
