import React from "react";

/**
 * SelectButton (Gaia)
 * - Sem Tailwind
 * - Card clicável com estado ativo
 * - Props: title, subtitle, active, onClick, className, disabled
 */
export default function SelectButton({
  title,
  subtitle,
  active = false,
  onClick,
  className = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={className}
      style={{
        width: "100%",
        textAlign: "left",
        padding: 14,
        borderRadius: 16,
        border: active ? "2px solid #16a34a" : "1px solid rgba(15,23,42,0.14)",
        background: active ? "rgba(22,163,74,0.10)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active ? "0 10px 24px rgba(22,163,74,0.12)" : "0 6px 18px rgba(0,0,0,0.04)",
        transition:
          "transform 80ms ease, box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "translateY(1px)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>{title}</div>
          {subtitle ? (
            <div style={{ opacity: 0.75, fontSize: 13, color: "#0f172a" }}>{subtitle}</div>
          ) : null}
        </div>

        <div
          aria-hidden="true"
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
}