import React from "react";

/**
 * SelectButton
 * Usado em formulários de perfil / wizard / triagem
 *
 * Props esperadas:
 * - value: valor atual
 * - onChange: função (novoValor) => void
 * - options: array [{ value, label }]
 * - disabled: boolean (opcional)
 */
export default function SelectButton({
  value,
  onChange,
  options = [],
  disabled = false,
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;

        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(opt.value)}
            style={{
              padding: "12px 14px",
              borderRadius: 14,
              border: active
                ? "2px solid #16a34a"
                : "1px solid rgba(0,0,0,0.15)",
              background: active ? "rgba(22,163,74,0.12)" : "#fff",
              fontWeight: active ? 800 : 600,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
              textAlign: "left",
            }}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
