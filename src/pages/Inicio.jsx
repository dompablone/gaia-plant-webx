import React from "react";
import { supabase } from "../lib/supabase.js";

export default function Inicio() {
  async function sair() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Início</h1>
      <p>App principal aqui.</p>

      <button onClick={sair} style={{ padding: 10, borderRadius: 10, cursor: "pointer" }}>
        Sair
      </button>
    </div>
  );
}
