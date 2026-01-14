import React, { useState } from "react";
import { ObjetivosGrid } from "./objetivos";

export default function PassoObjetivo({ onNext }) {
  const [goal, setGoal] = useState(null);

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Selecione o principal objetivo que busca com o tratamento</h2>

      <ObjetivosGrid value={goal} onChange={setGoal} />

      <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          disabled={!goal}
          onClick={() => onNext({ main_goal: goal })}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            background: !goal ? "#94a3b8" : "#1f7a3a",
            color: "#fff",
            fontWeight: 800,
            cursor: !goal ? "not-allowed" : "pointer",
            boxShadow: !goal ? "none" : "0 10px 20px rgba(31,122,58,0.18)",
          }}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
